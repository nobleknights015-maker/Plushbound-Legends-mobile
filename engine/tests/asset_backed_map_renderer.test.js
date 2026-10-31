import test from 'node:test';
import assert from 'node:assert/strict';
import {ContentAssetCatalog} from '../src/assets/ContentAssetCatalog.js';
import {AssetBackedMapRenderer,createAssetBackedMvTilesetResolver} from '../src/render/AssetBackedMapRenderer.js';

function catalogFixture(){
  const catalog=new ContentAssetCatalog();
  catalog.registerManifest({entries:[{id:'tileset/test/plains',type:'tileset',path:'tilesets/test/plains.png',status:'planned'}]});
  return catalog;
}

test('asset-backed resolver derives all nine sheet asset IDs from one map-facing tileset ID',()=>{
  const catalog=catalogFixture(),resolver=createAssetBackedMvTilesetResolver('tileset/test/plains',{catalog});
  assert.equal(resolver.resolve(2816,{animationFrame:0}).image,'tileset/test/plains/A2');
  assert.equal(resolver.resolve(1536).image,'tileset/test/plains/A5');
  assert.equal(resolver.resolve(0).image,'tileset/test/plains/B');
  assert.equal(catalog.get('tileset/test/plains/A4').path,'tilesets/test/plains/A4.png');
  assert.equal(catalog.get('tileset/test/plains/A4').width,768);
  assert.equal(catalog.get('tileset/test/plains/A4').height,720);
});

test('map renderer automatically resolves parent tileset ID into MV sheet sources',()=>{
  const renderer=new AssetBackedMapRenderer({catalog:catalogFixture(),strict:true});
  const map={id:'map/test',width:2,height:1,tileset:'tileset/test/plains',layers:[{id:'ground',z:0,data:[2816,1536]}]};
  const result=renderer.buildDrawList({map,clockMs:0});
  const tiles=result.commands.filter(command=>command.kind==='tile');
  assert.equal(tiles.length,2);
  assert.equal(tiles[0].source.sheetId,'A2');
  assert.equal(tiles[0].source.image,'tileset/test/plains/A2');
  assert.equal(tiles[0].source.quadrants.length,4);
  assert.equal(tiles[1].source.sheetId,'A5');
  assert.equal(tiles[1].source.image,'tileset/test/plains/A5');
  assert.equal(tiles[1].source.sw,48);
});

test('A1 animation phase advances through the normal map renderer clock',()=>{
  const renderer=new AssetBackedMapRenderer({catalog:catalogFixture()});
  const map={width:1,height:1,tileset:'tileset/test/plains',layers:[{data:[2048]}]};
  const a=renderer.buildDrawList({map,clockMs:0}).commands[0].source;
  const b=renderer.buildDrawList({map,clockMs:400}).commands[0].source;
  assert.equal(a.sheetId,'A1');assert.equal(b.sheetId,'A1');
  assert.notDeepEqual(a.sourceBlock,b.sourceBlock);
  assert.equal(a.animationPhase,0);assert.equal(b.animationPhase,1);
});

test('map renderer fails closed when a map has no stable string tileset ID',()=>{
  const renderer=new AssetBackedMapRenderer({catalog:catalogFixture()});
  assert.throws(()=>renderer.buildDrawList({map:{width:1,height:1,tilesetId:1,layers:[{data:[1]}]}}),/stable string tileset parent asset ID/);
});

test('render executes resolved map commands through a backend without manual sheet wiring',()=>{
  const renderer=new AssetBackedMapRenderer({catalog:catalogFixture()}),drawn=[];
  const backend={beginFrame:()=>drawn.push('begin'),draw:command=>drawn.push(command),endFrame:()=>drawn.push('end')};
  const result=renderer.render({backend,map:{width:1,height:1,tileset:'tileset/test/plains',layers:[{data:[1536]}]}});
  assert.equal(result.commands.length,1);
  assert.equal(drawn[0],'begin');assert.equal(drawn.at(-1),'end');
  assert.equal(drawn[1].source.image,'tileset/test/plains/A5');
});
