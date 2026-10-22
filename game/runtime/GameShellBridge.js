function clone(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export class GameShellBridge {
  constructor({ scope = globalThis } = {}) {
    this.scope = scope;
    this.game = null;
    this.listeners = [];
    this.ready = false;
  }

  attach() {
    if (this.ready) return this;
    this.ready = true;
    const onReady = () => this.bind(this.scope.PlushboundGame);
    this.scope.addEventListener?.('plushbound-game-ready', onReady);
    this.listeners.push(['plushbound-game-ready', onReady]);
    if (this.scope.PlushboundGame) this.bind(this.scope.PlushboundGame);
    return this;
  }

  detach() {
    for (const [type, listener] of this.listeners) this.scope.removeEventListener?.(type, listener);
    this.listeners = [];
    this.ready = false;
    this.game = null;
  }

  bind(game) {
    if (!game?.session) throw new Error('GameShellBridge requires a PlushboundGame runtime with a session');
    this.game = game;
    this.publish('ready');
    return this.snapshot();
  }

  snapshot() { return this.game?.session?.snapshot?.() ?? null; }

  interact(eventId) {
    const result = this.#requireSession().interact(eventId);
    this.publish('interaction', { eventId, result });
    return result;
  }

  triggerAt(x, y, trigger = 'touch') {
    const result = this.#requireSession().triggerAt(x, y, trigger);
    this.publish('trigger', { x, y, trigger, result });
    return result;
  }

  enterMap(mapId, x = 0, y = 0, direction = 2) {
    const result = this.#requireSession().enter(mapId, x, y, direction);
    this.publish('map', { mapId, x, y, direction });
    return result;
  }

  advanceDialogue() {
    const current = this.#requireSession().advanceDialogue();
    this.publish('dialogue', { current });
    return current;
  }

  recordBattle(enemyTags = []) {
    const result = this.#requireSession().recordBattle(enemyTags);
    this.publish('battle', { enemyTags: clone(enemyTags) });
    return result;
  }

  recordTalk(npcId) {
    const result = this.#requireSession().recordTalk(npcId);
    this.publish('talk', { npcId });
    return result;
  }

  openShop(shopId) {
    const shop = this.#requireSession().openShop(shopId);
    this.publish('shop', { shop });
    return clone(shop);
  }

  buyItem(itemId, count = 1) {
    const purchase = this.#requireSession().buyItem(itemId, count);
    this.publish('purchase', { purchase });
    return clone(purchase);
  }

  closeShop() {
    const result = this.#requireSession().closeShop();
    this.publish('shop-close');
    return result;
  }

  quest(questId) { return this.game?.session?.game?.questState?.(questId) ?? null; }

  publish(reason, detail = {}) {
    const snapshot = this.snapshot();
    this.scope.dispatchEvent?.(new CustomEvent('plushbound-shell-update', {
      detail: { reason, snapshot: clone(snapshot), ...clone(detail) }
    }));
    return snapshot;
  }

  #requireSession() {
    if (!this.game?.session) throw new Error('Plushbound game session is not ready');
    return this.game.session;
  }
}

export function installGameShellBridge({ scope = globalThis } = {}) {
  const bridge = new GameShellBridge({ scope }).attach();
  scope.PlushboundShell = bridge;
  return bridge;
}

if (typeof window !== 'undefined' && window.document) installGameShellBridge({ scope: window });
