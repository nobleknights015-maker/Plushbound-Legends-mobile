import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bootPlushboundGame } from '../runtime/AndroidGameBootstrap.js';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const index = read('content/content-index.json');
const fixtures = new Map([['content/content-index.json', index]]);
for (const entry of index.packages || []) fixtures.set(`content/${entry.path}`, read(`content/${entry.path}`));
for (const entry of index.runtimePackages || []) {
  const normalized = new URL(entry.path, 'file:///game/content/').pathname.replace('/game/', '');
  fixtures.set(normalized, read(normalized));
}

function fixtureKey(url) {
  const pathname = new URL(url).pathname;
  const marker = '/game/';
  const offset = pathname.indexOf(marker);
  return offset >= 0 ? pathname.slice(offset + marker.length) : pathname.split('/').pop();
}

test('Android game bootstrap loads all indexed regional content on the frozen engine baseline and enters Elyndor', async () => {
  const originalFetch = globalThis.fetch;
  const originalCustomEvent = globalThis.CustomEvent;
  globalThis.CustomEvent = globalThis.CustomEvent || class CustomEvent {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  };
  globalThis.fetch = async url => {
    const data = fixtures.get(fixtureKey(url));
    return data
      ? { ok: true, status: 200, async json() { return structuredClone(data); } }
      : { ok: false, status: 404, async json() { return {}; } };
  };

  try {
    const events = [];
    const listeners = new Map();
    const scope = {
      location: { href: 'file:///android_asset/index.html' },
      addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
      removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
      dispatchEvent(event) {
        events.push(event);
        for (const fn of listeners.get(event.type) || []) fn(event);
      }
    };
    const runtime = await bootPlushboundGame({
      scope,
      baseUrl: 'file:///android_asset/game/runtime/'
    });

    assert.equal(runtime.engineBaseline, '160d9fd95bc0d3db39224f8bb4c5e1e3a1f54425');
    assert.equal(runtime.session.snapshot().currentMap, 'elyndor-sunny-plains');
    assert.equal(runtime.loadedPackageIds.length, index.packages.length);
    assert.equal(runtime.loadedRuntimePackageIds.length, index.runtimePackages.length);
    assert.ok(runtime.loadedRuntimePackageIds.includes('verdancia-region-maps'));
    assert.ok(runtime.loadedMapIds.includes('verdancia-lanternbough'));
    assert.ok(runtime.loadedMapIds.includes('verdancia-weavers-sanctum'));
    assert.equal(scope.PlushboundGame, runtime);
    assert.ok(scope.PlushboundGameShell);
    assert.equal(events.some(event => event.type === 'plushbound-game-ready' && event.detail?.loadedMaps === runtime.loadedMapIds.length), true);
    assert.equal(events.some(event => event.type === 'plushbound-shell-update' && event.detail?.snapshot?.currentMap === 'elyndor-sunny-plains'), true);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.CustomEvent = originalCustomEvent;
  }
});
