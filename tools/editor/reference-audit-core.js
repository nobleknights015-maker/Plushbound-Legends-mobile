function records(value){
  if(Array.isArray(value)) return value;
  if(value&&typeof value==='object') return Object.values(value);
  return [];
}

function packageEntries(packages=[]){
  return (packages||[]).map((entry,index)=>{
    if(entry&&typeof entry==='object'&&entry.data&&typeof entry.data==='object')return {sourceId:String(entry.sourceId||entry.id||`package-${index+1}`),data:entry.data};
    return {sourceId:String(entry?.__sourceId||`package-${index+1}`),data:entry||{}};
  });
}

function idsFromPackages(packages,key){
  const ids=new Set();
  for(const entry of packageEntries(packages)) for(const record of records(entry.data?.[key])) if(record?.id!=null) ids.add(String(record.id));
  return ids;
}

function recordsFromPackages(packages,key){
  const out=[];
  for(const entry of packageEntries(packages))for(const record of records(entry.data?.[key]))if(record&&typeof record==='object')out.push(record);
  return out;
}

export function contentReferenceRegistry(contentPackages=[]){
  const quests=recordsFromPackages(contentPackages,'quests');
  const enemies=recordsFromPackages(contentPackages,'enemies');
  const npcs=new Set([...idsFromPackages(contentPackages,'npcs'),...idsFromPackages(contentPackages,'namedCore')]);
  const questObjectives=new Map();
  for(const quest of quests)questObjectives.set(String(quest.id),new Set((quest.objectives||[]).map(objective=>String(objective.id))));
  const enemyTags=new Set();for(const enemy of enemies)for(const tag of enemy.tags||[])enemyTags.add(String(tag));
  return {
    quests:new Set(quests.map(quest=>String(quest.id))),
    questObjectives,
    items:idsFromPackages(contentPackages,'items'),
    shops:idsFromPackages(contentPackages,'shops'),
    waystitches:idsFromPackages(contentPackages,'waystitches'),
    enemies:new Set(enemies.map(enemy=>String(enemy.id))),
    encounterTables:idsFromPackages(contentPackages,'encounterTables'),
    npcs,
    enemyTags
  };
}

export function commandReferences(pkg={}){
  const refs=[];
  for(const map of pkg.maps||[]) for(const event of map.events||[]) for(let pageIndex=0;pageIndex<(event.pages||[]).length;pageIndex++){
    const commands=event.pages?.[pageIndex]?.commands||[];
    for(let commandIndex=0;commandIndex<commands.length;commandIndex++){
      const command=commands[commandIndex]||{};
      if(command.code==='SHOP') refs.push({kind:'shop',id:String(command.parameters?.[0]??''),mapId:map.id,eventId:event.id,pageIndex,commandIndex});
      if(command.code!=='SCRIPT_HOOK') continue;
      const hook=String(command.parameters?.[0]??'');
      const payload=command.parameters?.[1]&&typeof command.parameters[1]==='object'?command.parameters[1]:{};
      if(hook==='quest.start'||hook==='quest.complete') refs.push({kind:'quest',id:String(payload.questId??''),hook,mapId:map.id,eventId:event.id,pageIndex,commandIndex});
      else if(hook==='quest.objective') refs.push({kind:'quest-objective',id:String(payload.questId??''),objectiveId:String(payload.objectiveId??''),hook,mapId:map.id,eventId:event.id,pageIndex,commandIndex});
      else if(hook==='inventory.give') refs.push({kind:'item',id:String(payload.itemId??''),hook,mapId:map.id,eventId:event.id,pageIndex,commandIndex});
      else if(hook==='waystitch.activate') refs.push({kind:'waystitch',id:String(payload.waystitchId??''),hook,mapId:map.id,eventId:event.id,pageIndex,commandIndex});
      else refs.push({kind:'hook',id:hook,hook,mapId:map.id,eventId:event.id,pageIndex,commandIndex});
    }
  }
  return refs;
}

