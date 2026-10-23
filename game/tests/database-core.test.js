import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { collectionDescriptors, collectionRecords, validateCollection, validatePackageCollections, replaceRecord, addRecord, removeRecord } from '../../tools/editor/database-core.js';

const guardians = JSON.parse(readFileSync(new URL('../content/guardians.json', import.meta.url), 'utf8'));

test('database discovers editable object-record collections without changing package metadata', () => {
  const descriptors = collectionDescriptors(guardians);
  assert.deepEqual(descriptors.map(entry => entry.key), ['starters']);
  assert.equal(descriptors[0].kind, 'array');
  assert.equal(descriptors[0].count, 4);
  assert.equal(guardians.schemaVersion, 1);
});

test('database edits array registries while preserving surrounding records', () => {
  const pkg = structuredClone(guardians);
  const before = JSON.stringify(pkg.starters[1]);
  const first = collectionRecords(pkg, 'starters')[0];
  replaceRecord(pkg, 'starters', first.locator, { ...first.record, role: 'Burst Striker' });
  assert.equal(pkg.starters[0].role, 'Burst Striker');
  assert.equal(JSON.stringify(pkg.starters[1]), before);
  assert.deepEqual(validateCollection(pkg, 'starters'), []);
});

test('database supports keyed registries without converting their native shape', () => {
  const pkg = { enemies: { sprout: { id: 'sprout', name: 'Sprout' } } };
  assert.equal(collectionDescriptors(pkg)[0].kind, 'keyed');
  addRecord(pkg, 'enemies', { id: 'mossling', name: 'Mossling' });
  assert.equal(Array.isArray(pkg.enemies), false);
  assert.equal(pkg.enemies.mossling.name, 'Mossling');
  replaceRecord(pkg, 'enemies', 'sprout', { id: 'sprout', name: 'Bright Sprout' });
  assert.equal(pkg.enemies.sprout.name, 'Bright Sprout');
  assert.equal(removeRecord(pkg, 'enemies', 'mossling').id, 'mossling');
});

test('database rejects duplicate ids before export', () => {
  const pkg = structuredClone(guardians);
  assert.throws(() => addRecord(pkg, 'starters', { id: 'cinder', name: 'Duplicate' }), /Duplicate/);
  pkg.starters[1].id = 'cinder';
  assert.ok(validateCollection(pkg, 'starters').some(issue => issue.code === 'duplicate-id'));
});

test('package validation catches errors outside the currently selected collection', () => {
  const pkg = {
    guardians: [{ id: 'cinder', name: 'Cinder' }],
    enemies: [{ id: 'sprout', name: 'Sprout' }, { id: 'sprout', name: 'Duplicate Sprout' }]
  };
  assert.deepEqual(validateCollection(pkg, 'guardians'), []);
  const issues = validatePackageCollections(pkg);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].collectionKey, 'enemies');
  assert.equal(issues[0].collectionLabel, 'Enemies');
  assert.equal(issues[0].code, 'duplicate-id');
});
