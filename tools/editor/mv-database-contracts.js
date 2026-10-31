// Independent RPG Maker MV database/map record compatibility validators.
// Implements observable serialized project-data contracts only. No RPG Maker runtime code or assets.

function obj(v){return !!v&&typeof v==='object'&&!Array.isArray(v);}
function arr(v){return Array.isArray(v);}
function issue(code,message,file,severity='error'){return {severity,code,message,file};}
function int(v,min=0){return Number.isInteger(v)&&v>=min;}
function str(v){return typeof v==='string';}
function bool(v){return typeof v==='boolean';}

export const MV_RECORD_KEYS=Object.freeze({
  actor:['id','name','nickname','classId','initialLevel','maxLevel','characterName','characterIndex','faceName','faceIndex','battlerName','equips','traits','note','profile'],
  class:['id','name','expParams','params','learnings','traits','note'],
  skill:['id','name','description','iconIndex','stypeId','scope','occasion','speed','successRate','repeats','tpGain','hitType','animationId','damage','effects','mpCost','tpCost','requiredWtypeId1','requiredWtypeId2','message1','message2','note'],
  item:['id','name','description','iconIndex','itypeId','scope','occasion','speed','successRate','repeats','tpGain','hitType','animationId','damage','effects','consumable','price','note'],
  weapon:['id','name','description','iconIndex','etypeId','wtypeId','animationId','price','params','traits','note'],
  armor:['id','name','description','iconIndex','etypeId','atypeId','price','params','traits','note'],
  enemy:['id','name','battlerName','battlerHue','params','exp','gold','dropItems','actions','traits','note'],
  state:['id','name','iconIndex','restriction','priority','removeAtBattleEnd','removeByRestriction','autoRemovalTiming','minTurns','maxTurns','removeByDamage','chanceByDamage','removeByWalking','stepsToRemove','message1','message2','message3','message4','motion','overlay','traits','note'],
  animation:['id','name','animation1Name','animation1Hue','animation2Name','animation2Hue','position','frames','timings'],
  commonEvent:['id','name','trigger','switchId','list'],
  mapInfo:['id','expanded','name','order','parentId','scrollX','scrollY'],
  troop:['id','name','members','pages']
});

export function validateMvAudioObject(v,file='audio'){
  const issues=[];
  if(!obj(v)) return [issue('MV_AUDIO_OBJECT','MV audio reference must be an object',file)];
  if(!str(v.name)) issues.push(issue('MV_AUDIO_NAME','MV audio name must be a string',file));
  for(const k of ['volume','pitch','pan']) if(!Number.isFinite(v[k])) issues.push(issue('MV_AUDIO_NUMBER',`MV audio ${k} must be numeric`,file));
  return issues;
}

export function validateMvTrait(v,file='trait'){
  const issues=[];
  if(!obj(v)) return [issue('MV_TRAIT_OBJECT','MV trait must be an object',file)];
  if(!int(v.code)) issues.push(issue('MV_TRAIT_CODE','MV trait code must be a non-negative integer',file));
  if(!int(v.dataId)) issues.push(issue('MV_TRAIT_DATA_ID','MV trait dataId must be a non-negative integer',file));
  if(!Number.isFinite(v.value)) issues.push(issue('MV_TRAIT_VALUE','MV trait value must be numeric',file));
  return issues;
}

export function validateMvEffect(v,file='effect'){
  const issues=[];
  if(!obj(v)) return [issue('MV_EFFECT_OBJECT','MV effect must be an object',file)];
  if(!int(v.code)) issues.push(issue('MV_EFFECT_CODE','MV effect code must be a non-negative integer',file));
  if(!int(v.dataId)) issues.push(issue('MV_EFFECT_DATA_ID','MV effect dataId must be a non-negative integer',file));
  if(!Number.isFinite(v.value1)||!Number.isFinite(v.value2)) issues.push(issue('MV_EFFECT_VALUE','MV effect values must be numeric',file));
  return issues;
}

