import { useState, useEffect } from 'react';
import type { F1State, Session, Driver, Position, Interval, Lap, Pit, RaceControl, Weather, OpenF1Stint, TeamRadioMsg } from '../types/f1';
import { EMPTY_STATE, openF1, sessionPhase, type Race } from '../utils/data';
import { deriveStints } from '../utils/stintUtils';
export function useOpenF1(enabled = true, sessionKeyOverride: number | null = null, race?: Race | null, revision = 0) {
  const [state, setState] = useState<F1State>(EMPTY_STATE);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>; let failures = 0; let current: F1State = { ...EMPTY_STATE, source: 'openf1' }; let discoveryAt = 0;
    setState(current);
    async function poll() {
      if (document.hidden) { timer = setTimeout(poll, 15000); return; }
      try {
        if (!current.session || (!sessionKeyOverride && Date.now() - discoveryAt > 60000)) {
          const sessions = await openF1<Session>(sessionKeyOverride ? `/sessions?session_key=${sessionKeyOverride}` : `/sessions?year=${new Date().getFullYear()}`, controller.signal);
          const eligible = sessionKeyOverride ? sessions : sessions.filter(s => !race || (Date.parse(s.date_start) >= Date.parse(race.date) - 4 * 86400000 && Date.parse(s.date_start) <= Date.parse(race.date) + 86400000));
          const ordered = [...eligible].sort((a,b) => Date.parse(a.date_start) - Date.parse(b.date_start));
          const now = Date.now();
          const session = ordered.find(s => Date.parse(s.date_start) <= now && Date.parse(s.date_end) >= now) ?? ordered.find(s => Date.parse(s.date_start) > now) ?? ordered.at(-1);
          if (!session) throw new Error('No session published for this race weekend yet.');
          if (session.session_key !== current.session?.session_key) current = { ...EMPTY_STATE, session, source: 'openf1' };
          discoveryAt = now;
        }
        const session = current.session!;
        const q = `session_key=${session.session_key}`;
        const phase = sessionPhase(session.date_start, session.date_end, Date.now());
        if (phase === 'Upcoming') { current = { ...current, statusText: 'Pre-race', isLive: false, lastUpdated: new Date(), error: undefined, isStale: false }; }
        else {
          // Sequential, bounded requests; never download full car/location histories.
          const drivers = current.drivers.length ? current.drivers : await openF1<Driver>(`/drivers?${q}`, controller.signal);
          const positions = await openF1<Position>(`/position?${q}`, controller.signal);
          const laps = await openF1<Lap>(`/laps?${q}`, controller.signal);
          const optional = await Promise.allSettled([
            openF1<Interval>(`/intervals?${q}`, controller.signal), openF1<Pit>(`/pit?${q}`, controller.signal),
            openF1<RaceControl>(`/race_control?${q}`, controller.signal), openF1<Weather>(`/weather?${q}`, controller.signal),
            openF1<OpenF1Stint>(`/stints?${q}`, controller.signal), openF1<TeamRadioMsg>(`/team_radio?${q}`, controller.signal),
          ]);
          if (controller.signal.aborted) return;
          const [intervals, pits, rc, weather, stints, radio] = optional;
          const newest = Math.max(0, ...positions.map(p => Date.parse(p.date)));
          const fresh = phase === 'Session window' && Date.now() - newest < 90000;
          current = { ...current, drivers, positions: latest(positions), laps, intervals: intervals.status === 'fulfilled' ? latest(intervals.value) : current.intervals, pits: pits.status === 'fulfilled' ? pits.value : current.pits, raceControl: rc.status === 'fulfilled' ? rc.value : current.raceControl, weather: weather.status === 'fulfilled' ? weather.value.at(-1) ?? null : current.weather, stints: stints.status === 'fulfilled' ? deriveStints(laps, [], stints.value) : current.stints, teamRadio: radio.status === 'fulfilled' ? radio.value : current.teamRadio, currentLap: Math.max(0, ...laps.map(l => l.lap_number)), lastUpdated: new Date(), isLive: fresh, isStale: optional.some(r => r.status === 'rejected'), statusText: fresh ? 'Live timing' : phase === 'Archived' ? 'Archived session' : 'Awaiting live timing', error: optional.some(r => r.status === 'rejected') ? 'Some feeds are unavailable; last known values retained.' : undefined };
        }
        failures = 0;
      } catch (error) {
        if (controller.signal.aborted) return;
        failures++;
        current = { ...current, isLive: false, isStale: true, statusText: 'Timing unavailable', error: error instanceof Error ? error.message : 'Timing unavailable' };
      }
      if (controller.signal.aborted) return;
      setState({ ...current });
      timer = setTimeout(poll, failures ? Math.min(300000, 30000 * 2 ** (failures - 1)) : current.isLive ? 15000 : 60000);
    }
    poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [enabled, sessionKeyOverride, race?.date, revision]);
  return state;
}
function latest<T extends { driver_number: number; date: string }>(rows: T[]) { return [...new Map([...rows].sort((a,b) => Date.parse(a.date) - Date.parse(b.date)).map(r => [r.driver_number, r])).values()]; }
