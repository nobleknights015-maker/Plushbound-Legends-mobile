import test from 'node:test';
import assert from 'node:assert/strict';
import {MV_DATABASE_FILES,detectMvProject,validateMvDatabase,createMvCompatibilityPackage,mvMapCellIndex,mvMapCell} from '../../tools/editor/mv-project-core.js';

function numbered(record={id:1,name:'Test'}){return [null,record];}
function fixture(){
  const files={};
  for(const name of MV_DATABASE_FILES) files[name]=numbered();
  files['MapInfos.json']=numbered({id:1,name:'Test Map',order:1,parentId:0});
  files['System.json']={startMapId:1,startX:2,startY:1,switches:[''],variables:[''],elements:[''],skillTypes:[''],weaponTypes:[''],armorTypes:[''],equipTypes:['']};
  files['Map001.json']={width:3,height:2,tilesetId:1,data:Array.from({length:36},(_,i)=>i),events:[null],encounterList:[],displayName:'Compatibility Fixture',futureField:{keep:true}};
  return files;
}

test('detects a complete MV project data set',()=>{
  const result=detectMvProject(fixture());assert.equal(result.isMvProject,true);assert.deepEqual(result.missing,[]);assert.deepEqual(result.maps,['Map001.json']);
});

test('validates core MV database and six-layer map contracts',()=>{
  const result=validateMvDatabase(fixture());assert.equal(result.ok,true);assert.deepEqual(result.issues,[]);
});

test('rejects missing core database files',()=>{
  const files=fixture();delete files['Actors.json'];const result=validateMvDatabase(files);assert.equal(result.ok,false);assert.ok(result.issues.some(x=>x.code==='MV_FILE_MISSING'));
});

test('rejects a map with the wrong MV data-array size',()=>{
  const files=fixture();files['Map001.json'].data.pop();const result=validateMvDatabase(files);assert.equal(result.ok,false);assert.ok(result.issues.some(x=>x.code==='MV_MAP_DATA_SIZE'));
});

test('rejects a System start map that is not present',()=>{
  const files=fixture();files['System.json'].startMapId=2;const result=validateMvDatabase(files);assert.ok(result.issues.some(x=>x.code==='MV_START_MAP_MISSING'));
});

test('packages MV data without mutating or discarding unknown fields',()=>{
  const files=fixture();const pkg=createMvCompatibilityPackage(files);assert.equal(pkg.format,'rpg-maker-mv-project-data');assert.deepEqual(pkg.start,{mapId:1,x:2,y:1});assert.equal(pkg.maps[1].futureField.keep,true);pkg.maps[1].futureField.keep=false;assert.equal(files['Map001.json'].futureField.keep,true);
});

test('uses MV x/y/z map indexing exactly',()=>{
  const files=fixture();const map=files['Map001.json'];assert.equal(mvMapCellIndex(3,2,2,1,5),35);assert.equal(mvMapCell(map,2,1,5),35);assert.throws(()=>mvMapCell(map,3,0,0),RangeError);
});
