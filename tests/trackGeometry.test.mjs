import assert from 'node:assert/strict';
import test from 'node:test';
import { createTrackGeometry } from '../src/utils/trackGeometry.ts';

test('polyline sampling follows segment lengths, including the closing edge', () => {
  const geometry = createTrackGeometry('M 0 0 L 3 0 L 3 4 Z');
  assert.ok(geometry);
  assert.equal(geometry.totalLength, 12);
  assert.deepEqual(geometry.pointAtLength(0), { x: 0, y: 0 });
  assert.deepEqual(geometry.pointAtLength(1.5), { x: 1.5, y: 0 });
  assert.deepEqual(geometry.pointAtLength(3), { x: 3, y: 0 });
  assert.deepEqual(geometry.pointAtLength(5), { x: 3, y: 2 });
  assert.deepEqual(geometry.pointAtLength(9.5), { x: 1.5, y: 2 });
  assert.deepEqual(geometry.pointAtLength(12), { x: 0, y: 0 });
});

test('open paths clamp at their endpoints instead of wrapping', () => {
  const geometry = createTrackGeometry('M 2 3 L 5 7');
  assert.equal(geometry.totalLength, 5);
  assert.deepEqual(geometry.pointAtLength(-1), { x: 2, y: 3 });
  assert.deepEqual(geometry.pointAtLength(6), { x: 5, y: 7 });
});

test('duplicate GPS coordinates do not produce zero-length interpolation', () => {
  const geometry = createTrackGeometry('M 0 0 L 0 0 L 3 0 L 3 0 L 3 4 L 3 4 Z');
  assert.equal(geometry.totalLength, 12);
  assert.deepEqual(geometry.pointAtLength(3), { x: 3, y: 0 });
  assert.deepEqual(geometry.pointAtLength(7), { x: 3, y: 4 });
});

test('a different outline with the same length has independent geometry immediately', () => {
  const first = createTrackGeometry('M 0 0 L 10 0');
  const next = createTrackGeometry('M 0 0 L 0 10');
  assert.equal(first.totalLength, next.totalLength);
  assert.deepEqual(first.pointAtLength(5), { x: 5, y: 0 });
  assert.deepEqual(next.pointAtLength(5), { x: 0, y: 5 });
});

test('negative, decimal and exponent coordinates are preserved', () => {
  const geometry = createTrackGeometry('M-1e1,-.5 L+2,-.5');
  assert.equal(geometry.totalLength, 12);
  assert.deepEqual(geometry.pointAtLength(6), { x: -4, y: -0.5 });
});

test('empty, malformed, unsupported and degenerate paths have no geometry', () => {
  for (const path of [
    '', 'M 0 0', 'M 0 0 L 0 0 Z', 'M 0 0 L 4',
    'M 0 0 L Infinity 2', 'M 0 0 L 1e400 2', 'M 0 0 Q 1 1 2 2',
    'M 0 0 L 2 2 ? Z', 'M 0 0 Z L 2 2', 'M 0 0 M 2 2',
  ]) assert.equal(createTrackGeometry(path), null, path);
});

test('sampling a long outline locates every segment boundary', () => {
  const geometry = createTrackGeometry('M 0 0 ' + Array.from({ length: 800 }, (_, i) => `L ${i + 1} 0`).join(' '));
  assert.equal(geometry.totalLength, 800);
  for (let distance = 0; distance <= 800; distance += 0.5) {
    assert.deepEqual(geometry.pointAtLength(distance), { x: distance, y: 0 });
  }
});
