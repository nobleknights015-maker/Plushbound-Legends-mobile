function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}
function records(value){return Array.isArray(value)?value:value&&typeof value==='object'?Object.values(value):[];}
function isRecord(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}

export function itemKind(item={}){
  const type=String(item.type||'').toLowerCase();
  return type==='accessory'||type==='equipment'||isRecord(item.stats)?'equipment':'consumable';
}

export function itemTemplate(kind='consumable',{suffix='new'}={}){
  if(kind==='equipment') return {id:`new-accessory-${suffix}`,name:'New Accessory',type:'accessory',description:'',stats:{defense:0,spirit:0},assetBindings:{icon:''}};
  return {id:`new-item-${suffix}`,name:'New Item',type:'consumable',description:'',assetBindings:{icon:''}};
}

export function collectItems(packages=[]){
  const out=[];
  packages.forEach((entry,packageIndex)=>{
    const value=entry?.data?.items;
    if(Array.isArray(value)) value.forEach((item,locator)=>{if(isRecord(item))out.push({packageIndex,packageId:entry.id,path:entry.path,locator,registryKind:'array',item});});
    else if(isRecord(value)) for(const [locator,item] of Object.entries(value)) if(isRecord(item)) out.push({packageIndex,packageId:entry.id,path:entry.path,locator,registryKind:'keyed',item});
  });
  return out;
}

export function validateItems(packages=[]){
  const issues=[];const seen=new Map();
  for(const row of collectItems(packages)){
    const id=String(row.item.id||'').trim();
    if(!id){issues.push({severity:'error',code:'missing-item-id',packageId:row.packageId,locator:row.locator,message:`${row.packageId} contains an item without an id`});continue;}
    if(seen.has(id)) issues.push({severity:'error',code:'duplicate-item-id',id,packageId:row.packageId,message:`Duplicate item id ${id} in ${seen.get(id)} and ${row.packageId}`});
    else seen.set(id,row.packageId);
    if(!String(row.item.name||'').trim()) issues.push({severity:'warning',code:'missing-item-name',id,packageId:row.packageId,message:`Item ${id} has no display name`});
    if(isRecord(row.item.stats)) for(const [key,value] of Object.entries(row.item.stats)) if(!Number.isFinite(Number(value))) issues.push({severity:'error',code:'invalid-item-stat',id,stat:key,packageId:row.packageId,message:`Item ${id} stat ${key} must be numeric`});
  }
  return issues;
}

export function itemReferences(itemId,packages=[],runtimePackages=[]){
  const id=String(itemId);const refs=[];
  for(const entry of packages){
    const data=entry?.data||{};
    for(const quest of records(data.quests)) for(const reward of quest?.rewards?.items||[]) if(String(reward?.id)===id) refs.push({kind:'quest-reward',packageId:entry.id,recordId:quest.id,label:`Quest reward • ${quest.name||quest.id}`});
    for(const shop of records(data.shops)) for(const stock of shop?.inventory||[]) if(String(stock?.itemId)===id) refs.push({kind:'shop-stock',packageId:entry.id,recordId:shop.id,label:`Shop stock • ${shop.name||shop.id}`});
    for(const enemy of records(data.enemies)) for(const drop of enemy?.rewards?.drops||[]) if(String(drop?.itemId)===id) refs.push({kind:'enemy-drop',packageId:entry.id,recordId:enemy.id,label:`Enemy drop • ${enemy.name||enemy.id}`});
  }
  for(const entry of runtimePackages) for(const map of entry?.data?.maps||[]) for(const event of map.events||[]) for(const page of event.pages||[]) for(const command of page.commands||[]){
    if(command?.code!=='SCRIPT_HOOK'||String(command.parameters?.[0]||'')!=='inventory.give') continue;
    if(String(command.parameters?.[1]?.itemId||'')===id) refs.push({kind:'runtime-hook',packageId:entry.id,recordId:`${map.id}/${event.id}`,label:`Runtime give • ${map.id}/${event.id}`});
  }
  return refs;
}

export function replaceItem(packages,row,nextItem){
  if(!row||!isRecord(nextItem)) throw new Error('Item replacement requires an item object');
  const entry=packages[row.packageIndex];const value=entry?.data?.items;if(!entry||!value)throw new Error('Unknown item source package');
  const nextId=String(nextItem.id||'').trim();if(!nextId)throw new Error('Item id is required');
  const duplicate=collectItems(packages).find(other=>!(other.packageIndex===row.packageIndex&&String(other.locator)===String(row.locator))&&String(other.item.id)===nextId);
  if(duplicate)throw new Error(`Duplicate item id ${nextId}`);
  if(Array.isArray(value)) value[row.locator]=clone(nextItem);else value[String(row.locator)]=clone(nextItem);
  return nextItem;
}

export function addItem(packages,packageIndex,item){
  if(!isRecord(item)||!String(item.id||'').trim())throw new Error('New items require an id');
  if(collectItems(packages).some(row=>String(row.item.id)===String(item.id)))throw new Error(`Duplicate item id ${item.id}`);
  const entry=packages[packageIndex],value=entry?.data?.items;if(!entry||!value)throw new Error('Target package has no items registry');
  if(Array.isArray(value)){value.push(clone(item));return {packageIndex,locator:value.length-1,registryKind:'array'};}
  const key=String(item.id);if(Object.hasOwn(value,key))throw new Error(`Duplicate item key ${key}`);value[key]=clone(item);return {packageIndex,locator:key,registryKind:'keyed'};
}

export function removeItem(packages,row){
  const entry=packages[row?.packageIndex],value=entry?.data?.items;if(!entry||!value)throw new Error('Unknown item source package');
  if(Array.isArray(value))return value.splice(Number(row.locator),1)[0];const key=String(row.locator);if(!Object.hasOwn(value,key))throw new Error('Unknown item');const removed=value[key];delete value[key];return removed;
}

export {clone};
