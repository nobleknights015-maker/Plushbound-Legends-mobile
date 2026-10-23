const DEFAULT_MV_TARGET='1.6.x';

function clone(value){if(value==null)return value;if(typeof structuredClone==='function')return structuredClone(value);return JSON.parse(JSON.stringify(value));}
function strings(parameters={}){const out={};for(const [key,value] of Object.entries(parameters||{})){out[key]=typeof value==='string'?value:value==null?'':typeof value==='object'?JSON.stringify(value):String(value);}return out;}
function define(scope,name,value){try{scope[name]=value;}catch{Object.defineProperty(scope,name,{configurable:true,writable:true,value});}return value;}
function evt(scope,type,detail={}){const C=scope?.CustomEvent||globalThis.CustomEvent||class CustomEvent{constructor(t,init={}){this.type=t;this.detail=init.detail;}};return new C(type,{detail});}
function installMethod(target,key,value){if(target==null||key in target)return;Object.defineProperty(target,key,{configurable:true,writable:true,enumerable:false,value});}

export function installMVJavaScriptExtensions(){
  installMethod(Number.prototype,'clamp',function(min,max){return Math.min(Math.max(Number(this),min),max);});
  installMethod(Number.prototype,'mod',function(n){return((Number(this)%n)+n)%n;});
  installMethod(Number.prototype,'padZero',function(length){return String(this).padZero(length);});
  installMethod(String.prototype,'format',function(...args){return String(this).replace(/%([0-9]+)/g,(_m,n)=>args[Number(n)-1]);});
  installMethod(String.prototype,'padZero',function(length){let v=String(this);while(v.length<length)v=`0${v}`;return v;});
  installMethod(String.prototype,'contains',function(text){return String(this).indexOf(text)>=0;});
  installMethod(Array.prototype,'clone',function(){return this.slice(0);});
  installMethod(Array.prototype,'contains',function(value){return this.indexOf(value)>=0;});
  installMethod(Array.prototype,'equals',function(array){if(!array||this.length!==array.length)return false;for(let i=0;i<this.length;i++){const a=this[i],b=array[i];if(Array.isArray(a)&&Array.isArray(b)){if(!a.equals(b))return false;}else if(a!==b)return false;}return true;});
  if(typeof Math.randomInt!=='function')Object.defineProperty(Math,'randomInt',{configurable:true,writable:true,enumerable:false,value(max){return Math.floor(Math.max(0,Number(max)||0)*Math.random());}});
}

export function normalizeMVPluginManifest(raw={}){
  const list=Array.isArray(raw)?raw:raw.plugins;
  const plugins=(Array.isArray(list)?list:[]).map((entry,index)=>{const name=String(entry?.name||'').trim();return{name,status:entry?.status!==false,description:String(entry?.description||''),path:String(entry?.path||(name?`${name}.js`:'' )).trim(),parameters:strings(entry?.parameters||{}),compatibility:String(entry?.compatibility||'mv'),order:Number.isFinite(Number(entry?.order))?Number(entry.order):index};}).sort((a,b)=>a.order-b.order);
  return{schemaVersion:Number(raw?.schemaVersion||1),target:String(raw?.target||`RPG Maker MV ${DEFAULT_MV_TARGET}`),plugins};
}

export function validateMVPluginManifest(raw={}){
  const manifest=normalizeMVPluginManifest(raw),issues=[],names=new Set();
  manifest.plugins.forEach((plugin,index)=>{const key=plugin.name.toLowerCase();if(!plugin.name)issues.push({severity:'error',code:'missing-name',index,message:`Plugin row ${index+1} has no name`});if(key&&names.has(key))issues.push({severity:'error',code:'duplicate-name',index,message:`Duplicate plugin name: ${plugin.name}`});if(key)names.add(key);if(!plugin.path)issues.push({severity:'error',code:'missing-path',index,message:`Plugin ${plugin.name||index+1} has no script path`});if(/^(?:https?:|data:|javascript:|blob:)/i.test(plugin.path))issues.push({severity:'error',code:'external-path',index,message:`Plugin ${plugin.name||index+1} must use a packaged relative path`});if(plugin.path.split(/[\\/]+/).includes('..'))issues.push({severity:'error',code:'parent-path',index,message:`Plugin ${plugin.name||index+1} cannot escape the packaged plugin directory`});});
  return issues;
}

