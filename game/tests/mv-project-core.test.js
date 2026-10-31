import test from 'node:test';
import assert from 'node:assert/strict';
import {MV_DATABASE_FILES,MV_SCREEN,detectMvProject,detectMvArchiveLayout,classifyMvProjectPath,mvCharacterSheetGeometry,mvFaceSheetGeometry,mvTilesetSheetGeometry,validateMvDatabase,createMvCompatibilityPackage,mvMapCellIndex,mvMapCell} from '../../tools/editor/mv-project-core.js';

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

test('detects an MV project beneath a zip prefix without executing it',()=>{
  const prefix='NewData/';
  const paths=[prefix+'index.html',prefix+'package.json',...MV_DATABASE_FILES.map(x=>prefix+'data/'+x),prefix+'data/Map001.json',prefix+'js/main.js',prefix+'img/characters/Actor1.png',prefix+'audio/bgm/Theme.ogg'];
  const result=detectMvArchiveLayout(paths);
  assert.equal(result.isMvProject,true);assert.equal(result.root,'NewData');assert.deepEqual(result.maps,['NewData/data/Map001.json']);assert.ok(result.dirs.includes('data'));assert.ok(result.dirs.includes('js'));
});

test('classifies MV project paths relative to detected root',()=>{
  assert.deepEqual(classifyMvProjectPath('NewData/data/Map001.json','NewData'),{kind:'map',path:'data/Map001.json',name:'Map001.json'});
  assert.equal(classifyMvProjectPath('NewData/img/tilesets/World_A5.png','NewData').category,'tilesets');
  assert.equal(classifyMvProjectPath('NewData/audio/bgm/Theme.ogg','NewData').category,'bgm');
});

test('matches observable MV sheet geometry contracts',()=>{
  assert.deepEqual(mvCharacterSheetGeometry(576,384,'Actor1.png'),{valid:true,single:false,columns:12,rows:8,cellWidth:48,cellHeight:48});
  assert.deepEqual(mvCharacterSheetGeometry(144,192,'$Hero.png'),{valid:true,single:true,columns:3,rows:4,cellWidth:48,cellHeight:48});
  assert.deepEqual(mvFaceSheetGeometry(576,288),{valid:true,columns:4,rows:2,cellWidth:144,cellHeight:144});
  assert.equal(mvTilesetSheetGeometry(384,768,'A5').valid,true);
  assert.equal(mvTilesetSheetGeometry(768,720,'A4').valid,true);
  assert.equal(mvTilesetSheetGeometry(768,768,'B').valid,true);
  assert.equal(mvTilesetSheetGeometry(768,576,'A5').valid,false);
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
  const files=fixture();const pkg=createMvCompatibilityPackage(files);assert.equal(pkg.format,'rpg-maker-mv-project-data');assert.deepEqual(pkg.start,{mapId:1,x:2,y:1});assert.deepEqual(pkg.screen,MV_SCREEN);assert.equal(pkg.maps[1].futureField.keep,true);pkg.maps[1].futureField.keep=false;assert.equal(files['Map001.json'].futureField.keep,true);
});

test('uses MV x/y/z map indexing exactly',()=>{
  const files=fixture();const map=files['Map001.json'];assert.equal(mvMapCellIndex(3,2,2,1,5),35);assert.equal(mvMapCell(map,2,1,5),35);assert.throws(()=>mvMapCell(map,3,0,0),RangeError);
});
