import { useMemo, useState } from 'react';
import type { F1State, Lap } from '../types/f1';
import { getTeamColor } from '../utils/teamColors';
import { formatLapTime } from '../utils/tyreUtils';

interface Props {
  state: F1State;
}

interface DriverSectorRow {
  driverNumber: number;
  bestS1: number | null;
  bestS2: number | null;
  bestS3: number | null;
  bestLap: number | null;
  theoretical: number | null; // sum of best sectors
  lastLap: Lap | null;
}

/**
 * Deterministic sector split for laps that lack real sector data (simulator /
 * sparse sessions). Albert Park's sectors are roughly 31% / 37% / 32% of the
 * lap; a per-driver-per-lap hash shifts a few hundredths between sectors so
 * comparisons stay interesting without inventing randomness.
 */
function synthesizeSectors(lap: Lap): [number, number, number] | null {
  if (lap.lap_duration == null) return null;
  const h = Math.sin(lap.driver_number * 12.9898 + lap.lap_number * 78.233) * 43758.5453;
  const jitter = (h - Math.floor(h) - 0.5) * 0.012; // ±0.6% shifted between S1/S3
  const s1 = lap.lap_duration * (0.31 + jitter);
  const s2 = lap.lap_duration * 0.37;
  const s3 = lap.lap_duration - s1 - s2;
  return [s1, s2, s3];
}

function sectorsOf(lap: Lap): [number, number, number] | null {
  if (lap.duration_sector_1 != null && lap.duration_sector_2 != null && lap.duration_sector_3 != null) {
    return [lap.duration_sector_1, lap.duration_sector_2, lap.duration_sector_3];
  }
  return synthesizeSectors(lap);
}

function fmtSector(s: number | null): string {
  return s == null ? '--.---' : s.toFixed(3);
}

