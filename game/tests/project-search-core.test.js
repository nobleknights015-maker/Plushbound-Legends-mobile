import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProjectIndex,searchProject} from '../../tools/editor/project-search-core.js';

test('project index preserves source identity and nested object paths',()=>{
  const index=buildProjectIndex({
    contentPackages:[{id:'content-a',data:{shops:[{id:'shop-1',name:'Mender Shop',items:['potion']}]}}],
    runtimePackages:[{id:'maps-a',data:{maps:[{id:'map-1',events:[{id:'lio',pages:[{commands:[{code:'SHOP',parameters:['shop-1']}]}]}]}]}}],
    assetManifest:{assets:[{id:'npc/lio/sprite',type:'character-sprite'}]}
  });
  assert.ok(index.some(r=>r.sourceType==='content'&&r.sourceId==='content-a'&&r.label==='Mender Shop'));
  assert.ok(index.some(r=>r.sourceType==='runtime'&&r.label==='SHOP'&&r.path.join('.')==='maps.0.events.0.pages.0.commands.0'));
  assert.ok(index.some(r=>r.sourceType==='assets'&&r.label==='npc/lio/sprite'));
});

test('project search matches all query terms across ids paths labels and payloads',()=>{
  const index=buildProjectIndex({
    contentPackages:[{id:'route',data:{shops:[{id:'menders-rest-provisions',name:'Mender Provisions'}],quests:[{id:'a-thread-begins',name:'A Thread Begins'}]}}],
    runtimePackages:[{id:'maps',data:{maps:[{id:'elyndor-menders-rest',events:[{id:'merchant',pages:[{commands:[{code:'SHOP',parameters:['menders-rest-provisions']}]}]}]}]}}]
  });
  assert.ok(searchProject(index,'mender provisions').some(r=>r.label==='Mender Provisions'));
  assert.ok(searchProject(index,'SHOP menders-rest-provisions').some(r=>r.label==='SHOP'));
  assert.deepEqual(searchProject(index,'a-thread-begins',{sourceType:'runtime'}),[]);
  assert.ok(searchProject(index,'a-thread-begins',{sourceType:'content'}).length>0);
});
