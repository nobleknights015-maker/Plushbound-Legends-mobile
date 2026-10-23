import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEncounterTester } from '../../tools/editor/battle-test-core.js';

const mapPackage={schemaVersion:1,maps:[{id:'test-field',name:'Test Field',width:4,height:4,layers:[],blocked:[],regions:new Array(16).fill(0),encounterTable:'field-table',events:[]}]};
const contentPackages=[{
  quests:[{id:'hunt-test',name:'Hunt Test',stage:1,objectives:[{id:'defeat-woolbeast',type:'battle',targetTag:'woolbeast',count:2}]}],
  encounterTables:[{id:'field-table',entries:[{enemyId:'woolbeast-a',weight:3,regions:[0]},{enemyId:'woolbeast-b',weight:1,regions:[1]}]}],
  enemies:[{id:'woolbeast-a',name:'Woolbeast A',tags:['woolbeast']},{id:'woolbeast-b',name:'Woolbeast B',tags:['woolbeast']}]
}];

test('battle tester exposes runtime maps and region-filtered encounter previews',()=>{
  const tester=new BattleEncounterTester({mapPackage,contentPackages,rng:()=>0});
  assert.equal(tester.maps()[0].encounterTable,'field-table');
  assert.deepEqual(tester.encounterPreview({regionId:0}).entries.map(entry=>entry.enemyId),['woolbeast-a']);
  assert.deepEqual(tester.encounterPreview({regionId:1}).entries.map(entry=>entry.enemyId),['woolbeast-b']);
});

test('battle tester performs deterministic runtime weighted picks with enemy definitions',()=>{
  const tester=new BattleEncounterTester({mapPackage,contentPackages,rng:()=>0});
  const encounter=tester.pickEncounter({regionId:0});
  assert.equal(encounter.enemyId,'woolbeast-a');
  assert.equal(encounter.enemy.name,'Woolbeast A');
  assert.equal(tester.snapshot().lastEncounter.enemyId,'woolbeast-a');
});

test('victory resolves through PlushboundGameSession and progresses battle objectives',()=>{
  const tester=new BattleEncounterTester({mapPackage,contentPackages,rng:()=>0});
  tester.startQuest('hunt-test');
  tester.pickEncounter({regionId:0,enemyId:'woolbeast-a'});
  const result=tester.resolveEncounter('victory');
  assert.equal(result.result,'victory');
  assert.equal(tester.snapshot().quests['hunt-test'].objectives['defeat-woolbeast'],1);
  tester.pickEncounter({regionId:0,enemyId:'woolbeast-a'});
  tester.resolveEncounter('victory');
  assert.equal(tester.snapshot().quests['hunt-test'].objectives['defeat-woolbeast'],2);
  assert.equal(tester.snapshot().quests['hunt-test'].status,'ready');
});

test('escape does not progress battle objectives',()=>{
  const tester=new BattleEncounterTester({mapPackage,contentPackages,rng:()=>0});
  tester.startQuest('hunt-test');
  tester.pickEncounter({regionId:0,enemyId:'woolbeast-a'});
  tester.resolveEncounter('escape');
  assert.equal(tester.snapshot().quests['hunt-test'].objectives['defeat-woolbeast'],0);
});
