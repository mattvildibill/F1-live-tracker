import test from 'node:test';
import assert from 'node:assert/strict';
import { parseViewState, viewURL } from '../src/utils/viewState.ts';
import { elapsedLapPercent } from '../src/utils/telemetryCoordinate.ts';
import { EMPTY_STATE, json, providerError } from '../src/utils/data.ts';
import { latestRows, loadTimingSnapshot } from '../src/utils/timingSnapshot.ts';
import { createDemoLapSelector } from '../src/utils/demoLapData.ts';
import { sectorsOf } from '../src/utils/sectorData.ts';

const session = { session_key: 44, date_start: '2026-10-19T10:00:00Z', date_end: '2026-10-19T14:00:00Z' };
const now = Date.parse('2026-10-19T12:00:00Z');
const drivers = [{ driver_number: 4, name_acronym: 'NOR' }];
const positions = [{ driver_number: 4, position: 1, date: new Date(now).toISOString() }];
const laps = [{ driver_number: 4, lap_number: 3, lap_duration: 91 }];
function core(path) {
  if (path.startsWith('/drivers?')) return drivers;
  if (path.startsWith('/position?')) return positions;
  if (path.startsWith('/laps?')) return laps;
  return [];
}

test('launch links validate mode, panel, time and recorded race identity', () => {
  assert.deepEqual(parseViewState('?mode=demo&panel=tower&time=120', 5000, 2026), { mode: 'demo', panel: 'tower', time: 120, year: 2026, round: '', session: null });
  assert.equal(parseViewState('?mode=replay&panel=telemetry&year=2021&round=3', 5000, 2026).panel, 'tower');
  assert.equal(parseViewState('?mode=replay&panel=map&year=2021&round=3', 5000, 2026).year, 2021);
  assert.equal(parseViewState('?mode=oops&panel=unknown&time=NaN&year=2099&round=../../1', 5000, 2026).panel, 'weekend');
  assert.equal(parseViewState('?mode=demo&time=Infinity', 5000, 2026).time, 120);
  assert.equal(parseViewState('?mode=demo&time=-20', 5000, 2026).time, 0);
  assert.equal(parseViewState('?mode=demo&time=999999', 5000, 2026).time, 5000);
});

test('share links round-trip paused view state without stale mode parameters', () => {
  const view = { mode: 'demo', panel: 'map', time: 124.8, year: 2021, round: '3', session: null };
  const url = viewURL('https://f1.example/?embed=1&mode=replay&year=2020&round=9', view);
  assert.equal(url.searchParams.get('embed'), '1');
  assert.equal(url.searchParams.get('year'), null);
  assert.equal(url.searchParams.get('round'), null);
  assert.equal(parseViewState(url.search, 5000, 2026).time, 125);
  const replay = viewURL(url.href, { ...view, mode: 'replay' });
  assert.equal(replay.searchParams.get('time'), null);
  assert.equal(replay.searchParams.get('year'), '2021');
  assert.equal(replay.searchParams.get('round'), '3');
});

test('sharing a browsed OpenF1 session preserves it without leaking it into other modes', () => {
  const view = parseViewState('?mode=live&panel=tower&session=9472', 5000, 2026);
  assert.equal(view.session, 9472);
  const link = viewURL('https://f1.example/', view);
  assert.equal(parseViewState(link.search, 5000, 2026).session, 9472);
  assert.equal(viewURL(link.href, { ...view, mode: 'demo' }).searchParams.has('session'), false);
  for (const value of ['-1', '0', '1e4', '../9472', '9007199254740992']) assert.equal(parseViewState(`?mode=live&session=${value}`, 5000, 2026).session, null);
});

