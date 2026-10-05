import assert from 'node:assert/strict';
import test from 'node:test';
import { valueForRequest } from '../src/utils/scopedRequest.ts';
import { availableLap } from '../src/utils/telemetrySelection.ts';

test('request-scoped data hides previous session results until the matching response arrives', () => {
  const old = { key: 'session-a', value: { svgPath: 'M 0 0 L 1 1' } };
  assert.equal(valueForRequest('session-b', old), null);
  assert.equal(valueForRequest('session-b', null), null);
  assert.equal(valueForRequest('session-a', old), old.value);
});

test('retries and empty successful responses remain distinct from loading', () => {
  const complete = { key: '2026:all:1', value: { meetings: [], sessions: [], error: null } };
  assert.equal(valueForRequest('2026:all:1', complete), complete.value);
  assert.equal(valueForRequest('2026:all:2', complete), null);
});

test('telemetry starts at the latest completed lap then preserves that selection', () => {
  assert.equal(availableLap([1, 2, 3], null), 3);
  assert.equal(availableLap([1, 2, 3, 4], 3), 3);
  assert.equal(availableLap([1, 2, 3, 4], 1), 1);
});

test('telemetry selection recovers safely after seeking backward or changing driver', () => {
  assert.equal(availableLap([1, 2], 4), 2);
  assert.equal(availableLap([], 4), null);
  assert.equal(availableLap([], null), null);
});
