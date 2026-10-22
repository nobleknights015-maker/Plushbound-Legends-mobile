const MAP_NAMES = Object.freeze({
  'elyndor-sunny-plains': 'Sunny Plains of Elyndor',
  'elyndor-sunthread-crossing': 'Sunthread Crossing',
  'elyndor-menders-rest': "Mender's Rest"
});

function text(el, value) { if (el) el.textContent = value == null ? '' : String(value); }
function find(root, selectors = []) { for (const selector of selectors) { const found = root?.querySelector?.(selector); if (found) return found; } return null; }

function ensureLiveHud(root) {
  const existing = find(root, ['[data-plushbound-live-hud]']);
  if (existing) return existing;
  const host = find(root, ['#mapScreen .map-info', '#mapScreen', '[data-screen="map"]']);
  if (!host || !root?.createElement || !host.appendChild) return null;
  const hud = root.createElement('div');
  hud.dataset.plushboundLiveHud = 'true';
  hud.setAttribute?.('aria-live', 'polite');
  Object.assign(hud.style || {}, { display:'grid', gridTemplateColumns:'minmax(0,1fr) auto', gap:'4px 12px', alignItems:'center', width:'100%', fontSize:'12px', lineHeight:'1.25' });
  const map = root.createElement('strong'); map.dataset.plushboundMapInfo = 'true';
  const gold = root.createElement('span'); gold.dataset.plushboundGold = 'true';
  const quest = root.createElement('span'); quest.dataset.plushboundQuestInfo = 'true'; Object.assign(quest.style || {}, { gridColumn:'1 / -1', opacity:'0.9' });
  const dialogue = root.createElement('div'); dialogue.dataset.plushboundDialogue = 'true'; Object.assign(dialogue.style || {}, { gridColumn:'1 / -1', minHeight:'34px', maxHeight:'58px', overflow:'hidden', padding:'6px 8px', borderRadius:'6px', background:'rgba(0,0,0,0.28)' });
  const dialogueButton = root.createElement('button'); dialogueButton.type='button'; dialogueButton.dataset.plushboundAction='dialogue-next'; dialogueButton.dataset.plushboundDialogueNext='true'; dialogueButton.textContent='Next'; Object.assign(dialogueButton.style || {}, { gridColumn:'1 / -1', minHeight:'30px', padding:'4px 8px', display:'none' });
  const shop = root.createElement('div'); shop.dataset.plushboundShop='true'; Object.assign(shop.style || {}, { gridColumn:'1 / -1', display:'none', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:'5px', maxHeight:'100px', overflow:'hidden', padding:'6px', borderRadius:'6px', background:'rgba(0,0,0,0.24)' });
  const actions = root.createElement('div'); actions.dataset.plushboundActions='true'; Object.assign(actions.style || {}, { gridColumn:'1 / -1', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(112px,1fr))', gap:'5px', maxHeight:'96px', overflow:'hidden' });
  for (const node of [map,gold,quest,dialogue,dialogueButton,shop,actions]) hud.appendChild(node);
  host.appendChild(hud);
  return hud;
}

function renderActions(root, actions = []) {
  const host = find(root, ['[data-plushbound-actions]']);
  if (!host || !root?.createElement || !host.replaceChildren) return;
  const buttons = actions.slice(0,8).map(action => {
    const button = root.createElement('button');
    button.type='button'; button.textContent=action.label || action.eventId;
    button.dataset.plushboundAction = action.trigger === 'touch' ? 'touch' : 'interact';
    button.dataset.eventId=action.eventId; button.dataset.x=String(action.x ?? 0); button.dataset.y=String(action.y ?? 0); button.dataset.trigger=action.trigger || 'action'; button.dataset.actionKind=action.kind || 'interact';
    if (action.shopId) button.dataset.shopId=action.shopId;
    if (action.destinationMapId) button.dataset.destinationMapId=action.destinationMapId;
    Object.assign(button.style || {}, { minHeight:'32px', padding:'5px 8px', fontSize:'11px', lineHeight:'1.1' });
    return button;
  });
  host.replaceChildren(...buttons); host.dataset.actionCount=String(actions.length);
}

function renderDialogue(root, dialogue = {}, messages = []) {
  const host = find(root, ['[data-plushbound-dialogue]', '#dialogueText', '#messageText']);
  const next = find(root, ['[data-plushbound-dialogue-next]']);
  if (!host) return;
  const latest = dialogue?.current || messages.at?.(-1) || messages[messages.length-1];
  if (!latest) { text(host,'Explore the area and interact with nearby people or landmarks.'); delete host.dataset.speaker; if (next?.style) next.style.display='none'; return; }
  text(host, `${latest.speaker ? `${latest.speaker}: ` : ''}${latest.text || ''}`);
  if (latest.speaker) host.dataset.speaker=latest.speaker; else delete host.dataset.speaker;
  if (latest.portrait) host.dataset.portrait=latest.portrait; else delete host.dataset.portrait;
  if (next) { next.textContent = dialogue?.remaining > 0 ? `Next (${dialogue.remaining})` : 'Close'; if (next.style) next.style.display='block'; }
}

function renderShop(root, shop) {
  const host = find(root, ['[data-plushbound-shop]']);
  if (!host || !root?.createElement || !host.replaceChildren) return;
  if (!shop) { host.replaceChildren(); if (host.style) host.style.display='none'; delete host.dataset.shopId; return; }
  const nodes=[];
  const title=root.createElement('strong'); title.textContent=shop.name || shop.id; Object.assign(title.style || {}, { gridColumn:'1 / -1' }); nodes.push(title);
  for (const entry of (shop.inventory || []).slice(0,5)) {
    const buy=root.createElement('button');
    buy.type='button'; buy.dataset.plushboundAction='buy'; buy.dataset.itemId=entry.itemId; buy.dataset.price=String(Number(entry.price)||0);
    buy.textContent=`${entry.item?.name || entry.itemId} — ${Number(entry.price)||0} G`;
    Object.assign(buy.style || {}, { minHeight:'30px', padding:'4px 6px', fontSize:'11px', lineHeight:'1.1' }); nodes.push(buy);
  }
  const close=root.createElement('button'); close.type='button'; close.textContent='Close Shop'; close.dataset.plushboundAction='shop-close'; nodes.push(close);
  host.replaceChildren(...nodes); host.dataset.shopId=shop.id; if (host.style) host.style.display='grid';
}

export class GameDomAdapter {
  constructor({ scope=globalThis, bridge=scope.PlushboundGameShell }={}) { this.scope=scope; this.bridge=bridge; this.root=scope.document || null; this.bound=false; this.onUpdate=e=>this.render(e?.detail?.snapshot || this.bridge?.snapshot?.()); this.onClick=e=>this.#handleClick(e); }
  attach() { if (this.bound || !this.root) return this; this.bound=true; this.scope.addEventListener?.('plushbound-shell-update',this.onUpdate); this.root.addEventListener?.('click',this.onClick); ensureLiveHud(this.root); this.render(this.bridge?.snapshot?.()); return this; }
  detach() { if (!this.bound) return this; this.bound=false; this.scope.removeEventListener?.('plushbound-shell-update',this.onUpdate); this.root?.removeEventListener?.('click',this.onClick); return this; }
  render(snapshot={}) {
    if (!this.root || !snapshot) return snapshot; ensureLiveHud(this.root);
    const mapId=snapshot.currentMap || snapshot.map?.id || ''; const mapName=snapshot.mapName || MAP_NAMES[mapId] || mapId || 'Plustopia';
    const mapInfo=find(this.root,['[data-plushbound-map-info]','#mapInfo','#mapName','#locationName']); const worldMap=find(this.root,['[data-plushbound-world-map]','#worldMap','#mapScreen .world-map']); const questInfo=find(this.root,['[data-plushbound-quest-info]','#questInfo','#questStatus','#mapScreen .quest-info']); const goldInfo=find(this.root,['[data-plushbound-gold]','#goldValue','#gold']);
    text(mapInfo,mapName); if (worldMap) worldMap.dataset.plushboundMapId=mapId; text(goldInfo,`${snapshot.gold ?? 0} G`);
    const activeQuest=Object.values(snapshot.quests || {}).find(q=>q && q.status!=='complete') || Object.values(snapshot.quests || {}).find(Boolean);
    if (activeQuest) { const progress=Object.values(activeQuest.objectives || {}).reduce((sum,v)=>sum+Number(v||0),0); text(questInfo,`${activeQuest.name || activeQuest.id} — ${activeQuest.status}${progress ? ` (${progress})` : ''}`); if (questInfo) questInfo.dataset.questId=activeQuest.id; } else { text(questInfo,'No active quest'); if (questInfo) delete questInfo.dataset.questId; }
    renderDialogue(this.root,snapshot.dialogue || {},snapshot.messages || []); renderShop(this.root,snapshot.activeShop || null); renderActions(this.root,snapshot.actions || []);
    const mapScreen=find(this.root,['#mapScreen','[data-screen="map"]']); if (mapScreen) { mapScreen.dataset.plushboundLive='true'; mapScreen.dataset.plushboundMapId=mapId; mapScreen.dataset.plushboundActionCount=String((snapshot.actions || []).length); mapScreen.dataset.plushboundDialogueOpen=snapshot.dialogue?.current ? 'true' : 'false'; mapScreen.dataset.plushboundShopOpen=snapshot.activeShop ? 'true' : 'false'; }
    return snapshot;
  }
  #handleClick(event) {
    const target=event?.target?.closest?.('[data-plushbound-action]'); if (!target || !this.bridge) return; const action=target.dataset.plushboundAction;
    try {
      if (action==='interact' && target.dataset.eventId) this.bridge.interact(target.dataset.eventId);
      else if (action==='shop' && target.dataset.shopId) this.bridge.openShop(target.dataset.shopId);
      else if (action==='buy' && target.dataset.itemId) this.bridge.buyItem(target.dataset.itemId,1);
      else if (action==='shop-close') this.bridge.closeShop();
      else if (action==='dialogue-next') this.bridge.advanceDialogue();
      else if (action==='map' && target.dataset.mapId) this.bridge.enterMap(target.dataset.mapId,Number(target.dataset.x||0),Number(target.dataset.y||0),Number(target.dataset.direction||2));
      else if (action==='touch') this.bridge.triggerAt(Number(target.dataset.x||0),Number(target.dataset.y||0),target.dataset.trigger||'touch');
    } catch (error) { this.scope.dispatchEvent?.(new CustomEvent('plushbound-shell-action-error',{ detail:{ action, message:String(error?.message || error) } })); }
  }
}

if (typeof window!=='undefined' && window.document) { const start=()=>{ const bridge=window.PlushboundGameShell; if (!bridge) return; if (!window.PlushboundGameDomAdapter) window.PlushboundGameDomAdapter=new GameDomAdapter({ scope:window, bridge }).attach(); }; window.addEventListener('plushbound-shell-update',start,{ once:true }); start(); }
