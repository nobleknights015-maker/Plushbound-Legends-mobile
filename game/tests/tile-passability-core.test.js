import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {clone,ensureAuthoringMap,observedTileIds,tileAt,paintTile,regionAt,paintRegion,isBlocked,paintBlocked,validatePassabilityMap,tilesetUsage} from '../../tools/editor/tile-passability-core.js';

const source=JSON.parse(readFileSync(new URL('../runtime/elyndor-route-one.maps.json',import.meta.url),'utf8'));

test('authoring map normalization creates runtime-native layer and region grids without mutating source',()=>{
  const original=clone(source.maps[0]);
  const map=clone(original);
  ensureAuthoringMap(map);
  assert.equal(map.layers.length,1);
  assert.equal(map.layers[0].data.length,map.width*map.height);
  assert.equal(map.regions.length,map.width*map.height);
  assert.deepEqual(source.maps[0],original);
});

test('tile palette reflects observed numeric tile ids and supports paint/erase',()=>{
  const map=clone(source.maps[0]);ensureAuthoringMap(map);
  paintTile(map,0,2,3,17);paintTile(map,0,3,3,4);
  assert.equal(tileAt(map,0,2,3),17);
  assert.deepEqual(observedTileIds(map),[0,4,17]);
  paintTile(map,0,2,3,0);
  assert.equal(tileAt(map,0,2,3),0);
});

test('blocked painting deduplicates, erases and stays in map bounds',()=>{
  const map=clone(source.maps[0]);ensureAuthoringMap(map);
  paintBlocked(map,5,6,true);paintBlocked(map,5,6,true);
  assert.equal(map.blocked.filter(value=>value==='5,6').length,1);
  paintBlocked(map,999,-2,true);
  assert.ok(map.blocked.includes(`${map.width-1},0`));
  paintBlocked(map,5,6,false);
  assert.equal(isBlocked(map,5,6),false);
});

test('region brush uses the native full-size numeric region grid',()=>{
  const map=clone(source.maps[0]);ensureAuthoringMap(map);
  paintRegion(map,8,9,12);
  assert.equal(regionAt(map,8,9),12);
  paintRegion(map,8,9,0);
  assert.equal(regionAt(map,8,9),0);
});

test('passability validation catches malformed and out-of-bounds blocked cells',()=>{
  const map=clone(source.maps[0]);ensureAuthoringMap(map);
  map.blocked.push('oops',`${map.width},0`);
  const issues=validatePassabilityMap(map);
  assert.ok(issues.some(issue=>issue.code==='blocked-format'));
  assert.ok(issues.some(issue=>issue.code==='blocked-bounds'));
});

test('tileset usage reports logical runtime tileset ids without inventing metadata',()=>{
  const usage=tilesetUsage(source);
  assert.ok(usage.some(entry=>entry.tilesetId==='tileset/elyndor/sunny-plains'&&entry.mapIds.includes('elyndor-sunny-plains')));
});