function numericRecords(records=[]){const array=[null],numericById=new Map(),idByNumeric=new Map();let next=1;for(const record of records){if(!record)continue;const sourceId=String(record.id??'');let id=Number(record.mvId);if(!Number.isInteger(id)||id<=0||array[id]){while(array[next])next++;id=next++;}array[id]={...clone(record),id,_plushboundId:sourceId};numericById.set(sourceId,id);idByNumeric.set(id,sourceId);}return{array,numericById,idByNumeric};}

export class MVPluginRuntime{
  constructor({scope=globalThis,runtime,manifest={},baseUrl,logger=console}={}){
    if(!runtime?.session||!runtime?.state)throw new Error('MVPluginRuntime requires an initialized Plushbound runtime');
    this.scope=scope;this.runtime=runtime;this.session=runtime.session;this.state=runtime.state;this.logger=logger;this.manifest=normalizeMVPluginManifest(manifest);this.baseUrl=new URL(baseUrl||'../plugins/',runtime.runtimeBaseUrl||scope.location?.href||'file:///android_asset/game/runtime/');this.loaded=[];this.failed=[];this.nativeCommands=new Map();this.mapIds=numericRecords([...this.session.maps.maps.values()].map(map=>({id:map.id,name:map.name})));this.items=numericRecords([...this.session.game.items.values()]);this.enemies=numericRecords([...this.session.game.enemies.values()]);this.Interpreter=null;this.manager=null;
  }

