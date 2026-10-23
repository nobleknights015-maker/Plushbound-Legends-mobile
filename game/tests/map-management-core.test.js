import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankMap,duplicateMap,renameMap,resizeMap,inboundTransfers,removeMap,mapManagementSummary} from '../../tools/editor/map-management-core.js';

function fixture(){return {schemaVersion:1,maps:[{id:'field',name:'Field',width:2,height:2,layers:[{id:'ground',name:'Ground',z:0,visible:true,data:[1,2,3,4]}],blocked:['1,1'],regions:[0,1,0,0],events:[{id:'to-town',x:0,y:0,pages:[{trigger:'touch',commands:[{code:'TRANSFER',parameters:['town',1,1,2]}]}]},{id:'edge-event',x:1,y:1,pages:[{trigger:'action',commands:[]}]}]},{id:'town',name:'Town',width:3,height:2,layers:[{id:'ground',name:'Ground',z:0,visible:true,data:[5,6,7,8,9,10]}],blocked:['2,1'],regions:[1,2,3,4,5,6],events:[{id:'back-field',x:2,y:1,pages:[{trigger:'touch',commands:[{code:'TRANSFER',parameters:['field',1,1,2]}]}]}]}]};}

test('blank map uses runtime-native arrays and unique IDs',()=>{
  const pkg=fixture();const map=createBlankMap(pkg,{id:'field',name:'Fresh',width:4,height:3});
  assert.equal(map.id,'field-2');assert.equal(map.width,4);assert.equal(map.height,3);assert.equal(map.layers[0].data.length,12);assert.equal(map.regions.length,12);assert.deepEqual(map.events,[]);
});

test('duplicate map is a deep copy and does not rewrite internal transfer targets',()=>{
  const pkg=fixture();const copy=duplicateMap(pkg,'field');
  assert.equal(copy.id,'field-copy');assert.equal(copy.events[0].pages[0].commands[0].parameters[0],'town');
  copy.layers[0].data[0]=99;copy.events[0].id='changed';
  assert.equal(pkg.maps[0].layers[0].data[0],1);assert.equal(pkg.maps[0].events[0].id,'to-town');
});

test('rename map updates inbound TRANSFER targets transactionally',()=>{
  const pkg=fixture();const result=renameMap(pkg,'town','market',{name:'Market'});
  assert.equal(result.updatedTransfers,1);assert.equal(pkg.maps[1].id,'market');assert.equal(pkg.maps[1].name,'Market');assert.equal(pkg.maps[0].events[0].pages[0].commands[0].parameters[0],'market');
});

test('safe resize preserves overlapping tile/region coordinates and expands with zero fill',()=>{
  const pkg=fixture();const result=resizeMap(pkg,'town',{width:4,height:3});const map=result.map;
  assert.deepEqual(map.layers[0].data,[5,6,7,0,8,9,10,0,0,0,0,0]);
  assert.deepEqual(map.regions,[1,2,3,0,4,5,6,0,0,0,0,0]);
  assert.deepEqual(map.blocked,['2,1']);assert.equal(map.width,4);assert.equal(map.height,3);
  assert.equal(result.clampedEvents,0);assert.equal(result.clampedTransfers,0);
});

test('shrinking blocks clipped events and inbound transfer destinations by default without mutation',()=>{
  const pkg=fixture(),before=structuredClone(pkg);
  assert.throws(()=>resizeMap(pkg,'field',{width:1,height:1}),/event\(s\) outside/i);
  assert.deepEqual(pkg,before);
  const noEdge=fixture();noEdge.maps[0].events=noEdge.maps[0].events.filter(event=>event.id!=='edge-event');const untouched=structuredClone(noEdge);
  assert.throws(()=>resizeMap(noEdge,'field',{width:1,height:1}),/inbound transfer destination/i);
  assert.deepEqual(noEdge,untouched);
});

test('explicit clamp policy makes shrink deterministic and reports discarded collision cells',()=>{
  const pkg=fixture();const result=resizeMap(pkg,'field',{width:1,height:1,eventPolicy:'clamp',transferPolicy:'clamp'});
  assert.equal(result.clampedEvents,1);assert.equal(result.clampedTransfers,1);assert.equal(result.droppedBlocked,1);
  assert.deepEqual(result.map.layers[0].data,[1]);assert.deepEqual(result.map.regions,[0]);assert.deepEqual(result.map.blocked,[]);
  assert.equal(result.map.events.find(event=>event.id==='edge-event').x,0);assert.equal(result.map.events.find(event=>event.id==='edge-event').y,0);
  assert.deepEqual(pkg.maps[1].events[0].pages[0].commands[0].parameters.slice(0,3),['field',0,0]);
});

test('delete blocks inbound links by default and protects the final map',()=>{
  const pkg=fixture();assert.equal(inboundTransfers(pkg,'town').length,1);assert.throws(()=>removeMap(pkg,'town'),/inbound transfer/i);
  const removed=removeMap(pkg,'town',{allowInbound:true});assert.equal(removed.removed.id,'town');assert.equal(removed.inbound.length,1);assert.throws(()=>removeMap(pkg,'field'),/last map/i);
});

test('summary reports inbound and outbound transfer counts',()=>{
  const summary=mapManagementSummary(fixture());assert.deepEqual(summary.map(row=>[row.id,row.inbound,row.outbound]),[['field',1,1],['town',1,1]]);
});