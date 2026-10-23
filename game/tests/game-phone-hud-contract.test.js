import test from 'node:test';
import assert from 'node:assert/strict';
import { GameDomAdapter, GAME_TOUCH_TARGET_PX } from '../runtime/GameDomAdapter.js';

function dataKey(selector) {
  const match = /^\[data-([a-z0-9-]+)\]$/.exec(selector);
  if (!match) return null;
  return match[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function node(tagName='div') {
  return {
    tagName: tagName.toUpperCase(),
    textContent:'', dataset:{}, style:{}, children:[], attributes:{},
    appendChild(child) { this.children.push(child); child.parentNode=this; return child; },
    replaceChildren(...children) { this.children=[...children]; for (const child of children) child.parentNode=this; },
    setAttribute(name,value) { this.attributes[name]=String(value); },
    closest(selector) { return selector === '[data-plushbound-action]' && this.dataset.plushboundAction ? this : null; }
  };
}

function walk(root, predicate) {
  if (predicate(root)) return root;
  for (const child of root.children || []) { const found=walk(child,predicate); if (found) return found; }
  return null;
}

function makeDocument() {
  const mapScreen=node('section');
  const listeners=new Map();
  return {
    body:node('body'), mapScreen,
    createElement:tag=>node(tag),
    querySelector(selector) {
      if (selector === '#mapScreen') return mapScreen;
      if (selector === '#mapScreen .map-info') return null;
      const key=dataKey(selector);
      return key ? walk(mapScreen, el => Object.hasOwn(el.dataset,key)) : null;
    },
    addEventListener(type,fn) { listeners.set(type,fn); },
    removeEventListener(type,fn) { if (listeners.get(type)===fn) listeners.delete(type); }
  };
}

function makeScope(document, snapshot) {
  const listeners=new Map();
  return {
    document,
    addEventListener(type,fn) { if (!listeners.has(type)) listeners.set(type,new Set()); listeners.get(type).add(fn); },
    removeEventListener(type,fn) { listeners.get(type)?.delete(fn); },
    dispatchEvent(event) { for (const fn of listeners.get(event.type)||[]) fn(event); },
    PlushboundGameShell:{ snapshot:()=>snapshot }
  };
}

test('phone HUD keeps all variable player actions and shop entries reachable instead of truncating them', () => {
  const actions=Array.from({length:12},(_,i)=>({ eventId:`event-${i}`, label:`Action ${i}`, trigger:'action', x:i, y:i }));
  const inventory=Array.from({length:9},(_,i)=>({ itemId:`item-${i}`, price:i+1, item:{name:`Item ${i}`} }));
  const snapshot={
    currentMap:'elyndor-sunny-plains', gold:77, quests:{},
    dialogue:{ current:{ speaker:'Lio', text:'A long message must remain readable instead of being clipped by a fixed-height hidden-overflow box.' }, remaining:1 },
    messages:[], actions,
    activeShop:{ id:'phone-test-shop', name:'Phone Test Shop', inventory }
  };
  const document=makeDocument();
  const scope=makeScope(document,snapshot);
  const adapter=new GameDomAdapter({scope,bridge:scope.PlushboundGameShell}).attach();

  const hud=document.querySelector('[data-plushbound-live-hud]');
  const dialogue=document.querySelector('[data-plushbound-dialogue]');
  const next=document.querySelector('[data-plushbound-dialogue-next]');
  const actionHost=document.querySelector('[data-plushbound-actions]');
  const shop=document.querySelector('[data-plushbound-shop]');

  assert.ok(hud);
  assert.equal(hud.style.maxWidth,'100%');
  assert.equal(dialogue.style.overflowY,'auto');
  assert.notEqual(dialogue.style.overflow,'hidden');
  assert.equal(Number.parseInt(next.style.minHeight,10),GAME_TOUCH_TARGET_PX);

  assert.equal(actionHost.children.length,12);
  assert.equal(actionHost.dataset.actionCount,'12');
  assert.equal(actionHost.style.overflowY,'auto');
  for (const button of actionHost.children) assert.ok(Number.parseInt(button.style.minHeight,10) >= GAME_TOUCH_TARGET_PX);

  const buyButtons=shop.children.filter(child=>child.dataset.plushboundAction==='buy');
  const closeButton=shop.children.find(child=>child.dataset.plushboundAction==='shop-close');
  assert.equal(buyButtons.length,9);
  assert.equal(shop.style.overflowY,'auto');
  for (const button of buyButtons) assert.ok(Number.parseInt(button.style.minHeight,10) >= GAME_TOUCH_TARGET_PX);
  assert.ok(Number.parseInt(closeButton.style.minHeight,10) >= GAME_TOUCH_TARGET_PX);
  adapter.detach();
});
