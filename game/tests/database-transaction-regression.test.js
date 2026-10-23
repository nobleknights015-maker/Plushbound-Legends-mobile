import test from 'node:test';
import assert from 'node:assert/strict';

import { replaceRecord } from '../../tools/editor/database-core.js';

test('failed array record replacement rolls back without corrupting package state', () => {
  const pkg = { entries: [
    { id: 'alpha', name: 'Alpha' },
    { id: 'beta', name: 'Beta' }
  ] };
  const before = structuredClone(pkg);
  assert.throws(() => replaceRecord(pkg, 'entries', 1, { id: 'alpha', name: 'Duplicate Alpha' }), /Duplicate/);
  assert.deepEqual(pkg, before);
});

test('failed keyed record replacement rolls back without corrupting package state', () => {
  const pkg = { enemies: {
    sprout: { id: 'sprout', name: 'Sprout' },
    mossling: { id: 'mossling', name: 'Mossling' }
  } };
  const before = structuredClone(pkg);
  assert.throws(() => replaceRecord(pkg, 'enemies', 'mossling', { id: 'sprout', name: 'Duplicate Sprout' }), /Duplicate/);
  assert.deepEqual(pkg, before);
});
