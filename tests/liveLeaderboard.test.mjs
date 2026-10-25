import test from 'node:test';
import assert from 'node:assert/strict';
import { leaderboardState } from '../src/utils/espn.ts';
import { GET } from '../api/live-timing.js';
import { loadLeaderboard } from '../server/espn.js';

const now = Date.parse('2026-10-25T20:10:00Z');
const race = { date: '2026-10-25', season: '2026', raceName: 'United States Grand Prix', Circuit: { circuitName: 'COTA', Location: { locality: 'Austin', country: 'USA' } } };
const feed = { eventId: '123', competitionId: '456', date: '2026-10-25T20:00Z', status: 'in', totalLaps: 56, fetchedAt: now, drivers: [{ number: 16, name: 'Charles Leclerc', team: 'Ferrari', color: 'DC0000', position: 1, grid: 4, laps: 3, updatedAt: now - 1000 }] };

test('backup leaderboard uses real positions and grid without inventing detailed timing', () => {
  const state = leaderboardState(feed, race, now);
  assert.equal(state.source, 'espn');
  assert.equal(state.isLive, true);
  assert.equal(state.positions[0].driver_number, 16);
  assert.equal(state.startingGrid[16], 4);
  assert.equal(state.currentLap, 3);
  assert.equal(state.totalLaps, 56);
  assert.equal(state.session.session_key < 0, true);
  for (const key of ['laps', 'intervals', 'carData', 'pits', 'raceControl', 'locations']) assert.deepEqual(state[key], []);
  assert.deepEqual(state.stints, {});
  assert.equal(state.positionHistory, undefined);
});
test('scheduled, delayed, and finished leaderboards are never marked live', () => {
  assert.equal(leaderboardState({ ...feed, status: 'pre' }, race, now).statusText, 'Starting grid');
  assert.equal(leaderboardState({ ...feed, status: 'pre' }, race, now).isLive, false);
  assert.equal(leaderboardState(feed, race, now + 180000).isStale, true);
  assert.equal(leaderboardState({ ...feed, drivers: feed.drivers.map(d => ({ ...d, updatedAt: null })) }, race, now).isLive, false);
  assert.equal(leaderboardState({ ...feed, status: 'post' }, race, now).isLive, false);
  assert.throws(() => leaderboardState(feed, { ...race, date: '2026-11-01' }, now), /does not match/);
});
test('leaderboard API validates date before contacting its fixed provider', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('must not fetch'); });
  assert.equal((await GET(new Request('https://f1.example/api/live-timing?date=bad'))).status, 400);
});
test('discovery ignores practice and refuses a different Grand Prix date', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ events: [{ id: '1', competitions: [{ id: '2', date: '2026-10-24T20:00Z', type: { abbreviation: 'Race' } }, { id: '3', date: '2026-10-25T20:00Z', type: { abbreviation: 'FP1' } }] }] }));
  await assert.rejects(loadLeaderboard('2026-10-25'), /No ESPN Grand Prix/);
});