export function validateMvDamage(v,file='damage'){
  const issues=[];
  if(!obj(v)) return [issue('MV_DAMAGE_OBJECT','MV damage must be an object',file)];
  if(!int(v.type)||!int(v.elementId)) issues.push(issue('MV_DAMAGE_ID','MV damage type and elementId must be non-negative integers',file));
  if(!str(v.formula)) issues.push(issue('MV_DAMAGE_FORMULA','MV damage formula must be a string',file));
  if(!Number.isFinite(v.variance)) issues.push(issue('MV_DAMAGE_VARIANCE','MV damage variance must be numeric',file));
  if(!bool(v.critical)) issues.push(issue('MV_DAMAGE_CRITICAL','MV damage critical must be boolean',file));
  return issues;
}

export function validateMvMoveCommand(v,file='moveCommand'){
  const issues=[];
  if(!obj(v)) return [issue('MV_MOVE_COMMAND_OBJECT','MV movement command must be an object',file)];
  if(!int(v.code)) issues.push(issue('MV_MOVE_COMMAND_CODE','MV movement command code must be a non-negative integer',file));
  if(!arr(v.parameters)) issues.push(issue('MV_MOVE_COMMAND_PARAMETERS','MV movement command parameters must be an array',file));
  return issues;
}

export function validateMvMoveRoute(v,file='moveRoute'){
  const issues=[];
  if(!obj(v)) return [issue('MV_MOVE_ROUTE_OBJECT','MV movement route must be an object',file)];
  if(!bool(v.repeat)||!bool(v.skippable)||!bool(v.wait)) issues.push(issue('MV_MOVE_ROUTE_FLAGS','MV movement route repeat/skippable/wait must be booleans',file));
  if(!arr(v.list)) issues.push(issue('MV_MOVE_ROUTE_LIST','MV movement route list must be an array',file));
  else {
    v.list.forEach((x,i)=>issues.push(...validateMvMoveCommand(x,`${file}.list[${i}]`)));
    if(v.list.length===0||v.list[v.list.length-1]?.code!==0) issues.push(issue('MV_MOVE_ROUTE_TERMINATOR','MV movement route must terminate with command code 0',file));
  }
  return issues;
}

export function validateMvEventCommand(v,file='eventCommand'){
  const issues=[];
  if(!obj(v)) return [issue('MV_EVENT_COMMAND_OBJECT','MV event command must be an object',file)];
  if(!int(v.code)) issues.push(issue('MV_EVENT_COMMAND_CODE','MV event command code must be a non-negative integer',file));
  if(!int(v.indent)) issues.push(issue('MV_EVENT_COMMAND_INDENT','MV event command indent must be a non-negative integer',file));
  if(!arr(v.parameters)) issues.push(issue('MV_EVENT_COMMAND_PARAMETERS','MV event command parameters must be an array',file));
  return issues;
}

export function validateMvEventList(v,file='eventList'){
  const issues=[];
  if(!arr(v)) return [issue('MV_EVENT_LIST','MV event list must be an array',file)];
  v.forEach((x,i)=>issues.push(...validateMvEventCommand(x,`${file}[${i}]`)));
  if(v.length===0||v[v.length-1]?.code!==0) issues.push(issue('MV_EVENT_TERMINATOR','MV event lists must terminate with command code 0',file));
  return issues;
}