export function auditContentPackageReferences(contentPackages=[]){
  const registry=contentReferenceRegistry(contentPackages),issues=[];
  const add=(kind,id,{sourceId,collectionKey,recordId,owner},message)=>issues.push({severity:'error',code:`missing-${kind}-reference`,kind,id:String(id??''),owner,location:owner,packageId:sourceId||null,collectionKey:collectionKey||null,recordId:recordId||null,message});
  for(const entry of packageEntries(contentPackages)){
    const sourceId=entry.sourceId,pkg=entry.data;
    for(const quest of records(pkg.quests)){
      const owner=`quest:${quest.id}`,source={sourceId,collectionKey:'quests',recordId:String(quest.id),owner};
      for(const prerequisite of quest.prerequisites||[])if(prerequisite.questComplete&&!registry.quests.has(String(prerequisite.questComplete)))add('quest',prerequisite.questComplete,source,`Quest ${quest.id} requires unknown quest ${prerequisite.questComplete}`);
      for(const reward of quest.rewards?.items||[])if(reward?.id&&!registry.items.has(String(reward.id)))add('item',reward.id,source,`Quest ${quest.id} rewards unknown item ${reward.id}`);
      for(const unlock of quest.unlocks||[])if(String(unlock).startsWith('waystitch-')&&!registry.waystitches.has(String(unlock)))add('waystitch',unlock,source,`Quest ${quest.id} unlocks unknown Waystitch ${unlock}`);
      for(const objective of quest.objectives||[]){
        if(objective.type==='talk'&&objective.target&&!registry.npcs.has(String(objective.target)))add('npc',objective.target,source,`Quest ${quest.id} objective ${objective.id} targets unknown NPC ${objective.target}`);
        if(objective.type==='battle'&&objective.targetTag&&!registry.enemyTags.has(String(objective.targetTag)))add('enemy-tag',objective.targetTag,source,`Quest ${quest.id} objective ${objective.id} uses unknown enemy tag ${objective.targetTag}`);
      }
    }
    for(const shop of records(pkg.shops)){
      const source={sourceId,collectionKey:'shops',recordId:String(shop.id),owner:`shop:${shop.id}`};
      for(const stock of shop.inventory||[])if(stock?.itemId&&!registry.items.has(String(stock.itemId)))add('item',stock.itemId,source,`Shop ${shop.id} stocks unknown item ${stock.itemId}`);
    }
    for(const table of records(pkg.encounterTables)){
      const source={sourceId,collectionKey:'encounterTables',recordId:String(table.id),owner:`encounter:${table.id}`};
      for(const tableEntry of table.entries||[])if(tableEntry?.enemyId&&!registry.enemies.has(String(tableEntry.enemyId)))add('enemy',tableEntry.enemyId,source,`Encounter table ${table.id} references unknown enemy ${tableEntry.enemyId}`);
    }
    for(const waystitch of records(pkg.waystitches)){
      const source={sourceId,collectionKey:'waystitches',recordId:String(waystitch.id),owner:`waystitch:${waystitch.id}`};
      const required=waystitch.unlockCondition?.questComplete;if(required&&!registry.quests.has(String(required)))add('quest',required,source,`Waystitch ${waystitch.id} requires unknown quest ${required}`);
    }
  }
  return issues;
}

export function auditContentReferences(pkg,contentPackages=[]){
  const registry=contentReferenceRegistry(contentPackages);
  const issues=[...auditContentPackageReferences(contentPackages)];
  const allowedHooks=new Set(['quest.start','quest.objective','quest.complete','inventory.give','waystitch.activate']);
  for(const ref of commandReferences(pkg)){
    let known=true,message='';
    if(ref.kind==='shop') known=!!ref.id&&registry.shops.has(ref.id);
    else if(ref.kind==='quest') known=!!ref.id&&registry.quests.has(ref.id);
    else if(ref.kind==='quest-objective'){
      known=!!ref.id&&registry.quests.has(ref.id)&&!!ref.objectiveId&&registry.questObjectives.get(ref.id)?.has(ref.objectiveId);
      if(!known)message=registry.quests.has(ref.id)?`Unknown objective ${ref.objectiveId||'(missing)'} for quest ${ref.id}`:`Unknown quest reference ${ref.id||'(missing)'}`;
    }
    else if(ref.kind==='item') known=!!ref.id&&registry.items.has(ref.id);
    else if(ref.kind==='waystitch') known=!!ref.id&&registry.waystitches.has(ref.id);
    else if(ref.kind==='hook') known=allowedHooks.has(ref.id);
    if(!known) issues.push({...ref,severity:'error',code:`missing-${ref.kind}-reference`,location:`${ref.mapId}/${ref.eventId}`,message:message||(ref.kind==='hook'?`Unknown Plushbound game hook ${ref.id||'(missing)'}`:`Unknown ${ref.kind} reference ${ref.id||'(missing)'}`)});
  }
  return issues;
}