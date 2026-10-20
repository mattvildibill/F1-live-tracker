import type { F1State } from '../types/f1';
export const JOLPICA = 'https://api.jolpi.ca/ergast/f1';
export const EMPTY_STATE: F1State = { session: null, drivers: [], positions: [], intervals: [], laps: [], carData: [], pits: [], raceControl: [], weather: null, locations: [], stints: {}, teamRadio: [], ersStates: {}, isLive: false, isStale: false, lastUpdated: null, currentLap: 0, totalLaps: 0 };
export function providerName(url: string) {
  if (url.includes('open-meteo.com')) return 'Open-Meteo weather';
  if (url.includes('jolpi.ca') || url.startsWith('/jolpica')) return 'Jolpica race data';
  if (url.includes('openf1.org') || url.startsWith('/openf1')) return 'OpenF1 timing';
  return 'The data provider';
}
export function providerError(url: string, status: number) {
  const provider = providerName(url);
  if ((status === 401 || status === 403) && provider === 'OpenF1 timing') return 'OpenF1 requires authenticated access during live sessions. You can still try the synthetic demo or recorded race replay.';
  if (status === 401 || status === 403) return `${provider} denied this request. Try again later or use the synthetic demo.`;
  if (status === 429) return `${provider} has reached its request limit. Wait a moment before retrying.`;
  return `${provider} is unavailable (${status}). Please try again.`;
}
export async function json<T>(url: string, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(15000);
  let res: Response;
  try { res = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout }); }
  catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(timeout.aborted ? `${providerName(url)} took too long to respond. Please retry.` : `${providerName(url)} could not be reached. Check your connection or try the synthetic demo.`, { cause: error });
  }
  if (!res.ok) throw new Error(providerError(url, res.status));
  return res.json();
}
// One shared queue keeps all OpenF1 consumers below the free 30 requests/min limit.
let queue: Promise<unknown> = Promise.resolve();
let nextAt = 0;
export function openF1<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const task = queue.catch(() => {}).then(async () => {
    signal?.throwIfAborted();
    const wait = Math.max(0, nextAt - Date.now());
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    signal?.throwIfAborted();
    nextAt = Date.now() + 2100;
    const rows = await json<T[]>(`/openf1/v1${path}`, signal);
    if (!Array.isArray(rows)) throw new Error('Unexpected data response. Retrying automatically.');
    return rows;
  });
  queue = task;
  return task;
}
export type Person = { driverId: string; permanentNumber?: string; code?: string; givenName: string; familyName: string };
export type Result = { number: string; position: string; grid: string; laps: string; status: string; Driver: Person; Constructor: { name: string }; Q1?: string; Q2?: string; Q3?: string };
export type Timing = { driverId: string; position: string; time: string };
export type RecordedLap = { number: string; Timings: Timing[] };
export type Race = { season: string; round: string; raceName: string; date: string; time?: string; Circuit: { circuitId: string; circuitName: string; Location: { lat: string; long: string; locality: string; country: string } }; Results?: Result[]; QualifyingResults?: Result[]; Laps?: RecordedLap[]; PitStops?: { driverId: string; lap: string; duration: string; time: string; stop: string }[]; [key: string]: unknown };
export type MRData = { total: string; limit: string; offset: string; RaceTable?: { Races: Race[] }; StandingsTable?: { season: string; StandingsLists: { round: string; DriverStandings?: { position: string; points: string; Driver: Person; Constructors: { name: string }[] }[]; ConstructorStandings?: { position: string; points: string; Constructor: { name: string } }[] }[] } };
export async function jolpica(path: string, signal?: AbortSignal) { return (await json<{ MRData: MRData }>(`${JOLPICA}/${path}`, signal)).MRData; }
export function raceTime(race: Pick<Race, 'date' | 'time'>) { return Date.parse(`${race.date}T${race.time || '12:00:00Z'}`); }
export function selectWeekend(races: Race[], now: number): Race | null {
  const sorted = [...races].sort((a,b) => raceTime(a) - raceTime(b));
  // Keep race day visible through delays and result publication, then advance.
  return sorted.find(r => now < Date.parse(`${r.date}T23:59:59Z`)) ?? sorted.at(-1) ?? null;
}
export function sessionPhase(start: string, end: string, now: number) {
  if (now < Date.parse(start)) return 'Upcoming';
  if (Number.isFinite(Date.parse(end)) && now > Date.parse(end)) return 'Archived';
  return 'Session window';
}
