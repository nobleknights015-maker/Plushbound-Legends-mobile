import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankMap,duplicateMap,renameMap,inboundTransfers,removeMap,mapManagementSummary} from '../../tools/editor/map-management-core.js';

function fixture(){return {schemaVersion:1,maps:[{id:'field',name:'Field',width:2,height:2,layers:[{id:'ground',name:'Ground',z:0,visible:true,data:[1,2,3,4]}],blocked:['1,1'],regions:[0,1,0,0],events:[{id:'to-town',x:0,y:0,pages:[{trigger:'touch',commands:[{code:'TRANSFER',parameters:['town',1,1,2]}]}]}]},{id:'town',name:'Town',width:3,height:2,layers:[{id:'ground',name:'Ground',z:0,visible:true,data:[5,5,5,5,5,5]}],blocked:[],regions:[0,0,0,0,0,0],events:[]}]};}

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

test('delete blocks inbound links by default and protects the final map',()=>{
  const pkg=fixture();assert.equal(inboundTransfers(pkg,'town').length,1);assert.throws(()=>removeMap(pkg,'town'),/inbound transfer/i);
  const removed=removeMap(pkg,'town',{allowInbound:true});assert.equal(removed.removed.id,'town');assert.equal(removed.inbound.length,1);assert.throws(()=>removeMap(pkg,'field'),/last map/i);
});

test('summary reports inbound and outbound transfer counts',()=>{
  const summary=mapManagementSummary(fixture());assert.deepEqual(summary.map(row=>[row.id,row.inbound,row.outbound]),[['field',0,1],['town',1,0]]);
});
