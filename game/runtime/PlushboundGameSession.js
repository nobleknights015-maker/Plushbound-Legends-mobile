import { GameState } from '../../engine/src/core/GameState.js';
import { MapRuntime } from '../../engine/src/maps/MapRuntime.js';
import { EventInterpreter, EventCommandRegistry, registerCoreEventCommands } from '../../engine/src/events/EventInterpreter.js';
import { GameContentRuntime } from './GameContentRuntime.js';

function clone(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function titleCase(value = '') {
  return String(value)
    .replace(/^elyndor-/, '')
    .replace(/^waystitch-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function actionDescriptor(raw, resolved) {
  const commands = resolved?.commands || [];
  const message = commands.find(command => command.code === 'MESSAGE');
  const shop = commands.find(command => command.code === 'SHOP');
  const transfer = commands.find(command => command.code === 'TRANSFER');
  const hook = commands.find(command => command.code === 'SCRIPT_HOOK');
  const speaker = message?.parameters?.[1]?.speaker;
  const hookName = hook?.parameters?.[0];
  let kind = resolved?.trigger === 'touch' ? 'travel' : 'interact';
  if (shop) kind = 'shop';
  else if (transfer) kind = 'travel';
  else if (hookName === 'waystitch.activate') kind = 'waystitch';
  else if (String(raw.id).includes('chest')) kind = 'chest';
  else if (String(raw.id).includes('anchor')) kind = 'anchor';

  let label = speaker ? `Talk to ${speaker}` : titleCase(raw.id);
  if (kind === 'shop') label = speaker ? `Shop with ${speaker}` : 'Open Shop';
  else if (kind === 'travel') label = transfer ? `Travel to ${titleCase(transfer.parameters?.[0])}` : titleCase(raw.id);
  else if (kind === 'waystitch') label = 'Activate Waystitch';
  else if (kind === 'chest') label = 'Check Chest';
  else if (kind === 'anchor') label = `Inspect ${titleCase(raw.id)}`;

  return {
    eventId: String(raw.id),
    label,
    kind,
    trigger: resolved?.trigger || 'action',
    x: Number(raw.x) || 0,
    y: Number(raw.y) || 0,
    assetId: resolved?.assetId || raw.assetId || null,
    shopId: shop?.parameters?.[0] || null,
    destinationMapId: transfer?.parameters?.[0] || null
  };
}

export class PlushboundGameSession {
  constructor({
    state = new GameState(),
    mapPackage,
    contentPackages = [],
    ui = {},
    audio = {},
    battle = {},
    screen = {},
    movement = {},
    player = {},
    logger = console
  } = {}) {
    if (!mapPackage?.maps?.length) throw new Error('PlushboundGameSession requires a runtime map package');
    this.state = state;
    this.messages = [];
    this.dialogueQueue = [];
    this.shopHistory = [];
    this.activeShop = null;
    this.game = new GameContentRuntime({ state, contentPackages });
    this.maps = new MapRuntime({ state, logger });
    for (const map of mapPackage.maps) this.maps.register(map);

    this.externalUi = ui;
    this.ui = {
      ...ui,
      message: (text, meta = {}) => {
        const message = { text, ...clone(meta) };
        this.messages.push(message);
        this.dialogueQueue.push(message);
        return ui.message?.(text, meta);
      },
      shop: shopId => {
        const shop = this.openShop(shopId);
        return ui.shop?.(shop, this) ?? { opened: true, shop };
      }
    };

    this.registry = registerCoreEventCommands(new EventCommandRegistry(), {
      ui: this.ui,
      audio,
      battle,
      screen,
      movement,
      player,
      map: { transfer: (...args) => this.maps.transfer(...args) }
    });
    this.interpreter = new EventInterpreter({ commands: this.registry, state, logger });
  }

  enter(mapId, x = 0, y = 0, direction = 2) {
    this.maps.load(mapId, x, y, direction);
    this.activeShop = null;
    this.dialogueQueue = [];
    return this.snapshot();
  }

  event(eventId) {
    if (!this.maps.current) return null;
    const raw = (this.maps.current.events || []).find(entry => String(entry.id) === String(eventId));
    return raw ? this.maps.resolveEvent(raw) : null;
  }

  actions() {
    if (!this.maps.current) return [];
    const result = [];
    for (const raw of this.maps.current.events || []) {
      const resolved = this.maps.resolveEvent(raw);
      if (!resolved) continue;
      result.push(actionDescriptor(raw, resolved));
    }
    return clone(result);
  }

  interact(eventId) {
    const event = this.event(eventId);
    if (!event) throw new Error(`Unknown or inactive event ${eventId}`);
    if ((event.trigger || 'action') !== 'action') return false;
    this.dialogueQueue = [];
    this.#runEvent(event);
    if (event.assetId) return { handled: true, eventId: event.id, assetId: event.assetId };
    return { handled: true, eventId: event.id };
  }

  triggerAt(x, y, trigger = 'touch') {
    const events = this.maps.triggerEvents(trigger, x, y);
    this.dialogueQueue = [];
    for (const event of events) this.#runEvent(event);
    return events.map(event => event.id);
  }

  advanceDialogue() {
    if (this.dialogueQueue.length) this.dialogueQueue.shift();
    return clone(this.dialogueQueue[0] || null);
  }

  openShop(shopId) {
    const shop = this.game.shop(shopId);
    if (!shop) throw new Error(`Unknown shop ${shopId}`);
    if (this.activeShop?.id !== shop.id) this.shopHistory.push(String(shopId));
    this.activeShop = clone(shop);
    return clone(shop);
  }

  closeShop() {
    this.activeShop = null;
    return this.snapshot();
  }

  recordBattle(enemyTags = []) {
    this.game.recordBattle(enemyTags);
    return this.snapshot();
  }

  recordTalk(npcId) {
    this.game.recordTalk(npcId);
    return this.snapshot();
  }

  snapshot() {
    return {
      map: clone(this.state.map),
      currentMap: this.maps.current?.id || null,
      mapName: this.maps.current?.name || this.maps.current?.id || null,
      actions: this.actions(),
      gold: Number(this.state.variable('gold')) || 0,
      quests: clone(Object.fromEntries(this.state.quests)),
      inventory: {
        items: clone(Object.fromEntries(this.state.inventory.items)),
        weapons: clone(Object.fromEntries(this.state.inventory.weapons)),
        armor: clone(Object.fromEntries(this.state.inventory.armor))
      },
      messages: clone(this.messages),
      dialogue: {
        current: clone(this.dialogueQueue[0] || null),
        remaining: Math.max(0, this.dialogueQueue.length - 1),
        length: this.dialogueQueue.length
      },
      activeShop: clone(this.activeShop),
      shopHistory: clone(this.shopHistory)
    };
  }

  #runEvent(event) {
    this.interpreter.start(event.commands || [], {
      mapId: this.maps.current?.id,
      eventId: event.id,
      hooks: this.game.hooks
    });
    let safety = 100;
    while (this.interpreter.running && safety-- > 0) this.interpreter.update(0);
    if (safety <= 0) throw new Error(`Game event did not settle: ${event.id}`);
  }
}
