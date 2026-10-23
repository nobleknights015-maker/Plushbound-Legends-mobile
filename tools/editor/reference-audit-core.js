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

export function contentReferenceRegistry(contentPackages=[]){
  return {
    quests:idsFromPackages(contentPackages,'quests'),
    items:idsFromPackages(contentPackages,'items'),
    shops:idsFromPackages(contentPackages,'shops'),
    waystitches:idsFromPackages(contentPackages,'waystitches')
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
      else if(hook==='quest.objective') refs.push({kind:'quest',id:String(payload.questId??''),hook,mapId:map.id,eventId:event.id,pageIndex,commandIndex});
      else if(hook==='inventory.give') refs.push({kind:'item',id:String(payload.itemId??''),hook,mapId:map.id,eventId:event.id,pageIndex,commandIndex});
      else if(hook==='waystitch.activate') refs.push({kind:'waystitch',id:String(payload.waystitchId??''),hook,mapId:map.id,eventId:event.id,pageIndex,commandIndex});
      else refs.push({kind:'hook',id:hook,hook,mapId:map.id,eventId:event.id,pageIndex,commandIndex});
    }
  }
  return refs;
}

export function auditContentReferences(pkg,contentPackages=[]){
  const registry=contentReferenceRegistry(contentPackages);
  const issues=[];
  const allowedHooks=new Set(['quest.start','quest.objective','quest.complete','inventory.give','waystitch.activate']);
  for(const ref of commandReferences(pkg)){
    let known=true;
    if(ref.kind==='shop') known=!!ref.id&&registry.shops.has(ref.id);
    else if(ref.kind==='quest') known=!!ref.id&&registry.quests.has(ref.id);
    else if(ref.kind==='item') known=!!ref.id&&registry.items.has(ref.id);
    else if(ref.kind==='waystitch') known=!!ref.id&&registry.waystitches.has(ref.id);
    else if(ref.kind==='hook') known=allowedHooks.has(ref.id);
    if(!known) issues.push({...ref,severity:'error',code:`missing-${ref.kind}-reference`,message:ref.kind==='hook'?`Unknown Plushbound game hook ${ref.id||'(missing)'}`:`Unknown ${ref.kind} reference ${ref.id||'(missing)'}`});
  }
  return issues;
}