export function validateMvEventPage(v,file='eventPage'){
  const issues=[];
  if(!obj(v)) return [issue('MV_EVENT_PAGE_OBJECT','MV event page must be an object',file)];
  if(!obj(v.conditions)) issues.push(issue('MV_EVENT_PAGE_CONDITIONS','MV event page conditions must be an object',file));
  if(!obj(v.image)) issues.push(issue('MV_EVENT_PAGE_IMAGE','MV event page image must be an object',file));
  if(!int(v.moveType)||!int(v.moveSpeed)||!int(v.moveFrequency)||!int(v.priorityType)||!int(v.trigger)) issues.push(issue('MV_EVENT_PAGE_ENUM','MV event page movement/priority/trigger fields must be non-negative integers',file));
  for(const k of ['walkAnime','stepAnime','directionFix','through']) if(!bool(v[k])) issues.push(issue('MV_EVENT_PAGE_FLAG',`MV event page ${k} must be boolean`,file));
  issues.push(...validateMvMoveRoute(v.moveRoute,`${file}.moveRoute`));
  issues.push(...validateMvEventList(v.list,`${file}.list`));
  return issues;
}

export function validateMvMapEvent(v,file='mapEvent'){
  const issues=[];
  if(!obj(v)) return [issue('MV_MAP_EVENT_OBJECT','MV map event must be an object',file)];
  if(!int(v.id,1)||!int(v.x)||!int(v.y)) issues.push(issue('MV_MAP_EVENT_COORDS','MV map event id/x/y must be valid integers',file));
  if(!str(v.name)||!str(v.note)) issues.push(issue('MV_MAP_EVENT_TEXT','MV map event name/note must be strings',file));
  if(!arr(v.pages)) issues.push(issue('MV_MAP_EVENT_PAGES','MV map event pages must be an array',file));
  else v.pages.forEach((p,i)=>issues.push(...validateMvEventPage(p,`${file}.pages[${i}]`)));
  return issues;
}

export function validateMvEncounter(v,file='encounter'){
  const issues=[];
  if(!obj(v)) return [issue('MV_ENCOUNTER_OBJECT','MV encounter must be an object',file)];
  if(!int(v.troopId,1)||!int(v.weight,1)) issues.push(issue('MV_ENCOUNTER_ID','MV encounter troopId and weight must be positive integers',file));
  if(!arr(v.regionSet)||v.regionSet.some(x=>!int(x))) issues.push(issue('MV_ENCOUNTER_REGIONS','MV encounter regionSet must be an integer array',file));
  return issues;
}

export function validateMvMapInfo(v,file='MapInfos.json'){
  const issues=[];
  if(!obj(v)) return [issue('MV_MAPINFO_OBJECT','MV map info must be an object',file)];
  if(!int(v.id,1)||!int(v.order)||!int(v.parentId)) issues.push(issue('MV_MAPINFO_ID','MV map info id/order/parentId must be valid integers',file));
  if(!str(v.name)||!bool(v.expanded)||!Number.isFinite(v.scrollX)||!Number.isFinite(v.scrollY)) issues.push(issue('MV_MAPINFO_FIELDS','MV map info name/expanded/scroll fields are malformed',file));
  return issues;
}

