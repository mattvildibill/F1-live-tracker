const CORE = 'https://sports.core.api.espn.com/v2/sports/racing/leagues/f1';
const BOARD = 'https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard';

async function get(url, signal) {
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) });
  if (!response.ok) throw new Error(`ESPN leaderboard is unavailable (${response.status}).`);
  return response.json();
}
const statsOf = data => (data.splits?.categories ?? data.categories ?? []).flatMap(c => c.stats ?? []);
const numberOf = (stats, name) => {
  const value = stats.find(s => s.name === name)?.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

// Fixed public provider endpoints only; no credentials or arbitrary upstream URLs.
export async function loadLeaderboard(date, signal = new AbortController().signal) {
  const board = await get(`${BOARD}?dates=${date.replaceAll('-', '')}`, signal);
  const event = board.events?.find(e => e.competitions?.some(c => c.type?.abbreviation === 'Race' && c.date?.slice(0, 10) === date));
  const race = event?.competitions?.find(c => c.type?.abbreviation === 'Race' && c.date?.slice(0, 10) === date);
  if (!event || !race || !/^\d+$/.test(event.id) || !/^\d+$/.test(race.id)) throw new Error('No ESPN Grand Prix leaderboard is published for this race date.');
  const base = `${CORE}/events/${event.id}/competitions/${race.id}`;
  const [competition, status, totals] = await Promise.all([
    get(base, signal), get(`${base}/status`, signal), get(`${base}/statistics`, signal),
  ]);
  const drivers = await Promise.all((competition.competitors ?? []).map(async c => {
    if (!/^\d+$/.test(c.id)) throw new Error('Invalid leaderboard driver.');
    const stats = statsOf(await get(`${base}/competitors/${c.id}/statistics`, signal));
    const athlete = race.competitors?.find(a => a.id === c.id)?.athlete;
    const number = Number(c.vehicle?.number);
    const position = numberOf(stats, 'position') ?? numberOf(stats, 'place') ?? (status.type?.state === 'pre' ? c.startOrder : null);
    return {
      number, name: athlete?.displayName ?? athlete?.fullName, shortName: athlete?.shortName,
      team: c.vehicle?.manufacturer ?? '', color: c.vehicle?.teamColor ?? '',
      position, grid: c.startOrder ?? null, laps: numberOf(stats, 'lapsCompleted'),
      updatedAt: numberOf(stats, 'lastUpdated'),
    };
  }));
  const valid = drivers.filter(d => d.number > 0 && d.name && d.position > 0);
  if (!valid.length) throw new Error('ESPN has not published race positions yet.');
  return {
    eventId: event.id, competitionId: race.id, name: event.name, date: race.date,
    status: status.type?.state ?? 'pre', statusText: status.type?.description ?? 'Awaiting race',
    totalLaps: numberOf(statsOf(totals), 'laps') ?? 0, drivers: valid,
    fetchedAt: Date.now(),
  };
}
