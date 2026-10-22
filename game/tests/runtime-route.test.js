import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { GameState } from '../../engine/src/core/GameState.js';
import { MapRuntime } from '../../engine/src/maps/MapRuntime.js';
import { EventInterpreter, EventCommandRegistry, registerCoreEventCommands } from '../../engine/src/events/EventInterpreter.js';

const runtimeData = JSON.parse(readFileSync(new URL('../runtime/elyndor-route-one.maps.json', import.meta.url), 'utf8'));
const contract = JSON.parse(readFileSync(new URL('../runtime/elyndor-runtime-contract.json', import.meta.url), 'utf8'));

function setup() {
  const state = new GameState();
  const maps = new MapRuntime({ state });
  for (const map of runtimeData.maps) maps.register(map);
  maps.load('elyndor-sunny-plains', 12, 10, 2);
  const messages = [];
  const hooks = [];
  const shops = [];
  const registry = registerCoreEventCommands(new EventCommandRegistry(), {
    ui: {
      message: (text, options) => messages.push({ text, options }),
      shop: id => { shops.push(id); return { opened: id }; }
    },
    map: { transfer: (...args) => maps.transfer(...args) }
  });
  const interpreter = new EventInterpreter({ commands: registry, state, logger: { error() {} } });
  const context = {
    hooks: { emit: (name, payload) => hooks.push({ name, payload }) }
  };
  const run = (event, limit = 30) => {
    interpreter.start(event.commands || [], { ...context, mapId: maps.current.id, eventId: event.id });
    for (let i = 0; i < limit && interpreter.running; i += 1) interpreter.update(0);
    assert.equal(interpreter.running, false, `Event ${event.id} should finish`);
  };
  return { state, maps, messages, hooks, shops, run };
}

test('runtime package stays pinned to the frozen engine and exposes all three maps', () => {
  assert.equal(runtimeData.engineBaseline, contract.engineBaseline);
  assert.equal(runtimeData.maps.length, 3);
  assert.deepEqual(runtimeData.maps.map(map => map.id), [
    'elyndor-sunny-plains',
    'elyndor-sunthread-crossing',
    'elyndor-menders-rest'
  ]);
});

test('quest-gated eastern road resolves locked then unlocked event pages', () => {
  const { state, maps } = setup();
  const locked = maps.eventsAt(31, 10)[0];
  assert.equal(locked.id, 'sunny-plains-to-crossing');
  assert.match(locked.commands[0].parameters[0], /Lio asked/);

  state.setSw('quest:a-thread-begins:complete', true);
  const unlocked = maps.eventsAt(31, 10)[0];
  assert.equal(unlocked.commands[0].code, 'TRANSFER');
  assert.deepEqual(unlocked.commands[0].parameters, ['elyndor-sunthread-crossing', 2, 12, 6]);
});

test('transfer events execute through the frozen EventInterpreter and MapRuntime', () => {
  const { state, maps, run } = setup();
  state.setSw('quest:a-thread-begins:complete', true);
  run(maps.eventsAt(31, 10)[0]);
  assert.equal(maps.current.id, 'elyndor-sunthread-crossing');
  assert.deepEqual(state.map, { id: 'elyndor-sunthread-crossing', x: 2, y: 12, direction: 6, vehicle: null });

  run(maps.eventsAt(0, 12)[0]);
  assert.equal(maps.current.id, 'elyndor-sunny-plains');
  assert.equal(state.map.x, 29);
  assert.equal(state.map.y, 10);
});

test('tutorial chest self-switch prevents duplicate reward hook', () => {
  const { state, maps, hooks, run } = setup();
  const first = maps.eventsAt(25, 13)[0];
  run(first);
  assert.equal(state.selfSw('elyndor-sunny-plains', 'tutorial-chest', 'A'), true);
  assert.equal(hooks.filter(h => h.name === 'inventory.give').length, 1);

  const reopened = maps.eventsAt(25, 13)[0];
  assert.match(reopened.commands[0].parameters[0], /empty/);
  run(reopened);
  assert.equal(hooks.filter(h => h.name === 'inventory.give').length, 1);
});

test('anchor event changes to repaired page after quest interaction', () => {
  const { state, maps, hooks, run } = setup();
  maps.load('elyndor-sunthread-crossing', 12, 14, 2);
  state.setSw('quest:threads-out-of-tune:active', true);

  const anchor = maps.eventsAt(13, 14)[0];
  assert.equal(anchor.id, 'anchor-west');
  run(anchor);
  assert.equal(state.selfSw('elyndor-sunthread-crossing', 'anchor-west', 'A'), true);
  assert.ok(hooks.some(h => h.name === 'quest.objective' && h.payload.objectiveId === 'inspect-west-anchor'));

  const repaired = maps.eventsAt(13, 14)[0];
  assert.equal(repaired.assetId, 'environment/elyndor/thread-anchor-stable');
  assert.match(repaired.commands[0].parameters[0], /stable/);
});

test('Menders Rest shop and Waystitch pages resolve from progression switches', () => {
  const { state, maps, shops, hooks, run } = setup();
  maps.load('elyndor-menders-rest', 10, 7, 2);

  run(maps.eventsAt(11, 7)[0]);
  assert.deepEqual(shops, ['menders-rest-provisions']);

  const lockedWaystitch = maps.eventsAt(22, 5)[0];
  assert.match(lockedWaystitch.commands[0].parameters[0], /quiet/);
  state.setSw('waystitch:menders-rest:unlocked', true);
  const unlockedWaystitch = maps.eventsAt(22, 5)[0];
  run(unlockedWaystitch);
  assert.ok(hooks.some(h => h.name === 'waystitch.activate' && h.payload.waystitchId === 'waystitch-menders-rest'));
});

test('runtime events use only declared triggers, switches and core interpreter commands', () => {
  const allowedCodes = new Set(['WAIT','SWITCH','VARIABLE','VARIABLE_OP','SELF_SWITCH','CONDITIONAL','JUMP','EXIT_EVENT','COMMON_EVENT','MESSAGE','CHOICE','INPUT_NUMBER','TRANSFER','MOVE_ROUTE','RELOCATE_EVENT','ERASE_EVENT','TRANSPARENCY','FADE_SCREEN','TINT_SCREEN','FLASH_SCREEN','SHAKE_SCREEN','BGM','BGM_STOP','BGM_FADE','BGS','BGS_STOP','BGS_FADE','ME','SE','BATTLE','SHOP','SCRIPT_HOOK']);
  const switchSet = new Set(contract.switches);
  const triggerSet = new Set(contract.eventTriggers);
  for (const map of runtimeData.maps) {
    for (const event of map.events) {
      for (const page of event.pages || []) {
        assert.ok(triggerSet.has(page.trigger || 'action'), `Undeclared trigger on ${map.id}/${event.id}`);
        if (page.conditions?.switchId) assert.ok(switchSet.has(page.conditions.switchId), `Undeclared switch ${page.conditions.switchId}`);
        for (const command of page.commands || []) {
          assert.ok(allowedCodes.has(command.code), `Unsupported command ${command.code}`);
          if (command.code === 'SWITCH') assert.ok(switchSet.has(command.parameters[0]), `Undeclared switch ${command.parameters[0]}`);
        }
      }
    }
  }
});