  installGlobals(){
    installMVJavaScriptExtensions();const scope=this.scope,runtime=this;
    define(scope,'Imported',scope.Imported||{});
    define(scope,'$plugins',this.manifest.plugins.map(p=>({name:p.name,status:p.status,description:p.description,parameters:clone(p.parameters)})));

    function Game_Interpreter(depth){this.initialize(depth);}
    Game_Interpreter.prototype.initialize=function(depth){this._depth=Number(depth)||0;this.clear();};
    Game_Interpreter.prototype.clear=function(){this._mapId=runtime.mvMapId(runtime.state.map.id);this._eventId=0;this._params=[];this._waitCount=0;this._waitMode='';};
    Game_Interpreter.prototype.eventId=function(){return this._eventId||0;};
    Game_Interpreter.prototype.pluginCommand=function(command,args){return runtime.callNativeCommand(command,args,this);};
    Game_Interpreter.prototype.wait=function(duration){this._waitCount=Math.max(0,Number(duration)||0);};
    Game_Interpreter.prototype.setWaitMode=function(mode){this._waitMode=String(mode||'');};
    this.Interpreter=Game_Interpreter;define(scope,'Game_Interpreter',Game_Interpreter);

    const manager=this.createPluginManager();this.manager=manager;define(scope,'PluginManager',manager);
    define(scope,'$gameSwitches',{value(id){return runtime.state.sw(id);},setValue(id,value){runtime.state.setSw(id,value);runtime.changed('switch',{id,value:!!value});}});
    define(scope,'$gameVariables',{value(id){return runtime.state.variable(id);},setValue(id,value){runtime.state.setVariable(id,value);runtime.changed('variable',{id,value:clone(value)});}});
    define(scope,'$gameSelfSwitches',{value(key){const[m,e,k]=Array.isArray(key)?key:[];return runtime.state.selfSw(runtime.plushboundMapId(m),e,k);},setValue(key,value){const[m,e,k]=Array.isArray(key)?key:[];runtime.state.setSelfSw(runtime.plushboundMapId(m),e,k,value);runtime.changed('self-switch',{key:clone(key),value:!!value});}});

    define(scope,'$gameParty',{members(){return runtime.state.party.map(id=>scope.$gameActors.actor(id));},allMembers(){return this.members();},size(){return runtime.state.party.length;},isEmpty(){return runtime.state.party.length===0;},gold(){return Math.max(0,Number(runtime.state.variable('gold'))||0);},gainGold(amount){runtime.state.setVariable('gold',Math.max(0,this.gold()+(Number(amount)||0)));runtime.changed('gold');},loseGold(amount){this.gainGold(-(Number(amount)||0));},numItems(item){return runtime.state.count(runtime.itemKind(item),runtime.itemSourceId(item));},hasItem(item){return this.numItems(item)>0;},gainItem(item,amount){const kind=runtime.itemKind(item),id=runtime.itemSourceId(item),count=runtime.state.gain(kind,id,Number(amount)||0);runtime.changed('item',{kind,itemId:id,count});return count;},loseItem(item,amount){return this.gainItem(item,-(Number(amount)||0));},inBattle(){return!!runtime.session.lastEncounter;}});
    const actors=new Map();define(scope,'$gameActors',{actor(id){const key=String(id);if(!actors.has(key))actors.set(key,{actorId:()=>Number(id)||id,name:()=>String(runtime.state.actors.get(key)?.name||`Actor ${key}`),setName(name){const record=runtime.state.actors.get(key)||{id:key};record.name=String(name??'');runtime.state.actors.set(key,record);}});return actors.get(key);}});
    define(scope,'$gameMap',{mapId(){return runtime.mvMapId(runtime.state.map.id);},requestRefresh(){runtime.changed('map-refresh');},isEventRunning(){return!!runtime.session.interpreter.running;},event(id){const found=runtime.session.event(String(id));return found?{eventId:()=>Number(id)||id,x:found.x,y:found.y,event:()=>clone(found)}:null;}});
    let transfer=null;define(scope,'$gamePlayer',{get x(){return Number(runtime.state.map.x)||0;},get y(){return Number(runtime.state.map.y)||0;},direction(){return Number(runtime.state.map.direction)||2;},setDirection(direction){runtime.state.map.direction=Number(direction)||2;runtime.changed('direction');},reserveTransfer(mapId,x,y,direction=2){transfer={mapId:runtime.plushboundMapId(mapId),x:Number(x)||0,y:Number(y)||0,direction:Number(direction)||2};},isTransferring(){return!!transfer;},performTransfer(){if(!transfer)return false;const target=transfer;transfer=null;runtime.session.enter(target.mapId,target.x,target.y,target.direction);runtime.changed('transfer',target);return true;}});
    define(scope,'$gameSystem',{saveCount(){return Number(runtime.state.system.saveCount)||0;},playtime(){return Math.floor((Number(runtime.state.system.playtimeMs)||0)/1000);},onBeforeSave(){runtime.state.system.saveCount=(Number(runtime.state.system.saveCount)||0)+1;}});

    define(scope,'$dataItems',this.items.array);define(scope,'$dataEnemies',this.enemies.array);
    for(const name of ['$dataWeapons','$dataArmors','$dataActors','$dataClasses','$dataSkills','$dataStates','$dataAnimations','$dataTilesets','$dataCommonEvents'])define(scope,name,[null]);
    define(scope,'$dataSystem',{gameTitle:'Plushbound Legends',versionId:1});
    define(scope,'DataManager',{isItem(item){return runtime.items.idByNumeric.has(Number(item?.id));},isWeapon(item){return item?._plushboundKind==='weapons';},isArmor(item){return ['armor','armors'].includes(String(item?._plushboundKind||''));},makeSaveContents(){return runtime.session.serializeSave();},extractSaveContents(contents){return runtime.session.restoreSave(contents);},saveGame(){runtime.runtime.saveNow?.('mv-plugin');return true;},loadGame(){const ok=runtime.runtime.autosave?.restore?.(runtime.session);if(ok)runtime.changed('load');return!!ok;}});
    define(scope,'Utils',{...(scope.Utils||{}),RPGMAKER_NAME:'MV',RPGMAKER_VERSION:DEFAULT_MV_TARGET,isOptionValid(){return false;},isNwjs(){return false;},isMobileDevice(){return/Android|iPhone|iPad|Mobile/i.test(scope.navigator?.userAgent||'Android');}});
    define(scope,'Graphics',{...(scope.Graphics||{}),width:1604,height:720,boxWidth:1604,boxHeight:720,frameCount:0});

    const pressed=new Set();const input={keyMapper:{13:'ok',27:'escape',32:'ok',37:'left',38:'up',39:'right',40:'down',88:'escape',90:'ok'},isPressed(name){return pressed.has(String(name));},isTriggered(name){return pressed.has(String(name));},isRepeated(name){return pressed.has(String(name));},clear(){pressed.clear();},_currentState:Object.create(null)};define(scope,'Input',input);scope.addEventListener?.('keydown',e=>{const name=input.keyMapper[e.keyCode];if(name){pressed.add(name);input._currentState[name]=true;}});scope.addEventListener?.('keyup',e=>{const name=input.keyMapper[e.keyCode];if(name){pressed.delete(name);input._currentState[name]=false;}});
    const touch={x:0,y:0,_pressed:false,_triggered:false,isPressed(){return this._pressed;},isTriggered(){const v=this._triggered;this._triggered=false;return v;},isCancelled(){return false;},isMoved(){return false;},isReleased(){return!this._pressed;},clear(){this._pressed=false;this._triggered=false;}};define(scope,'TouchInput',touch);scope.addEventListener?.('pointerdown',e=>{touch.x=e.clientX||0;touch.y=e.clientY||0;touch._pressed=true;touch._triggered=true;});scope.addEventListener?.('pointermove',e=>{touch.x=e.clientX||0;touch.y=e.clientY||0;});scope.addEventListener?.('pointerup',()=>{touch._pressed=false;});
    const stack=[];define(scope,'SceneManager',{_scene:null,_stack:stack,push(scene){stack.push(this._scene?.constructor||null);this.goto(scene);},pop(){const next=stack.pop();if(next)this.goto(next);},goto(scene){this._scene=typeof scene==='function'?new scene():scene||null;runtime.changed('scene',{scene:scene?.name||null});},isSceneChanging(){return false;}});
    this.refreshDatabaseGlobals();return this;
  }

