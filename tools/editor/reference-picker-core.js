function records(value){return Array.isArray(value)?value:value&&typeof value==='object'?Object.values(value):[];}
export function referenceKind({fieldKey='',nestedPath='',nestedKey=''}={}){
  if(nestedPath==='entries'&&nestedKey==='enemyId')return'enemies';
  if(nestedPath==='inventory'&&nestedKey==='itemId')return'items';
  if(nestedPath==='prerequisites'&&nestedKey==='questComplete')return'quests';
  if(nestedPath==='rewards.items'&&nestedKey==='id')return'items';
  if(nestedPath==='rewards.drops'&&nestedKey==='itemId')return'items';
  const key=String(fieldKey).split('.').at(-1);
  if(key==='giver')return'npcs';if(key==='enemyId')return'enemies';if(key==='itemId')return'items';if(key==='questId')return'quests';if(key==='shopId')return'shops';if(key==='waystitchId')return'waystitches';if(key==='mapId')return'maps';
  return null;
}
export function buildReferenceRegistry(contentPackages=[],runtimePackages=[]){
  const registry={items:new Set(),enemies:new Set(),quests:new Set(),npcs:new Set(),shops:new Set(),waystitches:new Set(),maps:new Set()};
  for(const entry of contentPackages){const data=entry?.data||entry||{};for(const item of records(data.items))if(item?.id!=null)registry.items.add(String(item.id));for(const enemy of records(data.enemies))if(enemy?.id!=null)registry.enemies.add(String(enemy.id));for(const quest of records(data.quests))if(quest?.id!=null)registry.quests.add(String(quest.id));for(const npc of [...records(data.npcs),...records(data.namedCore)])if(npc?.id!=null)registry.npcs.add(String(npc.id));for(const shop of records(data.shops))if(shop?.id!=null)registry.shops.add(String(shop.id));for(const waystitch of records(data.waystitches))if(waystitch?.id!=null)registry.waystitches.add(String(waystitch.id));}
  for(const entry of runtimePackages){const data=entry?.data||entry||{};for(const map of records(data.maps))if(map?.id!=null)registry.maps.add(String(map.id));}
  return registry;
}
export function referenceOptions(registry,descriptor){const kind=referenceKind(descriptor);return kind?[...(registry?.[kind]||[])].sort():[];}
