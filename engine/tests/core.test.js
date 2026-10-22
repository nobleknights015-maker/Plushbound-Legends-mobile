import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/core/GameState.js';
import { EventInterpreter, EventCommandRegistry, registerCoreEventCommands } from '../src/events/EventInterpreter.js';

test('GameState preserves MV-style switches, variables, self switches and inventory across save/restore', () => {
  const state = new GameState();
  state.setSw(1, true);
  state.setVariable(2, 42);
  state.setSelfSw(3, 4, 'A', true);
  state.gain('items', 5, 3);
  state.map = { id: 9, x: 7, y: 8, direction: 4, vehicle: null };
  const raw = JSON.parse(JSON.stringify(state.serialize()));
  const restored = new GameState();
  restored.restore(raw);
  assert.equal(restored.sw(1), true);
  assert.equal(restored.variable(2), 42);
  assert.equal(restored.selfSw(3, 4, 'A'), true);
  assert.equal(restored.inventory.items.get('5'), 3);
  assert.deepEqual(restored.map, state.map);
});

test('inventory never drops below zero', () => {
  const state = new GameState();
  state.gain('items', 1, 2);
  assert.equal(state.gain('items', 1, -99), 0);
  assert.equal(state.inventory.items.has('1'), false);
});

test('core event commands mutate state and dispatch engine services', () => {
  const calls = [];
  const ui = { message: (...x) => calls.push(['message', ...x]), choice: (...x) => calls.push(['choice', ...x]) };
  const audio = { playBgm: (...x) => calls.push(['bgm', ...x]), playBgs: (...x) => calls.push(['bgs', ...x]), playSe: (...x) => calls.push(['se', ...x]) };
  const map = { transfer: (...x) => calls.push(['transfer', ...x]) };
  const battle = { start: (...x) => calls.push(['battle', ...x]) };
  const registry = registerCoreEventCommands(new EventCommandRegistry(), { ui, audio, map, battle });
  const state = new GameState();
  const interpreter = new EventInterpreter({ commands: registry, state, logger: { error(){ throw new Error('interpreter error'); } } });
  interpreter.start([
    { code: 'SWITCH', parameters: [1, true] },
    { code: 'VARIABLE', parameters: [2, 7] },
    { code: 'SELF_SWITCH', parameters: ['A', true] },
    { code: 'BGM', parameters: ['theme'] },
    { code: 'TRANSFER', parameters: [2, 4, 5, 2] }
  ], { mapId: 1, eventId: 6 });
  interpreter.update(0);
  assert.equal(state.sw(1), true);
  assert.equal(state.variable(2), 7);
  assert.equal(state.selfSw(1, 6, 'A'), true);
  assert.deepEqual(calls, [['bgm', 'theme'], ['transfer', 2, 4, 5, 2]]);
});

test('WAIT pauses and resumes interpreter deterministically', () => {
  const registry = new EventCommandRegistry();
  registry.register('WAIT', ({ parameters }) => ({ waitSeconds: Number(parameters[0]) }));
  registry.register('MARK', ({ state }) => state.setSw('done', true));
  const state = new GameState();
  const interpreter = new EventInterpreter({ commands: registry, state });
  interpreter.start([{ code: 'WAIT', parameters: [1] }, { code: 'MARK' }]);
  interpreter.update(0);
  assert.equal(state.sw('done'), false);
  interpreter.update(0.5);
  assert.equal(state.sw('done'), false);
  interpreter.update(0.5);
  interpreter.update(0);
  assert.equal(state.sw('done'), true);
});
