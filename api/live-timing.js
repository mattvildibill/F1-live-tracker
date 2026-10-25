import { loadLeaderboard } from '../server/espn.js';

export async function GET(request) {
  const date = new URL(request.url).searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) {
    return Response.json({ error: 'A valid race date is required.' }, { status: 400 });
  }
  try {
    const data = await loadLeaderboard(date, request.signal);
    return Response.json(data, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=15, stale-while-revalidate=15' } });
  } catch (error) {
    console.error('Live leaderboard:', error instanceof Error ? error.message : 'Provider failure');
    return Response.json({ error: error instanceof Error ? error.message : 'Leaderboard unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
