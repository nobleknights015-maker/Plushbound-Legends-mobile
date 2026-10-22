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

test('Android game bootstrap creates a session on the frozen engine baseline and enters Elyndor', async () => {
  const originalFetch = globalThis.fetch;
  const originalCustomEvent = globalThis.CustomEvent;
  globalThis.CustomEvent = globalThis.CustomEvent || class CustomEvent {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  };
  globalThis.fetch = async url => {
    const name = new URL(url).pathname.split('/').pop();
    const data = fixtures.get(name);
    return data
      ? { ok: true, status: 200, async json() { return structuredClone(data); } }
      : { ok: false, status: 404, async json() { return {}; } };
  };

  try {
    const events = [];
    const scope = {
      location: { href: 'file:///android_asset/index.html' },
      dispatchEvent(event) { events.push(event); }
    };
    const runtime = await bootPlushboundGame({
      scope,
      baseUrl: 'file:///android_asset/game/runtime/'
    });

    assert.equal(runtime.engineBaseline, '160d9fd95bc0d3db39224f8bb4c5e1e3a1f54425');
    assert.equal(runtime.session.snapshot().currentMap, 'elyndor-sunny-plains');
    assert.equal(scope.PlushboundGame, runtime);
    assert.equal(events.at(-1)?.type, 'plushbound-game-ready');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.CustomEvent = originalCustomEvent;
  }
});
