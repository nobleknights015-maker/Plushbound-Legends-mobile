import test from 'node:test';
import assert from 'node:assert/strict';

import { bootPlushboundEngineV1 } from '../src/runtime/BrowserRuntimeEntry.js';

test('browser runtime entry boots Engine v1 services and exposes executable scene rendering', async () => {
  const events = [];
  class FakeCustomEvent {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  }
  const scope = {
    CustomEvent: FakeCustomEvent,
    dispatchEvent(event) { events.push(event); }
  };

  const runtime = await bootPlushboundEngineV1({
    scope,
    manifest: {
      bindings: { 'ui/windowskin': 'ui/windowskin/test' },
      assets: [{ id: 'ui/windowskin/test', path: 'art/ui/test.png' }]
    },
    strictBindings: true
  });

  assert.equal(runtime.booted, true);
  assert.equal(scope.__PLUSHBOUND_ENGINE_V1__, runtime);
  assert.equal(runtime.validation.valid, true);
  assert.equal(runtime.assetManager.has('ui/windowskin/test'), true);
  const frame = runtime.composeScene({
    type: 'title',
    layers: [{ kind: 'window', z: 10, model: { rect: { x: 20, y: 20, width: 300, height: 180 }, items: [] } }]
  });
  assert.ok(frame.some(command => command.kind === 'ui-nine-slice'));
  assert.equal(events.at(-1).type, 'plushbound-engine-v1-ready');
});

test('browser runtime entry is idempotent for WebView recreation within one page', async () => {
  const scope = {};
  const first = await bootPlushboundEngineV1({ scope });
  const second = await bootPlushboundEngineV1({ scope });
  assert.equal(first, second);
});
