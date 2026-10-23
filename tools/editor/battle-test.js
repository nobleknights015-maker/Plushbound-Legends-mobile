import { BattleEncounterTester } from './battle-test-core.js';

const $=id=>document.getElementById(id);
const els=Object.fromEntries(['reloadBattle','runtimePackage','battleMap','battleRegion','battleSourceMeta','encounterTableMeta','encounterCandidates','rollEncounter','activeEncounter','resolveVictory','resolveEscape','resolveDefeat','battleQuest','prepareQuest','resetBattleSession','questProgress','battleStatus','battleDiagnostics'].map(id=>[id,$(id)]));
const state={index:null,contentPackages:[],runtimePackages:[],tester:null,activeRuntimeIndex:-1};

async function loadJson(url){const response=await fetch(url);if(!response.ok)throw new Error(`Could not load ${url} (${response.status})`);return response.json();}

async function loadProject(){
  els.battleStatus.textContent='Loading project…';
  const index=await loadJson(new URL('../../game/content/content-index.json',location.href));
  const contentPackages=[];
  for(const descriptor of index.packages||[]){
    try{contentPackages.push(await loadJson(new URL(`../../game/content/${descriptor.path}`,location.href)));}
    catch(error){if(descriptor.required)throw error;}
  }
  const runtimePackages=[];
  for(const descriptor of index.runtimePackages||[]){
    try{const data=await loadJson(new URL(`../../game/content/${descriptor.path}`,location.href));if(Array.isArray(data?.maps)&&data.maps.length)runtimePackages.push({...descriptor,data});}
    catch(error){if(descriptor.required&&/maps/i.test(descriptor.id||''))throw error;}
  }
  state.index=index;state.contentPackages=contentPackages;state.runtimePackages=runtimePackages;state.activeRuntimeIndex=0;
  renderRuntimePackages();createTester();
}

function renderRuntimePackages(){
  els.runtimePackage.innerHTML='';state.runtimePackages.forEach((entry,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=entry.id;els.runtimePackage.append(option);});els.runtimePackage.value=String(Math.max(0,state.activeRuntimeIndex));
}

function createTester(){
  const source=state.runtimePackages[state.activeRuntimeIndex];
  if(!source)throw new Error('No runtime map package with maps[] was found');
  state.tester=new BattleEncounterTester({mapPackage:source.data,contentPackages:state.contentPackages});
  renderMaps();renderQuests();refreshAll();
}

function renderMaps(){
  els.battleMap.innerHTML='';for(const map of state.tester.maps()){const option=document.createElement('option');option.value=map.id;option.textContent=map.name;els.battleMap.append(option);}const start=state.index?.start?.mapId;if(start&&state.tester.maps().some(map=>map.id===start))els.battleMap.value=start;state.tester.enterMap(els.battleMap.value,0,0);
}

function renderQuests(){
  els.battleQuest.innerHTML='<option value="">No quest selected</option>';for(const quest of state.tester.battleQuests()){const option=document.createElement('option');option.value=quest.id;option.textContent=`${quest.name} (${quest.id})`;els.battleQuest.append(option);}
}

function selectedPreview(){return state.tester.encounterPreview({mapId:els.battleMap.value,regionId:Number(els.battleRegion.value)||0});}

function renderCandidates(){
  const preview=selectedPreview();els.encounterTableMeta.textContent=preview.tableId?`${preview.tableId} • region ${preview.regionId} • ${preview.entries.length} candidate(s)`:'This map has no encounter table.';els.encounterCandidates.innerHTML='';
  for(const entry of preview.entries){const enemy=state.tester.session.game.enemyDefinition(entry.enemyId);const card=document.createElement('div');card.className='candidate-card';const info=document.createElement('div');const strong=document.createElement('strong');strong.textContent=enemy?.name||entry.enemyId;const small=document.createElement('small');small.textContent=`${entry.enemyId} • weight ${entry.weight??1}${Array.isArray(entry.regions)&&entry.regions.length?` • regions ${entry.regions.join(', ')}`:''}`;info.append(strong,small);const button=document.createElement('button');button.type='button';button.textContent='Test';button.dataset.enemyId=entry.enemyId;card.append(info,button);els.encounterCandidates.append(card);}
}

