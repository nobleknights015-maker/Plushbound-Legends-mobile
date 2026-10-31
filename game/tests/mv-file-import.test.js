import test from 'node:test';
import assert from 'node:assert/strict';
import {MV_DATABASE_FILES} from '../../tools/editor/mv-project-core.js';
import {collectMvJsonFiles,importMvFiles,exportMvFiles,isMvEditorProject} from '../../tools/editor/mv-file-import.js';

function fake(name,data,path=`Project/data/${name}`){return {name,webkitRelativePath:path,text:async()=>JSON.stringify(data)};}
function audio(){return {name:'',pan:0,pitch:100,volume:90};}
function end(){return {code:0,indent:0,parameters:[]};}
function tileset(){return {id:1,name:'Test',mode:0,tilesetNames:['A1','A2','A3','A4','A5','B','C','D','E'],flags:new Array(8192).fill(0),note:''};}
function dataset(){
  const files={};for(const name of MV_DATABASE_FILES)files[name]=[null,{id:1,name:'Test'}];
  files['Tilesets.json']=[null,tileset()];files['CommonEvents.json']=[null,{id:1,name:'Test',trigger:0,switchId:1,list:[end()]}];
  files['MapInfos.json']=[null,{id:1,name:'Map',order:1,parentId:0,expanded:false,scrollX:0,scrollY:0}];
  files['System.json']={startMapId:1,startX:0,startY:0,switches:[''],variables:[''],elements:[''],skillTypes:[''],weaponTypes:[''],armorTypes:[''],equipTypes:['']};
  files['Map001.json']={width:1,height:1,tilesetId:1,data:[0,0,0,0,0,0],events:[null],encounterList:[],displayName:'Map',bgm:audio(),bgs:audio(),autoplayBgm:false,autoplayBgs:false,disableDashing:false,parallaxLoopX:false,parallaxLoopY:false,parallaxShow:false,specifyBattleback:false,encounterStep:30,parallaxSx:0,parallaxSy:0,scrollType:0};return files;
}

test('collects only MV database and Map### JSON from a selected data folder',async()=>{
  const data=dataset();const selection=[...Object.entries(data).map(([n,v])=>fake(n,v)),fake('ignore.json',{x:1}),{name:'Actor1.png',webkitRelativePath:'Project/img/characters/Actor1.png',text:async()=>''}];
  const result=await collectMvJsonFiles(selection);assert.equal(result.ok,true);assert.deepEqual(result.maps,['Map001.json']);assert.equal(Object.keys(result.files).length,MV_DATABASE_FILES.length+1);assert.equal(result.sources['System.json'],'Project/data/System.json');
});

test('fails closed on missing or duplicate MV data files',async()=>{
  const data=dataset();delete data['Actors.json'];const files=Object.entries(data).map(([n,v])=>fake(n,v));files.push(fake('System.json',data['System.json'],'Other/data/System.json'));
  const result=await collectMvJsonFiles(files);assert.equal(result.ok,false);assert.ok(result.errors.some(x=>x.code==='MV_IMPORT_DATABASE_MISSING'&&x.file==='Actors.json'));assert.ok(result.errors.some(x=>x.code==='MV_IMPORT_DUPLICATE_FILE'&&x.file==='System.json'));
});

test('imports selected MV JSON into the lossless editor adapter and exports it back',async()=>{
  const data=dataset();const project=await importMvFiles(Object.entries(data).map(([n,v])=>fake(n,v)));assert.equal(isMvEditorProject(project),true);assert.equal(project.maps.length,1);const exported=exportMvFiles(project);assert.ok(exported.some(x=>x.name==='Map001.json'));assert.deepEqual(JSON.parse(exported.find(x=>x.name==='System.json').text),data['System.json']);
});
