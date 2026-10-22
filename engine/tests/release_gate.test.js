import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/core/GameState.js';
import { MemorySaveStorage, SaveManager } from '../src/saves/SaveManager.js';
import { FrontDoorFlow } from '../src/scenes/FrontDoorFlow.js';
import { CutsceneController } from '../src/scenes/CutsceneController.js';

test('older save schemas migrate sequentially and remain eligible for Continue', async () => {
  const legacyState = new GameState();
  legacyState.system.gold = 25;
  legacyState.actors.set('player', { id: 'player', name: 'Legacy Traveler' });
  legacyState.party = ['player'];

  const storage = new MemorySaveStorage({
    'plushbound:v1:slot:1': JSON.stringify({
      schemaVersion: 1,
      savedAt: 100,
      slot: 1,
      label: 'Legacy',
      state: legacyState.serialize()
    })
  });

  const restored = new GameState();
  const saves = new SaveManager({
    storage,
    gameState: restored,
    schemaVersion: 2,
    migrations: {
      1: payload => {
        payload.state.system.gold = Number(payload.state.system.gold || 0) + 5;
        payload.state.variables = { ...(payload.state.variables || {}), migrated: true };
        return payload;
      }
    }
  });

  const slots = await saves.listSlots();
  assert.equal(slots[0].valid, true);
  assert.equal(slots[0].migratable, true);
  assert.equal(slots[0].schemaVersion, 1);

  const payload = await saves.load(1);
  assert.equal(payload.schemaVersion, 2);
  assert.equal(payload.migratedFrom, 1);
  assert.equal(restored.system.gold, 30);
  assert.equal(restored.variable('migrated'), true);
});

test('missing migration path keeps incompatible saves out of Continue', async () => {
  const state = new GameState();
  const storage = new MemorySaveStorage({
    'plushbound:v1:slot:1': JSON.stringify({ schemaVersion: 1, savedAt: 100, slot: 1, state: state.serialize() })
  });
  const saves = new SaveManager({ storage, gameState: state, schemaVersion: 3, migrations: { 1: payload => payload } });
  const slots = await saves.listSlots();
  assert.equal(slots[0].valid, false);
  await assert.rejects(() => saves.load(1), /Unsupported save schema 1/);
});

test('return to title discards live runtime state but preserves Continue from storage', async () => {
  const storage = new MemorySaveStorage();
  const state = new GameState();
  const saves = new SaveManager({ storage, gameState: state });
  const front = new FrontDoorFlow({ state, saves });

  front.beginNewGame();
  front.setTraveler({ name: 'Traveler' });
  front.chooseGuardian('cinder');
  front.startOpening();
  state.system.gold = 77;
  await saves.save(1, { label: 'Before Title' });

  const result = front.returnToTitle();
  assert.equal(result.phase, 'title');
  assert.equal(front.phase, 'title');
  assert.equal(state.party.length, 0);
  assert.equal(state.guardian, null);
  assert.equal(state.system.gold ?? 0, 0);

  const title = await front.titleState();
  assert.equal(title.canContinue, true);
  await front.continueLatest();
  assert.equal(state.system.gold, 77);
  assert.equal(state.guardian.id, 'cinder');
});

test('opening cutscene locks input, honors waits, and restores control on normal completion', () => {
  const locks = [];
  const events = [];
  const controller = new CutsceneController({ input: { setLocked: value => locks.push(value) } });

  controller.start([
    { run: () => events.push('fade-in'), waitMs: 300 },
    { run: () => events.push('guardian-turn'), waitMs: 200 },
    { run: () => events.push('field-control') }
  ], { context: { onComplete: result => events.push(result.skipped ? 'skipped' : 'complete') } });

  assert.deepEqual(events, ['fade-in']);
  assert.deepEqual(locks, [true]);
  controller.update(299);
  assert.deepEqual(events, ['fade-in']);
  controller.update(1);
  assert.deepEqual(events, ['fade-in', 'guardian-turn']);
  controller.update(200);
  assert.deepEqual(events, ['fade-in', 'guardian-turn', 'field-control', 'complete']);
  assert.deepEqual(locks, [true, false]);
  assert.equal(controller.snapshot().running, false);
});

test('skipping a cutscene restores player control exactly once', () => {
  const locks = [];
  const events = [];
  const controller = new CutsceneController({ input: { setLocked: value => locks.push(value) } });

  controller.start([
    { run: () => events.push('opening'), waitMs: 1000 },
    { run: () => events.push('should-not-run') }
  ], {
    skippable: true,
    context: {
      onSkip: () => events.push('skip-cleanup'),
      onComplete: ({ skipped }) => events.push(skipped ? 'complete-skipped' : 'complete')
    }
  });

  assert.equal(controller.skip(), true);
  assert.equal(controller.skip(), false);
  assert.deepEqual(events, ['opening', 'skip-cleanup', 'complete-skipped']);
  assert.deepEqual(locks, [true, false]);
  assert.equal(controller.snapshot().completed, true);
});
