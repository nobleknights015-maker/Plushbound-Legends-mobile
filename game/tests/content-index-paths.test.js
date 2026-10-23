import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(here, '../content');
const index = JSON.parse(readFileSync(resolve(contentDir, 'content-index.json'), 'utf8'));

function resolveIndexPath(relativePath) {
  return resolve(contentDir, relativePath);
}

test('every required content and runtime package path in the index exists', () => {
  for (const entry of [...(index.packages || []), ...(index.runtimePackages || [])]) {
    assert.ok(entry.id, 'indexed package must have an id');
    assert.ok(entry.path, `${entry.id} must have a path`);
    assert.ok(existsSync(resolveIndexPath(entry.path)), `${entry.id} points to missing path ${entry.path}`);
  }
});

test('required asset libraries expose their declared manifest', () => {
  for (const library of index.assetLibraries || []) {
    assert.ok(library.id, 'asset library must have an id');
    assert.ok(existsSync(resolveIndexPath(library.root)), `${library.id} root is missing: ${library.root}`);
    assert.ok(existsSync(resolveIndexPath(library.manifest)), `${library.id} manifest is missing: ${library.manifest}`);
  }
});

test('Verdancia regional progression points only to registered package ids', () => {
  const registered = new Set([
    ...(index.packages || []).map(entry => entry.id),
    ...(index.runtimePackages || []).map(entry => entry.id),
    ...(index.assetLibraries || []).map(entry => entry.id)
  ]);
  const verdancia = (index.regionalProgression || []).find(entry => entry.regionId === 'verdancia');
  assert.ok(verdancia, 'Verdancia regional progression entry is required');
  for (const [key, value] of Object.entries(verdancia)) {
    if (!key.endsWith('PackageId') && !key.endsWith('LibraryId')) continue;
    assert.ok(registered.has(value), `Verdancia ${key} points to unregistered id ${value}`);
  }
});
