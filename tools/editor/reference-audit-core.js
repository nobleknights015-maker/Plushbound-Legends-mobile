function records(value){
  if(Array.isArray(value)) return value;
  if(value&&typeof value==='object') return Object.values(value);
  return [];
}

function idsFromPackages(packages,key){
  const ids=new Set();
  for(const pkg of packages||[]) for(const record of records(pkg?.[key])) if(record?.id!=null) ids.add(String(record.id));
  return ids;
}

function recordsFromPackages(packages,key){
  const out=[];
  for(const pkg of packages||[])for(const record of records(pkg?.[key]))if(record&&typeof record==='object')out.push(record);
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
  const add=(kind,id,owner,message)=>issues.push({severity:'error',code:`missing-${kind}-reference`,kind,id:String(id??''),owner,location:owner,message});
  for(const quest of recordsFromPackages(contentPackages,'quests')){
    const owner=`quest:${quest.id}`;
    for(const prerequisite of quest.prerequisites||[])if(prerequisite.questComplete&&!registry.quests.has(String(prerequisite.questComplete)))add('quest',prerequisite.questComplete,owner,`Quest ${quest.id} requires unknown quest ${prerequisite.questComplete}`);
    for(const reward of quest.rewards?.items||[])if(reward?.id&&!registry.items.has(String(reward.id)))add('item',reward.id,owner,`Quest ${quest.id} rewards unknown item ${reward.id}`);
    for(const unlock of quest.unlocks||[])if(String(unlock).startsWith('waystitch-')&&!registry.waystitches.has(String(unlock)))add('waystitch',unlock,owner,`Quest ${quest.id} unlocks unknown Waystitch ${unlock}`);
    for(const objective of quest.objectives||[]){
      if(objective.type==='talk'&&objective.target&&!registry.npcs.has(String(objective.target)))add('npc',objective.target,owner,`Quest ${quest.id} objective ${objective.id} targets unknown NPC ${objective.target}`);
      if(objective.type==='battle'&&objective.targetTag&&!registry.enemyTags.has(String(objective.targetTag)))add('enemy-tag',objective.targetTag,owner,`Quest ${quest.id} objective ${objective.id} uses unknown enemy tag ${objective.targetTag}`);
    }
  }
  for(const shop of recordsFromPackages(contentPackages,'shops'))for(const entry of shop.inventory||[])if(entry?.itemId&&!registry.items.has(String(entry.itemId)))add('item',entry.itemId,`shop:${shop.id}`,`Shop ${shop.id} stocks unknown item ${entry.itemId}`);
  for(const table of recordsFromPackages(contentPackages,'encounterTables'))for(const entry of table.entries||[])if(entry?.enemyId&&!registry.enemies.has(String(entry.enemyId)))add('enemy',entry.enemyId,`encounter:${table.id}`,`Encounter table ${table.id} references unknown enemy ${entry.enemyId}`);
  for(const waystitch of recordsFromPackages(contentPackages,'waystitches')){
    const required=waystitch.unlockCondition?.questComplete;if(required&&!registry.quests.has(String(required)))add('quest',required,`waystitch:${waystitch.id}`,`Waystitch ${waystitch.id} requires unknown quest ${required}`);
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
