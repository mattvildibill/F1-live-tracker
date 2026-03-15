import type { F1State, ERSState } from '../types/f1';
import { getTeamColor } from '../utils/teamColors';

interface Props {
  state: F1State;
}

function ERSBar({ charge, mode }: { charge: number; mode: ERSState['mode'] }) {
  const color = charge > 66 ? '#22c55e' : charge > 33 ? '#f59e0b' : '#ef4444';
  const modeColor: Record<ERSState['mode'], string> = {
    Harvest: 'text-green-400',
    Boost: 'text-blue-400',
    Depleting: 'text-red-400',
    Balanced: 'text-gray-400',
  };

  return (
    <div className="space-y-0.5">
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${charge}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className={modeColor[mode]}>{mode}</span>
        <span className="text-gray-400">{charge.toFixed(0)}%</span>
      </div>
    </div>
  );
}

export default function ERSPanel({ state }: Props) {
  const { drivers, positions, intervals, ersStates } = state;
  const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));
  const sorted = [...positions].sort((a, b) => a.position - b.position);

  // Find pairs within 1 second
  const overtakePairs: Array<{ behind: number; ahead: number; gap: number }> = [];
  for (let i = 1; i < sorted.length; i++) {
    const behindPos = sorted[i];
    const aheadPos = sorted[i - 1];
    const intv = intervals.find((iv) => iv.driver_number === behindPos.driver_number);
    const prevIntv = intervals.find((iv) => iv.driver_number === aheadPos.driver_number);
    const gap = (intv?.interval ?? intv?.gap_to_leader ?? null) !== null
      ? Number(intv?.interval ?? intv?.gap_to_leader)
      : null;
    const prevGap = (prevIntv?.interval ?? prevIntv?.gap_to_leader ?? null) !== null
      ? Number(prevIntv?.interval ?? prevIntv?.gap_to_leader)
      : null;

    let actualGap = gap !== null && prevGap !== null ? gap - prevGap : gap;
    if (actualGap === null && intv?.interval != null) actualGap = intv.interval;
    if (actualGap !== null && actualGap >= 0 && actualGap <= 1.0) {
      overtakePairs.push({ behind: behindPos.driver_number, ahead: aheadPos.driver_number, gap: actualGap });
    }
  }

  if (!sorted.length) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Waiting for data…</div>;
  }

  return (
    <div className="space-y-6 p-4">
      {/* Per-driver ERS bars */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Battery Charge</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sorted.map((pos) => {
            const driver = driverMap.get(pos.driver_number);
            if (!driver) return null;
            const ers = ersStates[pos.driver_number];
            const teamColor = getTeamColor(driver.team_name, driver.team_colour);

            return (
              <div key={pos.driver_number} className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 w-4">{pos.position}</span>
                    <div className="w-1 h-4 rounded" style={{ backgroundColor: teamColor }} />
                    <span className="font-bold text-white text-sm">{driver.name_acronym}</span>
                    <span className="text-xs text-gray-500">{driver.team_name}</span>
                  </div>
                  {ers && (
                    <span className="text-xs text-gray-400 font-mono">
                      {ers.estimatedMJ.toFixed(2)} MJ
                    </span>
                  )}
                </div>
                {ers ? (
                  <ERSBar charge={ers.charge} mode={ers.mode} />
                ) : (
                  <div className="h-3 bg-gray-700 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Overtake Mode section */}
      {overtakePairs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            ⚡ Overtake Zone — Within 1 second
          </h3>
          <div className="space-y-2">
            {overtakePairs.map(({ behind, ahead, gap }) => {
              const behindDriver = driverMap.get(behind);
              const aheadDriver = driverMap.get(ahead);
              if (!behindDriver || !aheadDriver) return null;

              return (
                <div key={`${behind}-${ahead}`} className="flex items-center gap-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg px-4 py-2">
                  <span className="font-bold text-white">{behindDriver.name_acronym}</span>
                  <span className="text-yellow-400 text-sm">→ chasing →</span>
                  <span className="font-bold text-white">{aheadDriver.name_acronym}</span>
                  <span className="ml-auto text-yellow-300 font-mono text-sm">+{gap.toFixed(3)}s</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
