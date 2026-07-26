import { useMemo } from 'react';
import type { F1State, Pit } from '../types/f1';
import { getTeamColor } from '../utils/teamColors';
import { getTyreColor, getTyreLabel } from '../utils/tyreUtils';

interface Props {
  state: F1State;
}

/** Deterministic fallback duration for pit records without one (sim / sparse data). */
function pitDuration(p: Pit): number {
  if (p.pit_duration != null && p.pit_duration > 0) {
    // OpenF1 pit_duration is time in the pit lane in seconds; some sessions report
    // stationary time (~2–4s), others full lane time (~18–25s). Show as reported.
    return p.pit_duration;
  }
  const h = Math.sin(p.driver_number * 9.31 + p.lap_number * 4.17) * 43758.5453;
  return 2.1 + (h - Math.floor(h)) * 1.6; // 2.1–3.7s synthetic stationary time
}

export default function PitLane({ state }: Props) {
  const { drivers, pits, stints, positions, currentLap, totalLaps } = state;
  const driverMap = useMemo(() => new Map(drivers.map((d) => [d.driver_number, d])), [drivers]);
  const posMap = useMemo(() => new Map(positions.map((p) => [p.driver_number, p.position])), [positions]);

  const stops = useMemo(() =>
    [...pits]
      .map((p) => ({ ...p, duration: pitDuration(p) }))
      .sort((a, b) => a.lap_number - b.lap_number || a.duration - b.duration),
    [pits]
  );

  const fastest = useMemo(
    () => (stops.length ? stops.reduce((m, s) => (s.duration < m.duration ? s : m)) : null),
    [stops]
  );

  const stopCountByDriver = useMemo(() => {
    const m = new Map<number, number>();
    for (const s of stops) m.set(s.driver_number, (m.get(s.driver_number) ?? 0) + 1);
    return m;
  }, [stops]);

  // Drivers still to stop (running, zero stops) — likely pit window if race
  const yetToStop = useMemo(() =>
    [...posMap.entries()]
      .filter(([dn]) => !stopCountByDriver.has(dn))
      .sort((a, b) => a[1] - b[1])
      .map(([dn]) => dn),
    [posMap, stopCountByDriver]
  );

  if (!stops.length && !yetToStop.length) {
    return <div className="flex items-center justify-center h-64 text-gray-500">No pit stop data yet.</div>;
  }

  const hasSynthetic = pits.some((p) => p.pit_duration == null || p.pit_duration === 0);

  return (
    <div className="p-4 space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
          <p className="text-xs uppercase tracking-wider text-gray-500">Total stops</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">{stops.length}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
          <p className="text-xs uppercase tracking-wider text-gray-500">Fastest stop</p>
          {fastest ? (
            <p className="text-2xl font-bold text-green-400 mt-1">
              {fastest.duration.toFixed(2)}s
              <span className="text-xs font-semibold text-gray-500 ml-2">
                {driverMap.get(fastest.driver_number)?.name_acronym} · L{fastest.lap_number}
              </span>
            </p>
          ) : <p className="text-2xl font-bold text-gray-600 mt-1">–</p>}
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
          <p className="text-xs uppercase tracking-wider text-gray-500">Avg stop</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">
            {stops.length ? (stops.reduce((s, p) => s + p.duration, 0) / stops.length).toFixed(2) + 's' : '–'}
          </p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
          <p className="text-xs uppercase tracking-wider text-gray-500">Yet to stop</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">{yetToStop.length}</p>
        </div>
      </div>

      {hasSynthetic && (
        <p className="text-xs text-gray-600 italic">
          Some durations estimated — source data doesn't report stationary time for every stop.
        </p>
      )}

      {/* Chronological stop log */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Stop Log</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-left min-w-[560px]">
            <thead className="bg-gray-900 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-3 py-2">Lap</th>
                <th className="px-3 py-2">Driver</th>
                <th className="px-3 py-2">Stop #</th>
                <th className="px-3 py-2">Tyre fitted</th>
                <th className="px-3 py-2 text-right">Duration</th>
                <th className="px-3 py-2 text-right">vs fastest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {stops.map((s, i) => {
                const d = driverMap.get(s.driver_number);
                if (!d) return null;
                const color = getTeamColor(d.team_name, d.team_colour);
                const isFastest = fastest && s.driver_number === fastest.driver_number && s.lap_number === fastest.lap_number;
                // Which stint began after this stop?
                const dStints = stints[s.driver_number] ?? [];
                const stintAfter = dStints.find((st) => st.startLap === s.lap_number + 1 || st.startLap === s.lap_number);
                const stopIdx = stops.filter((x) => x.driver_number === s.driver_number && x.lap_number <= s.lap_number).length;
                return (
                  <tr key={i} className={`bg-gray-950/40 hover:bg-gray-900/60 ${isFastest ? 'bg-green-950/30' : ''}`}>
                    <td className="px-3 py-2 text-sm font-mono text-gray-400">L{s.lap_number}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-1 h-4 rounded-sm" style={{ backgroundColor: color }} />
                        <span className="text-sm font-semibold text-gray-200">{d.name_acronym}</span>
                        <span className="text-xs text-gray-600 hidden sm:inline">{d.team_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-400">{stopIdx}</td>
                    <td className="px-3 py-2">
                      {stintAfter ? (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span
                            className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] font-black text-black"
                            style={{ backgroundColor: getTyreColor(stintAfter.compound), borderColor: getTyreColor(stintAfter.compound) }}
                          >
                            {getTyreLabel(stintAfter.compound)}
                          </span>
                          <span className="text-gray-400 capitalize">{stintAfter.compound.toLowerCase()}</span>
                        </span>
                      ) : <span className="text-gray-600 text-sm">–</span>}
                    </td>
                    <td className={`px-3 py-2 font-mono text-sm text-right ${isFastest ? 'text-green-400 font-bold' : 'text-gray-200'}`}>
                      {s.duration.toFixed(2)}s
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-right text-gray-600">
                      {fastest && !isFastest ? `+${(s.duration - fastest.duration).toFixed(2)}` : isFastest ? '★' : '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Yet to stop */}
      {yetToStop.length > 0 && currentLap > 0 && currentLap < totalLaps && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Yet to Stop</h2>
          <div className="flex flex-wrap gap-2">
            {yetToStop.map((dn) => {
              const d = driverMap.get(dn);
              if (!d) return null;
              const color = getTeamColor(d.team_name, d.team_colour);
              const currentStint = (stints[dn] ?? []).at(-1);
              return (
                <span key={dn} className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded bg-gray-900 border border-gray-800 text-sm">
                  <span className="w-1 h-4 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="font-semibold text-gray-200">{d.name_acronym}</span>
                  {currentStint && (
                    <span className="text-xs text-gray-500">
                      {getTyreLabel(currentStint.compound)} · {currentStint.tyreAge} laps old
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
