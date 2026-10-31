// Independent RPG Maker MV project-data compatibility helpers.
// This module implements observable JSON/project contracts only; it contains no RPG Maker runtime code or assets.

export const MV_DATABASE_FILES=Object.freeze([
  'Actors.json','Animations.json','Armors.json','Classes.json','CommonEvents.json','Enemies.json','Items.json',
  'MapInfos.json','Skills.json','States.json','System.json','Tilesets.json','Troops.json','Weapons.json'
]);

export const MV_MAP_FILE=/^Map(\d{3})\.json$/;
export const MV_SCREEN=Object.freeze({width:816,height:624});
export const MV_PROJECT_ROOT_FILES=Object.freeze(['index.html','package.json']);
export const MV_PROJECT_DIRS=Object.freeze(['audio','data','fonts','icon','img','js']);
export const MV_IMAGE_DIRS=Object.freeze(['animations','battlebacks1','battlebacks2','characters','enemies','faces','parallaxes','sv_actors','sv_enemies','system','tilesets','titles1','titles2']);
export const MV_TILESET_GEOMETRY=Object.freeze({
  A1:[768,576],A2:[768,576],A3:[768,384],A4:[768,720],A5:[384,768],B:[768,768],C:[768,768],D:[768,768],E:[768,768]
});

function clone(v){return typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v));}
function obj(v){return !!v&&typeof v==='object'&&!Array.isArray(v);}
function arr(v){return Array.isArray(v);}
function issue(code,message,file,severity='error'){return {severity,code,message,file};}
function numberedArray(value){return arr(value)&&value.length>0&&value[0]===null;}
function cleanPath(v){return String(v||'').replace(/\\/g,'/').replace(/^\.\//,'').replace(/\/+/g,'/').replace(/^\//,'');}

export function detectMvProject(files={}){
  const names=new Set(Object.keys(files));
  const present=MV_DATABASE_FILES.filter(name=>names.has(name));
  const maps=[...names].filter(name=>MV_MAP_FILE.test(name)).sort();
  return {isMvProject:present.length===MV_DATABASE_FILES.length&&maps.length>0,present,missing:MV_DATABASE_FILES.filter(name=>!names.has(name)),maps};
}

// Detect an MV-shaped project inside an archive or file listing without executing any source code.
// A project may live at archive root or beneath one common prefix (for example NewData/).
export function detectMvArchiveLayout(paths=[]){
  const normalized=[...new Set(paths.map(cleanPath).filter(Boolean))];
  const roots=new Set(['']);
  for(const p of normalized){
    for(const marker of ['index.html','package.json','data/System.json']){
      if(p===marker) roots.add('');
      else if(p.endsWith('/'+marker)) roots.add(p.slice(0,-marker.length));
    }
  }
  const pathSet=new Set(normalized);
  const candidates=[...roots].map(root=>{
    const prefix=root?root.replace(/\/$/,'')+'/':'';
    const required=[...MV_PROJECT_ROOT_FILES.map(x=>prefix+x),...MV_DATABASE_FILES.map(x=>prefix+'data/'+x)];
    const maps=normalized.filter(x=>x.startsWith(prefix+'data/')&&MV_MAP_FILE.test(x.slice((prefix+'data/').length))).sort();
    const missing=required.filter(x=>!pathSet.has(x));
    const dirs=MV_PROJECT_DIRS.filter(d=>normalized.some(x=>x.startsWith(prefix+d+'/')));
    return {root:root.replace(/\/$/,''),isMvProject:missing.length===0&&maps.length>0,missing,maps,dirs};
  }).sort((a,b)=>Number(b.isMvProject)-Number(a.isMvProject)||a.missing.length-b.missing.length||a.root.localeCompare(b.root));
  return candidates[0]||{root:'',isMvProject:false,missing:[],maps:[],dirs:[]};
}

export function classifyMvProjectPath(path,root=''){
  const p=cleanPath(path);const r=cleanPath(root).replace(/\/$/,'');
  const rel=r&&p.startsWith(r+'/')?p.slice(r.length+1):p;
  if(MV_PROJECT_ROOT_FILES.includes(rel)) return {kind:'root',path:rel};
  if(rel.startsWith('data/')){const name=rel.slice(5);return {kind:MV_MAP_FILE.test(name)?'map':'database',path:rel,name};}
  if(rel.startsWith('img/')){const [,category,...tail]=rel.split('/');return {kind:'image',category,path:rel,name:tail.join('/')};}
  if(rel.startsWith('audio/')){const [,category,...tail]=rel.split('/');return {kind:'audio',category,path:rel,name:tail.join('/')};}
  if(rel.startsWith('js/')) return {kind:'javascript',path:rel,name:rel.slice(3)};
  if(rel.startsWith('fonts/')) return {kind:'font',path:rel,name:rel.slice(6)};
  if(rel.startsWith('icon/')) return {kind:'icon',path:rel,name:rel.slice(5)};
  return {kind:'other',path:rel};
}

export function mvCharacterSheetGeometry(width,height,filename=''){
  if(!Number.isInteger(width)||width<=0||!Number.isInteger(height)||height<=0) throw new RangeError('MV character sheet dimensions must be positive integers');
  const single=/^!?\$/.test(String(filename).split('/').pop()||'');
  const columns=single?3:12,rows=single?4:8;
  if(width%columns||height%rows) return {valid:false,single,columns,rows,cellWidth:null,cellHeight:null};
  return {valid:true,single,columns,rows,cellWidth:width/columns,cellHeight:height/rows};
}

export function mvFaceSheetGeometry(width,height){
  if(!Number.isInteger(width)||width<=0||!Number.isInteger(height)||height<=0) throw new RangeError('MV face sheet dimensions must be positive integers');
  const columns=4,rows=2;
  if(width%columns||height%rows) return {valid:false,columns,rows,cellWidth:null,cellHeight:null};
  return {valid:true,columns,rows,cellWidth:width/columns,cellHeight:height/rows};
}

export function mvTilesetSheetGeometry(width,height,slot){
  const key=String(slot||'').toUpperCase();const expected=MV_TILESET_GEOMETRY[key];
  if(!expected) throw new RangeError(`Unknown MV tileset slot: ${slot}`);
  return {valid:width===expected[0]&&height===expected[1],slot:key,width,height,expectedWidth:expected[0],expectedHeight:expected[1],tileSize:48};
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
    screen:{...MV_SCREEN},
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
