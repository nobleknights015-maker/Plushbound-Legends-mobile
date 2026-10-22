import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/core/GameState.js';
import { BattleEngine } from '../src/battle/BattleEngine.js';

test('battle resolves deterministic turn order by agility', () => {
  const battle = new BattleEngine({ rng: () => 0.5 });
  battle.start({
    party: [{ id: 'hero', hp: 20, atk: 8, def: 2, agi: 5 }],
    enemies: [{ id: 'slime', hp: 12, atk: 4, def: 1, agi: 2 }]
  });
  const result = battle.resolveTurn([
    { actorId: 'slime', type: 'attack', targetId: 'hero' },
    { actorId: 'hero', type: 'attack', targetId: 'slime' }
  ]);
  assert.equal(result.log[0].actorId, 'hero');
  assert.equal(result.log[1].actorId, 'slime');
});

test('guard reduces incoming damage', () => {
  const battle = new BattleEngine({ rng: () => 0.5 });
  battle.start({
    party: [{ id: 'hero', hp: 20, atk: 5, def: 0, agi: 10 }],
    enemies: [{ id: 'wolf', hp: 20, atk: 10, def: 0, agi: 5 }]
  });
  const result = battle.resolveTurn([
    { actorId: 'hero', type: 'guard' },
    { actorId: 'wolf', type: 'attack', targetId: 'hero' }
  ]);
  const hit = result.log.find(x => x.type === 'damage');
  assert.equal(hit.damage, 5);
  assert.equal(battle.party[0].hp, 15);
});

test('victory grants rewards exactly once', () => {
  const state = new GameState();
  const battle = new BattleEngine({ state, rng: () => 0.5 });
  battle.start({
    party: [{ id: 'hero', hp: 20, atk: 20, def: 2, agi: 5 }],
    enemies: [{ id: 'slime', hp: 5, atk: 1, def: 0, agi: 1 }],
    rewards: { gold: 12, exp: 30, items: [{ kind: 'items', id: 3, amount: 2 }] }
  });
  const result = battle.resolveTurn([{ actorId: 'hero', type: 'attack', targetId: 'slime' }]);
  assert.equal(result.result, 'victory');
  assert.equal(state.system.gold, 12);
  assert.equal(state.system.exp, 30);
  assert.equal(state.inventory.items.get('3'), 2);
  assert.throws(() => battle.resolveTurn([]), /No active battle/);
  assert.equal(state.system.gold, 12);
});

test('defeat does not grant victory rewards', () => {
  const state = new GameState();
  const battle = new BattleEngine({ state, rng: () => 0.5 });
  battle.start({
    party: [{ id: 'hero', hp: 3, atk: 1, def: 0, agi: 1 }],
    enemies: [{ id: 'ogre', hp: 20, atk: 10, def: 0, agi: 5 }],
    rewards: { gold: 99, exp: 99 }
  });
  const result = battle.resolveTurn([{ actorId: 'ogre', type: 'attack', targetId: 'hero' }]);
  assert.equal(result.result, 'defeat');
  assert.equal(state.system.gold || 0, 0);
  assert.equal(state.system.exp || 0, 0);
});

test('snapshot is detached from live combat state', () => {
  const battle = new BattleEngine();
  battle.start({ party: [{ id: 'hero', hp: 10, atk: 2 }], enemies: [{ id: 'slime', hp: 10, atk: 1 }] });
  const snap = battle.snapshot();
  snap.party[0].hp = 0;
  assert.equal(battle.party[0].hp, 10);
});
