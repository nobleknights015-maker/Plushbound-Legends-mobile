function clone(value){return value==null?value:(typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value)));}

function cleanLine(line=''){
  return String(line).replace(/^\s*\*\s?/,'').trimEnd();
}

function annotationBlock(source='', locale=''){
  const text=String(source||'');
  const wanted=locale?new RegExp(`/\\*:${locale}\\b([\\s\\S]*?)\\*/`,'i'):null;
  const localized=wanted?.exec(text);
  if(localized) return localized[1];
  const base=/\/\*:(?![a-z]{2}\b)([\s\S]*?)\*\//i.exec(text);
  return base?.[1]||'';
}

export function parseMVPluginMetadata(source='',{locale=''}={}){
  const block=annotationBlock(source,locale);
  const lines=block.split(/\r?\n/).map(cleanLine);
  const metadata={description:'',author:'',help:'',parameters:[]};
  let current=null, mode='';
  for(const raw of lines){
    const line=raw.trim();
    if(!line) {
      if(mode==='help') metadata.help += (metadata.help?'\n':'');
      continue;
    }
    const tag=/^@([A-Za-z][\w-]*)\s*(.*)$/.exec(line);
    if(tag){
      const key=tag[1].toLowerCase(), value=tag[2]||'';
      mode='';
      if(key==='plugindesc'){metadata.description=value;continue;}
      if(key==='author'){metadata.author=value;continue;}
      if(key==='help'){mode='help';if(value)metadata.help=value;continue;}
      if(key==='param'){
        current={name:value,text:value,description:'',default:'',type:'string',options:[],min:null,max:null,decimals:null};
        metadata.parameters.push(current);continue;
      }
      if(!current) continue;
      if(key==='text')current.text=value||current.name;
      else if(key==='desc')current.description=value;
      else if(key==='default')current.default=value;
      else if(key==='type')current.type=value||'string';
      else if(key==='min')current.min=value===''?null:Number(value);
      else if(key==='max')current.max=value===''?null:Number(value);
      else if(key==='decimals')current.decimals=value===''?null:Number(value);
      else if(key==='option')current.options.push({text:value,value});
      else if(key==='value'&&current.options.length)current.options.at(-1).value=value;
      else if(key==='on')current.on=value;
      else if(key==='off')current.off=value;
      continue;
    }
    if(mode==='help'){metadata.help += `${metadata.help?'\n':''}${raw}`;continue;}
    if(current?.description) current.description += `\n${raw}`;
  }
  metadata.help=metadata.help.trim();
  return metadata;
}

function stringParams(parameters={}){
  const out={};
  for(const [key,value] of Object.entries(parameters||{})){
    if(typeof value==='string')out[key]=value;
    else if(value==null)out[key]='';
    else if(typeof value==='object')out[key]=JSON.stringify(value);
    else out[key]=String(value);
  }
  return out;
}

export function normalizePluginManifest(raw={}){
  const source=Array.isArray(raw)?{plugins:raw}:raw||{};
  const plugins=(Array.isArray(source.plugins)?source.plugins:[]).map((entry,index)=>({
    name:String(entry?.name||'').trim(),
    status:entry?.status!==false,
    description:String(entry?.description||''),
    path:String(entry?.path||(entry?.name?`${entry.name}.js`:'')),
    parameters:stringParams(entry?.parameters||{}),
    compatibility:String(entry?.compatibility||'mv'),
    order:index
  }));
  return {schemaVersion:Number(source.schemaVersion||1),target:String(source.target||'RPG Maker MV 1.6.x'),plugins};
}

export function validatePluginManifest(raw={}){
  const manifest=normalizePluginManifest(raw), issues=[], names=new Set();
  manifest.plugins.forEach((plugin,index)=>{
    const label=plugin.name||`row ${index+1}`;
    if(!plugin.name)issues.push({severity:'error',code:'missing-name',index,message:`Plugin ${label} needs a name`});
    const key=plugin.name.toLowerCase();
    if(key&&names.has(key))issues.push({severity:'error',code:'duplicate-name',index,message:`Duplicate plugin name: ${plugin.name}`});
    if(key)names.add(key);
    if(!plugin.path)issues.push({severity:'error',code:'missing-path',index,message:`Plugin ${label} needs a .js path`});
    if(plugin.path&&!/\.js$/i.test(plugin.path))issues.push({severity:'warning',code:'non-js-path',index,message:`Plugin ${label} path does not end in .js`});
    if(/^(?:https?:|data:|javascript:|blob:)/i.test(plugin.path)||plugin.path.split(/[\\/]+/).includes('..'))issues.push({severity:'error',code:'unsafe-path',index,message:`Plugin ${label} must use a packaged relative path`});
  });
  return issues;
}

export function createPluginEntry({name,path,source='',status=true}={}){
  const cleanName=String(name||String(path||'').split('/').pop()?.replace(/\.js$/i,'')||'').trim();
  const metadata=parseMVPluginMetadata(source);
  const parameters={};
  for(const param of metadata.parameters)parameters[param.name]=String(param.default??'');
  return {
    name:cleanName,
    status:!!status,
    description:metadata.description,
    path:String(path||`${cleanName}.js`),
    parameters,
    compatibility:'mv',
    order:0
  };
}

export function addPlugin(manifest,entry){
  const next=normalizePluginManifest(manifest);
  if(!entry?.name)throw new Error('Plugin requires a name');
  if(next.plugins.some(plugin=>plugin.name.toLowerCase()===String(entry.name).toLowerCase()))throw new Error(`Plugin already exists: ${entry.name}`);
  next.plugins.push({...clone(entry),parameters:stringParams(entry.parameters||{}),order:next.plugins.length});
  return normalizePluginManifest(next);
}

export function removePlugin(manifest,index){
  const next=normalizePluginManifest(manifest);
  if(index<0||index>=next.plugins.length)throw new Error('Unknown plugin row');
  next.plugins.splice(index,1);
  return normalizePluginManifest(next);
}

export function movePlugin(manifest,index,delta){
  const next=normalizePluginManifest(manifest),target=Math.max(0,Math.min(next.plugins.length-1,index+delta));
  if(index<0||index>=next.plugins.length)throw new Error('Unknown plugin row');
  if(target===index)return next;
  const [entry]=next.plugins.splice(index,1);next.plugins.splice(target,0,entry);
  return normalizePluginManifest(next);
}

export function updatePlugin(manifest,index,patch={}){
  const next=normalizePluginManifest(manifest);
  if(index<0||index>=next.plugins.length)throw new Error('Unknown plugin row');
  const current=next.plugins[index];
  next.plugins[index]={...current,...clone(patch),parameters:patch.parameters?stringParams(patch.parameters):current.parameters,order:index};
  const issues=validatePluginManifest(next).filter(issue=>issue.severity==='error');
  if(issues.length)throw new Error(issues[0].message);
  return normalizePluginManifest(next);
}

export function applyParameterDefinitions(entry,metadata){
  const next=clone(entry),existing=stringParams(entry?.parameters||{});
  next.description=entry?.description||metadata?.description||'';
  next.parameters={};
  for(const param of metadata?.parameters||[])next.parameters[param.name]=Object.prototype.hasOwnProperty.call(existing,param.name)?existing[param.name]:String(param.default??'');
  for(const [key,value] of Object.entries(existing))if(!Object.prototype.hasOwnProperty.call(next.parameters,key))next.parameters[key]=value;
  return next;
}
