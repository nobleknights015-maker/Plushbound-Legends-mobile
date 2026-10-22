import test from 'node:test';
import assert from 'node:assert/strict';
import { GameDomAdapter } from '../runtime/GameDomAdapter.js';

function element() {
  return {
    textContent: '', dataset: {},
    closest(selector) { return selector === '[data-plushbound-action]' ? this : null; }
  };
}

function makeDocument() {
  const mapInfo = element();
  const worldMap = element();
  const questInfo = element();
  const gold = element();
  const mapScreen = element();
  const selectors = new Map([
    ['#mapScreen .map-info', mapInfo], ['#mapScreen .world-map', worldMap],
    ['#questStatus', questInfo], ['#goldValue', gold], ['#mapScreen', mapScreen]
  ]);
  let clickListener = null;
  return {
    nodes: { mapInfo, worldMap, questInfo, gold, mapScreen },
    querySelector(selector) { return selectors.get(selector) || null; },
    addEventListener(type, fn) { if (type === 'click') clickListener = fn; },
    removeEventListener(type, fn) { if (type === 'click' && clickListener === fn) clickListener = null; },
    click(target) { clickListener?.({ target }); },
    listener() { return clickListener; }
  };
}

function makeScope(document) {
  const listeners = new Map();
  const events = [];
  return {
    document, events,
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    dispatchEvent(event) { events.push(event); for (const fn of listeners.get(event.type) || []) fn(event); }
  };
}

test('DOM adapter renders live map, quest and gold state into reconstructed shell selectors', () => {
  const document = makeDocument();
  const scope = makeScope(document);
  const bridge = { snapshot: () => ({ currentMap: 'elyndor-sunny-plains', gold: 100, quests: { q: { id: 'q', name: 'A Thread Begins', status: 'active' } } }) };
  const adapter = new GameDomAdapter({ scope, bridge }).attach();
  assert.equal(document.nodes.mapInfo.textContent, 'Sunny Plains of Elyndor');
  assert.equal(document.nodes.worldMap.dataset.plushboundMapId, 'elyndor-sunny-plains');
  assert.equal(document.nodes.questInfo.textContent, 'A Thread Begins — active');
  assert.equal(document.nodes.gold.textContent, '100');
  assert.equal(document.nodes.mapScreen.dataset.plushboundLive, 'true');
  adapter.detach();
  assert.equal(document.listener(), null);
});

test('DOM adapter routes declarative UI actions through GameShellBridge', () => {
  const original = globalThis.CustomEvent;
  globalThis.CustomEvent = globalThis.CustomEvent || class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
  try {
    const document = makeDocument();
    const scope = makeScope(document);
    const calls = [];
    const bridge = {
      snapshot: () => ({ currentMap: 'elyndor-sunny-plains', gold: 0, quests: {} }),
      interact: id => calls.push(['interact', id]),
      openShop: id => calls.push(['shop', id]),
      enterMap: (...args) => calls.push(['map', ...args]),
      triggerAt: (...args) => calls.push(['touch', ...args])
    };
    new GameDomAdapter({ scope, bridge }).attach();
    const npc = element(); npc.dataset.plushboundAction = 'interact'; npc.dataset.eventId = 'lio';
    document.click(npc);
    const shop = element(); shop.dataset.plushboundAction = 'shop'; shop.dataset.shopId = 'menders-rest-provisions';
    document.click(shop);
    assert.deepEqual(calls, [['interact', 'lio'], ['shop', 'menders-rest-provisions']]);
  } finally { globalThis.CustomEvent = original; }
});
