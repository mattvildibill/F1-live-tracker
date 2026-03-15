import type { F1State, RaceControl } from '../types/f1';

interface Props {
  state: F1State;
}

function flagStyle(rc: RaceControl): { bg: string; text: string; label: string } {
  const msg = rc.message.toLowerCase();
  const flag = (rc.flag ?? '').toLowerCase();

  if (flag === 'red' || msg.includes('red flag')) return { bg: 'bg-red-900/60 border-red-700/50', text: 'text-red-300', label: '🚩 RED FLAG' };
  if (flag === 'yellow' || msg.includes('yellow')) return { bg: 'bg-yellow-900/40 border-yellow-700/40', text: 'text-yellow-300', label: '🟡 YELLOW' };
  if (flag === 'double yellow' || msg.includes('double yellow')) return { bg: 'bg-yellow-900/60 border-yellow-600/50', text: 'text-yellow-200', label: '🟡🟡 DOUBLE YELLOW' };
  if (msg.includes('safety car deployed')) return { bg: 'bg-orange-900/40 border-orange-700/40', text: 'text-orange-300', label: '🚗 SAFETY CAR' };
  if (msg.includes('virtual safety car')) return { bg: 'bg-orange-900/30 border-orange-800/40', text: 'text-orange-400', label: '🚗 VSC' };
  if (msg.includes('drs enabled')) return { bg: 'bg-green-900/40 border-green-700/40', text: 'text-green-300', label: '✅ DRS ENABLED' };
  if (msg.includes('drs disabled')) return { bg: 'bg-gray-800/60 border-gray-700/40', text: 'text-gray-400', label: '❌ DRS DISABLED' };
  if (flag === 'green' || msg.includes('green flag') || msg.includes('track clear')) return { bg: 'bg-green-900/30 border-green-800/40', text: 'text-green-400', label: '🟢 GREEN' };
  if (msg.includes('pit lane') || msg.includes('pit exit')) return { bg: 'bg-blue-900/30 border-blue-800/40', text: 'text-blue-400', label: '🔵 PIT' };
  return { bg: 'bg-gray-800/40 border-gray-700/30', text: 'text-gray-400', label: '📻 INFO' };
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return dateStr;
  }
}

export default function TeamRadio({ state }: Props) {
  const { raceControl } = state;
  const sorted = [...raceControl].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (!sorted.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No race control messages yet.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
      {sorted.map((rc, i) => {
        const { bg, text, label } = flagStyle(rc);
        return (
          <div key={i} className={`rounded-lg border px-4 py-3 ${bg}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <span className={`text-xs font-bold uppercase tracking-wider ${text} mr-2`}>{label}</span>
                {rc.lap_number && (
                  <span className="text-xs text-gray-500">Lap {rc.lap_number}</span>
                )}
                <p className="text-sm text-gray-200 mt-1">{rc.message}</p>
                {rc.scope && rc.scope !== 'Track' && (
                  <span className="text-xs text-gray-500">Scope: {rc.scope}</span>
                )}
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap font-mono">{formatTime(rc.date)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
