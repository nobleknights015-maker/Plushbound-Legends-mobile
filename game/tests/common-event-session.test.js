import test from 'node:test';
import assert from 'node:assert/strict';

import { PlushboundGameSession } from '../runtime/PlushboundGameSession.js';

function mapPackage(commands){
  return {
    schemaVersion:1,
    maps:[{
      id:'test-map',name:'Test Map',width:3,height:3,blocked:[],layers:[],regions:Array(9).fill(0),events:[{
        id:'caller',x:1,y:1,pages:[{trigger:'action',commands}]
      }]
    }]
  };
}

test('game session resolves COMMON_EVENT commands from exported authoring library shape', () => {
  const commonEvents={schemaVersion:1,commonEvents:[{
    id:'greet',name:'Greet',commands:[
      {code:'MESSAGE',parameters:['Hello from common event',{speaker:'System'}]},
      {code:'SWITCH',parameters:['common:greeted',true]}
    ]
  }]};
  const session=new PlushboundGameSession({
    mapPackage:mapPackage([{code:'COMMON_EVENT',parameters:['greet']}]),
    commonEvents
  });
  session.enter('test-map',1,1,2);
  session.interact('caller');
  assert.equal(session.messages.at(-1).text,'Hello from common event');
  assert.equal(session.state.sw('common:greeted'),true);
});

test('game session supports nested runtime common events without mutating the source library', () => {
  const commonEvents={schemaVersion:1,commonEvents:[
    {id:'outer',commands:[{code:'COMMON_EVENT',parameters:['inner']}]},
    {id:'inner',commands:[{code:'VARIABLE',parameters:['nested-count',7]}]}
  ]};
  const before=structuredClone(commonEvents);
  const session=new PlushboundGameSession({
    mapPackage:mapPackage([{code:'COMMON_EVENT',parameters:['outer']}]),
    commonEvents
  });
  session.enter('test-map',1,1,2);
  session.interact('caller');
  assert.equal(session.state.variable('nested-count'),7);
  assert.deepEqual(commonEvents,before);
});

test('game session rejects missing common-event references before play begins', () => {
  assert.throws(()=>new PlushboundGameSession({
    mapPackage:mapPackage([]),
    commonEvents:{schemaVersion:1,commonEvents:[
      {id:'caller',commands:[{code:'COMMON_EVENT',parameters:['missing']}]}
    ]}
  }),/references unknown common event: missing/i);
});

test('game session rejects recursive common-event call graphs before play begins', () => {
  assert.throws(()=>new PlushboundGameSession({
    mapPackage:mapPackage([]),
    commonEvents:{schemaVersion:1,commonEvents:[
      {id:'loop',commands:[{code:'COMMON_EVENT',parameters:['loop']}]}
    ]}
  }),/recursive common event cycle: loop -> loop/i);
  assert.throws(()=>new PlushboundGameSession({
    mapPackage:mapPackage([]),
    commonEvents:{schemaVersion:1,commonEvents:[
      {id:'a',commands:[{code:'COMMON_EVENT',parameters:['b']}]},
      {id:'b',commands:[{code:'COMMON_EVENT',parameters:['a']}]}
    ]}
  }),/recursive common event cycle: a -> b -> a/i);
});
