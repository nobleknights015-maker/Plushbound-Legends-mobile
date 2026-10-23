import { clone, EDITABLE_COMMANDS } from './editor-core.js';
import { createCommonEventLibrary, normalizeCommonEventLibrary, validateCommonEventLibrary, addCommonEvent, updateCommonEvent, removeCommonEvent, appendCommonEventCommand, replaceCommonEventCommand, removeCommonEventCommand, moveCommonEventCommand } from './common-event-core.js';

const COMMAND_SPECS={
  WAIT:{parameters:[0.5],help:'Pause event execution for seconds.'},
  SWITCH:{parameters:['switch-id',true],help:'Set a global switch.'},
  VARIABLE:{parameters:['variable-id',0],help:'Set a variable value.'},
  VARIABLE_OP:{parameters:['variable-id','+',1],help:'Apply +, -, *, / or assignment to a variable.'},
  SELF_SWITCH:{parameters:['A',true],help:'Set this map event self-switch.'},
  CONDITIONAL:{parameters:['switch','switch-id','===',true,null],help:'Condition on switch, variable or item. Optional false jump index.'},
  JUMP:{parameters:[0],help:'Jump to a command index.'},
  EXIT_EVENT:{parameters:[],help:'Stop the current event.'},
  COMMON_EVENT:{parameters:['common-event-id'],help:'Runtime common-event call; authoring libraries are normally expanded when inserted.'},
  MESSAGE:{parameters:['Dialogue text',{speaker:'Speaker'}],help:'Show dialogue/message text.'},
  CHOICE:{parameters:[['Yes','No'],{}],help:'Show a choice list.'},
  INPUT_NUMBER:{parameters:['variable-id',{}],help:'Request numeric input and save it to a variable.'},
  TRANSFER:{parameters:['map-id',0,0,2],help:'Transfer player to map, x, y, direction.'},
  MOVE_ROUTE:{parameters:['player',{wait:true,route:[]}],help:'Run a movement route.'},
  RELOCATE_EVENT:{parameters:['event-id',0,0],help:'Move an event to map coordinates.'},
  ERASE_EVENT:{parameters:[],help:'Erase the current map event.'},
  TRANSPARENCY:{parameters:[true],help:'Toggle player transparency.'},
  FADE_SCREEN:{parameters:['out',0.4],help:'Fade screen in/out; second value may be duration.'},
  TINT_SCREEN:{parameters:[{}],help:'Apply a screen tint payload.'},
  FLASH_SCREEN:{parameters:[{}],help:'Apply a screen flash payload.'},
  SHAKE_SCREEN:{parameters:[{}],help:'Apply a screen shake payload.'},
  BGM:{parameters:['bgm-id',{}],help:'Play background music.'},
  BGM_STOP:{parameters:[],help:'Stop background music.'},
  BGM_FADE:{parameters:[1],help:'Fade background music.'},
  BGS:{parameters:['bgs-id',{}],help:'Play background ambience.'},
  BGS_STOP:{parameters:[],help:'Stop background ambience.'},
  BGS_FADE:{parameters:[1],help:'Fade background ambience.'},
  ME:{parameters:['me-id',{}],help:'Play a music effect.'},
  SE:{parameters:['se-id',{}],help:'Play a sound effect.'},
  BATTLE:{parameters:['encounter-id'],help:'Start a battle through the runtime battle adapter.'},
  SHOP:{parameters:['shop-id'],help:'Open a registered Plushbound shop.'},
  SCRIPT_HOOK:{parameters:['hook.name',{}],help:'Emit a registered game-layer hook.'}
};

const state={library:createCommonEventLibrary(),selectedId:null,history:{undo:[],redo:[],limit:80}};
const $=id=>document.getElementById(id);
const els=Object.fromEntries(['commonFile','newLibrary','exportLibrary','undoCommon','redoCommon','eventSearch','addCommon','libraryMeta','commonList','commonEmpty','commonEditor','commonId','commonName','applyCommon','deleteCommon','commonCommands','commonCommandType','commonCommandParameters','commandHelp','addCommonCommand','supportedCommands','commonValidation'].map(id=>[id,$(id)]));

