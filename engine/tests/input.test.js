import test from 'node:test';
import assert from 'node:assert/strict';
import { InputManager } from '../src/input/InputManager.js';

test('input manager maps physical input by context and tracks press/release edges', () => {
  const input = new InputManager({ bindings: {
    default: { ArrowUp: 'up', Enter: 'confirm' },
    menu: { ArrowUp: 'menuUp', Escape: 'cancel' }
  }});
  assert.equal(input.keyDown('ArrowUp'), true);
  assert.equal(input.isDown('up'), true);
  assert.equal(input.wasPressed('up'), true);
  input.update();
  assert.equal(input.wasPressed('up'), false);
  input.keyUp('ArrowUp');
  assert.equal(input.wasReleased('up'), true);
  input.setContext('menu');
  input.keyDown('ArrowUp');
  assert.equal(input.isDown('menuUp'), true);
});

test('context change clears transient edges and lifecycle clear removes stuck input', () => {
  const input = new InputManager({ bindings: { default: { KeyZ: 'confirm' } } });
  input.keyDown('KeyZ');
  assert.equal(input.isDown('confirm'), true);
  input.setContext('battle');
  assert.equal(input.wasPressed('confirm'), false);
  input.clearAll();
  assert.equal(input.isDown('confirm'), false);
});

test('touch input distinguishes tap and directional swipe with deadzone', () => {
  const input = new InputManager({ touchDeadzone: 10 });
  input.pointerDown({ id: 1, x: 100, y: 100 });
  assert.deepEqual(input.pointerUp({ id: 1, x: 104, y: 103 }), { type: 'tap', x: 104, y: 103 });
  input.pointerDown({ id: 2, x: 50, y: 50 });
  assert.equal(input.pointerMove({ id: 2, x: 90, y: 55 }), 'right');
  assert.deepEqual(input.pointerUp({ id: 2, x: 90, y: 55 }), { type: 'swipe', direction: 'right', x: 90, y: 55 });
});