  refreshDatabaseGlobals(){const current=this.session.maps.current;define(this.scope,'$dataMap',current?clone(current):null);const infos=[null];for(const[sourceId,id]of this.mapIds.numericById){const map=this.session.maps.maps.get(sourceId);infos[id]={id,name:map?.name||sourceId,_plushboundId:sourceId};}define(this.scope,'$dataMapInfos',infos);return this;}
  attachEventCommands(){const handler=({context,parameters})=>{const line=String((Array.isArray(parameters)?parameters[0]:parameters)??''),args=line.split(' '),command=args.shift()||'';if(!command)return;const interpreter=new this.Interpreter();interpreter._mapId=this.mvMapId(context?.mapId??this.state.map.id);interpreter._eventId=Number(context?.eventId)||context?.eventId||0;interpreter._params=[line];return interpreter.pluginCommand(command,args);};if(!this.session.registry.has('PLUGIN_COMMAND'))this.session.registry.register('PLUGIN_COMMAND',handler);if(!this.session.registry.has(356))this.session.registry.register(356,handler);return this;}
  registerNativeCommand(name,handler){if(!name||typeof handler!=='function')throw new Error('MV native command requires a name and handler');this.nativeCommands.set(String(name).toLowerCase(),handler);return handler;}
  callNativeCommand(command,args,interpreter){const handler=this.nativeCommands.get(String(command||'').toLowerCase());return handler?handler.call(interpreter,args||[],{runtime:this.runtime,session:this.session,state:this.state}):undefined;}
  invokePluginCommand(line,context={}){const args=String(line??'').split(' '),command=args.shift()||'',interpreter=new this.Interpreter();interpreter._mapId=this.mvMapId(context.mapId??this.state.map.id);interpreter._eventId=Number(context.eventId)||context.eventId||0;interpreter._params=[String(line??'')];return interpreter.pluginCommand(command,args);}
  changed(reason,detail={}){this.refreshDatabaseGlobals();this.scope.dispatchEvent?.(evt(this.scope,'plushbound-mv-state-changed',{reason,...clone(detail)}));this.scope.PlushboundGameShell?.publish?.(`mv:${reason}`);}
  mvMapId(id){return this.mapIds.numericById.get(String(id))||0;}
  plushboundMapId(id){if(this.session.maps.maps.has(String(id)))return String(id);return this.mapIds.idByNumeric.get(Number(id))||String(this.state.map.id||'');}
  itemSourceId(item){if(item?._plushboundId)return String(item._plushboundId);return this.items.idByNumeric.get(Number(item?.id))||String(item?.id??'');}
  itemKind(item){const kind=String(item?._plushboundKind||'');if(kind==='armors')return'armor';return['items','weapons','armor'].includes(kind)?kind:'items';}
  async loadEnabledPlugins(){const errors=validateMVPluginManifest(this.manifest).filter(i=>i.severity==='error');if(errors.length)throw new Error(errors[0].message);await this.manager.setup(this.manifest.plugins);this.manager.checkErrors();return this.snapshot();}
  snapshot(){return{target:this.manifest.target,configured:this.manifest.plugins.length,enabled:this.manifest.plugins.filter(p=>p.status).length,loaded:clone(this.loaded),failed:clone(this.failed)}};

