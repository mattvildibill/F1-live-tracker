import { useMemo, useState, useEffect } from 'react';
import { useJolpica } from '../hooks/useJolpica';
import { getTeamColor } from '../utils/teamColors';
import type { ScheduledRace } from '../types/championship';

function raceDate(r: ScheduledRace): Date {
  return new Date(`${r.date}T${r.time ?? '12:00:00Z'}`);
}

function useCountdown(target: Date | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return '';
  const ms = target.getTime() - now;
  if (ms <= 0) return 'Underway';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`;
}

export default function Championship() {
  const champ = useJolpica(true);
  const { driverStandings, constructorStandings, schedule, lastRace, season, loading, error } = champ;

  const now = Date.now();
  const nextRace = useMemo(
    () => schedule.find((r) => raceDate(r).getTime() > now) ?? null,
    [schedule, now]
  );
  const countdown = useCountdown(nextRace ? raceDate(nextRace) : null);

  const maxDriverPts = driverStandings.length ? parseFloat(driverStandings[0].points) || 1 : 1;
  const maxTeamPts = constructorStandings.length ? parseFloat(constructorStandings[0].points) || 1 : 1;

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading championship data…</div>;
  }
  if (error && !driverStandings.length && !schedule.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2 px-6 text-center">
        <p>Couldn't reach the Jolpica-F1 API for championship data.</p>
        <p className="text-xs text-gray-600">
          Check your connection or try again shortly — standings refresh automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Next race hero */}
      {nextRace && (
        <div className="rounded-lg border border-gray-800 bg-gradient-to-r from-gray-950 to-gray-900 p-4 flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">Next round · R{nextRace.round}</p>
            <p className="text-xl font-bold text-gray-100 mt-0.5">{nextRace.raceName}</p>
            <p className="text-sm text-gray-400">
              {nextRace.Circuit.circuitName} — {nextRace.Circuit.Location.locality}, {nextRace.Circuit.Location.country}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs uppercase tracking-wider text-gray-500">Lights out in</p>
            <p className="text-2xl font-black text-red-400 font-mono mt-0.5">{countdown}</p>
            <p className="text-xs text-gray-600">
              {raceDate(nextRace).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      )}

      {/* Last race podium */}
      {lastRace?.Results && lastRace.Results.length >= 3 && (
        <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-4">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
            Last race — {lastRace.raceName} (R{lastRace.round})
          </p>
          <div className="flex gap-4 flex-wrap">
            {lastRace.Results.slice(0, 3).map((r) => (
              <div key={r.position} className="flex items-center gap-2">
                <span className={`text-lg font-black ${
                  r.position === '1' ? 'text-yellow-400' : r.position === '2' ? 'text-gray-300' : 'text-amber-600'
                }`}>P{r.position}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-200">{r.Driver.givenName} {r.Driver.familyName}</p>
                  <p className="text-xs text-gray-500">{r.Constructor.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Driver standings */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">
            {season ?? ''} Drivers' Championship
          </h2>
          <div className="rounded-lg border border-gray-800 divide-y divide-gray-800/60">
            {driverStandings.map((s) => {
              const teamName = s.Constructors[0]?.name ?? '';
              const color = getTeamColor(teamName);
              const pts = parseFloat(s.points) || 0;
              return (
                <div key={s.Driver.driverId} className="flex items-center gap-3 px-3 py-2 bg-gray-950/40 relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 opacity-[0.08]"
                    style={{ width: `${(pts / maxDriverPts) * 100}%`, backgroundColor: color }}
                  />
                  <span className="w-6 text-sm font-bold text-gray-500 text-right relative">{s.position}</span>
                  <span className="w-1 h-5 rounded-sm relative" style={{ backgroundColor: color }} />
                  <div className="flex-1 relative">
                    <span className="text-sm font-semibold text-gray-200">
                      {s.Driver.givenName} {s.Driver.familyName}
                    </span>
                    <span className="text-xs text-gray-600 ml-2 hidden sm:inline">{teamName}</span>
                  </div>
                  {parseInt(s.wins) > 0 && (
                    <span className="text-xs text-gray-500 relative">🏆 {s.wins}</span>
                  )}
                  <span className="text-sm font-mono font-bold text-gray-100 relative w-14 text-right">{s.points}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Constructor standings + calendar */}
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">
              {season ?? ''} Constructors' Championship
            </h2>
            <div className="rounded-lg border border-gray-800 divide-y divide-gray-800/60">
              {constructorStandings.map((s) => {
                const color = getTeamColor(s.Constructor.name);
                const pts = parseFloat(s.points) || 0;
                return (
                  <div key={s.Constructor.constructorId} className="flex items-center gap-3 px-3 py-2 bg-gray-950/40 relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 opacity-[0.08]"
                      style={{ width: `${(pts / maxTeamPts) * 100}%`, backgroundColor: color }}
                    />
                    <span className="w-6 text-sm font-bold text-gray-500 text-right relative">{s.position}</span>
                    <span className="w-1 h-5 rounded-sm relative" style={{ backgroundColor: color }} />
                    <span className="flex-1 text-sm font-semibold text-gray-200 relative">{s.Constructor.name}</span>
                    <span className="text-sm font-mono font-bold text-gray-100 relative w-14 text-right">{s.points}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Season Calendar</h2>
            <div className="rounded-lg border border-gray-800 divide-y divide-gray-800/60 max-h-80 overflow-y-auto">
              {schedule.map((r) => {
                const past = raceDate(r).getTime() < now;
                const isNext = nextRace?.round === r.round;
                return (
                  <div
                    key={r.round}
                    className={`flex items-center gap-3 px-3 py-1.5 text-sm ${
                      isNext ? 'bg-red-950/30' : 'bg-gray-950/40'
                    } ${past ? 'opacity-50' : ''}`}
                  >
                    <span className="w-8 text-xs font-mono text-gray-500">R{r.round}</span>
                    <span className={`flex-1 ${isNext ? 'text-red-300 font-semibold' : 'text-gray-300'}`}>
                      {r.raceName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    {past && <span className="text-xs text-gray-600">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-600">
        Real-world championship data via the Jolpica-F1 API · refreshes every 5 minutes
      </p>
    </div>
  );
}
