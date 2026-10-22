import test from 'node:test';
import assert from 'node:assert/strict';

import { ClassicUiRenderer } from '../src/render/ClassicUiRenderer.js';
import { ClassicScreenPresentation } from '../src/ui/ClassicScreenPresentation.js';
import { transitionModel } from '../src/ui/VisualTheme.js';

test('nine-slice windows generate all frame parts using Plushbound skin', () => {
  const renderer = new ClassicUiRenderer({ corner: 12 });
  const commands = renderer.windowCommands({ rect: { x: 10, y: 20, width: 240, height: 120 } });
  assert.equal(commands.length, 9);
  assert.equal(commands[0].assetId, 'ui/windowskin/plushbound-classic');
  assert.deepEqual(new Set(commands.map(x => x.part)), new Set(['center','t','b','l','r','tl','tr','bl','br']));
});

test('portrait composition layers portrait below frame', () => {
  const renderer = new ClassicUiRenderer();
  const commands = renderer.portraitCommands({ assetId: 'portraits/player/traveler', x: 100, y: 80, width: 144, height: 144, z: 200 });
  assert.equal(commands.length, 2);
  assert.equal(commands[0].role, 'portrait');
  assert.equal(commands[1].role, 'portrait-frame');
  assert.ok(commands[1].z > commands[0].z);
});

test('selection cursor pulses deterministically without moving target geometry', () => {
  const renderer = new ClassicUiRenderer({ cursorPulseMs: 1000 });
  const a = renderer.selectionCommands({ itemRect: { x: 20, y: 30, width: 300, height: 48 }, timeMs: 0 });
  const b = renderer.selectionCommands({ itemRect: { x: 20, y: 30, width: 300, height: 48 }, timeMs: 250 });
  assert.deepEqual(a[0].destination, b[0].destination);
  assert.notEqual(a[0].opacity, b[0].opacity);
  assert.equal(a[1].assetId, 'ui/cursor/thread-glow');
});

test('classic menu presentation composes bound portraits windows and selection', () => {
  const ui = new ClassicScreenPresentation();
  const model = ui.mainMenu({
    commands: [{ id: 'items', text: 'Items' }, { id: 'quests', text: 'Quests' }],
    selectedIndex: 1,
    party: [{ id: 'traveler', name: 'Traveler', hp: 20, maxHp: 30 }],
    guardian: { id: 'cinder', name: 'Cinder' }
  });
  const renderer = new ClassicUiRenderer();
  const commands = renderer.composeScreen(model, { timeMs: 500 });
  assert.ok(commands.some(x => x.kind === 'ui-nine-slice'));
  assert.ok(commands.some(x => x.role === 'portrait'));
  assert.ok(commands.some(x => x.role === 'cursor'));
});

test('save shop and quest rows produce real icon draw commands and selected highlights', () => {
  const ui = new ClassicScreenPresentation();
  const renderer = new ClassicUiRenderer();
  const save = renderer.composeScreen(ui.saveScreen({ slots: [{ slot: 1, exists: true }], selectedIndex: 0 }));
  const shop = renderer.composeScreen(ui.shopScreen({ goods: [{ id: 'waybread', name: 'Waybread', price: 10 }], gold: 20, selectedIndex: 0 }));
  const quests = renderer.composeScreen(ui.questScreen({ quests: [{ id: 'a-thread-begins', title: 'A Thread Begins', status: 'active' }], selectedIndex: 0 }));
  assert.ok(save.some(x => x.role === 'icon'));
  assert.ok(shop.some(x => x.role === 'icon'));
  assert.ok(quests.some(x => x.role === 'icon'));
  assert.ok(save.some(x => x.kind === 'ui-selection-highlight'));
});

test('fade and battle transitions emit renderable transition commands', () => {
  const renderer = new ClassicUiRenderer();
  const fade = renderer.transitionCommands(transitionModel('fade', { direction: 'out' }), { progress: 0.5, viewportWidth: 1604, viewportHeight: 720 });
  assert.equal(fade[0].kind, 'ui-fade');
  assert.equal(fade[0].opacity, 0.5);
  const battle = renderer.transitionCommands(transitionModel('battle', { direction: 'in' }), { progress: 0.5, viewportWidth: 1604, viewportHeight: 720 });
  assert.equal(battle[0].kind, 'ui-transition-image');
  assert.ok(battle[0].assetId);
});