export function validateMvSystem(v,file='System.json'){
  const issues=[];
  if(!obj(v)) return [issue('MV_SYSTEM_OBJECT','MV System must be an object',file)];
  for(const k of ['startMapId','startX','startY','editMapId','versionId','testTroopId']) if(k in v&&!int(v[k])) issues.push(issue('MV_SYSTEM_INT',`MV System ${k} must be a non-negative integer`,file));
  for(const k of ['gameTitle','currencyUnit','locale','title1Name','title2Name','battleback1Name','battleback2Name','battlerName']) if(k in v&&!str(v[k])) issues.push(issue('MV_SYSTEM_TEXT',`MV System ${k} must be a string`,file));
  for(const k of ['switches','variables','elements','skillTypes','weaponTypes','armorTypes','equipTypes','magicSkills','partyMembers','menuCommands','sounds','attackMotions','testBattlers']) if(!arr(v[k])) issues.push(issue('MV_SYSTEM_ARRAY',`MV System ${k} must be an array`,file));
  for(const k of ['optDisplayTp','optDrawTitle','optExtraExp','optFloorDeath','optFollowers','optSideView','optSlipDeath','optTransparent']) if(k in v&&!bool(v[k])) issues.push(issue('MV_SYSTEM_BOOL',`MV System ${k} must be boolean`,file));
  for(const k of ['battleBgm','defeatMe','gameoverMe','titleBgm','victoryMe']) issues.push(...validateMvAudioObject(v[k],`${file}.${k}`));
  for(const k of ['boat','ship','airship']){
    const vehicle=v[k];
    if(!obj(vehicle)){issues.push(issue('MV_VEHICLE_OBJECT',`MV System ${k} must be an object`,file));continue;}
    if(!str(vehicle.characterName)||!int(vehicle.characterIndex)||!int(vehicle.startMapId)||!int(vehicle.startX)||!int(vehicle.startY)) issues.push(issue('MV_VEHICLE_FIELDS',`MV ${k} vehicle fields are malformed`,file));
    issues.push(...validateMvAudioObject(vehicle.bgm,`${file}.${k}.bgm`));
  }
  if(!obj(v.terms)) issues.push(issue('MV_TERMS_OBJECT','MV System terms must be an object',file));
  else for(const k of ['basic','commands','messages','params']) if(!(arr(v.terms[k])||obj(v.terms[k]))) issues.push(issue('MV_TERMS_FIELD',`MV terms ${k} must be serialized data`,file));
  if(!arr(v.windowTone)||v.windowTone.length!==4||v.windowTone.some(x=>!Number.isFinite(x))) issues.push(issue('MV_WINDOW_TONE','MV windowTone must contain four numeric entries',file));
  return issues;
}

function validateBaseRecord(v,file){
  const issues=[];
  if(!obj(v)) return [issue('MV_RECORD_OBJECT','MV database record must be an object',file)];
  if(!int(v.id,1)) issues.push(issue('MV_RECORD_ID','MV database record id must be a positive integer',file));
  if('name' in v&&!str(v.name)) issues.push(issue('MV_RECORD_NAME','MV database record name must be a string',file));
  if('note' in v&&!str(v.note)) issues.push(issue('MV_RECORD_NOTE','MV database record note must be a string',file));
  if('traits' in v){if(!arr(v.traits)) issues.push(issue('MV_TRAITS_ARRAY','MV traits must be an array',file));else v.traits.forEach((x,i)=>issues.push(...validateMvTrait(x,`${file}.traits[${i}]`)));}
  return issues;
}

