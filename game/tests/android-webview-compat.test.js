import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { bootPlushboundGame } from '../runtime/AndroidGameBootstrap.js';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const fixtures = new Map([
  ['content-index.json', read('content/content-index.json')],
  ['opening-elyndor.json', read('content/opening-elyndor.json')],
  ['elyndor-route-one.json', read('content/elyndor-route-one.json')],
  ['elyndor-route-one.maps.json', read('runtime/elyndor-route-one.maps.json')]
]);

test('Android bootstrap supplies structuredClone compatibility before frozen engine map registration', async () => {
  const originalClone = globalThis.structuredClone;
  const originalFetch = globalThis.fetch;
  const originalCustomEvent = globalThis.CustomEvent;
  globalThis.structuredClone = undefined;
  globalThis.CustomEvent = globalThis.CustomEvent || class CustomEvent {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  };
  globalThis.fetch = async url => {
    const name = new URL(url).pathname.split('/').pop();
    const data = fixtures.get(name);
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
