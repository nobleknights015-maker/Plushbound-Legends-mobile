import {VISUAL_COMMAND_FORMS,visualFormSupported,valuesFromParameters,parametersFromValues} from './command-form-core.js';

if(!document.querySelector('link[data-command-forms]')){const link=document.createElement('link');link.rel='stylesheet';link.href='./command-forms.css';link.dataset.commandForms='1';document.head.append(link);}

function readJson(textarea){try{return JSON.parse(textarea.value||'[]');}catch{return [];}}
function fieldInput([key,type,label,options],value){
  const wrap=document.createElement('label');wrap.className='command-form-field';wrap.textContent=label;
  let input;
  if(type==='textarea'||type==='lines'){input=document.createElement('textarea');input.rows=type==='lines'?4:3;input.value=value??'';}
  else if(type==='select'){input=document.createElement('select');for(const option of options||[]){const pair=Array.isArray(option)?option:[option,option];const o=document.createElement('option');o.value=pair[0];o.textContent=pair[1];input.append(o);}input.value=String(value??'');}
  else if(type==='boolean'){input=document.createElement('input');input.type='checkbox';input.checked=!!value;wrap.classList.add('command-form-check');}
  else {input=document.createElement('input');input.type=type==='number'?'number':'text';if(type==='number')input.step='any';input.value=value??'';}
  input.dataset.commandField=key;wrap.append(input);return wrap;
}
function collect(form){const values={};for(const input of form.querySelectorAll('[data-command-field]'))values[input.dataset.commandField]=input.type==='checkbox'?input.checked:input.value;return values;}
function renderForm(code,textarea,host){
  host.innerHTML='';host.oninput=null;host.onchange=null;if(!visualFormSupported(code)){host.hidden=true;return;}host.hidden=false;host.dataset.code=code;const spec=VISUAL_COMMAND_FORMS[code],values=valuesFromParameters(code,readJson(textarea));const title=document.createElement('div');title.className='command-form-title';title.textContent=`Visual ${spec.label} Parameters`;host.append(title);const grid=document.createElement('div');grid.className='command-form-grid';for(const field of spec.fields)grid.append(fieldInput(field,values[field[0]]));host.append(grid);
  const sync=()=>{const params=parametersFromValues(code,collect(host));if(params)textarea.value=JSON.stringify(params,null,2);};host.oninput=sync;host.onchange=sync;
}
function attachBuilder(select,textarea){if(!select||!textarea)return;let host=textarea.parentElement?.querySelector(':scope > .visual-command-form');if(!host){host=document.createElement('div');host.className='visual-command-form';textarea.parentElement?.insertBefore(host,textarea);}const refresh=()=>renderForm(select.value,textarea,host);select.addEventListener('change',()=>queueMicrotask(refresh));textarea.addEventListener('input',()=>{if(document.activeElement===textarea)queueMicrotask(refresh);});refresh();}
function commandCode(card){const head=card.querySelector('.command-head,.common-command-head');const text=head?.textContent||'';const match=text.match(/\b([A-Z][A-Z0-9_]+)\b/);return match?.[1]||null;}
let refreshCommandPaste=()=>{};
function installCommandCardActions(card,code){
  const editor=window.PlushboundEditor;if(!editor||card.dataset.commandActions==='1'||card.dataset.commandIndex===undefined)return;
  card.dataset.commandActions='1';const index=Number(card.dataset.commandIndex),head=card.querySelector('.command-head');const readOnly=head?.textContent?.includes('read-only');
  const host=document.createElement('div');host.className='tool-grid command-structure-actions';host.style.marginTop='.45rem';
  const duplicate=document.createElement('button');duplicate.type='button';duplicate.textContent='Duplicate';duplicate.dataset.commandAction='duplicate';
  const copy=document.createElement('button');copy.type='button';copy.textContent='Copy';copy.dataset.commandAction='copy';
  const up=document.createElement('button');up.type='button';up.textContent='↑';up.dataset.commandAction='up';up.disabled=index<=0;
  const down=document.createElement('button');down.type='button';down.textContent='↓';down.dataset.commandAction='down';down.disabled=index>=Number(editor.getCommandCount?.()||0)-1;
  const remove=document.createElement('button');remove.type='button';remove.textContent='Delete';remove.dataset.commandAction='delete';remove.disabled=!!readOnly;remove.title=readOnly?'Read-only commands are preserved and cannot be deleted here':'';
  host.append(duplicate,copy,up,down,remove);card.append(host);
  duplicate.addEventListener('click',()=>editor.duplicateCommand?.(index));
  copy.addEventListener('click',()=>{editor.copyCommand?.(index);refreshCommandPaste();});
  up.addEventListener('click',()=>editor.moveCommand?.(index,-1));
  down.addEventListener('click',()=>editor.moveCommand?.(index,1));
  remove.addEventListener('click',()=>{if(!readOnly&&confirm(`Delete ${code} command?`))editor.deleteCommand?.(index);});
}
function enhanceCards(root=document){for(const card of root.querySelectorAll('.command-card')){const code=commandCode(card),textarea=card.querySelector('textarea');installCommandCardActions(card,code);if(card.dataset.visualEnhanced==='1')continue;if(!code||!textarea||!visualFormSupported(code))continue;card.dataset.visualEnhanced='1';const host=document.createElement('div');host.className='visual-command-form existing-command-form';textarea.before(host);renderForm(code,textarea,host);textarea.addEventListener('input',()=>{if(document.activeElement===textarea)queueMicrotask(()=>renderForm(code,textarea,host));});}}

