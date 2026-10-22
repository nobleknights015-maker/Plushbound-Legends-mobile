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

test('failed migrations leave live state and raw stored save untouched', async () => {
  const live = new GameState();
  live.system.gold = 91;
  const legacy = new GameState();
  legacy.system.gold = 10;
  const raw = JSON.stringify({ schemaVersion: 1, savedAt: 123, slot: 1, state: legacy.serialize() });
  const storage = new MemorySaveStorage({ 'plushbound:v1:slot:1': raw });
  const saves = new SaveManager({
    storage,
    gameState: live,
    schemaVersion: 2,
    migrations: { 1: () => { throw new Error('migration exploded'); } }
  });

  const before = live.serialize();
  await assert.rejects(() => saves.load(1), /migration exploded/);
  assert.deepEqual(live.serialize(), before);
  assert.equal(await storage.get('plushbound:v1:slot:1'), raw);
});

test('successful migration does not rewrite the raw stored legacy payload', async () => {
  const legacy = new GameState();
  legacy.system.gold = 5;
  const raw = JSON.stringify({ schemaVersion: 1, savedAt: 100, slot: 1, state: legacy.serialize() });
  const storage = new MemorySaveStorage({ 'plushbound:v1:slot:1': raw });
  const live = new GameState();
  const saves = new SaveManager({
    storage,
    gameState: live,
    schemaVersion: 2,
    migrations: { 1: payload => { payload.state.system.gold = 6; return payload; } }
  });

  await saves.load(1);
  assert.equal(live.system.gold, 6);
  assert.equal(await storage.get('plushbound:v1:slot:1'), raw);
});

test('future save schemas remain invalid and cannot mutate live state', async () => {
  const live = new GameState();
  live.system.gold = 44;
  const future = new GameState();
  future.system.gold = 999;
  const storage = new MemorySaveStorage({
    'plushbound:v1:slot:1': JSON.stringify({ schemaVersion: 99, savedAt: 100, slot: 1, state: future.serialize() })
  });
  const saves = new SaveManager({ storage, gameState: live, schemaVersion: 2 });
  assert.equal((await saves.listSlots())[0].valid, false);
  await assert.rejects(() => saves.load(1), /Unsupported save schema 99/);
  assert.equal(live.system.gold, 44);
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

test('exactly one safety-window of zero-wait cutscene steps completes normally', () => {
  let count = 0;
  const locks = [];
  const controller = new CutsceneController({ input: { setLocked: value => locks.push(value) }, logger: { error() {} } });
  controller.start(Array.from({ length: 100 }, () => ({ run: () => { count += 1; } })));
  assert.equal(count, 100);
  assert.equal(controller.snapshot().completed, true);
  assert.deepEqual(locks, [true, false]);
});

test('more than one safety-window of zero-wait steps is rejected as runaway', () => {
  const controller = new CutsceneController({ input: { setLocked() {} }, logger: { error() {} } });
  assert.throws(() => controller.start(Array.from({ length: 101 }, () => ({ run() {} }))), /Cutscene runaway detected/);
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
