import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/core/GameState.js';
import { SaveManager, MemorySaveStorage } from '../src/saves/SaveManager.js';

test('manual save restores exact gameplay state after simulated app restart', async () => {
  const storage = new MemorySaveStorage();
  const first = new GameState();
  first.setSw(10, true);
  first.setVariable(3, 99);
  first.setSelfSw(4, 8, 'B', true);
  first.gain('items', 7, 4);
  first.party = ['hero', 'guardian-cinder'];
  first.guardian = { id: 'cinder', bond: 12 };
  first.quests.set('thread-begins', { stage: 2, complete: false });
  first.map = { id: 6, x: 14, y: 9, direction: 8, vehicle: null };
  const savesA = new SaveManager({ storage, gameState: first, clock: () => 12345 });
  await savesA.initialize();
  await savesA.save(1, { label: 'Elyndor' });

  const second = new GameState();
  const savesB = new SaveManager({ storage, gameState: second, clock: () => 99999 });
  await savesB.initialize();
  const loaded = await savesB.load(1);

  assert.equal(loaded.label, 'Elyndor');
  assert.equal(second.sw(10), true);
  assert.equal(second.variable(3), 99);
  assert.equal(second.selfSw(4, 8, 'B'), true);
  assert.equal(second.inventory.items.get('7'), 4);
  assert.deepEqual(second.party, ['hero', 'guardian-cinder']);
  assert.deepEqual(second.guardian, { id: 'cinder', bond: 12 });
  assert.deepEqual(second.quests.get('thread-begins'), { stage: 2, complete: false });
  assert.deepEqual(second.map, { id: 6, x: 14, y: 9, direction: 8, vehicle: null });
});

test('autosave survives restart and can be discovered as newest save', async () => {
  const storage = new MemorySaveStorage();
  const state = new GameState();
  const saves = new SaveManager({ storage, gameState: state, clock: () => 5000 });
  state.map = { id: 2, x: 5, y: 6, direction: 2, vehicle: null };
  await saves.autosave({ label: 'Waystitch' });
  assert.equal(await saves.exists('auto'), true);
  const slots = await saves.listSlots();
  assert.equal(slots[0].slot, 'auto');
  assert.equal(slots[0].label, 'Waystitch');
});

test('deleting a save removes it cleanly', async () => {
  const state = new GameState();
  const storage = new MemorySaveStorage();
  const saves = new SaveManager({ storage, gameState: state });
  await saves.save(2);
  assert.equal(await saves.exists(2), true);
  await saves.delete(2);
  assert.equal(await saves.exists(2), false);
  assert.equal(await saves.load(2), null);
});

test('corrupt and incompatible saves fail safely instead of damaging state', async () => {
  const state = new GameState();
  state.setVariable(1, 77);
  const storage = new MemorySaveStorage({
    'plushbound:v1:slot:1': '{broken-json',
    'plushbound:v1:slot:2': JSON.stringify({ schemaVersion: 999, state: { variables: { 1: 1 } } })
  });
  const saves = new SaveManager({ storage, gameState: state });
  await assert.rejects(() => saves.load(1), /corrupted/);
  assert.equal(state.variable(1), 77);
  await assert.rejects(() => saves.load(2), /Unsupported save schema/);
  assert.equal(state.variable(1), 77);
});
