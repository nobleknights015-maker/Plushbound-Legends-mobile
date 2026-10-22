import test from 'node:test';
import assert from 'node:assert/strict';

import { InputManager } from '../src/input/InputManager.js';
import { LiveInputRouter } from '../src/input/LiveInputRouter.js';
import { LogicalViewport } from '../src/render/Canvas2DRenderBackend.js';
import { classifyScreen, safeViewport, responsiveAnchor } from '../src/platform/ScreenAdaptation.js';
import { bootPlushboundEngineV1 } from '../src/runtime/BrowserRuntimeEntry.js';

test('Engine v1 freeze gate: screen, touch, assets and runtime error contracts remain stable', async () => {
  const viewport = new LogicalViewport();
  const fit = viewport.fit(2400, 1080, { left: 80, right: 40, top: 20, bottom: 20 });
  assert.ok(fit.scale > 0);
  const center = viewport.logicalToScreen(802, 360);
  const roundTrip = viewport.screenToLogical(center.x, center.y);
  assert.ok(Math.abs(roundTrip.x - 802) < 0.001);
  assert.ok(Math.abs(roundTrip.y - 360) < 0.001);

  const screen = classifyScreen({ width: 1604, height: 720 });
  assert.equal(screen.orientation, 'landscape');
  assert.match(screen.profile, /^phone-/);
  const safe = safeViewport({ width: 2400, height: 1080, insets: { left: 80, right: 40, top: 20, bottom: 20 } });
  const anchored = responsiveAnchor({ width: 320, height: 160, anchorX: 'right', anchorY: 'bottom', safeArea: safe, margin: 24 });
  assert.ok(anchored.x + anchored.width <= safe.x + safe.width);
  assert.ok(anchored.y + anchored.height <= safe.y + safe.height);

  const actions = [];
  const input = new InputManager({ touchDeadzone: 8 });
  const router = new LiveInputRouter({ input, onAction: action => actions.push(action) });
  router.pointerDown({ pointerId: 4, clientX: 10, clientY: 10 });
  assert.deepEqual(router.pointerMove({ pointerId: 4, clientX: 80, clientY: 10 }), { type: 'navigate', direction: 'right' });
  assert.equal(router.pointerUp({ pointerId: 4, clientX: 120, clientY: 10 }), null);
  assert.equal(actions.length, 1);

  await assert.rejects(
    () => bootPlushboundEngineV1({
      scope: {},
      manifest: { required: ['ui/windowskin/core'], assets: [] },
      strictBindings: true,
      strictAssets: true
    }),
    /Missing required asset/
  );

  const events = [];
  const runtime = await bootPlushboundEngineV1({
    scope: {
      dispatchEvent(event) { events.push(event); },
      CustomEvent: class { constructor(type, init){ this.type = type; this.detail = init?.detail; } },
      console: { error(){} }
    }
  });
  runtime.registerInteraction('title', 'fail', async () => { throw new Error('freeze-gate-error'); });
  runtime.interaction.setScene({ type: 'title', commands: [{ id: 'fail', enabled: true, rect: { x: 0, y: 0, width: 100, height: 40 } }] });
  const result = await runtime.handleAction({ type: 'activate', id: 'fail' });
  assert.equal(result.error, true);
  assert.equal(runtime.interactionErrors().length, 1);
  assert.equal(events.at(-1).type, 'plushbound-engine-v1-interaction-error');
});