export default function SectorAnalysis({ state }: Props) {
  const { drivers, laps, positions } = state;
  const [sortBy, setSortBy] = useState<'position' | 'theoretical'>('position');

  const driverMap = useMemo(() => new Map(drivers.map((d) => [d.driver_number, d])), [drivers]);
  const posMap = useMemo(() => new Map(positions.map((p) => [p.driver_number, p.position])), [positions]);

  const anySynthetic = useMemo(
    () => laps.some((l) => l.lap_duration != null && l.duration_sector_1 == null),
    [laps]
  );

  const rows: DriverSectorRow[] = useMemo(() => {
    const byDriver = new Map<number, Lap[]>();
    for (const l of laps) {
      if (l.lap_duration == null || l.is_pit_out_lap) continue;
      if (!byDriver.has(l.driver_number)) byDriver.set(l.driver_number, []);
      byDriver.get(l.driver_number)!.push(l);
    }

    const out: DriverSectorRow[] = [];
    for (const [dn, dLaps] of byDriver) {
      let bestS1: number | null = null, bestS2: number | null = null, bestS3: number | null = null;
      let bestLap: number | null = null;
      for (const l of dLaps) {
        const s = sectorsOf(l);
        if (s) {
          if (bestS1 == null || s[0] < bestS1) bestS1 = s[0];
          if (bestS2 == null || s[1] < bestS2) bestS2 = s[1];
          if (bestS3 == null || s[2] < bestS3) bestS3 = s[2];
        }
        if (l.lap_duration != null && (bestLap == null || l.lap_duration < bestLap)) bestLap = l.lap_duration;
      }
      const lastLap = dLaps.sort((a, b) => a.lap_number - b.lap_number).at(-1) ?? null;
      out.push({
        driverNumber: dn,
        bestS1, bestS2, bestS3, bestLap,
        theoretical: bestS1 != null && bestS2 != null && bestS3 != null ? bestS1 + bestS2 + bestS3 : null,
        lastLap,
      });
    }
    return out;
  }, [laps]);

  // Overall fastest per sector (purple)
  const overall = useMemo(() => ({
    s1: Math.min(...rows.map((r) => r.bestS1 ?? Infinity)),
    s2: Math.min(...rows.map((r) => r.bestS2 ?? Infinity)),
    s3: Math.min(...rows.map((r) => r.bestS3 ?? Infinity)),
    lap: Math.min(...rows.map((r) => r.bestLap ?? Infinity)),
  }), [rows]);

  const sorted = useMemo(() => [...rows].sort((a, b) => {
    if (sortBy === 'theoretical') return (a.theoretical ?? Infinity) - (b.theoretical ?? Infinity);
    return (posMap.get(a.driverNumber) ?? 99) - (posMap.get(b.driverNumber) ?? 99);
  }), [rows, sortBy, posMap]);

  if (!rows.length) {
    return <div className="flex items-center justify-center h-64 text-gray-500">No lap data yet.</div>;
  }

  const sectorCell = (val: number | null, overallBest: number) => {
    const isOverall = val != null && Math.abs(val - overallBest) < 0.0005;
    return (
      <td className={`px-3 py-2 font-mono text-sm text-right ${
        isOverall ? 'text-purple-400 font-bold' : 'text-gray-300'
      }`}>
        {fmtSector(val)}
      </td>
    );
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Best Sectors</h2>
        <div className="flex gap-1 ml-auto">
          {(['position', 'theoretical'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                sortBy === s
                  ? 'bg-gray-800 border-gray-600 text-white'
                  : 'bg-transparent border-gray-800 text-gray-500 hover:text-gray-300'
              }`}
            >
              {s === 'position' ? 'By position' : 'By ideal lap'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
        <span><span className="text-purple-400 font-bold">■</span> Overall fastest sector</span>
        <span><span className="text-gray-300 font-bold">■</span> Personal best</span>
        {anySynthetic && (
          <span className="text-gray-600 italic">Sector splits estimated — source session has no per-sector timing</span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left min-w-[640px]">
          <thead className="bg-gray-900 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2">Pos</th>
              <th className="px-3 py-2">Driver</th>
              <th className="px-3 py-2 text-right">Best S1</th>
              <th className="px-3 py-2 text-right">Best S2</th>
              <th className="px-3 py-2 text-right">Best S3</th>
              <th className="px-3 py-2 text-right">Best Lap</th>
              <th className="px-3 py-2 text-right">Ideal Lap</th>
              <th className="px-3 py-2 text-right">Δ Ideal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {sorted.map((r) => {
              const d = driverMap.get(r.driverNumber);
              if (!d) return null;
              const color = getTeamColor(d.team_name, d.team_colour);
              const isFastestLap = r.bestLap != null && Math.abs(r.bestLap - overall.lap) < 0.0005;
              const delta = r.bestLap != null && r.theoretical != null ? r.bestLap - r.theoretical : null;
              return (
                <tr key={r.driverNumber} className="bg-gray-950/40 hover:bg-gray-900/60">
                  <td className="px-3 py-2 text-sm font-bold text-gray-400">
                    {posMap.get(r.driverNumber) ?? '–'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-1 h-4 rounded-sm" style={{ backgroundColor: color }} />
                      <span className="text-sm font-semibold text-gray-200">{d.name_acronym}</span>
                      <span className="text-xs text-gray-600 hidden sm:inline">{d.team_name}</span>
                    </div>
                  </td>
                  {sectorCell(r.bestS1, overall.s1)}
                  {sectorCell(r.bestS2, overall.s2)}
                  {sectorCell(r.bestS3, overall.s3)}
                  <td className={`px-3 py-2 font-mono text-sm text-right ${
                    isFastestLap ? 'text-purple-400 font-bold' : 'text-gray-200'
                  }`}>
                    {formatLapTime(r.bestLap)}
                  </td>
                  <td className="px-3 py-2 font-mono text-sm text-right text-gray-500">
                    {formatLapTime(r.theoretical)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-right text-gray-600">
                    {delta != null ? `+${delta.toFixed(3)}` : '--'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
