import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CHARACTER_ATLAS_V1} from '../../tools/editor/character-atlas-v1-core.js';
import {MV_AUDIO_CATEGORIES,MV_AUDIO_EXTENSIONS,MV_IMAGE_EXTENSION} from '../../tools/editor/mv-shell-contracts.js';
import {MV_TILE_IDS,MV_TILE_COUNTS} from '../../tools/editor/mv-tile-id-contracts.js';
import {MV_FLOOR_AUTOTILE_TABLE,MV_WALL_AUTOTILE_TABLE,MV_WATERFALL_AUTOTILE_TABLE} from '../../tools/editor/mv-autotile-composition.js';

const here=dirname(fileURLToPath(import.meta.url));
const contract=JSON.parse(readFileSync(resolve(here,'../assets/ASSET_COMPATIBILITY_V1.json'),'utf8'));
const manifest=JSON.parse(readFileSync(resolve(here,'../assets/asset-manifest.json'),'utf8'));

test('asset compatibility handoff is locked to established editor/runtime fundamentals',()=>{
  assert.equal(contract.schemaVersion,1);
  assert.equal(contract.id,'plushbound-asset-compatibility-v1');
  assert.equal(contract.global.tileSize,manifest.tileSize);
  assert.deepEqual([contract.global.screenWidth,contract.global.screenHeight],[816,624]);
  assert.equal(contract.referencePolicy.runtimeArtMustBeOriginal,true);
  assert.equal(contract.referencePolicy.copyReferencePixels,false);
  assert.equal(contract.global.visualInferenceForbidden,true);
});

test('Character Atlas V1 handoff exactly matches the compiler contract',()=>{
  assert.equal(contract.characters.atlasV1.templateId,CHARACTER_ATLAS_V1.id);
  assert.equal(contract.characters.atlasV1.version,CHARACTER_ATLAS_V1.version);
  assert.equal(contract.characters.atlasV1.width,CHARACTER_ATLAS_V1.width);
  assert.equal(contract.characters.atlasV1.height,CHARACTER_ATLAS_V1.height);
  assert.equal(contract.characters.atlasV1.format,CHARACTER_ATLAS_V1.format);
});

test('tileset geometry covers the entire observable MV A1-E layout contract',()=>{
  const s=contract.tilesets.sheets;
  assert.deepEqual([s.A1.width,s.A1.height],[768,576]);
  assert.deepEqual([s.A2.width,s.A2.height],[768,576]);
  assert.deepEqual([s.A3.width,s.A3.height],[768,384]);
  assert.deepEqual([s.A4.width,s.A4.height],[768,720]);
  assert.deepEqual([s.A5.width,s.A5.height,s.A5.columns,s.A5.rows],[384,768,8,16]);
  for(const key of ['B','C','D','E'])assert.deepEqual([s[key].width,s[key].height,s[key].columns,s[key].rows],[768,768,16,16]);
  assert.equal(MV_TILE_IDS.A5,1536);assert.equal(MV_TILE_COUNTS.A5,128);
  assert.equal(contract.tilesets.autotiles.floorShapes,MV_FLOOR_AUTOTILE_TABLE.length);
  assert.equal(contract.tilesets.autotiles.wallShapes,MV_WALL_AUTOTILE_TABLE.length);
  assert.equal(contract.tilesets.autotiles.waterfallShapes,MV_WATERFALL_AUTOTILE_TABLE.length);
});

test('field, face, UI and audio handoff dimensions are deterministic',()=>{
  const f=contract.characters.fieldRuntime;
  assert.deepEqual([f.width,f.height,f.frameWidth,f.frameHeight,f.columns,f.rows],[144,192,48,48,3,4]);
  assert.deepEqual(f.directionRows,['down','left','right','up']);
  const face=contract.faces.mvReferenceSheet;
  assert.deepEqual([face.width,face.height,face.cellWidth,face.cellHeight,face.columns,face.rows],[576,288,144,144,4,2]);
  assert.deepEqual([contract.ui.icon.runtimeNative.width,contract.ui.icon.runtimeNative.height],[32,32]);
  assert.equal(MV_IMAGE_EXTENSION,'.png');
  assert.deepEqual(contract.audio.categories,MV_AUDIO_CATEGORIES);
  assert.deepEqual(contract.audio.mvReferenceExtensions,MV_AUDIO_EXTENSIONS);
});

test('manifest entry policy remains compatible with existing game asset manifest',()=>{
  assert.deepEqual(contract.manifestEntry.statuses,manifest.statuses);
  for(const entry of manifest.entries){
    for(const field of contract.manifestEntry.requiredFields)assert.ok(entry[field],`${entry.id||'entry'} missing ${field}`);
    assert.ok(!entry.path.startsWith('/'));
    assert.ok(!entry.path.includes('..'));
  }
});
