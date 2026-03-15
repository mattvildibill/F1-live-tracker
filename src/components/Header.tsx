import type { F1State } from '../types/f1';

interface Props {
  state: F1State;
}

function FlagBadge({ message }: { message: string }) {
  const lower = message.toLowerCase();
  if (lower.includes('safety car')) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-500 text-black">SC</span>;
  if (lower.includes('virtual safety car') || lower.includes('vsc')) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-400 text-black">VSC</span>;
  if (lower.includes('red flag')) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white">RED FLAG</span>;
  if (lower.includes('drs enabled')) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500 text-black">DRS ✓</span>;
  if (lower.includes('drs disabled')) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-500 text-white">DRS ✗</span>;
  return null;
}

export default function Header({ state }: Props) {
  const { session, isLive, isStale, weather, raceControl, currentLap, totalLaps } = state;

  const latestRC = [...raceControl].reverse().slice(0, 5);
  const tickerText = latestRC.map((rc) => rc.message).join('   ·   ');

  const scActive = raceControl.some((rc) => {
    const msg = rc.message.toLowerCase();
    return msg.includes('safety car deployed') || msg.includes('virtual safety car');
  });

  const sessionLabel = session
    ? `${session.circuit_short_name ?? session.location} — ${session.session_name}`
    : 'Loading…';

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="px-4 py-2 flex items-center gap-4 flex-wrap">
        {/* Logo / Title */}
        <div className="flex items-center gap-2">
          <span className="text-red-500 font-black text-xl tracking-tight">F1</span>
          <span className="text-white font-semibold text-sm">Live Tracker</span>
        </div>

        {/* Live/Replay indicator */}
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full live-dot ${isLive ? 'bg-red-500' : 'bg-gray-500'}`} />
          <span className={`text-xs font-bold uppercase tracking-widest ${isLive ? 'text-red-400' : 'text-gray-400'}`}>
            {isLive ? 'Live' : 'Replay'}
          </span>
        </div>

        {isStale && (
          <span className="px-2 py-0.5 rounded text-xs bg-orange-900 text-orange-300 border border-orange-700">
            Stale data
          </span>
        )}

        {/* Session name */}
        <span className="text-gray-300 text-sm font-medium">{sessionLabel}</span>

        {/* Lap counter */}
        {currentLap > 0 && (
          <span className="text-gray-400 text-sm">
            Lap <span className="text-white font-bold">{currentLap}</span>
            {totalLaps > 0 && <span> / {totalLaps}</span>}
          </span>
        )}

        {/* SC / Red flag badges */}
        {scActive && <FlagBadge message="safety car" />}

        {/* Weather chips */}
        {weather && (
          <div className="flex items-center gap-2 ml-auto text-xs text-gray-400">
            <span className="bg-gray-800 px-2 py-0.5 rounded">
              🌡 Track {weather.track_temperature.toFixed(0)}°C
            </span>
            <span className="bg-gray-800 px-2 py-0.5 rounded">
              Air {weather.air_temperature.toFixed(0)}°C
            </span>
            <span className="bg-gray-800 px-2 py-0.5 rounded">
              💧 {weather.humidity.toFixed(0)}%
            </span>
            {weather.rainfall > 0 && (
              <span className="bg-blue-900 px-2 py-0.5 rounded text-blue-300">🌧 Rain</span>
            )}
          </div>
        )}
      </div>

      {/* Ticker */}
      {tickerText && (
        <div className="overflow-hidden bg-gray-950 border-t border-gray-800 py-1 text-xs text-gray-400">
          <span className="ticker-inner px-4">{tickerText}</span>
        </div>
      )}
    </header>
  );
}
