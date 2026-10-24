import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EngineV11EditorBridge, adaptEditorPackage, validateEditorPackage } from '../runtime/EngineV11EditorBridge.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const routePath = path.resolve(here, '../runtime/elyndor-route-one.maps.json');
const route = JSON.parse(fs.readFileSync(routePath, 'utf8'));

test('Engine v1.1 validates and adapts the real Elyndor editor/runtime package', () => {
  const bridge = new EngineV11EditorBridge();
  const validation = bridge.validate(route);
  assert.equal(validation.ok, true, JSON.stringify(validation.errors));
  const result = bridge.load(route);
  assert.equal(result.package.maps.length, route.maps.length);
  assert.equal(result.package.maps[0].id, route.maps[0].id);
  assert.equal(result.package.engineV11.editorBridge, 1);
  assert.equal(result.package.maps[0].regions.length, route.maps[0].width * route.maps[0].height);
});

test('Engine v1.1 preserves authored data while normalizing editor grids', () => {
  const source = { schemaVersion: 1, customFutureField: { keep: true }, maps: [{ id: 'round-trip', width: 2, height: 2, customMapField: 'preserve-me', layers: [{ id: 'ground', data: [[1, 2], [3, 4]], customLayerField: 9 }], events: [{ id: 'npc-1', x: 0, y: 0, customEventField: 'keep', pages: [{ trigger: 'action', commands: [] }] }] }] };
  const { package: adapted } = adaptEditorPackage(source);
  assert.deepEqual(adapted.customFutureField, { keep: true });
  assert.equal(adapted.maps[0].customMapField, 'preserve-me');
  assert.equal(adapted.maps[0].layers[0].customLayerField, 9);
  assert.deepEqual(adapted.maps[0].layers[0].data, [1, 2, 3, 4]);
  assert.equal(adapted.maps[0].events[0].customEventField, 'keep');
  assert.deepEqual(source.maps[0].layers[0].data, [[1, 2], [3, 4]], 'source package must not be mutated');
});

test('Engine v1.1 rejects broken transfers before runtime', () => {
  const source = { maps: [{ id: 'a', width: 2, height: 2, events: [{ id: 'exit', x: 1, y: 1, pages: [{ trigger: 'touch', commands: [{ code: 'TRANSFER', parameters: ['missing', 0, 0, 2] }] }] }] }] };
  const result = validateEditorPackage(source);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(issue => issue.code === 'TRANSFER_MAP_MISSING'));
  assert.throws(() => adaptEditorPackage(source), error => error.code === 'ENGINE_V11_EDITOR_VALIDATION_FAILED');
});

test('Engine v1.1 rejects unresolved event assets when a manifest is supplied', () => {
  const source = { maps: [{ id: 'a', width: 1, height: 1, events: [{ id: 'npc', x: 0, y: 0, assetId: 'npc/missing', pages: [] }] }] };
  const result = validateEditorPackage(source, { assetIds: ['npc/known'] });
  assert.equal(result.ok, false);
  const issue = result.errors.find(entry => entry.code === 'MISSING_ASSET');
  assert.equal(issue.objectId, 'npc'); assert.equal(issue.value, 'npc/missing');
});

test('Engine v1.1 rejects duplicate stable IDs and invalid event positions', () => {
  const source = { maps: [{ id: 'same', width: 1, height: 1, events: [{ id: 'x', x: 2, y: 0 }, { id: 'x', x: 0, y: 0 }] }, { id: 'same', width: 1, height: 1, events: [] }] };
  const result = validateEditorPackage(source);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(issue => issue.code === 'MAP_ID_DUPLICATE'));
  assert.ok(result.errors.some(issue => issue.code === 'EVENT_ID_DUPLICATE'));
  assert.ok(result.errors.some(issue => issue.code === 'EVENT_POSITION_INVALID'));
});

test('Engine v1.1 validates the editor-selected game start', () => {
  const source = { maps: [{ id: 'home', width: 3, height: 3, events: [] }] };
  assert.equal(validateEditorPackage(source, { start: { mapId: 'home', x: 2, y: 2, direction: 6 } }).ok, true);
  const missing = validateEditorPackage(source, { start: { mapId: 'missing' } });
  assert.ok(missing.errors.some(issue => issue.code === 'START_MAP_MISSING'));
  const outside = validateEditorPackage(source, { start: { mapId: 'home', x: 3, y: 0, direction: 6 } });
  assert.ok(outside.errors.some(issue => issue.code === 'START_POSITION_INVALID'));
  const direction = validateEditorPackage(source, { start: { mapId: 'home', x: 0, y: 0, direction: 5 } });
  assert.ok(direction.errors.some(issue => issue.code === 'START_DIRECTION_INVALID'));
});

test('Engine v1.1 rejects malformed editor collections instead of silently dropping them', () => {
  const source = { maps: [{ id: 'bad', width: 2, height: 2, layers: {}, events: {}, blocked: {}, regions: {} }] };
  const result = validateEditorPackage(source);
  assert.equal(result.ok, false);
  for (const code of ['LAYERS_INVALID', 'EVENTS_INVALID', 'BLOCKED_INVALID', 'MAP_GRID_INVALID']) assert.ok(result.errors.some(issue => issue.code === code), code);
});

test('Engine v1.1 normalizes short region grids and reports the repair', () => {
  const source = { maps: [{ id: 'grid', width: 2, height: 2, regions: [7], events: [] }] };
  const result = adaptEditorPackage(source);
  assert.deepEqual(result.package.maps[0].regions, [7, 0, 0, 0]);
  assert.ok(result.validation.warnings.some(issue => issue.code === 'MAP_GRID_SIZE_NORMALIZED'));
});
