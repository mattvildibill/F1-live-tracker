import assert from 'node:assert/strict';
import test from 'node:test';
import { panelsForMode, primaryPanelIds } from '../src/utils/panels.ts';

test('compact navigation preserves every live and demo panel', () => {
  for (const mode of ['live', 'demo']) {
    const panels = panelsForMode(mode);
    assert.equal(panels.length, 13);
    assert.equal(new Set(panels.map(([id]) => id)).size, 13);
    assert.equal(panels.filter(([id]) => primaryPanelIds.has(id)).length, 5);
    assert.equal(panels.filter(([id]) => !primaryPanelIds.has(id)).length, 8);
  }
});

test('recorded replay exposes only supported analysis with honest map labeling', () => {
  const panels = panelsForMode('replay');
  assert.equal(panels.length, 8);
  assert.equal(panels.find(([id]) => id === 'map')[1], 'Position history');
  assert.deepEqual(panels.filter(([id]) => !primaryPanelIds.has(id)).map(([id]) => id), ['pits', 'h2h', 'gaps']);
  for (const id of ['sectors', 'telemetry', 'ers', 'tyres', 'radio']) assert.ok(!panels.some(([panel]) => panel === id));
});
