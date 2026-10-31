import test from 'node:test';
import assert from 'node:assert/strict';
import {readZipDirectory,readZipEntry,mvDataZipEntries,readMvDataZip,createStoredZip,crc32} from '../../tools/editor/mv-zip.js';

const enc=new TextEncoder();

test('creates and selectively reads deterministic stored ZIP entries',async()=>{
  const blob=createStoredZip([{name:'System.json',text:'{"startMapId":1}'},{name:'Map001.json',text:'{"width":1}'}]);
  const dir=await readZipDirectory(blob);assert.deepEqual(dir.map(x=>x.name),['data/System.json','data/Map001.json']);assert.equal(mvDataZipEntries(dir).length,2);
  assert.equal(new TextDecoder().decode(await readZipEntry(blob,dir[0])),'{"startMapId":1}');
  const mv=await readMvDataZip(blob);assert.deepEqual(mv.files['System.json'],{startMapId:1});assert.deepEqual(mv.files['Map001.json'],{width:1});assert.deepEqual(mv.errors,[]);
});

test('CRC32 matches the standard check value',()=>assert.equal(crc32(enc.encode('123456789')),0xcbf43926));

test('MV ZIP selection ignores runtime code and proprietary asset paths',async()=>{
  const blob=createStoredZip([{name:'System.json',text:'{}'},{name:'Map001.json',text:'{}'},{name:'../js/main.js',text:'alert(1)'},{name:'../img/characters/Actor1.png',text:'not-an-image'}]);
  const dir=await readZipDirectory(blob);assert.deepEqual(mvDataZipEntries(dir).map(x=>x.name),['data/System.json','data/Map001.json']);
});
