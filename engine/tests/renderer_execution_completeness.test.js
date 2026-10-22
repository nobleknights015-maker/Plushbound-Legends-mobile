import test from 'node:test';
import assert from 'node:assert/strict';
import { ClassicUiRenderer } from '../src/render/ClassicUiRenderer.js';
import { Canvas2DRenderBackend } from '../src/render/Canvas2DRenderBackend.js';

function contextLog(calls) {
  return {
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    fillStyle: '#000',
    font: '',
    textBaseline: 'top',
    save(){ calls.push(['save']); },
    restore(){ calls.push(['restore']); },
    setTransform(...args){ calls.push(['setTransform', ...args]); },
    fillRect(...args){ calls.push(['fillRect', ...args]); },
    drawImage(...args){ calls.push(['drawImage', ...args]); },
    fillText(...args){ calls.push(['fillText', ...args]); },
    measureText(text){ return { width: String(text).length * 10 }; }
  };
}

test('classic UI emits concrete text and gauge commands', () => {
  const ui = new ClassicUiRenderer({ assets: { resolve: id => id } });
  const model = {
    rect: { x: 20, y: 20, width: 320, height: 180 },
    padding: 18,
    lineHeight: 36,
    fontSize: 28,
    colors: { text: '#fff', disabled: '#777', system: '#fd7' },
    name: 'Lio',
    text: 'Waystitches remember every traveler.',
    items: [{ id: 'ok', text: 'Continue', enabled: true, rect: { x: 40, y: 120, width: 180, height: 36 } }]
  };
  const commands = ui.windowCommands(model);
  assert.ok(commands.some(command => command.kind === 'ui-text' && command.text === 'Lio'));
  assert.ok(commands.some(command => command.kind === 'ui-text' && command.text === 'Continue'));
  const gauge = ui.gaugeCommand({ value: 25, max: 100, width: 200 });
  assert.equal(gauge.kind, 'ui-gauge');
  assert.equal(gauge.value, 25);
  assert.equal(gauge.max, 100);
});

test('Canvas2D backend executes text gauges tiles sprites and parallax', () => {
  const calls = [];
  const ctx = contextLog(calls);
  const canvas = {
    width: 0, height: 0, clientWidth: 1604, clientHeight: 720, style: {},
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0 })
  };
  const image = { width: 192, height: 192 };
  const cache = new Map([
    ['tiles/world', image],
    ['sprites/hero', image],
    ['bg/sky', image]
  ]);
  const assets = { cache, has: id => cache.has(id), load: async id => cache.get(id) };
  const backend = new Canvas2DRenderBackend({ canvas, assetManager: assets, scope: { innerWidth: 1604, innerHeight: 720, devicePixelRatio: 1 } });

  backend.beginFrame();
  backend.draw({ kind: 'ui-text', text: 'Hello', x: 10, y: 12, fontSize: 24, color: '#fff' });
  backend.draw({ kind: 'ui-gauge', destination: { x: 10, y: 40, width: 100, height: 12 }, value: 50, max: 100, color: '#fff' });
  backend.draw({ kind: 'tile', source: { image: 'tiles/world', sx: 0, sy: 0, sw: 48, sh: 48 }, screenX: 100, screenY: 120 });
  backend.draw({ kind: 'sprite', source: { image: 'sprites/hero', sx: 48, sy: 0, sw: 48, sh: 48 }, screenX: 160, screenY: 180 });
  backend.draw({ kind: 'parallax', image: 'bg/sky', offsetX: 0, offsetY: 0, loopX: false, loopY: false });
  backend.endFrame();

  assert.ok(calls.some(call => call[0] === 'fillText' && call[1] === 'Hello'));
  assert.ok(calls.filter(call => call[0] === 'fillRect').length >= 3);
  assert.ok(calls.filter(call => call[0] === 'drawImage').length >= 3);
  assert.ok(calls.some(call => call[0] === 'drawImage' && call.length >= 10));
});