  createPluginManager(){const runtime=this;function PluginManager(){throw new Error('This is a static class');}PluginManager._path=runtime.baseUrl.href;PluginManager._scripts=[];PluginManager._errorUrls=[];PluginManager._parameters={};PluginManager.setup=async function(plugins=[]){for(const plugin of plugins){if(!plugin?.status||!plugin.name||this._scripts.includes(plugin.name))continue;this.setParameters(plugin.name,plugin.parameters||{});try{await runtime.loadScript(plugin.path||`${plugin.name}.js`,plugin.name);this._scripts.push(plugin.name);runtime.loaded.push(plugin.name);}catch(error){const path=plugin.path||`${plugin.name}.js`;this._errorUrls.push(path);runtime.failed.push({name:plugin.name,path,message:String(error?.message||error)});runtime.logger?.error?.(`MV plugin failed: ${plugin.name}`,error);}}return runtime.snapshot();};PluginManager.checkErrors=function(){const url=this._errorUrls.shift();if(url)throw new Error(`Failed to load: ${url}`);};PluginManager.parameters=function(name){return this._parameters[String(name||'').toLowerCase()]||{};};PluginManager.setParameters=function(name,parameters){this._parameters[String(name||'').toLowerCase()]=strings(parameters||{});};PluginManager.loadScript=function(name){return runtime.loadScript(name,String(name).replace(/\.js$/i,''));};PluginManager.onError=function(error){this._errorUrls.push(error?.target?._url||error?.target?.src||String(error||'unknown plugin'));};return PluginManager;}
  async loadScript(path,pluginName){const text=String(path||'').trim();if(!text)throw new Error(`Plugin ${pluginName} has no script path`);if(/^(?:https?:|data:|javascript:|blob:)/i.test(text)||text.split(/[\\/]+/).includes('..'))throw new Error(`Plugin ${pluginName} uses a non-packaged path`);if(!this.scope.document?.createElement)throw new Error(`Cannot load MV plugin ${pluginName} without a DOM`);const url=new URL(text,this.baseUrl),basePath=this.baseUrl.pathname.endsWith('/')?this.baseUrl.pathname:`${this.baseUrl.pathname}/`;if(url.origin!==this.baseUrl.origin||!url.pathname.startsWith(basePath))throw new Error(`Plugin ${pluginName} escaped the packaged plugin directory`);await new Promise((resolve,reject)=>{const script=this.scope.document.createElement('script');script.type='text/javascript';script.async=false;script.src=url.href;script.dataset.plushboundMvPlugin=pluginName;script._url=url.href;script.onload=resolve;script.onerror=()=>reject(new Error(`Failed to load ${url.href}`));(this.scope.document.body||this.scope.document.head||this.scope.document.documentElement).appendChild(script);});}
}

export function createMVPluginRuntime(options){const runtime=new MVPluginRuntime(options);runtime.installGlobals().attachEventCommands();return runtime;}
