import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/core/GameState.js';
import { EventInterpreter, EventCommandRegistry, registerCoreEventCommands } from '../src/events/EventInterpreter.js';
import { MapRuntime } from '../src/maps/MapRuntime.js';
import { BattleEngine } from '../src/battle/BattleEngine.js';
import { SaveManager, MemorySaveStorage } from '../src/saves/SaveManager.js';
import { ShopEngine } from '../src/shops/ShopEngine.js';

test('vertical slice: new game through save/reload preserves exact progression', async () => {
  const state = new GameState();
  state.actors.set('player', { name: 'Traveler', appearance: { hair: 'brown' } });
  state.party = ['player'];
  state.guardian = { id: 'cinder', name: 'Cinder', affinity: 'ember' };
  state.system.gold = 100;

  const maps = new Map();
  maps.set('1', {
    id: 1, width: 6, height: 6,
    layers: { ground: new Array(36).fill(1) },
    events: [
      { id: 1, x: 2, y: 1, pages: [
        { trigger: 'action', conditions: {}, commands: [{ code: 'SWITCH', parameters: [10, true] }] },
        { trigger: 'action', conditions: { switchId: 10 }, commands: [{ code: 'VARIABLE', parameters: [2, 1] }] }
      ]},
      { id: 2, x: 3, y: 1, pages: [
        { trigger: 'action', conditions: {}, commands: [{ code: 'SELF_SWITCH', parameters: ['A', true] }] },
        { trigger: 'action', conditions: { selfSwitch: 'A' }, commands: [] }
      ]}
    ]
  });
  maps.set('2', { id: 2, width: 4, height: 4, layers: { ground: new Array(16).fill(1) }, events: [] });

  const map = new MapRuntime({ state, maps });
  map.load(1, 1, 1, 2);

  const ui = { message() {}, choice() {} };
  const audio = { playBgm() {}, playBgs() {}, playSe() {} };
  const battleService = { start() {} };
  const registry = registerCoreEventCommands(new EventCommandRegistry(), { ui, audio, map, battle: battleService });
  const runEvent = (event) => {
    const resolved = map.resolveEvent(event);
    const interpreter = new EventInterpreter({ commands: registry, state });
    interpreter.start(resolved.commands || [], { mapId: state.map.id, eventId: event.id });
    interpreter.update(0);
  };

  const npc = map.current.events[0];
  runEvent(npc);
  assert.equal(state.sw(10), true);
  runEvent(npc);
  assert.equal(state.variable(2), 1);

  const chest = map.current.events[1];
  runEvent(chest);
  assert.equal(state.selfSw(1, 2, 'A'), true);

  const shop = new ShopEngine({ state });
  shop.open([{ kind: 'items', id: 5, price: 25 }]);
  assert.equal(shop.buy(0, 2), true);
  assert.equal(state.inventory.items.get('5'), 2);
  assert.equal(state.system.gold, 50);
  shop.close();

  const battle = new BattleEngine({ state, rng: () => 0.5 });
  battle.start({
    party: [{ id: 'player', name: 'Traveler', hp: 30, maxHp: 30, atk: 20, def: 4, agi: 10 }],
    enemies: [{ id: 'frayling', hp: 10, maxHp: 10, atk: 2, def: 0, agi: 1 }],
    rewards: { gold: 15, exp: 20, items: [{ id: 9, amount: 1 }] }
  });
  const result = battle.resolveTurn([{ actorId: 'player', type: 'attack', targetId: 'frayling' }]);
  assert.equal(result.result, 'victory');
  assert.equal(state.system.gold, 65);
  assert.equal(state.inventory.items.get('9'), 1);

  state.quests.set('thread-begins', { stage: 2, status: 'active' });
  map.transfer(2, 2, 3, 4);

  const storage = new MemorySaveStorage();
  const saves = new SaveManager({ storage, gameState: state, clock: () => 123456 });
  await saves.save(1, { label: 'Vertical Slice' });

  const expected = state.serialize();
  const restored = new GameState();
  const reopened = new SaveManager({ storage, gameState: restored, clock: () => 999999 });
  await reopened.initialize();
  const loaded = await reopened.load(1);

  assert.equal(loaded.label, 'Vertical Slice');
  assert.deepEqual(restored.serialize(), expected);
  assert.equal(restored.guardian.id, 'cinder');
  assert.deepEqual(restored.map, { id: 2, x: 2, y: 3, direction: 4, vehicle: null });
  assert.equal(restored.quests.get('thread-begins').stage, 2);
});
