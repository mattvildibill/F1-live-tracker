import type { F1State } from '../types/f1';
import { getTeamColor } from '../utils/teamColors';
import { formatLapTime, formatGap, getTyreColor, getTyreLabel } from '../utils/tyreUtils';
import { STARTING_GRID } from '../mocks/australianGP2026';

interface Props {
  state: F1State;
}

function ERSBar({ charge }: { charge: number }) {
  const color = charge > 66 ? '#22c55e' : charge > 33 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-1.5 w-24">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${charge}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{charge.toFixed(0)}%</span>
    </div>
  );
}

export default function RaceTower({ state }: Props) {
  const { drivers, positions, intervals, laps, stints, ersStates, pits, currentLap } = state;

  const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));

  // Build per-driver last lap time
  const lastLapMap = new Map<number, number | null>();
  for (const dn of driverMap.keys()) {
    const driverLaps = laps
      .filter((l) => l.driver_number === dn && l.lap_duration != null)
      .sort((a, b) => b.lap_number - a.lap_number);
    lastLapMap.set(dn, driverLaps[0]?.lap_duration ?? null);
  }

  // Pit stop count per driver
  const pitCountMap = new Map<number, number>();
  for (const dn of driverMap.keys()) {
    pitCountMap.set(dn, pits.filter((p) => p.driver_number === dn).length);
  }

  // Currently pitting (this lap or last lap)
  const inPitSet = new Set(
    pits.filter((p) => p.lap_number >= currentLap - 1 && p.lap_number <= currentLap)
        .map((p) => p.driver_number)
  );

  // Sort by position
  const sorted = [...positions].sort((a, b) => a.position - b.position);

  if (!sorted.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Waiting for position data…
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
            <th className="text-left py-2 px-3 w-8">P</th>
            <th className="text-left py-2 px-2 w-12">Δ Grid</th>
            <th className="text-left py-2 px-3">Driver</th>
            <th className="text-left py-2 px-3">Team</th>
            <th className="text-right py-2 px-3">Gap</th>
            <th className="text-right py-2 px-3">Last Lap</th>
            <th className="text-left py-2 px-3">Tyre</th>
            <th className="text-center py-2 px-2">Pits</th>
            <th className="text-left py-2 px-3">ERS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((pos, idx) => {
            const driver = driverMap.get(pos.driver_number);
            if (!driver) return null;
            const interval = intervals.find((i) => i.driver_number === pos.driver_number);
            const lastLap = lastLapMap.get(pos.driver_number);
            const ers = ersStates[pos.driver_number];
            const teamColor = getTeamColor(driver.team_name, driver.team_colour);
            const isPitting = inPitSet.has(pos.driver_number);
            const pitCount = pitCountMap.get(pos.driver_number) ?? 0;

            // Position delta vs. starting grid
            const gridPos = STARTING_GRID[pos.driver_number];
            const delta = gridPos != null && gridPos > 0 ? gridPos - pos.position : null;

            // Current tyre
            const driverStints = stints[pos.driver_number] ?? [];
            const currentStint = driverStints[driverStints.length - 1];
            const compound = currentStint?.compound ?? 'UNKNOWN';
            const tyreAge = currentStint?.tyreAge ?? 0;

            return (
              <tr
                key={pos.driver_number}
                className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${idx === 0 ? 'bg-gray-800/20' : ''} ${isPitting ? 'bg-blue-950/30' : ''}`}
              >
                {/* Position */}
                <td className="py-2.5 px-3 font-bold text-white">{pos.position}</td>

                {/* Grid delta */}
                <td className="py-2.5 px-2 text-xs font-bold font-mono w-12">
                  {isPitting ? (
                    <span className="text-blue-400">PIT</span>
                  ) : delta === null || delta === 0 ? (
                    <span className="text-gray-600">—</span>
                  ) : delta > 0 ? (
                    <span className="text-green-400">▲{delta}</span>
                  ) : (
                    <span className="text-red-400">▼{Math.abs(delta)}</span>
                  )}
                </td>

                {/* Driver */}
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 rounded-full" style={{ backgroundColor: teamColor }} />
                    <div>
                      <div className="font-bold text-white">{driver.name_acronym}</div>
                      <div className="text-xs text-gray-500">{driver.broadcast_name}</div>
                    </div>
                  </div>
                </td>

                {/* Team */}
                <td className="py-2.5 px-3">
                  <span className="text-xs text-gray-400">{driver.team_name}</span>
                </td>

                {/* Gap */}
                <td className="py-2.5 px-3 text-right font-mono">
                  {pos.position === 1 ? (
                    <span className="text-yellow-400 font-bold">Leader</span>
                  ) : (
                    <span className="text-gray-300">{formatGap(interval?.gap_to_leader)}</span>
                  )}
                </td>

                {/* Last Lap */}
                <td className="py-2.5 px-3 text-right font-mono text-gray-300">
                  {formatLapTime(lastLap)}
                </td>

                {/* Tyre */}
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-black"
                      style={{ backgroundColor: getTyreColor(compound) }}
                    >
                      {getTyreLabel(compound)}
                    </span>
                    <span className="text-xs text-gray-500">{tyreAge}L</span>
                  </div>
                </td>

                {/* Pit count */}
                <td className="py-2.5 px-2 text-center font-mono text-xs text-gray-400">
                  {pitCount > 0 ? pitCount : '—'}
                </td>

                {/* ERS */}
                <td className="py-2.5 px-3">
                  {ers ? <ERSBar charge={ers.charge} /> : <span className="text-gray-600 text-xs">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
