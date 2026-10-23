import {
  parseMVPluginMetadata, normalizePluginManifest, validatePluginManifest,
  createPluginEntry, addPlugin, removePlugin, movePlugin, updatePlugin, applyParameterDefinitions
} from './plugin-manager-core.js';

const $=id=>document.getElementById(id);
const ids=['loadBundled','manifestFile','pluginFile','exportManifest','pluginSearch','addBlank','manifestMeta','pluginList','pluginEmpty','pluginEditor','pluginStatus','pluginName','pluginPath','pluginDescription','moveUp','moveDown','applyPlugin','deletePlugin','parameterHelp','parameterList','newParamName','newParamValue','addParameter','pluginHelp','validationMeta','validationIssues','sourceMeta'];
const els=Object.fromEntries(ids.map(id=>[id,$(id)]));
const state={manifest:normalizePluginManifest({plugins:[]}),selected:-1,metadata:new Map(),sourceCache:new Map()};

function selected(){return state.manifest.plugins[state.selected]||null;}
function pluginKey(plugin){return `${plugin?.name||''}::${plugin?.path||''}`;}
function setSelected(index){state.selected=index>=0&&index<state.manifest.plugins.length?index:-1;render();if(state.selected>=0)inspectSelectedSource();}

function render(){
  renderList();renderEditor();renderValidation();
  const enabled=state.manifest.plugins.filter(plugin=>plugin.status).length;
  els.manifestMeta.textContent=`${state.manifest.target} • ${state.manifest.plugins.length} plugin(s) • ${enabled} enabled`;
}
function renderList(){
  els.pluginList.innerHTML='';
  const query=els.pluginSearch.value.trim().toLowerCase();
  state.manifest.plugins.forEach((plugin,index)=>{
    if(query&&!`${plugin.name} ${plugin.description} ${plugin.path}`.toLowerCase().includes(query))return;
    const button=document.createElement('button');button.type='button';button.className=`plugin-card${plugin.status?' enabled':''}${index===state.selected?' selected':''}`;button.dataset.pluginIndex=String(index);
    const dot=document.createElement('span');dot.className='status-dot';dot.setAttribute('aria-label',plugin.status?'Enabled':'Disabled');
    const text=document.createElement('span');const strong=document.createElement('strong');strong.textContent=plugin.name||'(unnamed plugin)';const sub=document.createElement('span');sub.textContent=`${plugin.path}${plugin.description?` • ${plugin.description}`:''}`;text.append(strong,document.createElement('br'),sub);
    const order=document.createElement('span');order.className='plugin-order';order.textContent=String(index+1);
    button.append(dot,text,order);els.pluginList.append(button);
  });
}
function renderEditor(){
  const plugin=selected(),has=!!plugin;els.pluginEditor.hidden=!has;els.pluginEmpty.hidden=has;if(!has)return;
  els.pluginStatus.checked=plugin.status;els.pluginName.value=plugin.name;els.pluginPath.value=plugin.path;els.pluginDescription.value=plugin.description||'';
  els.moveUp.disabled=state.selected<=0;els.moveDown.disabled=state.selected>=state.manifest.plugins.length-1;
  const metadata=state.metadata.get(pluginKey(plugin))||{parameters:[],help:''};
  renderParameters(plugin,metadata);
  els.pluginHelp.textContent=metadata.help||'No parsed help metadata.';
}
function parameterControl(parameter,value){
  const type=String(parameter?.type||'string').toLowerCase();
  let input;
  if(type==='boolean'){
    input=document.createElement('select');
    for(const [v,label] of [['true',parameter.on||'ON'],['false',parameter.off||'OFF']]){const option=document.createElement('option');option.value=v;option.textContent=label;input.append(option);}
    input.value=String(value).toLowerCase()==='false'?'false':'true';
  }else if(type.startsWith('select')&&parameter.options?.length){
    input=document.createElement('select');for(const optionMeta of parameter.options){const option=document.createElement('option');option.value=String(optionMeta.value??optionMeta.text);option.textContent=String(optionMeta.text||optionMeta.value);input.append(option);}input.value=String(value??'');
  }else if(type==='number'){
    input=document.createElement('input');input.type='number';if(Number.isFinite(parameter.min))input.min=String(parameter.min);if(Number.isFinite(parameter.max))input.max=String(parameter.max);if(Number.isFinite(parameter.decimals))input.step=parameter.decimals>0?String(10**-parameter.decimals):'1';input.value=String(value??'');
  }else if(type==='note'){
    input=document.createElement('textarea');input.rows=3;input.value=String(value??'');
  }else{
    input=document.createElement('input');input.type='text';input.value=String(value??'');
  }
  input.dataset.paramName=parameter.name;
  return input;
}
function renderParameters(plugin,metadata){
  els.parameterList.innerHTML='';
  const definitions=new Map((metadata.parameters||[]).map(parameter=>[parameter.name,parameter]));
  const keys=[...new Set([...(metadata.parameters||[]).map(parameter=>parameter.name),...Object.keys(plugin.parameters||{})])];
  if(!keys.length){const empty=document.createElement('div');empty.className='meta';empty.textContent='This plugin has no configured MV parameters.';els.parameterList.append(empty);return;}
  for(const name of keys){
    const parameter=definitions.get(name)||{name,text:name,type:'string',description:'Parameter not present in the currently parsed plugin header.'};
    const row=document.createElement('div');row.className='parameter-row';
    const label=document.createElement('label');label.textContent=parameter.text||name;
    const control=parameterControl(parameter,plugin.parameters?.[name]??parameter.default??'');label.append(control);row.append(label);
    if(parameter.description||parameter.type){const meta=document.createElement('div');meta.className='parameter-meta';meta.textContent=`${parameter.type||'string'}${parameter.description?` • ${parameter.description}`:''}`;row.append(meta);}
    const remove=document.createElement('button');remove.type='button';remove.textContent='Remove Parameter';remove.dataset.removeParam=name;row.append(remove);
    els.parameterList.append(row);
  }
}
function collectParameters(){
  const params={};els.parameterList.querySelectorAll('[data-param-name]').forEach(input=>{params[input.dataset.paramName]=String(input.value??'');});return params;
}
function renderValidation(){
  const issues=validatePluginManifest(state.manifest);const errors=issues.filter(issue=>issue.severity==='error').length,warnings=issues.length-errors;
  els.validationMeta.textContent=`${errors} error(s) • ${warnings} warning(s)`;els.validationIssues.innerHTML='';
  for(const issue of issues){const row=document.createElement('div');row.className=`issue-row ${issue.severity}`;row.textContent=`${issue.severity.toUpperCase()} • ${issue.message}`;els.validationIssues.append(row);}
}
async function inspectSelectedSource(){
  const plugin=selected();if(!plugin)return;
  const key=pluginKey(plugin);let source=state.sourceCache.get(key);
  if(source==null){
    try{
      const safe=validatePluginManifest({plugins:[plugin]}).every(issue=>issue.severity!=='error');
      if(!safe)throw new Error('Unsafe or invalid packaged path');
      const url=new URL(`../../game/plugins/${plugin.path}`,location.href);
      const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);source=await response.text();state.sourceCache.set(key,source);
    }catch(error){els.sourceMeta.textContent=`Source not available in packaged game/plugins: ${error.message}`;return;}
  }
  const metadata=parseMVPluginMetadata(source);state.metadata.set(key,metadata);
  const merged=applyParameterDefinitions(plugin,metadata);
  state.manifest=updatePlugin(state.manifest,state.selected,{description:plugin.description||metadata.description,parameters:merged.parameters});
  els.sourceMeta.textContent=`Parsed ${metadata.parameters.length} parameter definition(s)${metadata.author?` • ${metadata.author}`:''}`;
  render();
}
function exportManifest(){
  const issues=validatePluginManifest(state.manifest);if(issues.some(issue=>issue.severity==='error')){alert(`Manifest not exported: ${issues.find(issue=>issue.severity==='error').message}`);return;}
  const blob=new Blob([JSON.stringify(normalizePluginManifest(state.manifest),null,2)+'\n'],{type:'application/json'});
  const anchor=document.createElement('a');anchor.href=URL.createObjectURL(blob);anchor.download='plugins.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(anchor.href),1000);
}
async function loadBundled(){
  try{const response=await fetch(new URL('../../game/plugins/plugins.json',location.href),{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);state.manifest=normalizePluginManifest(await response.json());state.selected=state.manifest.plugins.length?0:-1;state.metadata.clear();state.sourceCache.clear();render();if(state.selected>=0)inspectSelectedSource();}
  catch(error){alert(`Could not load bundled plugin manifest: ${error.message}`);}
}
function openManifest(file){
  const reader=new FileReader();reader.onload=()=>{try{state.manifest=normalizePluginManifest(JSON.parse(String(reader.result||'{}')));state.selected=state.manifest.plugins.length?0:-1;state.metadata.clear();state.sourceCache.clear();render();if(state.selected>=0)inspectSelectedSource();}catch(error){alert(`Manifest not loaded: ${error.message}`);}};reader.readAsText(file);
}
function inspectLocalPlugin(file){
  const reader=new FileReader();reader.onload=()=>{try{const source=String(reader.result||''),name=file.name.replace(/\.js$/i,''),entry=createPluginEntry({name,path:file.name,source});state.manifest=addPlugin(state.manifest,entry);state.selected=state.manifest.plugins.findIndex(plugin=>plugin.name===name);const key=pluginKey(selected());state.sourceCache.set(key,source);state.metadata.set(key,parseMVPluginMetadata(source));els.sourceMeta.textContent='Plugin source is loaded for editor inspection. Add the .js file to game/plugins before building the APK.';render();}catch(error){alert(`Plugin not added: ${error.message}`);}};reader.readAsText(file);
}

els.pluginList.addEventListener('click',event=>{const button=event.target.closest('[data-plugin-index]');if(button)setSelected(Number(button.dataset.pluginIndex));});
els.pluginSearch.addEventListener('input',renderList);
els.loadBundled.addEventListener('click',loadBundled);
els.manifestFile.addEventListener('change',()=>{const file=els.manifestFile.files?.[0];if(file)openManifest(file);els.manifestFile.value='';});
els.pluginFile.addEventListener('change',()=>{const file=els.pluginFile.files?.[0];if(file)inspectLocalPlugin(file);els.pluginFile.value='';});
els.exportManifest.addEventListener('click',exportManifest);
els.addBlank.addEventListener('click',()=>{try{const suffix=state.manifest.plugins.length+1;state.manifest=addPlugin(state.manifest,{name:`Plugin${suffix}`,path:`Plugin${suffix}.js`,status:false,description:'',parameters:{},compatibility:'mv'});setSelected(state.manifest.plugins.length-1);}catch(error){alert(error.message);}});
els.applyPlugin.addEventListener('click',()=>{try{state.manifest=updatePlugin(state.manifest,state.selected,{name:els.pluginName.value.trim(),path:els.pluginPath.value.trim(),description:els.pluginDescription.value,status:els.pluginStatus.checked,parameters:collectParameters()});render();inspectSelectedSource();}catch(error){alert(`Plugin not changed: ${error.message}`);}});
els.deletePlugin.addEventListener('click',()=>{if(state.selected<0)return;state.manifest=removePlugin(state.manifest,state.selected);state.selected=Math.min(state.selected,state.manifest.plugins.length-1);render();if(state.selected>=0)inspectSelectedSource();});
els.moveUp.addEventListener('click',()=>{if(state.selected<=0)return;state.manifest=movePlugin(state.manifest,state.selected,-1);state.selected--;render();});
els.moveDown.addEventListener('click',()=>{if(state.selected<0||state.selected>=state.manifest.plugins.length-1)return;state.manifest=movePlugin(state.manifest,state.selected,1);state.selected++;render();});
els.parameterList.addEventListener('click',event=>{const button=event.target.closest('[data-remove-param]');if(!button)return;const plugin=selected();if(!plugin)return;const parameters=collectParameters();delete parameters[button.dataset.removeParam];try{state.manifest=updatePlugin(state.manifest,state.selected,{parameters});render();}catch(error){alert(error.message);}});
els.addParameter.addEventListener('click',()=>{const name=els.newParamName.value.trim();if(!name)return;const plugin=selected();if(!plugin)return;const parameters=collectParameters();parameters[name]=String(els.newParamValue.value??'');try{state.manifest=updatePlugin(state.manifest,state.selected,{parameters});els.newParamName.value='';els.newParamValue.value='';render();}catch(error){alert(error.message);}});

render();loadBundled();