function selected(){return state.library.commonEvents.find(event=>event.id===state.selectedId)||null;}
function snapshot(label){state.history.undo.push({label,library:clone(state.library),selectedId:state.selectedId});if(state.history.undo.length>state.history.limit)state.history.undo.shift();state.history.redo=[];updateHistory();}
function restore(entry){if(!entry)return false;state.library=clone(entry.library);state.selectedId=entry.selectedId;renderAll();return true;}
function undo(){if(!state.history.undo.length)return false;const entry=state.history.undo.pop();state.history.redo.push({label:entry.label,library:clone(state.library),selectedId:state.selectedId});return restore(entry);}
function redo(){if(!state.history.redo.length)return false;const entry=state.history.redo.pop();state.history.undo.push({label:entry.label,library:clone(state.library),selectedId:state.selectedId});return restore(entry);}
function updateHistory(){els.undoCommon.disabled=!state.history.undo.length;els.redoCommon.disabled=!state.history.redo.length;els.undoCommon.title=state.history.undo.at(-1)?.label||'Nothing to undo';els.redoCommon.title=state.history.redo.at(-1)?.label||'Nothing to redo';}

function renderAll(){renderList();renderEditor();renderValidation();updateHistory();}
function renderList(){
  const q=els.eventSearch.value.trim().toLowerCase();els.commonList.innerHTML='';
  for(const event of state.library.commonEvents){if(q&&!`${event.id} ${event.name}`.toLowerCase().includes(q))continue;const b=document.createElement('button');b.dataset.commonId=event.id;b.className=event.id===state.selectedId?'selected':'';b.innerHTML=`<strong>${event.name||event.id}</strong><small>${event.id} • ${event.commands.length} command(s)</small>`;els.commonList.append(b);}
  els.libraryMeta.textContent=`Schema ${state.library.schemaVersion} • ${state.library.commonEvents.length} common event(s)`;
}
function renderEditor(){
  const event=selected();els.commonEmpty.hidden=!!event;els.commonEditor.hidden=!event;if(!event)return;els.commonId.value=event.id;els.commonName.value=event.name||event.id;els.commonCommands.innerHTML='';
  event.commands.forEach((command,index)=>{const card=document.createElement('div');card.className='command-card';const head=document.createElement('div');head.className='common-command-head';const title=document.createElement('strong');title.textContent=`${index+1}. ${command.code}`;head.append(title);const actions=document.createElement('div');actions.className='common-command-actions';for(const [label,delta] of [['↑',-1],['↓',1]]){const b=document.createElement('button');b.textContent=label;b.disabled=(delta<0&&index===0)||(delta>0&&index===event.commands.length-1);b.addEventListener('click',()=>{snapshot(`Move ${command.code}`);state.library=moveCommonEventCommand(state.library,event.id,index,delta);renderAll();});actions.append(b);}const remove=document.createElement('button');remove.textContent='Delete';remove.addEventListener('click',()=>{snapshot(`Delete ${command.code}`);state.library=removeCommonEventCommand(state.library,event.id,index);renderAll();});actions.append(remove);head.append(actions);card.append(head);const ta=document.createElement('textarea');ta.rows=4;ta.value=JSON.stringify(command.parameters??[],null,2);card.append(ta);const apply=document.createElement('button');apply.textContent='Apply Command';apply.addEventListener('click',()=>{try{const parameters=JSON.parse(ta.value||'[]');snapshot(`Edit ${command.code}`);state.library=replaceCommonEventCommand(state.library,event.id,index,{code:command.code,parameters});renderAll();}catch(error){alert(`Command not changed: ${error.message}`);}});card.append(apply);els.commonCommands.append(card);});
}
function renderValidation(){try{validateCommonEventLibrary(state.library);els.commonValidation.textContent='Library valid.';}catch(error){els.commonValidation.textContent=`Error: ${error.message}`;}}
function populateCommands(){
  const codes=[...EDITABLE_COMMANDS];els.commonCommandType.innerHTML='';els.supportedCommands.innerHTML='';for(const code of codes){const o=document.createElement('option');o.value=code;o.textContent=code;els.commonCommandType.append(o);const chip=document.createElement('span');chip.textContent=code;els.supportedCommands.append(chip);}setCommandTemplate();
}
function setCommandTemplate(){const spec=COMMAND_SPECS[els.commonCommandType.value]||{parameters:[],help:''};els.commonCommandParameters.value=JSON.stringify(spec.parameters,null,2);els.commandHelp.textContent=spec.help;}
function selectEvent(id){state.selectedId=id;renderAll();}
function resetLibrary(library=createCommonEventLibrary()){state.library=normalizeCommonEventLibrary(library);state.selectedId=state.library.commonEvents[0]?.id||null;state.history={undo:[],redo:[],limit:80};renderAll();}
function exportLibrary(){validateCommonEventLibrary(state.library);const blob=new Blob([`${JSON.stringify(state.library,null,2)}\n`],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='plushbound-common-events.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}

els.commonList.addEventListener('click',event=>{const b=event.target.closest('[data-common-id]');if(b)selectEvent(b.dataset.commonId);});
els.eventSearch.addEventListener('input',renderList);els.commonCommandType.addEventListener('change',setCommandTemplate);
els.addCommon.addEventListener('click',()=>{let n=state.library.commonEvents.length+1,id=`common-event-${n}`;while(state.library.commonEvents.some(event=>event.id===id))id=`common-event-${++n}`;snapshot(`Create ${id}`);state.library=addCommonEvent(state.library,{id,name:`Common Event ${n}`});state.selectedId=id;renderAll();});
els.applyCommon.addEventListener('click',()=>{const event=selected();if(!event)return;try{const oldId=event.id,nextId=els.commonId.value.trim();snapshot(`Edit ${oldId}`);state.library=updateCommonEvent(state.library,oldId,{id:nextId,name:els.commonName.value});state.selectedId=nextId;renderAll();}catch(error){state.history.undo.pop();alert(`Common event not changed: ${error.message}`);updateHistory();}});
els.deleteCommon.addEventListener('click',()=>{const event=selected();if(!event||!confirm(`Delete ${event.name||event.id}?`))return;snapshot(`Delete ${event.id}`);state.library=removeCommonEvent(state.library,event.id);state.selectedId=state.library.commonEvents[0]?.id||null;renderAll();});
els.addCommonCommand.addEventListener('click',()=>{const event=selected();if(!event)return;try{const code=els.commonCommandType.value,parameters=JSON.parse(els.commonCommandParameters.value||'[]');snapshot(`Add ${code}`);state.library=appendCommonEventCommand(state.library,event.id,{code,parameters});renderAll();setCommandTemplate();}catch(error){state.history.undo.pop();alert(`Command not added: ${error.message}`);updateHistory();}});
els.newLibrary.addEventListener('click',()=>{if(state.library.commonEvents.length&&!confirm('Start a new common-event library?'))return;resetLibrary();});els.exportLibrary.addEventListener('click',()=>{try{exportLibrary();}catch(error){alert(`Library not exported: ${error.message}`);}});els.undoCommon.addEventListener('click',undo);els.redoCommon.addEventListener('click',redo);
els.commonFile.addEventListener('change',async()=>{const file=els.commonFile.files?.[0];if(!file)return;try{resetLibrary(JSON.parse(await file.text()));}catch(error){alert(`Library not opened: ${error.message}`);}finally{els.commonFile.value='';}});
document.addEventListener('keydown',event=>{if(!(event.ctrlKey||event.metaKey))return;if(event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();}else if(event.key.toLowerCase()==='y'){event.preventDefault();redo();}});

populateCommands();resetLibrary();
window.PlushboundCommonEvents={getLibrary:()=>clone(state.library),setLibrary:resetLibrary,selectEvent,undo,redo,getState:()=>state};
