import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { GameState } from '../../engine/src/core/GameState.js';
import { GameContentRuntime } from '../runtime/GameContentRuntime.js';

const read = name => JSON.parse(readFileSync(new URL(`../content/${name}`, import.meta.url), 'utf8'));
const opening = read('opening-elyndor.json');
const route = read('elyndor-route-one.json');

function setup() {
  const state = new GameState();
  const game = new GameContentRuntime({ state, contentPackages: [opening, route] });
  return { state, game };
}

function completeFirstQuest(game) {
  game.startQuest('a-thread-begins');
  game.recordBattle(['frayling', 'elyndor']);
  game.completeQuest('a-thread-begins');
}

function completeSecondQuest(game) {
  game.startQuest('threads-out-of-tune');
  game.progressObjective('threads-out-of-tune', 'inspect-west-anchor', 1);
  game.progressObjective('threads-out-of-tune', 'inspect-east-anchor', 1);
  game.recordBattle(['crossing-frayling']);
  game.recordBattle(['crossing-frayling']);
  game.recordBattle(['crossing-frayling']);
  game.completeQuest('threads-out-of-tune');
}

test('A Thread Begins progresses from first meeting through battle to turn-in rewards', () => {
  const { state, game } = setup();
  const started = game.startQuest('a-thread-begins');
  assert.equal(started.status, 'active');
  assert.equal(started.objectives['speak-to-lio'], 1);
  assert.equal(state.sw('quest:a-thread-begins:active'), true);

  game.recordBattle(['frayling', 'elyndor']);
  const ready = game.questState('a-thread-begins');
  assert.equal(ready.objectives['defeat-first-frayling'], 1);
  assert.equal(ready.status, 'ready');
  assert.equal(state.sw('quest:a-thread-begins:ready'), true);

  const complete = game.completeQuest('a-thread-begins');
  assert.equal(complete.status, 'complete');
  assert.equal(complete.objectives['return-to-lio'], 1);
  assert.equal(state.variable('gold'), 100);
  assert.equal(state.count('items', 'threadmend-tonic'), 1);
  assert.equal(state.sw('quest:a-thread-begins:complete'), true);
});

test('Threads Out of Tune cannot start before A Thread Begins is complete', () => {
  const { game } = setup();
  assert.throws(() => game.startQuest('threads-out-of-tune'), /prerequisite not met/);
  completeFirstQuest(game);
  assert.equal(game.startQuest('threads-out-of-tune').status, 'active');
});

test('Threads Out of Tune requires both anchors and three crossing battles', () => {
  const { state, game } = setup();
  completeFirstQuest(game);
  game.startQuest('threads-out-of-tune');
  game.progressObjective('threads-out-of-tune', 'inspect-west-anchor', 1);
  game.progressObjective('threads-out-of-tune', 'inspect-east-anchor', 1);
  game.recordBattle(['crossing-frayling']);
  game.recordBattle(['crossing-frayling']);
  assert.equal(game.questState('threads-out-of-tune').status, 'active');
  game.recordBattle(['crossing-frayling']);

  const ready = game.questState('threads-out-of-tune');
  assert.equal(ready.objectives['defeat-crossing-fraylings'], 3);
  assert.equal(ready.status, 'ready');

  game.completeQuest('threads-out-of-tune');
  assert.equal(state.variable('gold'), 280);
  assert.equal(state.count('items', 'threadmend-tonic'), 3);
  assert.equal(state.count('items', 'woven-charm'), 1);
  assert.equal(state.sw('waystitch:menders-rest:unlocked'), true);
});

test('item grants and Waystitch activation are data-defined game-layer hooks with saved state', () => {
  const { state, game } = setup();
  game.emit('inventory.give', { itemId: 'threadmend-tonic', count: 1 });
  assert.equal(state.count('items', 'threadmend-tonic'), 1);

  game.emit('waystitch.activate', { waystitchId: 'elyndor-first-waystitch' });
  assert.equal(state.sw('waystitch:elyndor-first:active'), true);

  assert.throws(() => game.emit('waystitch.activate', { waystitchId: 'waystitch-menders-rest' }), /locked by quest/);
  completeFirstQuest(game);
  completeSecondQuest(game);
  game.emit('waystitch.activate', { waystitchId: 'waystitch-menders-rest' });
  assert.equal(state.sw('waystitch:menders-rest:active'), true);
  assert.throws(() => game.emit('waystitch.activate', { waystitchId: 'missing-waystitch' }), /Unknown Waystitch/);
});

test('quest completion is guarded against premature turn-in and duplicate rewards', () => {
  const { state, game } = setup();
  game.startQuest('a-thread-begins');
  assert.throws(() => game.completeQuest('a-thread-begins'), /not ready/);
  game.recordBattle(['frayling']);
  game.completeQuest('a-thread-begins');
  game.completeQuest('a-thread-begins');
  assert.equal(state.variable('gold'), 100);
  assert.equal(state.count('items', 'threadmend-tonic'), 1);
});
