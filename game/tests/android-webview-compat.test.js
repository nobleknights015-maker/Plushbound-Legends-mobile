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

test('Android bootstrap supplies structuredClone compatibility before frozen engine map registration', async () => {
  const originalClone = globalThis.structuredClone;
  const originalFetch = globalThis.fetch;
  const originalCustomEvent = globalThis.CustomEvent;
  globalThis.structuredClone = undefined;
  globalThis.CustomEvent = globalThis.CustomEvent || class CustomEvent {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  };
  globalThis.fetch = async url => {
    const data = fixtures.get(fixtureKey(url));
    return data
      ? { ok: true, status: 200, async json() { return JSON.parse(JSON.stringify(data)); } }
      : { ok: false, status: 404, async json() { return {}; } };
  };

  try {
    const events = [];
    const scope = {
      location: { href: 'file:///android_asset/index.html' },
      addEventListener() {}, removeEventListener() {},
      dispatchEvent(event) { events.push(event); }
    };
    const runtime = await bootPlushboundGame({ scope, baseUrl: 'file:///android_asset/game/runtime/' });
    assert.equal(typeof globalThis.structuredClone, 'function');
    assert.equal(runtime.session.snapshot().currentMap, 'elyndor-sunny-plains');
    assert.ok(runtime.loadedMapIds.includes('verdancia-lanternbough'));
    runtime.session.interact('lio');
    assert.equal(runtime.session.snapshot().quests['a-thread-begins'].status, 'active');
    assert.ok(events.some(event => event.type === 'plushbound-shell-update'));
    assert.doesNotThrow(() => JSON.stringify(runtime.snapshot()));
  } finally {
    globalThis.structuredClone = originalClone;
    globalThis.fetch = originalFetch;
    globalThis.CustomEvent = originalCustomEvent;
  }
});
