import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const gameRoot = resolve(here, '..');
const read = path => JSON.parse(readFileSync(resolve(gameRoot, path), 'utf8'));

const manifest = read('assets/asset-manifest.json');
const slots = read('content/elyndor-asset-slots.json');
const guardians = read('content/guardians.json');

const entryById = new Map(manifest.entries.map(entry => [entry.id, entry]));

test('game asset library has stable unique logical IDs and safe relative paths', () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.game, 'Plushbound Legends');
  assert.equal(manifest.tileSize, 48);
  assert.equal(entryById.size, manifest.entries.length, 'asset logical IDs must be unique');
  for (const entry of manifest.entries) {
    assert.ok(entry.id && entry.type && entry.path && entry.status, `invalid asset entry ${JSON.stringify(entry)}`);
    assert.ok(!entry.path.startsWith('/'), `${entry.id} path must be relative`);
    assert.ok(!entry.path.includes('..'), `${entry.id} path cannot escape game/assets`);
    assert.ok(manifest.statuses.includes(entry.status), `${entry.id} has unsupported status ${entry.status}`);
  }
});

test('every established Elyndor asset slot has a physical-library destination', () => {
  for (const slot of slots.slots) {
    assert.ok(entryById.has(slot.id), `missing manifest destination for ${slot.id}`);
  }
});

test('all four starter Guardian bindings have physical-library destinations', () => {
  assert.equal(guardians.starters.length, 4);
  for (const guardian of guardians.starters) {
    for (const id of Object.values(guardian.assetBindings || {})) {
      assert.ok(entryById.has(id), `missing Guardian asset destination ${id}`);
    }
  }
});

test('ready or placeholder assets must exist physically, while planned slots may be empty', () => {
  for (const entry of manifest.entries) {
    if (!['ready', 'placeholder'].includes(entry.status)) continue;
    assert.ok(existsSync(resolve(gameRoot, 'assets', entry.path)), `${entry.status} asset missing: ${entry.id} -> ${entry.path}`);
  }
});

test('major asset category roots are committed', () => {
  for (const category of ['characters','guardians','enemies','tilesets','environment','ui','items','animations','audio','fonts']) {
    assert.ok(existsSync(resolve(gameRoot, 'assets', category, 'README.md')), `missing category root ${category}`);
  }
});
