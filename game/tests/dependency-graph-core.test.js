import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDependencyGraph,dependencyNeighborhood,dependencyCycles,dependencyNodeLinks} from '../../tools/editor/dependency-graph-core.js';

function fixtures(){
  const content=[{sourceId:'core',data:{
    quests:[
      {id:'q1',name:'First',prerequisites:[],objectives:[{id:'talk','type':'talk',target:'npc1'}],rewards:{items:[{id:'potion'}]},unlocks:['waystitch-home']},
      {id:'q2',name:'Second',prerequisites:[{questComplete:'q1'}],objectives:[{id:'hunt',type:'battle',targetTag:'slime'}],rewards:{items:[]}}
    ],
    items:[{id:'potion',name:'Potion'}],npcs:[{id:'npc1',name:'Guide'}],enemies:[{id:'e1',name:'Slime',tags:['slime']}],
    shops:[{id:'shop1',inventory:[{itemId:'potion'}]}],encounterTables:[{id:'field',entries:[{enemyId:'e1'}]}],
    waystitches:[{id:'waystitch-home',unlockCondition:{questComplete:'q1'}}]
  }}];
  const pkg={maps:[{id:'map1',name:'Field',events:[{id:'ev1',name:'Quest Giver',pages:[{commands:[
    {code:'SHOP',parameters:['shop1']},
    {code:'SCRIPT_HOOK',parameters:['quest.start',{questId:'q2'}]},
    {code:'SCRIPT_HOOK',parameters:['inventory.give',{itemId:'missing-item'}]}
  ]}]}]}]};
  return {content,pkg};
}

test('builds deterministic source-aware dependency nodes and edges including unresolved targets',()=>{
  const {content,pkg}=fixtures(),graph=buildDependencyGraph(pkg,content);
  assert.ok(graph.nodes.some(n=>n.key==='quest:q1'&&n.resolved));
  assert.ok(graph.edges.some(e=>e.from==='quest:q2'&&e.to==='quest:q1'&&e.relation==='requires'));
  assert.ok(graph.edges.some(e=>e.from==='quest:q1'&&e.to==='item:potion'&&e.relation==='rewards'));
  assert.ok(graph.edges.some(e=>e.from==='shop:shop1'&&e.to==='item:potion'&&e.relation==='stocks'));
  assert.ok(graph.edges.some(e=>e.from==='encounter:field'&&e.to==='enemy:e1'&&e.relation==='contains'));
  assert.ok(graph.edges.some(e=>e.from==='event:map1/ev1'&&e.to==='quest:q2'&&e.relation==='quest.start'));
  assert.ok(graph.nodes.some(n=>n.key==='item:missing-item'&&n.resolved===false));
  assert.equal(graph.stats.unresolved,1);
});

test('returns focused neighborhoods and inbound/outbound links',()=>{
  const {content,pkg}=fixtures(),graph=buildDependencyGraph(pkg,content),hood=dependencyNeighborhood(graph,'quest:q1',{depth:1}),links=dependencyNodeLinks(graph,'quest:q1');
  assert.ok(hood.nodes.some(n=>n.key==='quest:q2'));
  assert.ok(hood.nodes.some(n=>n.key==='item:potion'));
  assert.ok(links.incoming.some(e=>e.from==='quest:q2'));
  assert.ok(links.outgoing.some(e=>e.to==='waystitch:waystitch-home'));
});

test('detects quest/waystitch dependency cycles without inventing relationships',()=>{
  const graph={nodes:[
    {key:'quest:a',kind:'quest'},{key:'quest:b',kind:'quest'},{key:'item:x',kind:'item'}
  ],edges:[
    {from:'quest:a',to:'quest:b',relation:'requires'},
    {from:'quest:b',to:'quest:a',relation:'requires'},
    {from:'quest:a',to:'item:x',relation:'rewards'}
  ]};
  const cycles=dependencyCycles(graph);
  assert.ok(cycles.some(c=>c[0]==='quest:a'&&c.at(-1)==='quest:a'));
  assert.ok(cycles.every(c=>!c.includes('item:x')));
});
