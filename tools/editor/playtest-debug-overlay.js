function entries(value){return value&&typeof value==='object'?Object.entries(value):[];}
export function summarizePlaytestDebug(snapshot={}){
  const state=snapshot.debugState||{};
  return {
    map:`${snapshot.currentMap||state.map?.id||'—'} @ ${state.map?.x??snapshot.map?.x??'—'},${state.map?.y??snapshot.map?.y??'—'} • R${snapshot.regionId??0}`,
    switches:entries(state.switches).filter(([,v])=>!!v).length,
    variables:entries(state.variables).length,
    selfSwitches:entries(state.selfSwitches).filter(([,v])=>!!v).length,
    quests:entries(state.quests).length,
    items:entries(state.inventory?.items).reduce((n,[,v])=>n+(Number(v)||0),0),
    actions:(snapshot.actions||[]).length,
    dialogue:snapshot.dialogue?.length||0,
    encounter:snapshot.lastEncounter?.enemyId||snapshot.encounterPreview?.tableId||null,
    state
  };
}
function json(value){return JSON.stringify(value??{},null,2);}
function ensureUi(){
  const panel=document.querySelector('#playtestOverlay .playtest-panel');if(!panel)return null;
  let section=document.getElementById('playtestDebugState');if(section)return section;
  section=document.createElement('details');section.id='playtestDebugState';section.innerHTML='<summary>Runtime State Debug</summary><div id="playtestDebugSummary" class="meta"></div><div class="two-col"><details><summary>Switches / Variables</summary><pre id="playtestDebugVariables" class="meta"></pre></details><details><summary>Quest / Inventory</summary><pre id="playtestDebugProgress" class="meta"></pre></details></div><details><summary>Full Serialized GameState</summary><pre id="playtestDebugJson" class="meta"></pre></details>';
  panel.append(section);return section;
}
export function refreshPlaytestDebug(){
  const section=ensureUi();if(!section||document.getElementById('playtestOverlay')?.hidden)return null;
  const snapshot=window.PlushboundEditor?.getPlaytestSnapshot?.();if(!snapshot)return null;const s=summarizePlaytestDebug(snapshot),state=s.state;
  section.querySelector('#playtestDebugSummary').textContent=`${s.map} • switches ${s.switches} • vars ${s.variables} • self ${s.selfSwitches} • quests ${s.quests} • items ${s.items} • actions ${s.actions}${s.encounter?` • encounter ${s.encounter}`:''}`;
  section.querySelector('#playtestDebugVariables').textContent=json({switches:state.switches||{},variables:state.variables||{},selfSwitches:state.selfSwitches||{}});
  section.querySelector('#playtestDebugProgress').textContent=json({quests:state.quests||{},inventory:state.inventory||{},party:state.party||[],guardian:state.guardian??null});
  section.querySelector('#playtestDebugJson').textContent=json(state);return s;
}
export function installPlaytestDebug(){if(!ensureUi())return false;const refresh=()=>setTimeout(refreshPlaytestDebug,0);document.getElementById('startPlaytest')?.addEventListener('click',refresh);document.getElementById('playtestInteract')?.addEventListener('click',refresh);for(const b of document.querySelectorAll('#playtestOverlay [data-move]'))b.addEventListener('click',refresh);const timer=setInterval(refreshPlaytestDebug,300);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});return true;}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installPlaytestDebug,{once:true});else installPlaytestDebug();}
