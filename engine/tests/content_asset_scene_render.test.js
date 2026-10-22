import test from 'node:test';
import assert from 'node:assert/strict';

import { AssetManager } from '../src/assets/AssetManager.js';
import { ContentAssetCatalog } from '../src/assets/ContentAssetCatalog.js';
import { AssetBindingRegistry } from '../src/ui/AssetBindingRegistry.js';
import { ClassicScreenPresentation } from '../src/ui/ClassicScreenPresentation.js';
import { SceneRenderExecutor, RecordingRenderBackend } from '../src/render/SceneRenderExecutor.js';

test('content asset catalog registers manifest into asset manager and validates UI bindings', () => {
  const manager = new AssetManager({ loader: descriptor => ({ loaded: descriptor.id }) });
  const bindings = new AssetBindingRegistry({ fallback: false, bindings: {} });
  const catalog = new ContentAssetCatalog({ assetManager: manager, bindings, required: ['ui/windowskin/plushbound-classic'] });

  const result = catalog.registerManifest({
    bindings: {
      'ui/windowskin': 'ui/windowskin/plushbound-classic',
      'ui/cursor': 'ui/cursor/thread-glow',
      'portrait/default-player': 'portraits/player/traveler'
    },
    assets: [
      { id: 'ui/windowskin/plushbound-classic', path: 'art/ui/windowskin.png', preload: true },
      { id: 'ui/cursor/thread-glow', path: 'art/ui/cursor.png', preload: true },
      { id: 'portraits/player/traveler', path: 'art/portraits/traveler.png' }
    ]
  });

  assert.equal(result.valid, true);
  assert.equal(manager.has('ui/windowskin/plushbound-classic'), true);
  assert.deepEqual(catalog.preloadIds().sort(), ['ui/cursor/thread-glow', 'ui/windowskin/plushbound-classic']);
});

test('catalog reports unresolved bindings instead of silently pretending art exists', () => {
  const bindings = new AssetBindingRegistry({ fallback: false, bindings: {} });
  const catalog = new ContentAssetCatalog({ bindings });
  const result = catalog.registerManifest({
    bindings: { 'ui/windowskin': 'ui/windowskin/missing' },
    assets: [{ id: 'ui/cursor/thread-glow', path: 'art/ui/cursor.png' }]
  });
  assert.equal(result.valid, false);
  assert.equal(result.missingBindings[0].logicalId, 'ui/windowskin');
});

test('scene render executor turns a real menu presentation into an executable ordered frame', () => {
  const ui = new ClassicScreenPresentation();
  const scene = ui.mainMenu({
    commands: [{ id: 'items', text: 'Items' }, { id: 'quests', text: 'Quests' }],
    party: [{ id: 'player', name: 'Traveler', hp: 30, maxHp: 40, mp: 8, maxMp: 12, tp: 25 }],
    guardian: { id: 'cinder', name: 'Cinder' },
    selectedIndex: 1
  });
  const backend = new RecordingRenderBackend();
  const executor = new SceneRenderExecutor({ backend });
  const frame = executor.execute(scene, { timeMs: 450 });

  assert.ok(frame.some(command => command.kind === 'ui-nine-slice'));
  assert.ok(frame.some(command => command.role === 'portrait'));
  assert.ok(frame.some(command => command.role === 'cursor'));
  assert.deepEqual(frame.map(command => command.z), [...frame].map(command => command.z).sort((a, b) => a - b));
  assert.equal(backend.latest().commands.length, frame.length);
});

test('scene executor combines presentation layers and transition overlay in one frame', () => {
  const executor = new SceneRenderExecutor();
  const scene = {
    type: 'title',
    layers: [
      { kind: 'background', assetId: 'ui/title-background', z: 0 },
      { kind: 'window', z: 20, model: { rect: { x: 100, y: 100, width: 300, height: 180 }, items: [] } }
    ]
  };
  const frame = executor.compose(scene, {
    transition: { type: 'fade', direction: 'out' },
    transitionProgress: 0.5
  });
  assert.equal(frame[0].kind, 'image');
  assert.ok(frame.some(command => command.kind === 'ui-nine-slice'));
  assert.equal(frame.at(-1).kind, 'ui-fade');
});
