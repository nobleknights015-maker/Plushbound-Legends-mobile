import test from 'node:test';
import assert from 'node:assert/strict';
import { GameFlowBindings } from '../src/scenes/GameFlowBindings.js';

test('title handlers drive front-door navigation', async () => {
  const calls = [];
  const frontDoor = {
    beginNewGame() { calls.push('new'); return { phase: 'creator' }; },
    async continueLatest() { calls.push('continue'); return { phase: 'field', slot: 1 }; }
  };
  const nav = [];
  const bindings = new GameFlowBindings({ frontDoor, onNavigate: event => nav.push(event) });
  const handlers = bindings.handlersFor('title');
  await handlers['new-game']();
  await handlers.continue();
  await handlers.options();
  assert.deepEqual(calls, ['new', 'continue']);
  assert.deepEqual(nav.map(event => event.target), ['creator', 'field', 'options']);
});

test('save and load handlers call SaveManager and navigate correctly', async () => {
  const saves = [];
  const loads = [];
  const nav = [];
  const manager = {
    async save(slot, meta) { saves.push({ slot, meta }); return { slot }; },
    async load(slot) { loads.push(slot); return { slot, state: { ok: true } }; }
  };
  const bindings = new GameFlowBindings({ saves: manager, onNavigate: event => nav.push(event) });
  const saveHandlers = bindings.handlersFor('save', { slots: [{ id: 'slot-1', slot: 1, label: 'Elyndor' }] });
  await saveHandlers['slot-1']();
  const loadHandlers = bindings.handlersFor('load', { slots: [{ id: 'slot-1', slot: 1, valid: true }] });
  await loadHandlers['slot-1']();
  assert.equal(saves[0].slot, 1);
  assert.equal(saves[0].meta.label, 'Elyndor');
  assert.deepEqual(loads, [1]);
  assert.equal(nav.at(-1).target, 'field');
});

test('shop handlers mutate through ShopEngine and report rejection/success', async () => {
  const bought = [];
  const notices = [];
  const shop = {
    buy(index, amount) { bought.push({ index, amount }); return index === 0; },
    close() { bought.push({ closed: true }); }
  };
  const bindings = new GameFlowBindings({ shop, onNotify: event => notices.push(event) });
  const handlers = bindings.handlersFor('shop', { mode: 'buy', rows: [
    { id: 'waybread', shopIndex: 0, amount: 2 },
    { id: 'expensive', shopIndex: 1, amount: 1 }
  ] });
  assert.equal(await handlers.waybread(), true);
  assert.equal(await handlers.expensive(), false);
  assert.deepEqual(bought.slice(0, 2), [{ index: 0, amount: 2 }, { index: 1, amount: 1 }]);
  assert.deepEqual(notices.map(n => n.type), ['shop-transaction-complete', 'shop-transaction-rejected']);
});

test('quest and battle handlers use live state/commands', async () => {
  const notices = [];
  const state = { quests: new Map([['a-thread-begins', { id: 'a-thread-begins', stage: 2 }]]) };
  const bindings = new GameFlowBindings({ state, onNotify: event => notices.push(event) });
  const quests = bindings.handlersFor('quests', { rows: [{ id: 'a-thread-begins' }] });
  const quest = await quests['a-thread-begins']();
  assert.equal(quest.stage, 2);
  let executed = 0;
  const battle = bindings.handlersFor('battle', { commands: [{ id: 'attack', execute: () => ++executed }] });
  assert.equal(await battle.attack(), 1);
  assert.equal(executed, 1);
  assert.equal(notices[0].type, 'quest-selected');
});
