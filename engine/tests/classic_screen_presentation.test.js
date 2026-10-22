import test from 'node:test';
import assert from 'node:assert/strict';

import { AssetBindingRegistry } from '../src/ui/AssetBindingRegistry.js';
import { ClassicScreenPresentation } from '../src/ui/ClassicScreenPresentation.js';

test('asset binding registry resolves Plushbound UI assets and typed fallbacks', () => {
  const assets = new AssetBindingRegistry({
    bindings: {
      'icons/items/threadmend-tonic': 'art/icons/threadmend-tonic',
      'portraits/player/player': 'art/portraits/traveler'
    }
  });
  assert.equal(assets.resolve('ui/windowskin'), 'ui/windowskin/plushbound-classic');
  assert.equal(assets.itemIcon({ kind: 'items', id: 'threadmend-tonic' }), 'art/icons/threadmend-tonic');
  assert.equal(assets.itemIcon({ kind: 'items', id: 'unknown' }), 'icons/item/threadmend-tonic');
  assert.equal(assets.portrait({ id: 'player' }, 'player'), 'art/portraits/traveler');
});

test('main menu composes party guardian and runtime info with shared skin', () => {
  const ui = new ClassicScreenPresentation();
  const model = ui.mainMenu({
    commands: [{ id: 'items', text: 'Items' }, { id: 'quests', text: 'Quests' }],
    party: [{ id: 'player', name: 'Traveler', hp: 30, maxHp: 40, mp: 8, maxMp: 12, tp: 25 }],
    guardian: { id: 'cinder', name: 'Cinder', bond: { firstThread: true } },
    gold: 105,
    playtime: '00:18:22',
    location: 'Sunny Plains of Elyndor'
  });
  assert.equal(model.type, 'menu');
  assert.equal(model.skinAssetId, 'ui/windowskin/plushbound-classic');
  assert.equal(model.layers.find(x => x.kind === 'party-status').cards[0].name, 'Traveler');
  assert.equal(model.layers.find(x => x.kind === 'guardian-status').card.name, 'Cinder');
  assert.equal(model.layers.find(x => x.model?.id === 'menu-info').model.gold, 105);
});

test('save screen visually distinguishes filled and empty slots', () => {
  const ui = new ClassicScreenPresentation();
  const model = ui.saveScreen({
    mode: 'load',
    slots: [
      { slot: 1, exists: true, label: 'Elyndor', savedAt: 1000, extra: { location: 'Elyndor', playtime: '00:10:00' } },
      { slot: 2, exists: false }
    ],
    selectedIndex: 1
  });
  assert.equal(model.type, 'load');
  assert.equal(model.rows[0].iconAssetId, 'ui/save/filled-thread');
  assert.equal(model.rows[1].iconAssetId, 'ui/save/empty-thread');
  assert.equal(model.rows[1].selected, true);
});

test('shop screen binds item icons and disables unaffordable goods', () => {
  const ui = new ClassicScreenPresentation({
    assets: new AssetBindingRegistry({ bindings: { 'icons/items/waybread': 'art/icons/waybread' } })
  });
  const model = ui.shopScreen({
    gold: 15,
    goods: [
      { kind: 'items', id: 'waybread', name: 'Waybread', price: 10 },
      { kind: 'items', id: 'thread-charm', name: 'Thread Charm', price: 50 }
    ]
  });
  assert.equal(model.list[0].iconAssetId, 'art/icons/waybread');
  assert.equal(model.list[0].enabled, true);
  assert.equal(model.list[1].enabled, false);
  assert.equal(model.goldWindow.gold, 15);
});

test('quest screen filters and exposes selected quest details', () => {
  const ui = new ClassicScreenPresentation();
  const quests = [
    { id: 'a-thread-begins', title: 'A Thread Begins', status: 'active', stage: 2, objective: 'Return to Lio.' },
    { id: 'old-road', title: 'Old Road', status: 'complete', stage: 3, objective: 'Done.' }
  ];
  const active = ui.questScreen({ quests, filter: 'active', selectedIndex: 0 });
  assert.equal(active.list.length, 1);
  assert.equal(active.list[0].iconAssetId, 'ui/quest/active');
  assert.equal(active.detail.quest.id, 'a-thread-begins');
  const complete = ui.questScreen({ quests, filter: 'complete', selectedIndex: 0 });
  assert.equal(complete.list[0].iconAssetId, 'ui/quest/complete');
});
