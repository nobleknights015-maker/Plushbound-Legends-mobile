import test from 'node:test';
import assert from 'node:assert/strict';
import {editorDestination,diagnosticDestination,readEditorLink,readSearchLink} from '../../tools/editor/editor-navigation-core.js';
import {indexSource} from '../../tools/editor/project-search-core.js';

test('content search records deep link to exact database record',()=>{
  const rows=indexSource({sourceType:'content',sourceId:'route-one',data:{quests:[{id:'threads-out-of-tune',name:'Threads Out of Tune'}]}});
  const quest=rows.find(row=>row.context?.recordId==='threads-out-of-tune');
  assert.equal(editorDestination(quest),'./database.html?package=route-one&collection=quests&record=threads-out-of-tune');
});

test('runtime map and event records deep link to map manager and map editor',()=>{
  const rows=indexSource({sourceType:'runtime',sourceId:'maps',data:{maps:[{id:'crossing',events:[{id:'anchor-west',pages:[]}]}]}});
  const map=rows.find(row=>row.context?.mapId==='crossing'&&!row.context?.eventId);
  const event=rows.find(row=>row.context?.eventId==='anchor-west');
  assert.equal(editorDestination(map),'./map-manager.html?map=crossing');
  assert.equal(editorDestination(event),'./index.html?map=crossing&event=anchor-west');
});

test('asset records route audio to Audio Browser and visual assets to Map Editor',()=>{
  const rows=indexSource({sourceType:'assets',sourceId:'asset-manifest',data:{entries:[{id:'field-theme',type:'bgm'},{id:'npc/lio/sprite',type:'character-sprite'}]}});
  assert.equal(editorDestination(rows.find(row=>row.context?.assetId==='field-theme')),'./audio.html?asset=field-theme');
  assert.equal(editorDestination(rows.find(row=>row.context?.assetId==='npc/lio/sprite')),'./index.html?asset=npc%2Flio%2Fsprite');
});

test('diagnostics route runtime and source-aware content issues directly to editors',()=>{
  assert.equal(diagnosticDestination({mapId:'crossing',eventId:'anchor-west',id:'missing-shop'}),'./index.html?map=crossing&event=anchor-west');
  assert.equal(diagnosticDestination({mapId:'crossing',id:'missing-map-ref'}),'./map-manager.html?map=crossing');
  assert.equal(diagnosticDestination({packageId:'route-one',collectionKey:'quests',recordId:'threads-out-of-tune',owner:'quest:threads-out-of-tune',id:'missing-item'}),'./database.html?package=route-one&collection=quests&record=threads-out-of-tune');
});

test('diagnostics retain filtered-search fallback when source identity is unavailable',()=>{
  assert.equal(diagnosticDestination({owner:'quest:threads-out-of-tune',id:'missing-item'}),'./project-search.html?q=missing-item&type=content');
  assert.equal(diagnosticDestination({owner:'shop:menders-rest-provisions'}),'./project-search.html?q=menders-rest-provisions&type=content');
});

test('deep-link parsers safely expose supported targets and reject unknown source filters',()=>{
  assert.deepEqual(readEditorLink('?package=route&collection=quests&record=q1&map=m1&event=e1&asset=a1'),{packageId:'route',collectionKey:'quests',recordId:'q1',mapId:'m1',eventId:'e1',assetId:'a1'});
  assert.deepEqual(readSearchLink('?q=threads-out-of-tune&type=content'),{query:'threads-out-of-tune',sourceType:'content'});
  assert.deepEqual(readSearchLink('?q=test&type=unknown'),{query:'test',sourceType:''});
});