import test from 'node:test';
import assert from 'node:assert/strict';
import {MV_DATABASE_FILES} from '../../tools/editor/mv-project-core.js';
import {importMvProjectData,exportMvProjectData,mvEditorTileAt,verifyMvRoundTrip} from '../../tools/editor/mv-editor-adapter.js';

function audio(){return {name:'',pan:0,pitch:100,volume:90};}
function filesFixture(){
  const files={};
  for(const name of MV_DATABASE_FILES) files[name]=[null,{id:1,name:'Test'}];
  files['MapInfos.json']=[null,{id:1,name:'Map',order:1,parentId:0,expanded:false,scrollX:0,scrollY:0}];
  files['System.json']={startMapId:1,startX:1,startY:0,switches:[''],variables:[''],elements:[''],skillTypes:[''],weaponTypes:[''],armorTypes:[''],equipTypes:['']};
  const width=2,height=2,count=4;
  files['Map001.json']={
    width,height,tilesetId:1,data:Array.from({length:count*6},(_,i)=>i),
    events:[null,{id:1,name:'Touch Event',note:'keep',x:0,y:1,pages:[{conditions:{switch1Valid:false},image:{characterName:'',characterIndex:0,direction:2,pattern:1,tileId:0},moveType:0,moveSpeed:3,moveFrequency:3,moveRoute:{repeat:true,skippable:false,wait:false,list:[{code:0,parameters:[]}]},walkAnime:true,stepAnime:false,directionFix:false,through:false,priorityType:1,trigger:2,list:[{code:0,indent:0,parameters:[]}]}]}],
    encounterList:[],displayName:'Round Trip',futureField:{keep:true},
    bgm:audio(),bgs:audio(),autoplayBgm:false,autoplayBgs:false,disableDashing:false,parallaxLoopX:false,parallaxLoopY:false,parallaxShow:false,specifyBattleback:false,encounterStep:30,parallaxSx:0,parallaxSy:0,scrollType:0
  };
  return files;
}

test('imports six MV layers into four editable tile layers plus shadow and region grids',()=>{
  const project=importMvProjectData(filesFixture(),{strictExtended:false});
  const map=project.maps[0];
  assert.equal(map.layers.length,4);
  assert.deepEqual(map.layers[0].data,[0,1,2,3]);
  assert.deepEqual(map.mvShadowBits,[16,17,18,19]);
  assert.deepEqual(map.regions,[20,21,22,23]);
  assert.equal(mvEditorTileAt(project,'1',1,1,5),23);
  assert.equal(map.events[0].pages[0].trigger,'touch');
  assert.equal(map.events[0].pages[0].mvTrigger,2);
});

test('round trips untouched MV project data byte-for-byte at JSON value level',()=>{
  const files=filesFixture();
  assert.deepEqual(verifyMvRoundTrip(files),{ok:true,issues:[]});
});

test('exports editor tile, region, event position and start-position edits into MV serialization',()=>{
  const project=importMvProjectData(filesFixture(),{strictExtended:false});
  const map=project.maps[0];
  map.layers[0].data[0]=777;
  map.regions[3]=9;
  map.events[0].x=1;
  project.start={mapId:'1',x:0,y:1,direction:2};
  const out=exportMvProjectData(project);
  assert.equal(out['Map001.json'].data[0],777);
  assert.equal(out['Map001.json'].data[23],9);
  assert.equal(out['Map001.json'].events[1].x,1);
  assert.equal(out['Map001.json'].events[1].pages[0].trigger,2);
  assert.deepEqual([out['System.json'].startMapId,out['System.json'].startX,out['System.json'].startY],[1,0,1]);
  assert.equal(out['Map001.json'].futureField.keep,true);
});

test('rejects invalid MV event IDs during export instead of inventing identifiers',()=>{
  const project=importMvProjectData(filesFixture(),{strictExtended:false});
  project.maps[0].events[0].id='npc-a';
  assert.throws(()=>exportMvProjectData(project),/positive integer/);
});
