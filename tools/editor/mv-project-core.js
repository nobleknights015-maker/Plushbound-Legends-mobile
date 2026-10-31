// Independent RPG Maker MV project-data compatibility helpers.
// This module implements observable JSON/project contracts only; it contains no RPG Maker runtime code or assets.

export const MV_DATABASE_FILES=Object.freeze([
  'Actors.json','Animations.json','Armors.json','Classes.json','CommonEvents.json','Enemies.json','Items.json',
  'MapInfos.json','Skills.json','States.json','System.json','Tilesets.json','Troops.json','Weapons.json'
]);

export const MV_MAP_FILE=/^Map(\d{3})\.json$/;

function clone(v){return typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v));}
function obj(v){return !!v&&typeof v==='object'&&!Array.isArray(v);}
function arr(v){return Array.isArray(v);}
function issue(code,message,file,severity='error'){return {severity,code,message,file};}
function numberedArray(value){return arr(value)&&value.length>0&&value[0]===null;}

export function detectMvProject(files={}){
  const names=new Set(Object.keys(files));
  const present=MV_DATABASE_FILES.filter(name=>names.has(name));
  const maps=[...names].filter(name=>MV_MAP_FILE.test(name)).sort();
  return {isMvProject:present.length===MV_DATABASE_FILES.length&&maps.length>0,present,missing:MV_DATABASE_FILES.filter(name=>!names.has(name)),maps};
}

export function validateMvMap(map,file='Map001.json'){
  const issues=[];
  if(!obj(map)) return [issue('MV_MAP_OBJECT','MV map must be an object',file)];
  if(!Number.isInteger(map.width)||map.width<=0||!Number.isInteger(map.height)||map.height<=0) issues.push(issue('MV_MAP_SIZE','MV map width and height must be positive integers',file));
  if(!Number.isInteger(map.tilesetId)||map.tilesetId<0) issues.push(issue('MV_TILESET_ID','MV map tilesetId must be a non-negative integer',file));
  if(!arr(map.data)) issues.push(issue('MV_MAP_DATA','MV map data must be an array',file));
  else if(Number.isInteger(map.width)&&map.width>0&&Number.isInteger(map.height)&&map.height>0&&map.data.length!==map.width*map.height*6) issues.push(issue('MV_MAP_DATA_SIZE',`MV map data must contain width × height × 6 cells (${map.width*map.height*6})`,file));
  if(!arr(map.events)||map.events[0]!==null) issues.push(issue('MV_EVENTS_ARRAY','MV map events must use the null-at-index-zero array convention',file));
  if(!arr(map.encounterList)) issues.push(issue('MV_ENCOUNTERS','MV encounterList must be an array',file));
  return issues;
}

export function validateMvDatabase(files={}){
  const detection=detectMvProject(files);const issues=[];
  for(const name of detection.missing) issues.push(issue('MV_FILE_MISSING',`Missing MV database file: ${name}`,name));
  const numbered=['Actors.json','Animations.json','Armors.json','Classes.json','CommonEvents.json','Enemies.json','Items.json','Skills.json','States.json','Tilesets.json','Troops.json','Weapons.json'];
  for(const name of numbered){if(name in files&&!numberedArray(files[name]))issues.push(issue('MV_NUMBERED_ARRAY',`${name} must use MV's null-at-index-zero database convention`,name));}
  if('MapInfos.json' in files&&!numberedArray(files['MapInfos.json'])) issues.push(issue('MV_MAPINFOS_ARRAY','MapInfos.json must use MV\'s null-at-index-zero convention','MapInfos.json'));
  const system=files['System.json'];
  if(system!==undefined){
    if(!obj(system)) issues.push(issue('MV_SYSTEM_OBJECT','System.json must be an object','System.json'));
    else {
      for(const key of ['startMapId','startX','startY']) if(!Number.isInteger(system[key])||system[key]<0) issues.push(issue('MV_SYSTEM_START',`System.${key} must be a non-negative integer`,'System.json'));
      for(const key of ['switches','variables','elements','skillTypes','weaponTypes','armorTypes','equipTypes']) if(!arr(system[key])) issues.push(issue('MV_SYSTEM_LIST',`System.${key} must be an array`,'System.json'));
    }
  }
  for(const name of detection.maps) issues.push(...validateMvMap(files[name],name));
  if(obj(system)&&Number.isInteger(system.startMapId)&&system.startMapId>0){const start=`Map${String(system.startMapId).padStart(3,'0')}.json`;if(!(start in files))issues.push(issue('MV_START_MAP_MISSING',`System start map ${start} is missing`,start));}
  return {ok:!issues.some(x=>x.severity==='error'),issues,detection};
}

export function createMvCompatibilityPackage(files={}){
  const validation=validateMvDatabase(files);
  if(!validation.ok) throw new Error(`Invalid RPG Maker MV project data: ${validation.issues[0]?.message||'unknown error'}`);
  const system=files['System.json'];
  const maps={};
  for(const file of validation.detection.maps){const id=Number(file.match(MV_MAP_FILE)[1]);maps[id]=clone(files[file]);}
  const database={};for(const file of MV_DATABASE_FILES)database[file.replace('.json','')]=clone(files[file]);
  return {
    format:'rpg-maker-mv-project-data',compatibilityVersion:1,
    source:{databaseFiles:[...MV_DATABASE_FILES],mapFiles:[...validation.detection.maps]},
    start:{mapId:system.startMapId,x:system.startX,y:system.startY},
    database,maps,
    preservation:{mvIds:true,nullIndexZero:true,mapLayerCount:6,unknownFields:true}
  };
}

export function mvMapCellIndex(width,height,x,y,z){
  for(const [name,value,max] of [['x',x,width],['y',y,height],['z',z,6]]) if(!Number.isInteger(value)||value<0||value>=max) throw new RangeError(`MV ${name} coordinate out of range`);
  return (z*height+y)*width+x;
}

export function mvMapCell(map,x,y,z){
  const i=mvMapCellIndex(map.width,map.height,x,y,z);return map.data[i];
}