export function validateMvDatabaseRecord(type,v,file=type){
  const issues=validateBaseRecord(v,file);
  if(!obj(v)) return issues;
  switch(type){
    case 'Actors':
      for(const k of ['classId','initialLevel','maxLevel','characterIndex','faceIndex']) if(!int(v[k])) issues.push(issue('MV_ACTOR_INT',`MV actor ${k} must be a non-negative integer`,file));
      if(!arr(v.equips)) issues.push(issue('MV_ACTOR_EQUIPS','MV actor equips must be an array',file));
      break;
    case 'Classes':
      if(!arr(v.expParams)||!arr(v.params)||!arr(v.learnings)) issues.push(issue('MV_CLASS_ARRAYS','MV class expParams/params/learnings must be arrays',file));
      break;
    case 'Skills':
    case 'Items':
      for(const k of ['scope','occasion','speed','successRate','repeats','tpGain','hitType','animationId','iconIndex']) if(!Number.isInteger(v[k])) issues.push(issue('MV_USABLE_INT',`MV ${type} ${k} must be integer`,file));
      if(!arr(v.effects)) issues.push(issue('MV_EFFECTS_ARRAY',`MV ${type} effects must be an array`,file));else v.effects.forEach((x,i)=>issues.push(...validateMvEffect(x,`${file}.effects[${i}]`)));
      issues.push(...validateMvDamage(v.damage,`${file}.damage`));
      break;
    case 'Weapons':
    case 'Armors':
      if(!arr(v.params)||v.params.length!==8||v.params.some(x=>!Number.isFinite(x))) issues.push(issue('MV_EQUIP_PARAMS',`MV ${type} params must contain eight numeric entries`,file));
      if(!Number.isFinite(v.price)) issues.push(issue('MV_EQUIP_PRICE',`MV ${type} price must be numeric`,file));
      break;
    case 'Enemies':
      if(!arr(v.params)||v.params.length!==8) issues.push(issue('MV_ENEMY_PARAMS','MV enemy params must contain eight entries',file));
      if(!arr(v.dropItems)||!arr(v.actions)) issues.push(issue('MV_ENEMY_ARRAYS','MV enemy dropItems/actions must be arrays',file));
      break;
    case 'States':
      for(const k of ['removeAtBattleEnd','removeByRestriction','removeByDamage','removeByWalking']) if(!bool(v[k])) issues.push(issue('MV_STATE_BOOL',`MV state ${k} must be boolean`,file));
      break;
    case 'Animations':
      if(!arr(v.frames)||!arr(v.timings)) issues.push(issue('MV_ANIMATION_ARRAYS','MV animation frames/timings must be arrays',file));
      else v.timings.forEach((t,i)=>{if(!obj(t)||!int(t.frame)||!arr(t.flashColor)||!Number.isFinite(t.flashDuration)||!int(t.flashScope)) issues.push(issue('MV_ANIMATION_TIMING','MV animation timing is malformed',`${file}.timings[${i}]`)); else issues.push(...validateMvAudioObject(t.se,`${file}.timings[${i}].se`));});
      break;
    case 'CommonEvents':
      if(!int(v.trigger)||!int(v.switchId)) issues.push(issue('MV_COMMON_EVENT_FIELDS','MV common event trigger/switchId must be non-negative integers',file));
      issues.push(...validateMvEventList(v.list,`${file}.list`));
      break;
    case 'Troops':
      if(!arr(v.members)||!arr(v.pages)) issues.push(issue('MV_TROOP_ARRAYS','MV troop members/pages must be arrays',file));
      break;
  }
  return issues;
}

export function validateMvExtendedDatabase(files={}){
  const issues=[];
  if('System.json' in files) issues.push(...validateMvSystem(files['System.json']));
  if(arr(files['MapInfos.json'])) for(const r of files['MapInfos.json'].slice(1)) if(r) issues.push(...validateMvMapInfo(r,`MapInfos.json#${r.id}`));
  const groups=['Actors','Classes','Skills','Items','Weapons','Armors','Enemies','States','Animations','CommonEvents','Troops'];
  for(const type of groups){const a=files[`${type}.json`];if(arr(a)) for(const r of a.slice(1)) if(r) issues.push(...validateMvDatabaseRecord(type,r,`${type}.json#${r.id}`));}
  for(const [name,map] of Object.entries(files)) if(/^Map\d{3}\.json$/.test(name)&&obj(map)){
    if(arr(map.events)) map.events.slice(1).forEach((e,i)=>{if(e)issues.push(...validateMvMapEvent(e,`${name}.events[${i+1}]`));});
    if(arr(map.encounterList)) map.encounterList.forEach((e,i)=>issues.push(...validateMvEncounter(e,`${name}.encounterList[${i}]`)));
    for(const k of ['bgm','bgs']) issues.push(...validateMvAudioObject(map[k],`${name}.${k}`));
    for(const k of ['autoplayBgm','autoplayBgs','disableDashing','parallaxLoopX','parallaxLoopY','parallaxShow','specifyBattleback']) if(!bool(map[k])) issues.push(issue('MV_MAP_BOOL',`MV map ${k} must be boolean`,name));
    for(const k of ['encounterStep','height','parallaxSx','parallaxSy','scrollType','tilesetId','width']) if(!Number.isInteger(map[k])) issues.push(issue('MV_MAP_INT',`MV map ${k} must be integer`,name));
  }
  return {ok:!issues.some(x=>x.severity==='error'),issues};
}
