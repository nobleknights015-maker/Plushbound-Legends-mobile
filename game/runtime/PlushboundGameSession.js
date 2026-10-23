import { GameState } from '../../engine/src/core/GameState.js';
import { MapRuntime } from '../../engine/src/maps/MapRuntime.js';
import { EncounterManager } from '../../engine/src/encounters/EncounterManager.js';
import { EventInterpreter, EventCommandRegistry, registerCoreEventCommands } from '../../engine/src/events/EventInterpreter.js';
import { GameContentRuntime } from './GameContentRuntime.js';

const SAVE_SCHEMA_VERSION = 1;

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
    eventId: String(raw.id), label, kind,
    trigger: resolved?.trigger || 'action',
    x: Number(raw.x) || 0, y: Number(raw.y) || 0,
    assetId: resolved?.assetId || raw.assetId || null,
    shopId: shop?.parameters?.[0] || null,
    destinationMapId: transfer?.parameters?.[0] || null
  };
}

export class PlushboundGameSession {
  constructor({ state = new GameState(), mapPackage, contentPackages = [], ui = {}, audio = {}, battle = {}, screen = {}, movement = {}, player = {}, encounter = {}, logger = console } = {}) {
    if (!mapPackage?.maps?.length) throw new Error('PlushboundGameSession requires a runtime map package');
    this.state = state;
    this.messages = [];
    this.dialogueQueue = [];
    this.shopHistory = [];
    this.activeShop = null;
    this.lastEncounter = null;
    this.game = new GameContentRuntime({ state, contentPackages });
    this.maps = new MapRuntime({ state, logger });
    for (const map of mapPackage.maps) this.maps.register(map);

    this.encounterRate = Math.max(0, Number(encounter.rate ?? 1) || 0);
    this.encounters = new EncounterManager({ state, rng: encounter.rng || Math.random });
    for (const tableId of this.game.encounterTableIds()) this.encounters.registerTable(tableId, this.game.encounterTableEntries(tableId));
    this.encounters.resetThreshold(encounter.base ?? 20, encounter.variance ?? 10);

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
      ui: this.ui, audio, battle, screen, movement, player,
      map: { transfer: (...args) => this.maps.transfer(...args) }
    });
    this.interpreter = new EventInterpreter({ commands: this.registry, state, logger });
  }

  enter(mapId, x = 0, y = 0, direction = 2) {
    this.maps.load(mapId, x, y, direction);
    this.#clearTransientUi();
    this.lastEncounter = null;
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
      if (resolved) result.push(actionDescriptor(raw, resolved));
    }
    return clone(result);
  }

  interact(eventId) {
    const event = this.event(eventId);
    if (!event) throw new Error(`Unknown or inactive event ${eventId}`);
    if ((event.trigger || 'action') !== 'action') return false;
    this.dialogueQueue = [];
    this.#runEvent(event);
    return event.assetId ? { handled: true, eventId: event.id, assetId: event.assetId } : { handled: true, eventId: event.id };
  }

  triggerAt(x, y, trigger = 'touch') {
    const events = this.maps.triggerEvents(trigger, x, y);
    this.dialogueQueue = [];
    for (const event of events) this.#runEvent(event);
    return events.map(event => event.id);
  }

  move(dx, dy, { encounters = true } = {}) {
    const beforeMapId = this.maps.current?.id || null;
    if (!this.maps.move(dx, dy)) return { moved: false, encounter: null, touchEvents: [], snapshot: this.snapshot() };

    const stepped = { mapId: beforeMapId, x: this.state.map.x, y: this.state.map.y };
    const touchEvents = this.triggerAt(stepped.x, stepped.y, 'touch');
    const transferred = this.maps.current?.id !== beforeMapId;
    let rolled = null;

    if (encounters && !transferred) {
      const table = this.maps.current?.encounterTable;
      if (table) {
        const regionId = this.maps.regionAt(this.state.map.x, this.state.map.y);
        const picked = this.encounters.step({ regionId, table, rate: this.encounterRate });
        if (picked) {
          rolled = { ...picked, enemy: this.game.enemyDefinition(picked.enemyId) };
          this.lastEncounter = clone(rolled);
        }
      }
    }

    return { moved: true, transferred, touchEvents, encounter: clone(rolled), snapshot: this.snapshot() };
  }

  encounterPreview({ mapId = this.maps.current?.id, x = this.state.map.x, y = this.state.map.y } = {}) {
    const map = mapId === this.maps.current?.id ? this.maps.current : this.maps.maps.get(String(mapId));
    if (!map?.encounterTable) return { mapId, regionId: 0, tableId: null, entries: [] };
    const regionId = mapId === this.maps.current?.id ? this.maps.regionAt(x, y) : Number(map.regions?.[Number(y) * map.width + Number(x)] || 0);
    const table = this.game.encounterTable(map.encounterTable);
    const entries = (table?.entries || []).filter(entry => !Array.isArray(entry.regions) || !entry.regions.length || entry.regions.map(Number).includes(Number(regionId)));
    return { mapId: map.id, regionId, tableId: map.encounterTable, entries: clone(entries) };
  }

  resolveEncounter(result = 'victory') {
    if (!this.lastEncounter) throw new Error('No encounter is active');
    const normalized = String(result || '').toLowerCase();
    if (!['victory', 'escape', 'defeat'].includes(normalized)) throw new Error(`Unknown encounter result ${result}`);
    const encounter = clone(this.lastEncounter);
    if (normalized === 'victory') this.game.recordBattle(encounter.enemy?.tags || []);
    this.lastEncounter = null;
    return { result: normalized, encounter, snapshot: this.snapshot() };
  }

  serializeSave() {
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      game: 'Plushbound Legends',
      state: this.state.serialize()
    };
  }

  restoreSave(save = {}) {
    const schemaVersion = Number(save.schemaVersion ?? SAVE_SCHEMA_VERSION);
    if (schemaVersion !== SAVE_SCHEMA_VERSION) throw new Error(`Unsupported Plushbound save schema ${schemaVersion}`);
    const rawState = save.state || save.gameState || save;
    this.state.restore(rawState);
    const map = clone(this.state.map);
    if (!map?.id || !this.maps.maps.has(String(map.id))) throw new Error(`Save references unknown map ${map?.id ?? 'null'}`);
    this.maps.load(map.id, Number(map.x) || 0, Number(map.y) || 0, Number(map.direction) || 2);
    this.#clearTransientUi();
    this.lastEncounter = null;
    return this.snapshot();
  }

  advanceDialogue() {
    if (this.dialogueQueue.length) this.dialogueQueue.shift();
    return clone(this.dialogueQueue[0] || null);
  }

  openShop(shopId) {
    const raw = this.game.shop(shopId);
    if (!raw) throw new Error(`Unknown shop ${shopId}`);
    const shop = clone(raw);
    shop.inventory = (shop.inventory || []).map(entry => ({
      ...entry,
      item: this.game.itemDefinition(entry.itemId)
    }));
    if (this.activeShop?.id !== shop.id) this.shopHistory.push(String(shopId));
    this.activeShop = shop;
    return clone(shop);
  }

  buyItem(itemId, count = 1) {
    if (!this.activeShop) throw new Error('No shop is open');
    const entry = (this.activeShop.inventory || []).find(item => String(item.itemId) === String(itemId));
    if (!entry) throw new Error(`Item ${itemId} is not sold here`);
    const quantity = Math.max(1, Number(count) || 1);
    const total = (Number(entry.price) || 0) * quantity;
    const gold = Number(this.state.variable('gold')) || 0;
    if (gold < total) throw new Error('Not enough gold');
    this.state.setVariable('gold', gold - total);
    this.state.gain('items', itemId, quantity);
    return { itemId: String(itemId), count: quantity, spent: total, gold: gold - total };
  }

  closeShop() { this.activeShop = null; return this.snapshot(); }
  recordBattle(enemyTags = []) { this.game.recordBattle(enemyTags); return this.snapshot(); }
  recordTalk(npcId) { this.game.recordTalk(npcId); return this.snapshot(); }

  snapshot() {
    const regionId = this.maps.current ? this.maps.regionAt(this.state.map.x, this.state.map.y) : 0;
    return {
      map: clone(this.state.map),
      currentMap: this.maps.current?.id || null,
      mapName: this.maps.current?.name || this.maps.current?.id || null,
      regionId,
      encounterTable: this.maps.current?.encounterTable || null,
      lastEncounter: clone(this.lastEncounter),
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

  #clearTransientUi() {
    this.activeShop = null;
    this.dialogueQueue = [];
  }

  #runEvent(event) {
    this.interpreter.start(event.commands || [], { mapId: this.maps.current?.id, eventId: event.id, hooks: this.game.hooks });
    let safety = 100;
    while (this.interpreter.running && safety-- > 0) this.interpreter.update(0);
    if (safety <= 0) throw new Error(`Game event did not settle: ${event.id}`);
  }
}