const MAP_NAMES = Object.freeze({
  'elyndor-sunny-plains': 'Sunny Plains of Elyndor',
  'elyndor-sunthread-crossing': 'Sunthread Crossing',
  'elyndor-menders-rest': "Mender's Rest"
});

function text(el, value) {
  if (el) el.textContent = value == null ? '' : String(value);
}

function find(root, selectors = []) {
  for (const selector of selectors) {
    const found = root?.querySelector?.(selector);
    if (found) return found;
  }
  return null;
}

function ensureLiveHud(root) {
  const existing = find(root, ['[data-plushbound-live-hud]']);
  if (existing) return existing;
  const host = find(root, ['#mapScreen .map-info', '#mapScreen', '[data-screen="map"]']);
  if (!host || !root?.createElement || !host.appendChild) return null;

  const hud = root.createElement('div');
  hud.dataset.plushboundLiveHud = 'true';
  hud.setAttribute?.('aria-live', 'polite');
  Object.assign(hud.style || {}, {
    display: 'grid',
    gridTemplateColumns: 'minmax(0,1fr) auto',
    gap: '4px 12px',
    alignItems: 'center',
    width: '100%',
    fontSize: '12px',
    lineHeight: '1.25'
  });

  const map = root.createElement('strong');
  map.dataset.plushboundMapInfo = 'true';
  const gold = root.createElement('span');
  gold.dataset.plushboundGold = 'true';
  const quest = root.createElement('span');
  quest.dataset.plushboundQuestInfo = 'true';
  Object.assign(quest.style || {}, { gridColumn: '1 / -1', opacity: '0.9' });
  hud.appendChild(map);
  hud.appendChild(gold);
  hud.appendChild(quest);
  host.appendChild(hud);
  return hud;
}

export class GameDomAdapter {
  constructor({ scope = globalThis, bridge = scope.PlushboundGameShell } = {}) {
    this.scope = scope;
    this.bridge = bridge;
    this.root = scope.document || null;
    this.bound = false;
    this.onUpdate = event => this.render(event?.detail?.snapshot || this.bridge?.snapshot?.());
    this.onClick = event => this.#handleClick(event);
  }

  attach() {
    if (this.bound || !this.root) return this;
    this.bound = true;
    this.scope.addEventListener?.('plushbound-shell-update', this.onUpdate);
    this.root.addEventListener?.('click', this.onClick);
    ensureLiveHud(this.root);
    this.render(this.bridge?.snapshot?.());
    return this;
  }

  detach() {
    if (!this.bound) return this;
    this.bound = false;
    this.scope.removeEventListener?.('plushbound-shell-update', this.onUpdate);
    this.root?.removeEventListener?.('click', this.onClick);
    return this;
  }

  render(snapshot = {}) {
    if (!this.root || !snapshot) return snapshot;
    ensureLiveHud(this.root);
    const mapId = snapshot.currentMap || snapshot.map?.id || '';
    const mapName = MAP_NAMES[mapId] || mapId || 'Plustopia';
    const mapInfo = find(this.root, ['[data-plushbound-map-info]', '#mapInfo', '#mapName', '#locationName']);
    const worldMap = find(this.root, ['[data-plushbound-world-map]', '#worldMap', '#mapScreen .world-map']);
    const questInfo = find(this.root, ['[data-plushbound-quest-info]', '#questInfo', '#questStatus', '#mapScreen .quest-info']);
    const goldInfo = find(this.root, ['[data-plushbound-gold]', '#goldValue', '#gold']);

    text(mapInfo, mapName);
    if (worldMap) worldMap.dataset.plushboundMapId = mapId;
    text(goldInfo, `${snapshot.gold ?? 0} G`);

    const activeQuest = Object.values(snapshot.quests || {}).find(q => q && q.status !== 'complete') || Object.values(snapshot.quests || {}).find(Boolean);
    if (activeQuest) {
      text(questInfo, `${activeQuest.name || activeQuest.id} — ${activeQuest.status}`);
      if (questInfo) questInfo.dataset.questId = activeQuest.id;
    } else {
      text(questInfo, 'No active quest');
      if (questInfo) delete questInfo.dataset.questId;
    }

    const mapScreen = find(this.root, ['#mapScreen', '[data-screen="map"]']);
    if (mapScreen) {
      mapScreen.dataset.plushboundLive = 'true';
      mapScreen.dataset.plushboundMapId = mapId;
    }
    return snapshot;
  }

  #handleClick(event) {
    const target = event?.target?.closest?.('[data-plushbound-action]');
    if (!target || !this.bridge) return;
    const action = target.dataset.plushboundAction;
    try {
      if (action === 'interact' && target.dataset.eventId) this.bridge.interact(target.dataset.eventId);
      else if (action === 'shop' && target.dataset.shopId) this.bridge.openShop(target.dataset.shopId);
      else if (action === 'map' && target.dataset.mapId) this.bridge.enterMap(target.dataset.mapId, Number(target.dataset.x || 0), Number(target.dataset.y || 0), Number(target.dataset.direction || 2));
      else if (action === 'touch') this.bridge.triggerAt(Number(target.dataset.x || 0), Number(target.dataset.y || 0), target.dataset.trigger || 'touch');
    } catch (error) {
      this.scope.dispatchEvent?.(new CustomEvent('plushbound-shell-action-error', { detail: { action, message: String(error?.message || error) } }));
    }
  }
}

if (typeof window !== 'undefined' && window.document) {
  const start = () => {
    const bridge = window.PlushboundGameShell;
    if (!bridge) return;
    if (!window.PlushboundGameDomAdapter) window.PlushboundGameDomAdapter = new GameDomAdapter({ scope: window, bridge }).attach();
  };
  window.addEventListener('plushbound-shell-update', start, { once: true });
  start();
}
