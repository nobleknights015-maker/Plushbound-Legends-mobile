import {VISUAL_COMMAND_FORMS,visualFormSupported,valuesFromParameters,parametersFromValues} from './command-form-core.js';

if(!document.querySelector('link[data-command-forms]')){const link=document.createElement('link');link.rel='stylesheet';link.href='./command-forms.css';link.dataset.commandForms='1';document.head.append(link);}

function readJson(textarea){try{return JSON.parse(textarea.value||'[]');}catch{return [];}}
function fieldInput([key,type,label,options],value){
  const wrap=document.createElement('label');wrap.className='command-form-field';wrap.textContent=label;
  let input;
  if(type==='textarea'){input=document.createElement('textarea');input.rows=3;input.value=value??'';}
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
function enhanceCards(root=document){for(const card of root.querySelectorAll('.command-card')){if(card.dataset.visualEnhanced==='1')continue;const code=commandCode(card),textarea=card.querySelector('textarea');if(!code||!textarea||!visualFormSupported(code))continue;card.dataset.visualEnhanced='1';const host=document.createElement('div');host.className='visual-command-form existing-command-form';textarea.before(host);renderForm(code,textarea,host);textarea.addEventListener('input',()=>{if(document.activeElement===textarea)queueMicrotask(()=>renderForm(code,textarea,host));});}}

attachBuilder(document.getElementById('newCommandType'),document.getElementById('newCommandParameters'));
attachBuilder(document.getElementById('commonCommandType'),document.getElementById('commonCommandParameters'));
enhanceCards();
const observer=new MutationObserver(mutations=>{for(const mutation of mutations)for(const node of mutation.addedNodes)if(node.nodeType===1){if(node.matches?.('.command-card'))enhanceCards(node.parentElement||document);else if(node.querySelector?.('.command-card'))enhanceCards(node);}});observer.observe(document.body,{childList:true,subtree:true});
