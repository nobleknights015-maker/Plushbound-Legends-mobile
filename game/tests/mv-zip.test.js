import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateRawSync} from 'node:zlib';
import {readZipDirectory,readZipEntry,mvDataZipEntries,readMvDataZip,createStoredZip,crc32} from '../../tools/editor/mv-zip.js';

const enc=new TextEncoder();
const le16=n=>new Uint8Array([n&255,(n>>>8)&255]);
const le32=n=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);
function concat(parts){const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
function deflatedZip(name,text){const data=enc.encode(text),compressed=new Uint8Array(deflateRawSync(data)),n=enc.encode(name),crc=crc32(data);const local=concat([le32(0x04034b50),le16(20),le16(0),le16(8),le16(0),le16(0),le32(crc),le32(compressed.length),le32(data.length),le16(n.length),le16(0),n,compressed]);const central=concat([le32(0x02014b50),le16(20),le16(20),le16(0),le16(8),le16(0),le16(0),le32(crc),le32(compressed.length),le32(data.length),le16(n.length),le16(0),le16(0),le16(0),le16(0),le32(0),le32(0),n]);const eocd=concat([le32(0x06054b50),le16(0),le16(0),le16(1),le16(1),le32(central.length),le32(local.length),le16(0)]);return new Blob([local,central,eocd]);}

test('creates and selectively reads deterministic stored ZIP entries',async()=>{
  const blob=createStoredZip([{name:'System.json',text:'{"startMapId":1}'},{name:'Map001.json',text:'{"width":1}'}]);
  const dir=await readZipDirectory(blob);assert.deepEqual(dir.map(x=>x.name),['data/System.json','data/Map001.json']);assert.equal(mvDataZipEntries(dir).length,2);
  assert.equal(new TextDecoder().decode(await readZipEntry(blob,dir[0])),'{"startMapId":1}');
  const mv=await readMvDataZip(blob);assert.deepEqual(mv.files['System.json'],{startMapId:1});assert.deepEqual(mv.files['Map001.json'],{width:1});assert.deepEqual(mv.errors,[]);
});

test('reads method-8 raw-DEFLATE data entries used by the reference MV ZIP',async()=>{
  const blob=deflatedZip('NewData/data/System.json','{"startMapId":7}');const dir=await readZipDirectory(blob);assert.equal(dir[0].method,8);const mv=await readMvDataZip(blob);assert.deepEqual(mv.files['System.json'],{startMapId:7});assert.deepEqual(mv.errors,[]);
});

test('CRC32 matches the standard check value',()=>assert.equal(crc32(enc.encode('123456789')),0xcbf43926));

test('MV ZIP selection ignores runtime code and proprietary asset paths',async()=>{
  const blob=createStoredZip([{name:'System.json',text:'{}'},{name:'Map001.json',text:'{}'},{name:'../js/main.js',text:'alert(1)'},{name:'../img/characters/Actor1.png',text:'not-an-image'}]);
  const dir=await readZipDirectory(blob);assert.deepEqual(mvDataZipEntries(dir).map(x=>x.name),['data/System.json','data/Map001.json']);
});
