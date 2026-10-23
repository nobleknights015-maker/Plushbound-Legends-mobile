import { PlushboundGameSession } from '../../game/runtime/PlushboundGameSession.js';

function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}

export function seededRng(seed=1){
  let state=(Number.isFinite(Number(seed))?Math.trunc(Number(seed)):1)>>>0;
  return ()=>{
    state=(Math.imul(1664525,state)+1013904223)>>>0;
    return state/4294967296;
  };
}

export class BattleEncounterTester{
  constructor({mapPackage,contentPackages=[],rng=null,seed=null}={}){
    if(!mapPackage?.maps?.length)throw new Error('BattleEncounterTester requires a runtime map package');
    this.mapPackage=clone(mapPackage);
    this.contentPackages=clone(contentPackages);
    this.seed=seed===null?null:((Number.isFinite(Number(seed))?Math.trunc(Number(seed)):1)>>>0);
    const encounterRng=typeof rng==='function'?rng:(this.seed===null?Math.random:seededRng(this.seed));
    this.session=new PlushboundGameSession({
      mapPackage:this.mapPackage,
      contentPackages:this.contentPackages,
      encounter:{rng:encounterRng,base:1,variance:0,rate:1},
      logger:{error(){}}
    });
    const first=this.mapPackage.maps[0];
    this.session.enter(first.id,0,0,2);
  }

  maps(){
    return this.mapPackage.maps.map(map=>({id:String(map.id),name:map.name||String(map.id),encounterTable:map.encounterTable||null,width:Number(map.width)||0,height:Number(map.height)||0}));
  }

  bosses(){
    return this.session.game.bossEncounterIds().map(id=>{
      const definition=this.session.game.bossEncounter(id);
      return {...definition,available:this.session.game.bossEncounterAvailable(id),enemy:this.session.game.enemyDefinition(definition.enemyId)};
    });
  }

  battleQuests(){
    const out=[];
    for(const [id,quest] of this.session.game.quests){
      const objectives=(quest.objectives||[]).filter(objective=>objective.type==='battle');
      if(objectives.length)out.push({id:String(id),name:quest.name||String(id),prerequisites:clone(quest.prerequisites||[]),objectives:clone(objectives)});
    }
    return out;
  }

  enterMap(mapId,x=0,y=0){
    return this.session.enter(String(mapId),Number(x)||0,Number(y)||0,2);
  }

  encounterPreview({mapId=this.session.maps.current?.id,regionId=0}={}){
    const map=this.session.maps.maps.get(String(mapId));
    if(!map?.encounterTable)return {mapId:String(mapId),regionId:Number(regionId)||0,tableId:null,entries:[]};
    const table=this.session.game.encounterTable(map.encounterTable);
    const entries=(table?.entries||[]).filter(entry=>!Array.isArray(entry.regions)||!entry.regions.length||entry.regions.map(Number).includes(Number(regionId)||0));
    return {mapId:String(map.id),regionId:Number(regionId)||0,tableId:String(map.encounterTable),entries:clone(entries)};
  }

  pickEncounter({mapId=this.session.maps.current?.id,regionId=0,enemyId=null}={}){
    const preview=this.encounterPreview({mapId,regionId});
    if(!preview.tableId)return null;
    let picked;
    if(enemyId){
      const entry=preview.entries.find(candidate=>String(candidate.enemyId)===String(enemyId));
      picked=entry?clone(entry):null;
    }else picked=this.session.encounters.pick({regionId:preview.regionId,table:preview.tableId});
    if(!picked)return null;
    const encounter={...clone(picked),enemy:this.session.game.enemyDefinition(picked.enemyId)};
    this.session.lastEncounter=clone(encounter);
    return clone(encounter);
  }

  loadBoss(bossId){
    const id=String(bossId),definition=this.session.game.bossEncounter(id);
    if(!definition)throw new Error(`Unknown boss encounter ${id}`);
    if(definition.mapId){
      const targetMapId=String(definition.mapId);
      if(!this.session.maps.maps.has(targetMapId))throw new Error(`Boss encounter ${id} references unknown map ${targetMapId}`);
      if(this.session.maps.current?.id!==targetMapId)this.enterMap(targetMapId,0,0);
    }
    return this.session.startBossEncounter(id);
  }

  resolveEncounter(result='victory'){
    return this.session.resolveEncounter(result);
  }

  startQuest(questId){
    return this.session.game.startQuest(String(questId));
  }

  setQuestCompleteForTest(questId){
    const id=String(questId);
    const definition=this.session.game.questDefinition(id);
    if(!definition)throw new Error(`Unknown quest ${id}`);
    const quest={id,name:definition.name,stage:Number(definition.stage)||0,status:'complete',objectives:{},started:true,completed:true};
    for(const objective of definition.objectives||[])quest.objectives[objective.id]=Math.max(1,Number(objective.count)||1);
    this.session.state.quests.set(id,quest);
    this.session.state.setSw(`quest:${id}:complete`,true);
    return clone(quest);
  }

  snapshot(){
    return clone(this.session.snapshot());
  }
}
