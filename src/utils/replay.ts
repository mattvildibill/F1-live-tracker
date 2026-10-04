import type { F1State, Lap } from '../types/f1';
import { EMPTY_STATE, type Race, type RecordedLap, type Result } from './data.ts';
export type ReplayData = { race: Race; results: Result[]; laps: RecordedLap[]; pits: NonNullable<Race['PitStops']> };
export function seconds(time: string): number { return time.split(':').reduce((sum, part) => sum * 60 + Number(part), 0); }
export function replayState(data: ReplayData, progress: number): F1State {
  const { race, results } = data;
  const lapNumber = Math.floor(progress);
  const totalLaps = Math.max(0, ...data.laps.map(l => Number(l.number)));
  const drivers = results.map(r => ({ driver_number: Number(r.number), full_name: `${r.Driver.givenName} ${r.Driver.familyName}`, broadcast_name: r.Driver.familyName, name_acronym: r.Driver.code ?? r.Driver.familyName.slice(0,3).toUpperCase(), team_name: r.Constructor.name, team_colour: '' }));
  const numbers = new Map(results.map(r => [r.Driver.driverId, Number(r.number)]));
  const current = data.laps.find(l => Number(l.number) === lapNumber);
  const positions = current ? current.Timings.map(t => ({ driver_number: numbers.get(t.driverId)!, position: Number(t.position), date: '', session_key: -1, meeting_key: -1 })) : results.filter(r => Number(r.grid) > 0).map(r => ({ driver_number: Number(r.number), position: Number(r.grid), date: '', session_key: -1, meeting_key: -1 }));
  const laps: Lap[] = [];
  for (const l of data.laps) {
    if (Number(l.number) > lapNumber) continue;
    for (const t of l.Timings) { const dn = numbers.get(t.driverId); if (dn == null) continue; laps.push({ driver_number: dn, lap_number: Number(l.number), lap_duration: seconds(t.time), duration_sector_1: null, duration_sector_2: null, duration_sector_3: null, is_pit_out_lap: false, date_start: '', session_key: -1, meeting_key: -1 }); }
  }
  // Classification on a selected lap is recorded, not extrapolated from pace.
  return { ...EMPTY_STATE, source: 'replay', statusText: lapNumber >= totalLaps ? 'Replay complete' : 'Historical replay', session: { session_key: -1, meeting_key: -1, session_name: race.raceName, session_type: 'Race', status: 'finished', date_start: `${race.date}T${race.time || '12:00:00Z'}`, date_end: '', gmt_offset: '', location: race.Circuit.Location.locality, country_name: race.Circuit.Location.country, circuit_short_name: race.Circuit.circuitName, year: Number(race.season) }, drivers, positionHistory: data.laps.filter(l => Number(l.number) <= lapNumber).flatMap(l => l.Timings.filter(t => numbers.has(t.driverId)).map(t => ({ lap: Number(l.number), driver_number: numbers.get(t.driverId)!, position: Number(t.position) }))), positions: (lapNumber >= totalLaps ? results.map(r => ({ driver_number: Number(r.number), position: Number(r.position), date: '', session_key: -1, meeting_key: -1 })) : positions).filter(p => p.driver_number != null), laps, currentLap: lapNumber, totalLaps, startingGrid: Object.fromEntries(results.map(r => [Number(r.number), Number(r.grid)])), pits: data.pits.filter(p => Number(p.lap) <= lapNumber && numbers.has(p.driverId)).map(p => ({ driver_number: numbers.get(p.driverId)!, lap_number: Number(p.lap), pit_duration: seconds(p.duration), date: `${race.date}T${p.time}Z`, session_key: -1, meeting_key: -1 })), lastUpdated: null };
}
