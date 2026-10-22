import { GameState } from '../../engine/src/core/GameState.js';
import { MapRuntime } from '../../engine/src/maps/MapRuntime.js';
import { EventInterpreter, EventCommandRegistry, registerCoreEventCommands } from '../../engine/src/events/EventInterpreter.js';
import { GameContentRuntime } from './GameContentRuntime.js';

function clone(value) { return value == null ? value : structuredClone(value); }

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
    this.shopHistory = [];
    this.game = new GameContentRuntime({ state, contentPackages });
    this.maps = new MapRuntime({ state, logger });
    for (const map of mapPackage.maps) this.maps.register(map);

    this.ui = {
      ...ui,
      message: (text, meta = {}) => {
        this.messages.push({ text, ...clone(meta) });
        return ui.message?.(text, meta);
      },
      shop: shopId => {
        const shop = this.game.shop(shopId);
        if (!shop) throw new Error(`Unknown shop ${shopId}`);
        this.shopHistory.push(String(shopId));
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
    return this.snapshot();
  }

  event(eventId) {
    if (!this.maps.current) return null;
    const raw = (this.maps.current.events || []).find(entry => String(entry.id) === String(eventId));
    return raw ? this.maps.resolveEvent(raw) : null;
  }

  interact(eventId) {
    const event = this.event(eventId);
    if (!event) throw new Error(`Unknown or inactive event ${eventId}`);
    if ((event.trigger || 'action') !== 'action') return false;
    this.#runEvent(event);
    if (event.assetId) return { handled: true, eventId: event.id, assetId: event.assetId };
    return { handled: true, eventId: event.id };
  }

  triggerAt(x, y, trigger = 'touch') {
    const events = this.maps.triggerEvents(trigger, x, y);
    for (const event of events) this.#runEvent(event);
    return events.map(event => event.id);
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
      gold: Number(this.state.variable('gold')) || 0,
      quests: clone(Object.fromEntries(this.state.quests)),
      inventory: {
        items: clone(Object.fromEntries(this.state.inventory.items)),
        weapons: clone(Object.fromEntries(this.state.inventory.weapons)),
        armor: clone(Object.fromEntries(this.state.inventory.armor))
      },
      messages: clone(this.messages),
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
