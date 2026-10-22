import test from 'node:test';
import assert from 'node:assert/strict';
import { DataRegistry } from '../src/data/DataRegistry.js';

test('database registry stores stable string ids across core JRPG tables', () => {
  const db = new DataRegistry();
  db.load('skills', [{ id: 1, name: 'Thread Spark', mpCost: 3 }]);
  db.load('states', [{ id: 2, name: 'Burn', turns: 3 }]);
  db.load('actors', [{ id: 10, name: 'Traveler', skills: [1], states: [2] }]);
  db.load('enemies', [{ id: 20, name: 'Frayling' }]);
  db.load('troops', [{ id: 30, members: [{ enemyId: 20, x: 4, y: 2 }] }]);

  assert.equal(db.get('skills', 1).id, '1');
  assert.equal(db.get('actors', '10').name, 'Traveler');
  assert.equal(db.require('troops', 30).members[0].enemyId, 20);
  assert.deepEqual(db.validateReferences(), []);
});

test('database registry detects duplicate and missing references', () => {
  const db = new DataRegistry();
  assert.throws(() => db.load('items', [{ id: 1 }, { id: '1' }]), /Duplicate items id/);

  db.load('skills', [{ id: 4, addStates: [99], consumeItemId: 7 }]);
  db.load('actors', [{ id: 1, skills: [4, 5], states: [8] }]);
  db.load('enemies', []);
  db.load('troops', [{ id: 2, members: [{ enemyId: 9 }] }]);
  db.load('states', []);
  db.load('items', []);

  const errors = db.validateReferences();
  assert.ok(errors.includes('Actor 1 missing skill 5'));
  assert.ok(errors.includes('Actor 1 missing state 8'));
  assert.ok(errors.includes('Troop 2 missing enemy 9'));
  assert.ok(errors.includes('Skill 4 missing item 7'));
  assert.ok(errors.includes('Skill 4 missing state 99'));
});

test('schemas validate content before it enters live data', () => {
  const db = new DataRegistry();
  db.registerSchema('items', record => record.name ? true : 'Item requires a name');
  assert.throws(() => db.upsert('items', { id: 1 }), /Item requires a name/);
  const potion = db.upsert('items', { id: 1, name: 'Stitch Tonic', price: 25 });
  assert.equal(potion.name, 'Stitch Tonic');
});

test('snapshots are detached from live registry records', () => {
  const db = new DataRegistry();
  db.load('weapons', [{ id: 'needleblade', name: 'Needleblade', params: { atk: 4 } }]);
  const snapshot = db.snapshot();
  snapshot.weapons[0].params.atk = 999;
  assert.equal(db.get('weapons', 'needleblade').params.atk, 4);
});
