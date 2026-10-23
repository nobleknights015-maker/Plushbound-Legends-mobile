import { normalizeCommonEventLibrary, insertCommonEvent } from './common-event-core.js';

const state={library:null};
const host=document.querySelector('.sidebar.right');
if(host){
  const section=document.createElement('section');
  section.id='commonEventInsert';
  section.innerHTML=`<h2>Common Events</h2><label class="button file-button">Open Library<input id="mapCommonFile" type="file" accept="application/json,.json"></label><label>Reusable Event<select id="mapCommonSelect" disabled><option value="">Load a library</option></select></label><button id="insertCommonEvent" disabled>Insert Into Selected Page</button><div id="mapCommonStatus" class="note">Reusable commands are expanded into the selected event page, preserving current runtime compatibility.</div><a class="button" href="./common-events.html">Edit Common Events</a>`;
  const validation=host.querySelector('section:has(#validationSummary)');
  if(validation)host.insertBefore(section,validation);else host.append(section);
  const file=section.querySelector('#mapCommonFile'),select=section.querySelector('#mapCommonSelect'),insert=section.querySelector('#insertCommonEvent'),status=section.querySelector('#mapCommonStatus');
  function populate(){select.innerHTML='';if(!state.library?.commonEvents?.length){select.innerHTML='<option value="">No common events</option>';select.disabled=true;insert.disabled=true;return;}for(const event of state.library.commonEvents){const o=document.createElement('option');o.value=event.id;o.textContent=`${event.name||event.id} • ${event.commands.length} command(s)`;select.append(o);}select.disabled=false;insert.disabled=false;status.textContent=`${state.library.commonEvents.length} common event(s) loaded.`;}
  file.addEventListener('change',async()=>{const picked=file.files?.[0];if(!picked)return;try{state.library=normalizeCommonEventLibrary(JSON.parse(await picked.text()));populate();}catch(error){state.library=null;populate();alert(`Common-event library not loaded: ${error.message}`);}finally{file.value='';}});
  insert.addEventListener('click',()=>{try{if(!state.library)throw new Error('Load a common-event library first');const api=window.PlushboundEditor;if(!api)throw new Error('Map editor is not ready');const pkg=api.getPackage();const mapId=document.getElementById('mapSelect')?.value;const eventId=document.getElementById('eventId')?.value;const pageIndex=Number(document.getElementById('pageSelect')?.value)||0;if(!pkg||!mapId||!eventId)throw new Error('Select a map event first');const map=pkg.maps.find(item=>item.id===mapId);const event=map?.events?.find(item=>item.id===eventId);if(!event)throw new Error(`Selected event ${eventId} was not found`);const count=insertCommonEvent(event,pageIndex,state.library,select.value);api.setPackage(pkg);api.selectEvent(eventId);api.selectPage(pageIndex);status.textContent=`Inserted ${count} command(s) from ${select.value}.`; }catch(error){alert(`Common event not inserted: ${error.message}`);}});
  window.PlushboundCommonEventMap={setLibrary:library=>{state.library=normalizeCommonEventLibrary(library);populate();},getLibrary:()=>state.library};
}
