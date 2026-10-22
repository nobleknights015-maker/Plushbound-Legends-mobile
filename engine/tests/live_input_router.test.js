import test from 'node:test';
import assert from 'node:assert/strict';

import { InputManager } from '../src/input/InputManager.js';
import { LiveInputRouter } from '../src/input/LiveInputRouter.js';

test('input lock clears stale state and suppresses keyboard and touch until released', () => {
  const input = new InputManager({ bindings: { default: { Enter: 'confirm' } } });
  assert.equal(input.keyDown('Enter'), true);
  assert.equal(input.wasPressed('confirm'), true);

  input.setLocked(true);
  assert.equal(input.isLocked(), true);
  assert.equal(input.wasPressed('confirm'), false);
  assert.equal(input.keyDown('Enter'), false);
  assert.equal(input.pointerDown({ id: 1, x: 10, y: 10 }), false);

  input.setLocked(false);
  assert.equal(input.keyDown('Enter'), true);
  assert.equal(input.wasPressed('confirm'), true);
});

test('live input router activates enabled scene items using logical coordinates', () => {
  const actions = [];
  const input = new InputManager({ touchDeadzone: 10 });
  const router = new LiveInputRouter({ input, mapPoint: (x, y) => ({ x: x / 2, y: y / 2 }), onAction: action => actions.push(action) });
  router.setScene({
    type: 'title',
    layers: [{
      kind: 'window',
      model: {
        items: [
          { id: 'new-game', text: 'New Game', rect: { x: 100, y: 100, width: 240, height: 48 }, enabled: true },
          { id: 'continue', text: 'Continue', rect: { x: 100, y: 160, width: 240, height: 48 }, enabled: false }
        ]
      }
    }]
  });

  router.pointerDown({ pointerId: 7, clientX: 240, clientY: 240 });
  const action = router.pointerUp({ pointerId: 7, clientX: 240, clientY: 240 });
  assert.equal(action.type, 'activate');
  assert.equal(action.id, 'new-game');
  assert.equal(actions.length, 1);

  router.pointerDown({ pointerId: 8, clientX: 240, clientY: 340 });
  const disabled = router.pointerUp({ pointerId: 8, clientX: 240, clientY: 340 });
  assert.equal(disabled.type, 'tap');
});

test('live router turns swipes into directional navigation and obeys input locks', () => {
  const actions = [];
  const input = new InputManager({ touchDeadzone: 8 });
  const router = new LiveInputRouter({ input, onAction: action => actions.push(action) });

  router.pointerDown({ pointerId: 2, clientX: 20, clientY: 20 });
  const move = router.pointerMove({ pointerId: 2, clientX: 80, clientY: 22 });
  assert.deepEqual(move, { type: 'navigate', direction: 'right' });

  input.setLocked(true);
  assert.equal(router.pointerDown({ pointerId: 3, clientX: 10, clientY: 10 }), null);
  assert.equal(router.pointerUp({ pointerId: 3, clientX: 10, clientY: 10 }), null);
  assert.equal(actions.length, 1);
});