function renderActive(){
  const snap=state.tester.snapshot(),encounter=snap.lastEncounter;const active=!!encounter;els.resolveVictory.disabled=!active;els.resolveEscape.disabled=!active;els.resolveDefeat.disabled=!active;
  if(!encounter){els.activeEncounter.className='empty-state';els.activeEncounter.textContent='Pick or select an encounter candidate.';return;}
  els.activeEncounter.className='active-enemy';const enemy=encounter.enemy||{};const stats=enemy.stats||{};const tags=(enemy.tags||[]).join(', ')||'none';els.activeEncounter.innerHTML=`<strong>${enemy.name||encounter.enemyId}</strong><span>${encounter.enemyId}</span><span>Tags: ${tags}</span><div class="enemy-stats">${Object.entries(stats).map(([key,value])=>`<span>${key}: ${value}</span>`).join('')}</div>`;
}

function renderQuestProgress(){
  const selected=els.battleQuest.value;els.questProgress.innerHTML='';if(!selected)return;const definition=state.tester.session.game.questDefinition(selected),quest=state.tester.snapshot().quests[selected];const summary=document.createElement('div');summary.className='meta';summary.textContent=quest?`${quest.status} • stage ${quest.stage}`:'Not started';els.questProgress.append(summary);for(const objective of definition?.objectives||[]){const row=document.createElement('div');row.className='quest-objective';const target=Math.max(1,Number(objective.count)||1),current=Number(quest?.objectives?.[objective.id])||0;row.innerHTML=`<strong>${objective.id}</strong><span>${objective.type}${objective.targetTag?` • tag ${objective.targetTag}`:''}${objective.target?` • target ${objective.target}`:''} • ${current}/${target}</span>`;els.questProgress.append(row);}
}

function renderDiagnostics(message='Ready'){
  const preview=selectedPreview(),snap=state.tester.snapshot();els.battleStatus.textContent=message;els.battleSourceMeta.textContent=`${state.runtimePackages[state.activeRuntimeIndex]?.id||'runtime'} • ${state.tester.maps().length} map(s) • ${state.tester.battleQuests().length} battle quest(s)`;els.battleDiagnostics.textContent=JSON.stringify({map:els.battleMap.value,region:preview.regionId,table:preview.tableId,candidates:preview.entries.map(entry=>entry.enemyId),activeEncounter:snap.lastEncounter?.enemyId||null,quests:snap.quests},null,2);
}

function refreshAll(message='Ready'){renderCandidates();renderActive();renderQuestProgress();renderDiagnostics(message);}

function pick(enemyId=null){const encounter=state.tester.pickEncounter({mapId:els.battleMap.value,regionId:Number(els.battleRegion.value)||0,enemyId});refreshAll(encounter?`Encounter loaded: ${encounter.enemy?.name||encounter.enemyId}`:'No eligible encounter candidate');}

function resolve(result){try{const resolved=state.tester.resolveEncounter(result);refreshAll(`Resolved ${resolved.encounter.enemy?.name||resolved.encounter.enemyId}: ${result}`);}catch(error){refreshAll(error.message);}}

function prepareQuest(){const id=els.battleQuest.value;if(!id)return;try{const definition=state.tester.session.game.questDefinition(id);for(const prerequisite of definition?.prerequisites||[])if(prerequisite.questComplete)state.tester.setQuestCompleteForTest(prerequisite.questComplete);state.tester.startQuest(id);refreshAll(`Started quest sandbox: ${definition?.name||id}`);}catch(error){refreshAll(`Quest could not start: ${error.message}`);}}

els.runtimePackage.addEventListener('change',()=>{state.activeRuntimeIndex=Number(els.runtimePackage.value)||0;createTester();});
els.battleMap.addEventListener('change',()=>{state.tester.enterMap(els.battleMap.value,0,0);refreshAll(`Map selected: ${els.battleMap.value}`);});
els.battleRegion.addEventListener('input',()=>refreshAll('Region preview updated'));
els.encounterCandidates.addEventListener('click',event=>{const button=event.target.closest('[data-enemy-id]');if(button)pick(button.dataset.enemyId);});
els.rollEncounter.addEventListener('click',()=>pick());
els.resolveVictory.addEventListener('click',()=>resolve('victory'));els.resolveEscape.addEventListener('click',()=>resolve('escape'));els.resolveDefeat.addEventListener('click',()=>resolve('defeat'));
els.battleQuest.addEventListener('change',()=>refreshAll('Quest selection updated'));els.prepareQuest.addEventListener('click',prepareQuest);els.resetBattleSession.addEventListener('click',()=>{createTester();renderQuests();refreshAll('Battle test session reset');});els.reloadBattle.addEventListener('click',()=>loadProject().catch(error=>{els.battleStatus.textContent=error.message;}));

loadProject().catch(error=>{els.battleStatus.textContent=`Battle test load failed: ${error.message}`;els.battleDiagnostics.textContent=String(error.stack||error);});
