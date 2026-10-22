import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine } from '../src/battle/BattleEngine.js';
import { GameState } from '../src/core/GameState.js';

function state() {
  const s = new GameState();
  s.system.gold = 0;
  s.gain('items', 'potion', 2);
  return s;
}

test('skills spend MP and can damage, heal, add states and buffs', () => {
  const s = state();
  const battle = new BattleEngine({ state: s, rng: () => 0.5 });
  battle.start({
    party: [{ id: 'hero', hp: 40, maxHp: 50, mp: 12, maxMp: 12, atk: 8, def: 4, agi: 10 }],
    enemies: [{ id: 'slime', hp: 30, maxHp: 30, atk: 4, def: 2, agi: 1 }]
  });
  battle.resolveTurn([
    { actorId: 'hero', type: 'skill', targetId: 'slime', skill: { id: 'ember', mpCost: 4, power: 10, addState: { id: 'burn', turns: 2, damagePerTurn: 3 }, buff: { stat: 'atk', amount: 1 } } }
  ]);
  const snap = battle.snapshot();
  assert.equal(snap.party[0].mp, 8);
  assert.ok(snap.enemies[0].hp < 30);
  assert.equal(snap.enemies[0].states[0].id, 'burn');
  assert.equal(snap.enemies[0].buffs.atk, 1);
});

test('insufficient skill resources fail without spending', () => {
  const battle = new BattleEngine({ rng: () => 0.5 });
  battle.start({ party: [{ id: 'hero', hp: 20, mp: 1, maxMp: 10, atk: 5 }], enemies: [{ id: 'enemy', hp: 20 }] });
  const result = battle.resolveTurn([{ actorId: 'hero', type: 'skill', targetId: 'enemy', skill: { id: 'big', mpCost: 5, power: 99 } }]);
  assert.equal(battle.snapshot().party[0].mp, 1);
  assert.equal(battle.snapshot().enemies[0].hp, 20);
  assert.equal(result.log[0].type, 'skill-failed');
});

test('battle items consume inventory and heal allies', () => {
  const s = state();
  const battle = new BattleEngine({ state: s });
  battle.start({ party: [{ id: 'hero', hp: 10, maxHp: 30 }], enemies: [{ id: 'enemy', hp: 20 }] });
  battle.resolveTurn([{ actorId: 'hero', type: 'item', targetId: 'hero', item: { id: 'potion', heal: 15, scope: 'one-ally' } }]);
  assert.equal(battle.snapshot().party[0].hp, 25);
  assert.equal(s.count('items', 'potion'), 1);
});

test('temporary states tick and expire', () => {
  const battle = new BattleEngine({ rng: () => 0.5 });
  battle.start({
    party: [{ id: 'hero', hp: 20, agi: 10 }],
    enemies: [{ id: 'enemy', hp: 20, states: [{ id: 'poison', turns: 1, damagePerTurn: 4 }], agi: 1 }]
  });
  battle.resolveTurn([{ actorId: 'hero', type: 'guard' }, { actorId: 'enemy', type: 'guard' }]);
  const enemy = battle.snapshot().enemies[0];
  assert.equal(enemy.hp, 16);
  assert.equal(enemy.states.length, 0);
});

test('escape can succeed without granting victory rewards', () => {
  const s = state();
  const battle = new BattleEngine({ state: s, rng: () => 0 });
  battle.start({
    party: [{ id: 'hero', hp: 20, agi: 10 }],
    enemies: [{ id: 'enemy', hp: 20 }],
    rewards: { gold: 100 }
  });
  const result = battle.resolveTurn([{ actorId: 'hero', type: 'escape', chance: 0.5 }]);
  assert.equal(result.result, 'escape');
  assert.equal(s.system.gold, 0);
});