test('provider errors identify the failed service and preserve cancellation', async t => {
  assert.match(providerError('/openf1/v1/sessions', 403), /OpenF1 requires authenticated/);
  assert.doesNotMatch(providerError('https://api.jolpi.ca/ergast/f1/2026/races/', 403), /OpenF1|authenticated/);
  assert.match(providerError('https://api.open-meteo.com/v1/forecast', 429), /Open-Meteo weather/);
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(json('https://api.jolpi.ca/ergast/f1/current/'), /Jolpica race data could not be reached/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(json('/openf1/v1/sessions', controller.signal), /Failed to fetch/);
});

test('live telemetry uses elapsed lap percentage rather than a fixed circuit length', () => {
  const start = '2026-10-19T12:00:00Z';
  assert.equal(elapsedLapPercent('2026-10-19T12:00:45Z', start, 90), 50);
  assert.equal(elapsedLapPercent('2026-10-19T12:01:30Z', start, 90), 100);
  assert.equal(elapsedLapPercent('2026-10-19T11:59:59Z', start, 90), 0);
  assert.equal(elapsedLapPercent('not-a-date', start, 90), 0);
  assert.equal(elapsedLapPercent('2026-10-19T12:00:45Z', start, 0), 0);
});

test('a real session sharing the demo numeric ID cannot receive synthetic sectors', () => {
  const lap = { session_key: 9500, driver_number: 4, lap_number: 1, lap_duration: 90, duration_sector_1: null, duration_sector_2: null, duration_sector_3: null };
  assert.equal(sectorsOf(lap), null);
  assert.equal(sectorsOf(lap, false), null);
  const synthetic = sectorsOf(lap, true);
  assert.ok(Math.abs(synthetic.reduce((sum, value) => sum + value, 0) - 90) < 1e-9);
  assert.deepEqual(sectorsOf({ ...lap, duration_sector_1: 28, duration_sector_2: 31, duration_sector_3: 31 }), [28, 31, 31]);
});

test('core timing publishes before a slow optional feed; unused feeds are not requested', async () => {
  const optional = Promise.withResolvers(); const published = []; const calls = [];
  const client = async path => { calls.push(path); return path.startsWith('/intervals?') ? optional.promise : core(path); };
  const task = loadTimingSnapshot({ ...EMPTY_STATE }, session, 'Session window', 'tower', client, new AbortController().signal, value => published.push(value), now);
  await new Promise(setImmediate);
  assert.equal(published.length, 1);
  assert.deepEqual(published[0].positions, positions);
  assert.equal(published[0].currentLap, 3);
  assert.equal(published[0].isLive, true);
  assert.ok(published[0].loadingFeeds.includes('Gaps'));
  optional.resolve([]);
  const final = await task;
  assert.deepEqual(final.loadingFeeds, []);
  assert.equal(calls.some(path => path.startsWith('/team_radio?') || path.startsWith('/weather?')), false);
});

test('cancelled optional work cannot publish over a new session or enqueue more feeds', async () => {
  const optional = Promise.withResolvers(); const controller = new AbortController(); const published = []; const calls = [];
  const client = async path => { calls.push(path); return path.startsWith('/intervals?') ? optional.promise : core(path); };
  const task = loadTimingSnapshot({ ...EMPTY_STATE }, session, 'Session window', 'tower', client, controller.signal, value => published.push(value), now);
  await new Promise(setImmediate);
  controller.abort(); optional.resolve([]);
  await assert.rejects(task, { name: 'AbortError' });
  assert.equal(published.length, 1);
  assert.equal(calls.some(path => path.startsWith('/race_control?')), false);
});

test('failed optional feeds retain previous values without hiding valid timing', async () => {
  const previous = { ...EMPTY_STATE, intervals: [{ driver_number: 4, gap_to_leader: 0, date: 'old' }] };
  const client = async path => { if (path.startsWith('/intervals?')) throw new Error('rate limit'); return core(path); };
  const final = await loadTimingSnapshot(previous, session, 'Session window', 'tower', client, new AbortController().signal, () => {}, now);
  assert.deepEqual(final.intervals, previous.intervals);
  assert.deepEqual(final.positions, positions);
  assert.equal(final.isLive, true);
  assert.match(final.error, /Gaps unavailable/);
});

test('latest classification discards earlier records independently for each driver', () => {
  assert.deepEqual(latestRows([{ driver_number: 4, date: '2026-10-19T12:01Z', position: 2 }, { driver_number: 4, date: '2026-10-19T12:00Z', position: 1 }]).map(row => row.position), [2]);
});

test('demo animation reuses lap snapshots and seeking back cannot expose future laps', () => {
  const sourceLaps = [{ lap_number: 1 }, { lap_number: 2 }];
  const sourcePits = [{ lap_number: 1 }];
  const sourceControl = [{ lap_number: 1 }, { lap_number: 3 }];
  const select = createDemoLapSelector(sourceLaps, sourcePits, sourceControl, () => ({}));
  const first = select(1);
  assert.equal(select(1), first);
  assert.deepEqual(first.laps, [{ lap_number: 1 }]);
  assert.deepEqual(first.pits, []);
  assert.equal(select(2).pits.length, 1);
  assert.equal(select(1), first);
  assert.equal(sourceLaps.length, 2);
});
