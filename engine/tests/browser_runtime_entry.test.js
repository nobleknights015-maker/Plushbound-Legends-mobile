import test from 'node:test';
import assert from 'node:assert/strict';

import { bootPlushboundEngineV1, resolveRuntimeScriptConfig } from '../src/runtime/BrowserRuntimeEntry.js';

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

test('module bootstrap resolves the marked runtime script when document.currentScript is null', () => {
  const script = {
    src: 'file:///android_asset/engine-v1/runtime/BrowserRuntimeEntry.js',
    dataset: { assetManifest: '../content-assets.json' },
    getAttribute() { return null; }
  };
  const scope = {
    URL,
    document: {
      currentScript: null,
      baseURI: 'file:///android_asset/index.html',
      querySelector(selector) {
        assert.equal(selector, 'script[data-plushbound-engine-v1="runtime"]');
        return script;
      }
    }
  };
  const resolved = resolveRuntimeScriptConfig(scope);
  assert.equal(resolved.script, script);
  assert.equal(resolved.manifestUrl, 'file:///android_asset/engine-v1/content-assets.json');
});

test('runtime exposes safe-area aware screen profile and UI anchoring helpers', async () => {
  const ctx = {
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    save(){}, restore(){}, setTransform(){}, fillRect(){}, drawImage(){}, fillText(){}, measureText(){ return { width: 0 }; },
    fillStyle: '#000', font: '', textBaseline: 'top'
  };
  const canvas = {
    width: 0, height: 0, clientWidth: 1604, clientHeight: 720, style: {}, dataset: {},
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    setAttribute(){}, addEventListener(){}, removeEventListener(){}
  };
  const scope = {
    innerWidth: 1604, innerHeight: 720, devicePixelRatio: 1,
    document: { querySelector: () => null, createElement: () => canvas, body: { appendChild(){} } },
    addEventListener(){}, removeEventListener(){}, dispatchEvent(){},
    CustomEvent: class { constructor(type, init){ this.type = type; this.detail = init?.detail; } }
  };
  const runtime = await bootPlushboundEngineV1({ scope, canvas, safeInsets: { left: 80, right: 20, top: 10, bottom: 10 } });
  assert.equal(runtime.screenProfile().profile, 'phone-ultrawide');
  const anchored = runtime.anchorUi({ width: 300, height: 120, anchorX: 'right', anchorY: 'bottom', margin: 20 });
  const info = runtime.viewportInfo();
  assert.ok(anchored.x >= info.safeArea.x);
  assert.ok(anchored.y >= info.safeArea.y);
  assert.ok(anchored.x + anchored.width <= info.safeArea.x + info.safeArea.width);
  assert.ok(anchored.y + anchored.height <= info.safeArea.y + info.safeArea.height);
});
