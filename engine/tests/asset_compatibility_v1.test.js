import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateAssetCompatibilityV1,validateAssetDescriptorV1,assetCompatibilitySnapshot,mvTilesetSetChildDescriptors,mvTilesetSetSheetAssetId,mvTilesetSetSheetPath} from '../src/assets/AssetCompatibilityV1.js';
import {ContentAssetCatalog} from '../src/assets/ContentAssetCatalog.js';
import {MvTilesetResolver,mvTileSlot,mvTileLocalIndex,mvAutotileKind,mvAutotileShape,mvAutotileSourcePlan} from '../src/render/MvTilesetResolver.js';
import {mvTileSlot as editorSlot,mvTileLocalIndex as editorLocal,mvAutotileKind as editorKind,mvAutotileShape as editorShape} from '../../tools/editor/mv-tile-id-contracts.js';
import {mvAutotileSourcePlan as editorPlan} from '../../tools/editor/mv-autotile-composition.js';

const here=dirname(fileURLToPath(import.meta.url));
const contract=JSON.parse(readFileSync(resolve(here,'../../game/assets/ASSET_COMPATIBILITY_V1.json'),'utf8'));
const productionManifest=JSON.parse(readFileSync(resolve(here,'../../game/assets/asset-manifest.json'),'utf8'));

test('Asset Compatibility V1 is accepted by Engine v1',()=>{
  const result=validateAssetCompatibilityV1(contract);
  assert.equal(result.ok,true,JSON.stringify(result.issues));
  const snap=assetCompatibilitySnapshot(contract);
  assert.deepEqual(snap.screen,[816,624]);
  assert.deepEqual(snap.fieldSprite,[144,192]);
  assert.deepEqual(snap.fieldSafeArea,[48,48]);
  assert.deepEqual(snap.atlas,[1536,1024]);
  assert.deepEqual(snap.tilesetSheets.A5,[384,768]);
});

test('runtime descriptors fail closed when locked geometry is wrong',()=>{
  assert.equal(validateAssetDescriptorV1({id:'npc/test',type:'character-sprite',path:'characters/test.png',status:'ready',layout:'single-character-3x4',width:144,height:192},contract).ok,true);
  const bad=validateAssetDescriptorV1({id:'npc/test',type:'character-sprite',path:'characters/test.png',status:'ready',layout:'single-character-3x4',width:192,height:192},contract);
  assert.equal(bad.ok,false);
  assert.equal(bad.issues[0].code,'ASSET_CHARACTER_RUNTIME_SIZE');
});

test('tileset parent IDs derive exact A1-E child IDs, paths and dimensions',()=>{
  const parent={id:'tileset/elyndor/sunny-plains',type:'tileset',path:'tilesets/elyndor/sunny-plains.png',status:'planned'};
  const children=mvTilesetSetChildDescriptors(parent);
  assert.equal(children.length,9);
  assert.equal(mvTilesetSetSheetAssetId(parent.id,'A1'),'tileset/elyndor/sunny-plains/A1');
  assert.equal(mvTilesetSetSheetPath(parent.path,'A1'),'tilesets/elyndor/sunny-plains/A1.png');
  assert.deepEqual(children.find(child=>child.meta.mvSlot==='A1'),{id:'tileset/elyndor/sunny-plains/A1',type:'tileset-sheet',path:'tilesets/elyndor/sunny-plains/A1.png',status:'planned',width:768,height:576,layout:'mv-a1',meta:{parentId:'tileset/elyndor/sunny-plains',mvSlot:'A1',derivedFromTilesetSet:true}});
  assert.equal(validateAssetDescriptorV1(children.find(child=>child.meta.mvSlot==='A4'),contract).ok,true);
});

