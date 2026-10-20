import type { F1State, Session, Driver, Position, Interval, Lap, Pit, RaceControl, Weather, OpenF1Stint, TeamRadioMsg } from '../types/f1.ts';
import type { Tab } from './panels.ts';
import { deriveStints } from './stintUtils.ts';

export type TimingClient = <T>(path: string, signal?: AbortSignal) => Promise<T[]>;
export function latestRows<T extends { driver_number: number; date: string }>(rows: T[]) {
  return [...new Map([...rows].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).map(row => [row.driver_number, row])).values()];
}

// Publish required timing before requesting secondary feeds. The supplied client
// owns pacing; publishing earlier must never increase the provider request rate.
export async function loadTimingSnapshot(previous: F1State, session: Session, phase: string, panel: Tab, client: TimingClient, signal: AbortSignal, publish: (state: F1State) => void, now = Date.now()) {
  const q = `session_key=${session.session_key}`;
  const drivers = previous.drivers.length ? previous.drivers : await client<Driver>(`/drivers?${q}`, signal);
  signal.throwIfAborted();
  const positions = await client<Position>(`/position?${q}`, signal);
  signal.throwIfAborted();
  const laps = await client<Lap>(`/laps?${q}`, signal);
  signal.throwIfAborted();
  const newest = Math.max(0, ...positions.map(p => Date.parse(p.date)));
  const fresh = phase === 'Session window' && now - newest < 90000;
  let current: F1State = { ...previous, session, drivers, positions: latestRows(positions), laps, currentLap: Math.max(0, ...laps.map(l => l.lap_number)), lastUpdated: new Date(now), isLive: fresh, isStale: phase === 'Session window' && !fresh, statusText: fresh ? 'Live timing' : phase === 'Archived' ? 'Archived session' : 'Awaiting live timing', error: undefined };
  const feeds: { label: string; load: () => Promise<Partial<F1State>> }[] = [];
  if (['tower', 'command', 'map', 'gaps', 'h2h'].includes(panel)) feeds.push({ label: 'Gaps', load: async () => ({ intervals: latestRows(await client<Interval>(`/intervals?${q}`, signal)) }) });
  feeds.push({ label: 'Race control', load: async () => ({ raceControl: await client<RaceControl>(`/race_control?${q}`, signal) }) });
  if (['tower', 'command', 'tyres', 'h2h'].includes(panel)) feeds.push({ label: 'Tyres', load: async () => ({ stints: deriveStints(laps, [], await client<OpenF1Stint>(`/stints?${q}`, signal)) }) });
  if (['tower', 'command', 'pits', 'tyres'].includes(panel)) feeds.push({ label: 'Pit stops', load: async () => ({ pits: await client<Pit>(`/pit?${q}`, signal) }) });
  if (panel === 'command') feeds.push({ label: 'Track weather', load: async () => ({ weather: (await client<Weather>(`/weather?${q}`, signal)).at(-1) ?? null }) });
  if (panel === 'radio') feeds.push({ label: 'Team radio', load: async () => ({ teamRadio: await client<TeamRadioMsg>(`/team_radio?${q}`, signal) }) });
  const pending = feeds.map(feed => feed.label);
  const failed: string[] = [];
  current = { ...current, loadingFeeds: [...pending] };
  publish(current);
  // Sequential requests leave unneeded feeds out of the global queue when the
  // visitor changes panels. Cancellation also prevents an old session publishing.
  for (const feed of feeds) {
    signal.throwIfAborted();
    try {
      const value = await feed.load();
      signal.throwIfAborted();
      current = { ...current, ...value };
    } catch (error) {
      if (signal.aborted) throw error;
      failed.push(feed.label);
    }
    pending.shift();
    current = { ...current, loadingFeeds: [...pending], error: failed.length ? `${failed.join(', ')} unavailable; last known values are retained.` : undefined };
    publish(current);
  }
  return current;
}
