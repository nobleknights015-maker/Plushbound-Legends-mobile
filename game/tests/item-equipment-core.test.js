import test from 'node:test';
import assert from 'node:assert/strict';
import {itemKind,itemTemplate,collectItems,validateItems,itemReferences,replaceItem,addItem,removeItem,clone} from '../../tools/editor/item-equipment-core.js';

function fixture(){return [
  {id:'opening',path:'opening.json',data:{items:[{id:'tonic',name:'Tonic',type:'consumable',description:'heal',assetBindings:{icon:'item/tonic'}}],quests:[{id:'q1',name:'Quest',rewards:{items:[{id:'tonic',count:1}]}}]}},
  {id:'route',path:'route.json',data:{items:[{id:'charm',name:'Charm',type:'accessory',stats:{defense:2,spirit:1},assetBindings:{icon:'item/charm'}}],shops:[{id:'shop',inventory:[{itemId:'tonic',price:10}]}],enemies:[{id:'enemy',rewards:{drops:[{itemId:'charm',chance:.2}]}}]}}
];}

test('item authoring recognizes observed consumable and accessory contracts',()=>{
  const packages=fixture(),rows=collectItems(packages);
  assert.equal(rows.length,2);
  assert.equal(itemKind(rows[0].item),'consumable');
  assert.equal(itemKind(rows[1].item),'equipment');
  assert.equal(validateItems(packages).length,0);
});

test('new item templates stay within observed Plushbound item schema',()=>{
  assert.deepEqual(itemTemplate('consumable',{suffix:'test'}),{id:'new-item-test',name:'New Item',type:'consumable',description:'',assetBindings:{icon:''}});
  assert.deepEqual(itemTemplate('equipment',{suffix:'test'}),{id:'new-accessory-test',name:'New Accessory',type:'accessory',description:'',stats:{defense:0,spirit:0},assetBindings:{icon:''}});
});

test('item references include quest rewards shop stock enemy drops and runtime inventory hooks',()=>{
  const runtime=[{id:'maps',data:{maps:[{id:'map',events:[{id:'gift',pages:[{commands:[{code:'SCRIPT_HOOK',parameters:['inventory.give',{itemId:'tonic',count:1}]}]}]}]}]}}];
  assert.deepEqual(itemReferences('tonic',fixture(),runtime).map(ref=>ref.kind),['quest-reward','shop-stock','runtime-hook']);
  assert.deepEqual(itemReferences('charm',fixture(),runtime).map(ref=>ref.kind),['enemy-drop']);
});

test('item edits are duplicate-safe and preserve independent object graphs',()=>{
  const packages=fixture(),row=collectItems(packages)[1],before=clone(row.item),next=clone(row.item);next.name='Charm Prime';next.stats.defense=4;
  replaceItem(packages,row,next);
  assert.equal(packages[1].data.items[0].stats.defense,4);
  assert.equal(before.stats.defense,2);
  assert.throws(()=>replaceItem(packages,row,{...next,id:'tonic'}),/Duplicate item id/);
});

test('item add and remove support array registries transactionally at caller boundary',()=>{
  const packages=fixture();const item=itemTemplate('equipment',{suffix:'new'});const locator=addItem(packages,1,item);
  assert.equal(collectItems(packages).some(row=>row.item.id===item.id),true);
  const row=collectItems(packages).find(entry=>entry.packageIndex===locator.packageIndex&&String(entry.locator)===String(locator.locator));
  const removed=removeItem(packages,row);
  assert.equal(removed.id,item.id);
  assert.equal(collectItems(packages).some(entry=>entry.item.id===item.id),false);
});