test('Engine v1 consumes production manifest and registers derived A1-E sheets',()=>{
  const catalog=new ContentAssetCatalog();
  const validation=catalog.registerManifest(productionManifest);
  const tilesetCount=productionManifest.entries.filter(entry=>entry.type==='tileset').length;
  assert.equal(validation.valid,true);
  assert.equal(validation.registered,productionManifest.entries.length+tilesetCount*9);
  const sample=productionManifest.entries.find(entry=>entry.type==='character-sprite')||productionManifest.entries[0];
  assert.ok(catalog.has(sample.id));
  assert.equal(catalog.get(sample.id).status,sample.status);
  const tileset=productionManifest.entries.find(entry=>entry.type==='tileset');
  assert.ok(tileset);
  for(const slot of ['A1','A2','A3','A4','A5','B','C','D','E']){
    const id=`${tileset.id}/${slot}`,entry=catalog.get(id);
    assert.ok(entry,`missing derived ${id}`);
    assert.equal(entry.meta.parentId,tileset.id);
    assert.equal(entry.meta.mvSlot,slot);
  }
});

test('ContentAssetCatalog preserves deterministic slicing metadata',()=>{
  const catalog=new ContentAssetCatalog();
  catalog.register({id:'character/test/field',path:'characters/test.png',type:'character-sprite',status:'ready',width:144,height:192,layout:'single-character-3x4',frameWidth:48,frameHeight:48,columns:3,rows:4,atlas:{templateId:'plushbound-character-atlas-v1',slotId:'field.down.1'}});
  const entry=catalog.get('character/test/field');
  assert.deepEqual({width:entry.width,height:entry.height,layout:entry.layout,frameWidth:entry.frameWidth,frameHeight:entry.frameHeight,columns:entry.columns,rows:entry.rows},{width:144,height:192,layout:'single-character-3x4',frameWidth:48,frameHeight:48,columns:3,rows:4});
  assert.equal(entry.atlas.templateId,'plushbound-character-atlas-v1');
});

test('engine and editor agree on every MV tile slot and local index',()=>{
  for(let id=0;id<8192;id++){
    assert.equal(mvTileSlot(id),editorSlot(id),`slot mismatch tile ${id}`);
    assert.equal(mvTileLocalIndex(id),editorLocal(id),`local mismatch tile ${id}`);
    assert.equal(mvAutotileKind(id),editorKind(id),`kind mismatch tile ${id}`);
    assert.equal(mvAutotileShape(id),editorShape(id),`shape mismatch tile ${id}`);
  }
});

test('engine A1-A4 quarter composition matches editor contract across all valid autotiles',()=>{
  for(let id=2048;id<8192;id++){
    const slot=mvTileSlot(id);if(!['A1','A2','A3','A4'].includes(slot))continue;
    for(const frame of [0,1,2,3]){
      const engine=mvAutotileSourcePlan(id,{animationFrame:frame});
      const editor=editorPlan(id,{animationFrame:frame});
      assert.equal(engine.sheetId,editor.slot,`slot mismatch ${id}/${frame}`);
      assert.equal(engine.family,editor.family,`family mismatch ${id}/${frame}`);
      assert.equal(engine.supported,editor.supported,`support mismatch ${id}/${frame}`);
      assert.deepEqual(engine.sourceBlock,editor.sourceBlock,`block mismatch ${id}/${frame}`);
      assert.deepEqual(engine.quadrants.map(q=>q.sourcePixel),editor.quadrants.map(q=>q.sourcePixel),`source pixels mismatch ${id}/${frame}`);
      assert.deepEqual(engine.quadrants.map(q=>q.destinationPixel),editor.quadrants.map(q=>q.destinationPixel),`destination pixels mismatch ${id}/${frame}`);
    }
  }
});

test('engine directly resolves normal A5 and B-E tiles to 48px source cells',()=>{
  const resolver=new MvTilesetResolver({images:{A5:'a5.png',B:'b.png',E:'e.png'}});
  assert.deepEqual(resolver.resolve(1536),{kind:'direct',tileId:1536,sheetId:'A5',image:'a5.png',localIndex:0,sx:0,sy:0,sw:48,sh:48});
  assert.equal(resolver.resolve(1663).sx,336);
  assert.equal(resolver.resolve(1663).sy,720);
  assert.equal(resolver.resolve(0).image,'b.png');
  assert.equal(resolver.resolve(768).image,'e.png');
});
