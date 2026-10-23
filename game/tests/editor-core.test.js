import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { normalizePackage, moveEvent, setBlocked, eventSummary } from '../../tools/editor/editor-core.js';

const source = JSON.parse(readFileSync(new URL('../runtime/elyndor-route-one.maps.json', import.meta.url), 'utf8'));

test('editor accepts and clones the real Elyndor runtime package', () => {
  const pkg = normalizePackage(source);
  assert.equal(pkg.maps.length, 3);
  assert.notEqual(pkg, source);
  assert.equal(pkg.maps[0].id, 'elyndor-sunny-plains');
  assert.equal(pkg.maps[0].events.find(e => e.id === 'lio').x, 18);
});

test('event movement clamps to map bounds without touching page commands', () => {
  const pkg = normalizePackage(source);
  const map = pkg.maps.find(m => m.id === 'elyndor-sunny-plains');
  const before = JSON.stringify(map.events.find(e => e.id === 'lio').pages);
  const moved = moveEvent(map, 'lio', 999, -4);
  assert.equal(moved.x, map.width - 1);
  assert.equal(moved.y, 0);
  assert.equal(JSON.stringify(moved.pages), before);
});

test('blocked-cell painter adds, deduplicates and erases cells', () => {
  const pkg = normalizePackage(source);
  const map = pkg.maps.find(m => m.id === 'elyndor-sunny-plains');
  setBlocked(map, 5, 6, true);
  setBlocked(map, 5, 6, true);
  assert.equal(map.blocked.filter(v => v === '5,6').length, 1);
  setBlocked(map, 5, 6, false);
  assert.equal(map.blocked.includes('5,6'), false);
});

test('event summaries expose trigger/condition structure without mutating it', () => {
  const pkg = normalizePackage(source);
  const lio = pkg.maps[0].events.find(e => e.id === 'lio');
  const summary = eventSummary(lio);
  assert.equal(summary.length, 3);
  assert.equal(summary[0].trigger, 'action');
  assert.equal(summary[0].commandCount, 4);
  assert.equal(summary[2].conditions.switchId, 'quest:a-thread-begins:ready');
  summary[2].conditions.switchId = 'changed';
  assert.equal(lio.pages[2].conditions.switchId, 'quest:a-thread-begins:ready');
});
