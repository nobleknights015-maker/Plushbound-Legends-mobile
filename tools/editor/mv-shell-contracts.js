// Observable RPG Maker MV project-shell compatibility contracts.
// Reference-only structural validation; does not execute or reproduce RPG Maker runtime code.

function obj(v){return !!v&&typeof v==='object'&&!Array.isArray(v);}
function arr(v){return Array.isArray(v);}
function issue(code,message,file,severity='error'){return {severity,code,message,file};}

export const MV_BOOT_SCRIPT_ORDER=Object.freeze([
  'js/libs/pixi.js','js/libs/pixi-tilemap.js','js/libs/pixi-picture.js','js/libs/fpsmeter.js','js/libs/lz-string.js','js/libs/iphone-inline-video.browser.js',
  'js/rpg_core.js','js/rpg_managers.js','js/rpg_objects.js','js/rpg_scenes.js','js/rpg_sprites.js','js/rpg_windows.js','js/plugins.js','js/main.js'
]);
export const MV_AUDIO_CATEGORIES=Object.freeze(['bgm','bgs','me','se']);
export const MV_AUDIO_EXTENSIONS=Object.freeze(['.ogg','.m4a']);
export const MV_IMAGE_CATEGORIES=Object.freeze(['animations','battlebacks1','battlebacks2','characters','enemies','faces','parallaxes','sv_actors','sv_enemies','system','tilesets','titles1','titles2']);
export const MV_IMAGE_EXTENSION='.png';

export function validateMvPackageConfig(v,file='package.json'){
  const issues=[];
  if(!obj(v)) return [issue('MV_PACKAGE_OBJECT','MV package.json must serialize an object',file)];
  if(v.main!=='index.html') issues.push(issue('MV_PACKAGE_MAIN','MV project main entry must be index.html',file));
  if(!obj(v.window)) return [...issues,issue('MV_PACKAGE_WINDOW','MV package window configuration must be an object',file)];
  if(v.window.width!==816||v.window.height!==624) issues.push(issue('MV_PACKAGE_WINDOW_SIZE','MV default window contract is 816x624',file));
  if(typeof v.window.toolbar!=='boolean') issues.push(issue('MV_PACKAGE_TOOLBAR','MV package toolbar flag must be boolean',file));
  if(typeof v.window.title!=='string') issues.push(issue('MV_PACKAGE_TITLE','MV package window title must be a string',file));
  if(typeof v.window.icon!=='string') issues.push(issue('MV_PACKAGE_ICON','MV package window icon must be a string path',file));
  return issues;
}

export function validateMvPluginDescriptor(v,file='js/plugins.js'){
  const issues=[];
  if(!obj(v)) return [issue('MV_PLUGIN_OBJECT','MV plugin descriptor must be an object',file)];
  if(typeof v.name!=='string'||!v.name) issues.push(issue('MV_PLUGIN_NAME','MV plugin name must be a non-empty string',file));
  if(typeof v.status!=='boolean') issues.push(issue('MV_PLUGIN_STATUS','MV plugin status must be boolean',file));
  if(typeof v.description!=='string') issues.push(issue('MV_PLUGIN_DESCRIPTION','MV plugin description must be a string',file));
  if(!obj(v.parameters)) issues.push(issue('MV_PLUGIN_PARAMETERS','MV plugin parameters must be an object',file));
  else if(Object.values(v.parameters).some(x=>typeof x!=='string')) issues.push(issue('MV_PLUGIN_PARAMETER_VALUE','MV serialized plugin parameter values must be strings',file));
  return issues;
}

export function validateMvPluginList(v,file='js/plugins.js'){
  const issues=[];
  if(!arr(v)) return [issue('MV_PLUGIN_LIST','MV plugin configuration must serialize an array',file)];
  v.forEach((x,i)=>issues.push(...validateMvPluginDescriptor(x,`${file}#${i}`)));
  return issues;
}

export function validateMvBootScripts(paths,file='index.html'){
  const normalized=paths.map(x=>String(x).replace(/^\.\//,'').replace(/^\//,''));
  const issues=[];
  let last=-1;
  for(const required of MV_BOOT_SCRIPT_ORDER){
    const i=normalized.indexOf(required);
    if(i<0) issues.push(issue('MV_BOOT_SCRIPT_MISSING',`Missing MV boot script reference: ${required}`,file));
    else if(i<=last) issues.push(issue('MV_BOOT_SCRIPT_ORDER',`MV boot script is out of order: ${required}`,file));
    else last=i;
  }
  return issues;
}

export function classifyMvAssetFile(path){
  const p=String(path||'').replace(/\\/g,'/').replace(/^\.\//,'').replace(/^\//,'');
  let m=p.match(/(?:^|\/)img\/([^/]+)\/([^/]+)$/);
  if(m){const ext=(m[2].match(/\.[^.]+$/)||[''])[0].toLowerCase();return {kind:'image',category:m[1],name:m[2],extension:ext,supported:MV_IMAGE_CATEGORIES.includes(m[1])&&ext===MV_IMAGE_EXTENSION};}
  m=p.match(/(?:^|\/)audio\/([^/]+)\/([^/]+)$/);
  if(m){const ext=(m[2].match(/\.[^.]+$/)||[''])[0].toLowerCase();return {kind:'audio',category:m[1],name:m[2],extension:ext,supported:MV_AUDIO_CATEGORIES.includes(m[1])&&MV_AUDIO_EXTENSIONS.includes(ext)};}
  return {kind:'other',category:null,name:p.split('/').pop()||'',extension:'',supported:false};
}

export function auditMvAssetPairs(paths=[]){
  const audio=new Map();const issues=[];let images=0;
  for(const path of paths){const a=classifyMvAssetFile(path);if(a.kind==='image'){if(a.supported)images++;continue;}if(a.kind!=='audio'||!a.supported)continue;
    const stem=a.name.slice(0,-a.extension.length);const key=`${a.category}/${stem}`;if(!audio.has(key))audio.set(key,new Set());audio.get(key).add(a.extension);
  }
  for(const [key,set] of audio) for(const ext of MV_AUDIO_EXTENSIONS) if(!set.has(ext)) issues.push(issue('MV_AUDIO_PAIR_MISSING',`${key} is missing ${ext} counterpart`,'audio'));
  return {ok:issues.length===0,issues,imageCount:images,audioStemCount:audio.size,pairedAudioStemCount:[...audio.values()].filter(x=>MV_AUDIO_EXTENSIONS.every(e=>x.has(e))).length};
}