function installEventCopyActions(){
  const editor=window.PlushboundEditor,eventList=document.getElementById('eventList');
  if(!editor||!eventList||document.getElementById('eventCopyActions'))return ()=>{};
  const host=document.createElement('div');host.id='eventCopyActions';host.className='tool-grid';host.style.marginTop='.55rem';
  const duplicate=document.createElement('button');duplicate.id='duplicateEvent';duplicate.type='button';duplicate.textContent='Duplicate';
  const copy=document.createElement('button');copy.id='copyEvent';copy.type='button';copy.textContent='Copy';
  const paste=document.createElement('button');paste.id='pasteEvent';paste.type='button';paste.textContent='Paste';
  host.append(duplicate,copy,paste);eventList.after(host);
  const refresh=()=>{const selected=!!editor.getSelectedEventId?.();duplicate.disabled=!selected;copy.disabled=!selected;paste.disabled=!editor.hasEventClipboard?.();};
  duplicate.addEventListener('click',()=>{editor.duplicateSelectedEvent?.();refresh();});
  copy.addEventListener('click',()=>{editor.copySelectedEvent?.();refresh();});
  paste.addEventListener('click',()=>{editor.pasteCopiedEvent?.();refresh();});
  refresh();return refresh;
}

function installPageActions(){
  const editor=window.PlushboundEditor,pageEditor=document.getElementById('pageEditor'),addPage=document.getElementById('addPage');
  if(!editor||!pageEditor||!addPage||document.getElementById('eventPageActions'))return ()=>{};
  const host=document.createElement('div');host.id='eventPageActions';host.className='tool-grid';host.style.margin='.55rem 0';
  const duplicate=document.createElement('button');duplicate.id='duplicatePage';duplicate.type='button';duplicate.textContent='Duplicate Page';
  const up=document.createElement('button');up.id='movePageUp';up.type='button';up.textContent='Page ↑';
  const down=document.createElement('button');down.id='movePageDown';down.type='button';down.textContent='Page ↓';
  const remove=document.createElement('button');remove.id='deletePage';remove.type='button';remove.textContent='Delete Page';
  host.append(duplicate,up,down,remove);addPage.after(host);
  const refresh=()=>{const selected=!!editor.getSelectedEventId?.(),index=Number(editor.getSelectedPageIndex?.()||0),count=Number(editor.getSelectedPageCount?.()||0);duplicate.disabled=!selected;up.disabled=!selected||index<=0;down.disabled=!selected||index>=count-1;remove.disabled=!selected||count<=1;};
  duplicate.addEventListener('click',()=>{editor.duplicateSelectedPage?.();refresh();});
  up.addEventListener('click',()=>{editor.moveSelectedPage?.(-1);refresh();});
  down.addEventListener('click',()=>{editor.moveSelectedPage?.(1);refresh();});
  remove.addEventListener('click',()=>{if(confirm('Delete the selected event page?'))editor.deleteSelectedPage?.();refresh();});
  document.getElementById('pageSelect')?.addEventListener('change',()=>queueMicrotask(refresh));
  refresh();return refresh;
}

function installCommandPaste(){
  const editor=window.PlushboundEditor,addCommand=document.getElementById('addCommand');
  if(!editor||!addCommand||document.getElementById('pasteCommand'))return ()=>{};
  const paste=document.createElement('button');paste.id='pasteCommand';paste.type='button';paste.textContent='Paste Copied Command';paste.style.marginTop='.45rem';addCommand.after(paste);
  const refresh=()=>{paste.disabled=!editor.getSelectedEventId?.()||!editor.hasCommandClipboard?.();};
  paste.addEventListener('click',()=>{editor.pasteCommand?.();refresh();});refresh();return refresh;
}

attachBuilder(document.getElementById('newCommandType'),document.getElementById('newCommandParameters'));
attachBuilder(document.getElementById('commonCommandType'),document.getElementById('commonCommandParameters'));
refreshCommandPaste=installCommandPaste();
enhanceCards();
const refreshEventCopy=installEventCopyActions();
const refreshPageActions=installPageActions();
const observer=new MutationObserver(mutations=>{for(const mutation of mutations)for(const node of mutation.addedNodes)if(node.nodeType===1){if(node.matches?.('.command-card'))enhanceCards(node.parentElement||document);else if(node.querySelector?.('.command-card'))enhanceCards(node);}queueMicrotask(()=>{refreshEventCopy();refreshPageActions();refreshCommandPaste();});});observer.observe(document.body,{childList:true,subtree:true});
if(window.PlushboundEditor) import('./reference-audit.js');
