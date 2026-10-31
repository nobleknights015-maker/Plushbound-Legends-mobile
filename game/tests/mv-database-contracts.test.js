import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMvAudioObject,validateMvMoveRoute,validateMvEventPage,validateMvMapEvent,validateMvEncounter,validateMvMapInfo,validateMvSystem,validateMvDatabaseRecord,validateMvExtendedDatabase} from '../../tools/editor/mv-database-contracts.js';

const audio=(name='')=>({name,pan:0,pitch:100,volume:90});
const end=()=>({code:0,indent:0,parameters:[]});
const route=()=>({repeat:true,skippable:false,wait:false,list:[{code:0,parameters:[]}]});
const page=()=>({conditions:{},image:{characterName:'',characterIndex:0,direction:2,pattern:0,tileId:0},moveType:0,moveSpeed:3,moveFrequency:3,moveRoute:route(),walkAnime:true,stepAnime:false,directionFix:false,through:false,priorityType:1,trigger:0,list:[end()]});
const event=()=>({id:1,name:'EV001',note:'',x:2,y:3,pages:[page()]});
const system=()=>({startMapId:1,startX:2,startY:3,editMapId:1,versionId:1,testTroopId:1,gameTitle:'Test',currencyUnit:'G',locale:'en_US',title1Name:'',title2Name:'',battleback1Name:'',battleback2Name:'',battlerName:'',switches:[''],variables:[''],elements:[''],skillTypes:[''],weaponTypes:[''],armorTypes:[''],equipTypes:[''],magicSkills:[],partyMembers:[1],menuCommands:[true,true,true,true,true,true],sounds:[],attackMotions:[],testBattlers:[],optDisplayTp:false,optDrawTitle:true,optExtraExp:false,optFloorDeath:false,optFollowers:true,optSideView:false,optSlipDeath:false,optTransparent:false,battleBgm:audio(),defeatMe:audio(),gameoverMe:audio(),titleBgm:audio(),victoryMe:audio(),boat:{bgm:audio(),characterIndex:0,characterName:'Vehicle',startMapId:0,startX:0,startY:0},ship:{bgm:audio(),characterIndex:0,characterName:'Vehicle',startMapId:0,startX:0,startY:0},airship:{bgm:audio(),characterIndex:0,characterName:'Vehicle',startMapId:0,startX:0,startY:0},terms:{basic:[],commands:[],messages:{},params:[]},windowTone:[0,0,0,0]});

test('accepts serialized MV audio, route, event page, event, encounter and map-info shapes',()=>{
  assert.deepEqual(validateMvAudioObject(audio()),[]);
  assert.deepEqual(validateMvMoveRoute(route()),[]);
  assert.deepEqual(validateMvEventPage(page()),[]);
  assert.deepEqual(validateMvMapEvent(event()),[]);
  assert.deepEqual(validateMvEncounter({troopId:1,weight:10,regionSet:[]}),[]);
  assert.deepEqual(validateMvMapInfo({id:1,expanded:false,name:'MAP001',order:1,parentId:0,scrollX:0,scrollY:0}),[]);
});

test('accepts the observable System serialization contract',()=>assert.deepEqual(validateMvSystem(system()),[]));

test('rejects malformed movement and event termination',()=>{
  assert.ok(validateMvMoveRoute({...route(),list:[]}).some(x=>x.code==='MV_MOVE_ROUTE_TERMINATOR'));
  assert.ok(validateMvEventPage({...page(),list:[]}).some(x=>x.code==='MV_EVENT_TERMINATOR'));
});

test('validates representative actor, usable item, equipment, enemy, state and animation records',()=>{
  const actor={id:1,name:'Actor',nickname:'',classId:1,initialLevel:1,maxLevel:99,characterName:'Actor1',characterIndex:0,faceName:'Actor1',faceIndex:0,battlerName:'Actor1_1',equips:[1,0,0,0,0],traits:[],note:'',profile:''};
  const skill={id:1,name:'Attack',description:'',iconIndex:0,stypeId:1,scope:1,occasion:1,speed:0,successRate:100,repeats:1,tpGain:0,hitType:1,animationId:1,damage:{type:1,elementId:-1,formula:'a.atk*4-b.def*2',variance:20,critical:true},effects:[],mpCost:0,tpCost:0,requiredWtypeId1:0,requiredWtypeId2:0,message1:'',message2:'',note:''};
  const weapon={id:1,name:'Sword',description:'',iconIndex:0,etypeId:1,wtypeId:1,animationId:1,price:100,params:[0,0,10,0,0,0,0,0],traits:[],note:''};
  const enemy={id:1,name:'Slime',battlerName:'Slime',battlerHue:0,params:[100,0,10,10,10,10,10,10],exp:10,gold:5,dropItems:[],actions:[],traits:[],note:''};
  const state={id:1,name:'KO',iconIndex:0,restriction:4,priority:100,removeAtBattleEnd:false,removeByRestriction:false,autoRemovalTiming:0,minTurns:1,maxTurns:1,removeByDamage:false,chanceByDamage:100,removeByWalking:false,stepsToRemove:100,message1:'',message2:'',message3:'',message4:'',motion:3,overlay:0,traits:[],note:''};
  const animation={id:1,name:'Hit',animation1Name:'',animation1Hue:0,animation2Name:'',animation2Hue:0,position:1,frames:[],timings:[{flashColor:[255,255,255,0],flashDuration:5,flashScope:0,frame:0,se:audio()}]};
  for(const [type,record] of [['Actors',actor],['Skills',skill],['Weapons',weapon],['Enemies',enemy],['States',state],['Animations',animation]]) assert.deepEqual(validateMvDatabaseRecord(type,record),[],type);
});

test('extended database validator walks system, records, map events, encounters and map audio',()=>{
  const files={'System.json':system(),'MapInfos.json':[null,{id:1,expanded:false,name:'MAP001',order:1,parentId:0,scrollX:0,scrollY:0}],'Actors.json':[null,{id:1,name:'Actor',nickname:'',classId:1,initialLevel:1,maxLevel:99,characterName:'Actor1',characterIndex:0,faceName:'Actor1',faceIndex:0,battlerName:'',equips:[],traits:[],note:'',profile:''}],'Map001.json':{events:[null,event()],encounterList:[{troopId:1,weight:10,regionSet:[]}],bgm:audio(),bgs:audio(),autoplayBgm:false,autoplayBgs:false,disableDashing:false,parallaxLoopX:false,parallaxLoopY:false,parallaxShow:false,specifyBattleback:false,encounterStep:30,height:10,parallaxSx:0,parallaxSy:0,scrollType:0,tilesetId:1,width:10}};
  assert.deepEqual(validateMvExtendedDatabase(files),{ok:true,issues:[]});
});
