import type { F1State } from '../types/f1';
import EmptyState from './EmptyState';
import { getTeamColor } from '../utils/teamColors';
import { getTyreColor, getTyreLabel } from '../utils/tyreUtils';

interface Props {
  state: F1State;
}

export default function TyreStrategy({ state }: Props) {
  const { drivers, positions, stints, pits, currentLap, totalLaps } = state;
  const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));
  const sorted = [...positions].sort((a, b) => a.position - b.position);
  const raceLaps = Math.max(totalLaps, currentLap, 1);

  // Per-driver pit stop list sorted by lap
  const pitsByDriver = new Map<number, typeof pits>();
  for (const driver of drivers) {
    pitsByDriver.set(
      driver.driver_number,
      pits.filter((p) => p.driver_number === driver.driver_number).sort((a, b) => a.lap_number - b.lap_number)
    );
  }

  if (!sorted.length) {
    return <EmptyState icon="🔴" title="Waiting for tyre data" subtitle="Stint bars will appear after the first lap is completed." />;
  }

  return (
    <div className="p-4 overflow-x-auto">
      {/* Lap number axis */}
      <div className="flex items-center mb-1 pl-28">
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <div key={frac} className="text-xs text-gray-600" style={{ width: `${frac * 100}%`, position: 'relative' }}>
          </div>
        ))}
        <div className="flex justify-between w-full text-xs text-gray-500 mb-2">
          <span>Lap 1</span>
          <span>Lap {Math.round(raceLaps * 0.25)}</span>
          <span>Lap {Math.round(raceLaps * 0.5)}</span>
          <span>Lap {Math.round(raceLaps * 0.75)}</span>
          <span>Lap {raceLaps}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {sorted.map((pos) => {
          const driver = driverMap.get(pos.driver_number);
          if (!driver) return null;
          const teamColor = getTeamColor(driver.team_name, driver.team_colour);
          const driverStints = stints[pos.driver_number] ?? [];

          return (
            <div key={pos.driver_number} className="flex items-center gap-3">
              {/* Driver label */}
              <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                <span className="text-xs text-gray-500 w-4">{pos.position}</span>
                <div className="w-1 h-4 rounded" style={{ backgroundColor: teamColor }} />
                <span className="text-xs font-bold text-white">{driver.name_acronym}</span>
              </div>

              {/* Stint bars */}
              <div className="flex-1 relative h-7 bg-gray-800/40 rounded">
                {driverStints.map((stint, i) => {
                  const startPct = ((stint.startLap - 1) / raceLaps) * 100;
                  const widthPct = ((stint.endLap - stint.startLap + 1) / raceLaps) * 100;
                  const color = getTyreColor(stint.compound);
                  const label = getTyreLabel(stint.compound);

                  return (
                    <div
                      key={i}
                      className="absolute top-0.5 bottom-0.5 rounded flex items-center justify-center overflow-hidden"
                      style={{
                        left: `${startPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: color,
                        opacity: 0.9,
                      }}
                      title={`${stint.compound} — Laps ${stint.startLap}–${stint.endLap}`}
                    >
                      {widthPct > 5 && (
                        <span className="text-[10px] font-black text-black">
                          {label}{stint.tyreAge > 0 ? ` (${stint.tyreAge}L)` : ''}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Current lap indicator */}
                {currentLap > 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/40 rounded"
                    style={{ left: `${(currentLap / raceLaps) * 100}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pit stop delta table */}
      {pits.length > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-800">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Pit Stop Durations</h3>
          <div className="overflow-x-auto">
            <table className="text-xs font-mono w-full">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800">
                  <th className="text-left py-1 pr-4 font-normal">Driver</th>
                  {Array.from({ length: Math.max(...[...pitsByDriver.values()].map((p) => p.length), 0) }, (_, i) => (
                    <th key={i} className="text-center py-1 px-3 font-normal">Stop {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((pos) => {
                  const driver = driverMap.get(pos.driver_number);
                  if (!driver) return null;
                  const driverPits = pitsByDriver.get(pos.driver_number) ?? [];
                  if (!driverPits.length) return null;
                  const teamColor = getTeamColor(driver.team_name, driver.team_colour);
                  return (
                    <tr key={pos.driver_number} className="border-b border-gray-800/40">
                      <td className="py-1.5 pr-4">
                        <span className="font-bold" style={{ color: teamColor }}>{driver.name_acronym}</span>
                      </td>
                      {driverPits.map((pit, i) => (
                        <td key={i} className="text-center py-1.5 px-3">
                          <span className="text-gray-300">
                            {pit.pit_duration != null ? `${pit.pit_duration.toFixed(1)}s` : '—'}
                          </span>
                          <span className="text-gray-600 ml-1">L{pit.lap_number}</span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-800">
        {[['SOFT', '#FF3B30'], ['MEDIUM', '#FDE74C'], ['HARD', '#E0DCDC'], ['INTERMEDIATE', '#39B54A'], ['WET', '#0067FF']].map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
