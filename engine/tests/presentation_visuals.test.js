import test from 'node:test';
import assert from 'node:assert/strict';

import { ClassicWindowSystem } from '../src/ui/ClassicWindowSystem.js';
import { CharacterSpriteRenderer } from '../src/render/CharacterSpriteRenderer.js';
import { PresentationSceneModel } from '../src/scenes/PresentationSceneModel.js';

test('classic message and command windows use stable MV-style JRPG geometry', () => {
  const ui = new ClassicWindowSystem({ viewportWidth: 1604, viewportHeight: 720 });
  const message = ui.messageWindow({ hasFace: true, name: 'Lio' });
  assert.equal(message.rect.x, 0);
  assert.equal(message.rect.width, 1604);
  assert.equal(message.rect.y + message.rect.height, 720);
  assert.equal(message.frame.nineSlice, true);
  assert.ok(message.contents.x > message.face.x + message.face.width);

  const command = ui.commandWindow({ commands: [{ id: 'new', text: 'New Game' }, { id: 'continue', text: 'Continue', enabled: false }], index: 0 });
  assert.equal(command.items[0].selected, true);
  assert.equal(command.items[1].enabled, false);
  assert.equal(command.items[0].rect.height, command.lineHeight);
});

test('character sprite renderer provides four-direction three-frame walking animation', () => {
  const sprites = new CharacterSpriteRenderer();
  const idle = sprites.frameFor({ direction: 2, moving: false });
  assert.deepEqual({ column: idle.column, row: idle.row }, { column: 1, row: 0 });

  const left = sprites.frameFor({ direction: 4, moving: true, elapsedMs: 150 });
  assert.equal(left.row, 1);
  assert.equal(left.column, 1);

  const up = sprites.frameFor({ direction: 8, moving: true, elapsedMs: 300 });
  assert.equal(up.row, 3);
  assert.equal(up.column, 2);

  const draw = sprites.drawCommand({ id: 'player', assetId: 'characters/traveler', worldX: 96, worldY: 144, direction: 6 });
  assert.equal(draw.anchorX, 0.5);
  assert.equal(draw.anchorY, 1);
  assert.equal(draw.z, 1144);
});

test('presentation scene model shares one visual language across title map menu and battle', () => {
  const presentation = new PresentationSceneModel({ viewportWidth: 1604, viewportHeight: 720 });

  const title = presentation.title({ canContinue: true });
  assert.equal(title.type, 'title');
  assert.equal(title.layers.at(-1).model.items.find(i => i.id === 'continue').enabled, true);

  const map = presentation.map({ dialogue: { speaker: 'Lio', text: 'Stay close to your Guardian.', faceAssetId: 'faces/lio' }, choices: ['I will.', 'Not yet.'] });
  assert.equal(map.type, 'map');
  assert.equal(map.layers.some(layer => layer.model?.id === 'message'), true);
  assert.equal(map.layers.some(layer => layer.model?.id === 'choice'), true);

  const menu = presentation.menu({ commands: [{ id: 'items', text: 'Items' }], party: [{ id: 'player', name: 'Traveler' }] });
  assert.equal(menu.layers.some(layer => layer.model?.id === 'party-status'), true);

  const battle = presentation.battle({ backgroundAssetId: 'battlebacks/elyndor', battlers: [{ id: 'cinder' }], commandGroups: [{ id: 'attack', text: 'Attack' }] });
  assert.equal(battle.layers[0].kind, 'background');
  assert.equal(battle.layers.some(layer => layer.model?.id === 'battle-command'), true);
});
