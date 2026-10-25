import type { F1State } from '../types/f1.ts';
import { EMPTY_STATE, type Race } from './data.ts';

export type Leaderboard = {
  eventId: string; competitionId: string; name: string; date: string;
  status: string; statusText: string; totalLaps: number; fetchedAt: number;
  drivers: { number: number; name: string; shortName?: string; team: string; color: string; position: number; grid: number | null; laps: number | null; updatedAt: number | null }[];
};
export function leaderboardState(data: Leaderboard, race: Race, now = Date.now()): F1State {
  if (data.date.slice(0, 10) !== race.date || !data.drivers.length) throw new Error('Leaderboard does not match this race.');
  const updated = Math.max(0, ...data.drivers.map(d => d.updatedAt ?? 0));
  const stale = now - data.fetchedAt > 60000 || (data.status === 'in' && (!updated || now - updated > 120000));
  const currentLap = Math.max(0, ...data.drivers.map(d => d.laps ?? 0));
  const sessionKey = -Number(data.competitionId);
  const date = new Date(updated || data.fetchedAt).toISOString();
  const positions = data.drivers.map(d => ({ driver_number: d.number, position: d.position, date, session_key: sessionKey, meeting_key: Number(data.eventId) }));
  return {
    ...EMPTY_STATE, source: 'espn',
    session: { session_key: sessionKey, meeting_key: Number(data.eventId), session_name: race.raceName, session_type: 'Race', status: data.statusText, date_start: data.date, date_end: '', gmt_offset: '', location: race.Circuit.Location.locality, country_name: race.Circuit.Location.country, circuit_short_name: race.Circuit.circuitName, year: Number(race.season) },
    drivers: data.drivers.map(d => ({ driver_number: d.number, full_name: d.name, broadcast_name: d.name, name_acronym: d.name.split(' ').at(-1)!.slice(0, 3).toUpperCase(), team_name: d.team, team_colour: d.color })),
    positions, startingGrid: Object.fromEntries(data.drivers.filter(d => d.grid != null).map(d => [d.number, d.grid!])),
    currentLap, totalLaps: data.totalLaps, lastUpdated: new Date(data.fetchedAt), isStale: stale,
    isLive: data.status === 'in' && !stale,
    statusText: stale ? 'Leaderboard delayed' : data.status === 'in' ? 'Live leaderboard' : data.status === 'post' ? 'Race classification' : 'Starting grid',
  };
}

export async function loadESPN(race: Race, signal: AbortSignal) {
  const response = await fetch(`/api/live-timing?date=${encodeURIComponent(race.date)}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'ESPN leaderboard unavailable.');
  return leaderboardState(data, race);
}
