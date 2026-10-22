import test from 'node:test';
import assert from 'node:assert/strict';

import { gaugeModel, portraitModel, transitionModel, PLUSHBOUND_VISUAL_THEME } from '../src/ui/VisualTheme.js';
import { BattlePresentation } from '../src/battle/BattlePresentation.js';

test('visual theme builds deterministic gauges portraits and transitions', () => {
  const hp = gaugeModel({ kind: 'hp', current: 20, max: 100, width: 200 });
  assert.equal(hp.ratio, 0.2);
  assert.equal(hp.crisis, true);
  assert.equal(hp.fillColor, PLUSHBOUND_VISUAL_THEME.colors.hpCrisis);

  const face = portraitModel({ assetId: 'faces/traveler' });
  assert.equal(face.assetId, 'faces/traveler');
  assert.equal(face.frameAssetId, PLUSHBOUND_VISUAL_THEME.faceFrameAssetId);

  const transition = transitionModel('battle', { direction: 'in' });
  assert.equal(transition.assetId, PLUSHBOUND_VISUAL_THEME.transitionAssetId);
  assert.ok(transition.durationMs > 0);
});

test('battle presentation lays out party HUD and command chrome', () => {
  const presentation = new BattlePresentation({ viewportWidth: 1604, viewportHeight: 720 });
  const hud = presentation.hud({
    party: [
      { id: 'player', name: 'Traveler', hp: 35, maxHp: 40, mp: 8, maxMp: 12, tp: 20, faceAssetId: 'faces/player' },
      { id: 'cinder', name: 'Cinder', hp: 24, maxHp: 34, mp: 4, maxMp: 8, tp: 44, faceAssetId: 'faces/cinder' }
    ],
    commands: [
      { id: 'attack', text: 'Attack', iconId: 1 },
      { id: 'skills', text: 'Skills', iconId: 2 },
      { id: 'guard', text: 'Guard', iconId: 3 }
    ],
    selectedCommand: 1,
    log: ['Cinder lunges forward.']
  });

  assert.equal(hud.actors.length, 2);
  assert.equal(hud.actors[0].gauges.length, 3);
  assert.equal(hud.commandWindow.selectedIndex, 1);
  assert.equal(hud.commandWindow.skinAssetId, PLUSHBOUND_VISUAL_THEME.windowSkinAssetId);
  assert.equal(hud.commandWindow.cursorAssetId, PLUSHBOUND_VISUAL_THEME.cursorAssetId);
  assert.equal(hud.transitionIn.type, 'battle');
  assert.equal(hud.transitionOut.direction, 'out');
});

test('damage and healing popups use battle presentation colors and clear cleanly', () => {
  const presentation = new BattlePresentation();
  const damage = presentation.addPopup({ targetId: 'frayling', value: 37, critical: true, x: 800, y: 260 });
  const heal = presentation.addPopup({ targetId: 'player', value: 12, type: 'heal', x: 300, y: 420 });

  assert.equal(damage.text, '37');
  assert.equal(damage.color, PLUSHBOUND_VISUAL_THEME.colors.critical);
  assert.equal(heal.text, '+12');
  assert.equal(heal.color, PLUSHBOUND_VISUAL_THEME.colors.heal);
  assert.equal(presentation.hud().popups.length, 2);

  presentation.clearPopups();
  assert.equal(presentation.hud().popups.length, 0);
});

test('victory panel carries rewards through polished window presentation', () => {
  const presentation = new BattlePresentation();
  const result = presentation.victory({
    gold: 15,
    exp: 20,
    items: [{ kind: 'items', id: 'frayed-thread', amount: 1 }]
  });

  assert.equal(result.type, 'victory-panel');
  assert.equal(result.title, 'Victory!');
  assert.equal(result.rewards.gold, 15);
  assert.equal(result.rewards.exp, 20);
  assert.equal(result.rewards.items[0].id, 'frayed-thread');
  assert.equal(result.skinAssetId, PLUSHBOUND_VISUAL_THEME.windowSkinAssetId);
});
