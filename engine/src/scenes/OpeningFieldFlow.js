import { MapRuntime } from '../maps/MapRuntime.js';
import { EventCommandRegistry, EventInterpreter, registerCoreEventCommands } from '../events/EventInterpreter.js';

export const ELYNDOR_OPENING_MAP = Object.freeze({
  id: 'elyndor-start',
  width: 14,
  height: 12,
  layers: { ground: Array(14 * 12).fill(1) },
  blocked: [],
  events: [
    {
      id: 'lio', x: 7, y: 8,
      pages: [
        {
          trigger: 'action',
          commands: [
            { code: 'MESSAGE', parameters: ['The threads are restless today. Stay close to your Guardian.', { speaker: 'Lio' }] },
            { code: 'SCRIPT_HOOK', parameters: ['lio-first-meeting', { questId: 'a-thread-begins' }] },
            { code: 'SWITCH', parameters: ['elyndor-lio-met', true] }
          ]
        },
        {
          conditions: { switchId: 'elyndor-lio-met', switchValue: true },
          trigger: 'action',
          commands: [
            { code: 'MESSAGE', parameters: ['Follow the old stitching stones east. The disturbance began there.', { speaker: 'Lio' }] }
          ]
        }
      ]
    },
    {
      id: 'starter-chest', x: 9, y: 8,
      pages: [
        {
          trigger: 'action',
          commands: [
            { code: 'MESSAGE', parameters: ['You found a Threadmend Tonic.', { speaker: null }] },
            { code: 'SCRIPT_HOOK', parameters: ['opening-chest-reward', { itemId: 'threadmend-tonic' }] },
            { code: 'SELF_SWITCH', parameters: ['A', true] }
          ]
        },
        {
          conditions: { selfSwitch: 'A', selfSwitchValue: true },
          trigger: 'action',
          commands: [
            { code: 'MESSAGE', parameters: ['The chest is empty.', { speaker: null }] }
          ]
        }
      ]
    }
  ]
});

function clone(value) { return value == null ? value : structuredClone(value); }

export class OpeningFieldFlow {
  constructor({ state, ui = {}, audio = {}, mapData = ELYNDOR_OPENING_MAP } = {}) {
    if (!state) throw new Error('OpeningFieldFlow requires state');
    this.state = state;
    this.messages = [];
    this.ui = {
      ...ui,
      message: (text, meta = {}) => {
        this.messages.push({ text, ...clone(meta) });
        return ui.message?.(text, meta);
      }
    };
    this.maps = new MapRuntime({ state });
    this.maps.register(mapData);
    this.registry = registerCoreEventCommands(new EventCommandRegistry(), { ui: this.ui, audio, map: this.maps });
    this.interpreter = new EventInterpreter({ commands: this.registry, state });
    this.hooks = {
      emit: (name, payload) => this.#handleHook(name, payload)
    };
  }

  enter() {
    const mapId = this.state.map.id || 'elyndor-start';
    this.maps.load(mapId, this.state.map.x, this.state.map.y, this.state.map.direction);
    return this.snapshot();
  }

  interact(eventId) {
    if (!this.maps.current) this.enter();
    const event = (this.maps.current.events || []).find(candidate => String(candidate.id) === String(eventId));
    if (!event) throw new Error(`Unknown opening event: ${eventId}`);
    const resolved = this.maps.resolveEvent(event);
    if (!resolved || (resolved.trigger || 'action') !== 'action') return false;
    this.interpreter.start(resolved.commands || [], {
      mapId: this.maps.current.id,
      eventId: event.id,
      hooks: this.hooks
    });
    let safety = 100;
    while (this.interpreter.running && safety-- > 0) this.interpreter.update(0);
    if (safety <= 0) throw new Error(`Opening event did not settle: ${eventId}`);
    return true;
  }

  snapshot() {
    return {
      map: clone(this.state.map),
      quest: clone(this.state.quests.get('a-thread-begins') || null),
      lioMet: this.state.sw('elyndor-lio-met'),
      chestOpened: this.state.selfSw('elyndor-start', 'starter-chest', 'A'),
      tonicCount: this.state.count('items', 'threadmend-tonic'),
      messages: clone(this.messages)
    };
  }

  #handleHook(name) {
    if (name === 'lio-first-meeting') {
      const quest = this.state.quests.get('a-thread-begins') || { id: 'a-thread-begins', status: 'active', stage: 0 };
      this.state.quests.set('a-thread-begins', { ...quest, status: 'active', stage: Math.max(1, Number(quest.stage) || 0) });
      return;
    }
    if (name === 'opening-chest-reward') {
      if (!this.state.selfSw('elyndor-start', 'starter-chest', 'A')) {
        this.state.gain('items', 'threadmend-tonic', 1);
      }
    }
  }
}
