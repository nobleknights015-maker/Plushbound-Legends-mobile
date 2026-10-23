import test from 'node:test';
import assert from 'node:assert/strict';
import { EventCommandRegistry } from '../../engine/src/events/EventInterpreter.js';
import { MVEventCommandBridge, MVEventCompatibilityError } from '../runtime/MVEventCommandBridge.js';

function makeState() {
  const switches = new Map(), variables = new Map(), selfSwitches = new Map();
  return {
    switches, variables, selfSwitches, party: [], map: { id: 'map-a', x: 1, y: 2, direction: 2 }, system: { saveCount: 0 },
    sw(id) { return !!switches.get(String(id)); }, setSw(id, value) { switches.set(String(id), !!value); },
    variable(id) { return variables.get(String(id)) ?? 0; }, setVariable(id, value) { variables.set(String(id), value); },
    selfSw(m, e, k) { return !!selfSwitches.get(`${m}:${e}:${k}`); }, setSelfSw(m, e, k, value) { selfSwitches.set(`${m}:${e}:${k}`, !!value); },
    inventory: { items: new Map(), weapons: new Map(), armor: new Map() },
    gain(kind, id, amount) { const bag = this.inventory[kind], key = String(id), next = Math.max(0, (bag.get(key) || 0) + Number(amount || 0)); if (next) bag.set(key, next); else bag.delete(key); return next; },
    count(kind, id) { return this.inventory[kind].get(String(id)) || 0; }
  };
}

function fixture() {
  const state = makeState(), registry = new EventCommandRegistry(), calls = [];
  registry.register('MESSAGE', ({ parameters }) => { calls.push(['MESSAGE', parameters]); return { yield: true }; });
  registry.register('CHOICE', ({ parameters, context }) => { calls.push(['CHOICE', parameters]); context.lastChoice = 1; return { yield: true }; });
  registry.register('INPUT_NUMBER', ({ parameters, state: s }) => { s.setVariable(parameters[0], 7); return { yield: true }; });
  registry.register('EXIT_EVENT', () => ({ stop: true }));
  registry.register('PLUGIN_COMMAND', ({ parameters }) => { calls.push(['PLUGIN_COMMAND', parameters]); });
  const session = { registry, commonEvents: {}, game: { hooks: {} }, maps: { maps: new Map([['map-a', { id: 'map-a' }], ['map-b', { id: 'map-b' }]]) }, enter(mapId, x, y, direction) { state.map = { id: mapId, x, y, direction }; } };
  const scope = {
    $dataItems: [null, { id: 1, _plushboundId: 'potion', _plushboundKind: 'items' }],
    $dataWeapons: [null, { id: 1, _plushboundId: 'sword', _plushboundKind: 'weapons' }],
    $dataArmors: [null, { id: 1, _plushboundId: 'coat', _plushboundKind: 'armors' }],
    $dataActors: [null, { id: 1, _plushboundId: 'hero', _plushboundKind: 'actors' }],
    $dataCommonEvents: [null],
    Input: { isPressed: key => key === 'ok' }
  };
  scope.$gameSwitches = { value: id => state.sw(id), setValue: (id, value) => state.setSw(id, value) };
  scope.$gameVariables = { value: id => state.variable(id), setValue: (id, value) => state.setVariable(id, value) };
  scope.$gameSelfSwitches = { value: ([m, e, k]) => state.selfSw(m === 1 ? 'map-a' : m, e, k), setValue: ([m, e, k], value) => state.setSelfSw(m === 1 ? 'map-a' : m, e, k, value) };
  scope.$gameParty = {
    gold: () => Number(state.variable('gold')) || 0,
    gainGold: value => state.setVariable('gold', Math.max(0, (Number(state.variable('gold')) || 0) + Number(value || 0))),
    gainItem(item, value) { const kind = item._plushboundKind === 'armors' ? 'armor' : item._plushboundKind; state.gain(kind, item._plushboundId, value); },
    hasItem(item) { if (!item) return false; const kind = item._plushboundKind === 'armors' ? 'armor' : item._plushboundKind; return state.count(kind, item._plushboundId) > 0; }
  };
  function Interpreter() { this._params = []; this._mapId = 1; this._eventId = 0; this._indent = 0; }
  const mvPlugins = { Interpreter, mvMapId: id => id === 'map-a' ? 1 : id === 'map-b' ? 2 : 0, plushboundMapId: id => Number(id) === 2 ? 'map-b' : 'map-a', changed() {} };
  const runtime = { state, session, mvPlugins, mvDatabase: { sourceId() { return null; } }, saveCalls: [], saveNow(reason) { this.saveCalls.push(reason); } };
  const bridge = new MVEventCommandBridge({ scope, runtime, mvPlugins }).install();
  return { bridge, runtime, session, state, scope, calls, mvPlugins };
}

function frame(list = [], index = 0, context = { mapId: 'map-a', eventId: 4 }) {
  return { interpreter: { list, index, call(next, nextContext) { this.called = { list: next, context: nextContext }; } }, context, state: null, parameters: [], indent: 0, command: {} };
}

test('registers numeric MV codes and Game_Interpreter command methods without touching engine core', () => {
  const { bridge, session, mvPlugins } = fixture();
  for (const code of [101, 121, 122, 201, 352, 355, 356]) assert.equal(session.registry.has(code), true);
  assert.equal(typeof mvPlugins.Interpreter.prototype.command121, 'function');
  assert.equal(bridge.status(241).status, 'deferred');
  assert.match(bridge.status(241).reason, /AudioManager/);
  assert.throws(() => bridge.execute(241, {}), MVEventCompatibilityError);
});

test('show text consumes 401 continuation lines into the native message surface', () => {
  const { bridge, calls } = fixture();
  const list = [{ code: 401, indent: 0, parameters: ['Hello'] }, { code: 401, indent: 0, parameters: ['World'] }, { code: 121, indent: 0, parameters: [1, 1, 0] }];
  const f = frame(list, 0); f.parameters = ['Face', 2, 1, 0]; f.command = { code: 101 };
  bridge.execute(101, f);
  assert.equal(f.interpreter.index, 2);
  assert.equal(calls[0][0], 'MESSAGE');
  assert.equal(calls[0][1][0], 'Hello\nWorld');
  assert.equal(calls[0][1][1].faceName, 'Face');
});

test('control switches, variables, self switches, gold and inventory follow MV parameter shapes', () => {
  const { bridge, state } = fixture();
  bridge.execute(121, { parameters: [2, 4, 0] });
  assert.equal(state.sw(2), true); assert.equal(state.sw(4), true);
  bridge.execute(122, { parameters: [1, 1, 0, 0, 5] });
  bridge.execute(122, { parameters: [1, 1, 1, 0, 3] });
  assert.equal(state.variable(1), 8);
  bridge.execute(123, { context: { mapId: 'map-a', eventId: 6 }, parameters: ['A', 0] });
  assert.equal(state.selfSw('map-a', 6, 'A'), true);
  bridge.execute(125, { parameters: [0, 0, 250] });
  assert.equal(state.variable('gold'), 250);
  bridge.execute(126, { parameters: [1, 0, 0, 2] });
  bridge.execute(127, { parameters: [1, 0, 0, 1, false] });
  bridge.execute(128, { parameters: [1, 0, 0, 1, false] });
  assert.equal(state.count('items', 'potion'), 2);
  assert.equal(state.count('weapons', 'sword'), 1);
  assert.equal(state.count('armor', 'coat'), 1);
});

test('conditional, choice, loop and label control flow return interpreter jump targets', () => {
  const { bridge, state } = fixture();
  state.setSw(1, false);
  const conditionalList = [{ code: 121, indent: 1, parameters: [2, 2, 0] }, { code: 0, indent: 0, parameters: [] }];
  const conditionalFrame = frame(conditionalList, 0); conditionalFrame.indent = 0; conditionalFrame.parameters = [0, 1, 0];
  assert.deepEqual(bridge.execute(111, conditionalFrame), { jumpTo: 1 });
  const labelList = [{ code: 118, indent: 0, parameters: ['Target'] }, { code: 121, indent: 0, parameters: [1, 1, 0] }];
  assert.deepEqual(bridge.execute(119, { ...frame(labelList, 0), parameters: ['Target'] }), { jumpTo: 1 });
  const loopList = [{ code: 112, indent: 0, parameters: [] }, { code: 121, indent: 1, parameters: [1, 1, 0] }, { code: 413, indent: 0, parameters: [] }];
  assert.deepEqual(bridge.execute(113, { ...frame(loopList, 1), indent: 0 }), { jumpTo: 3 });
  assert.deepEqual(bridge.execute(413, { ...frame(loopList, 3), indent: 0 }), { jumpTo: 0 });
});

test('party, transfer, save, script continuation and plugin command have direct compatibility paths', () => {
  const { bridge, runtime, state, scope, calls } = fixture();
  bridge.execute(129, { parameters: [1, 0, true] });
  assert.deepEqual(state.party, ['hero']);
  bridge.execute(201, { parameters: [0, 2, 5, 6, 4, 0] });
  assert.deepEqual(state.map, { id: 'map-b', x: 5, y: 6, direction: 4 });
  scope.$gameSystem = { onBeforeSave() { state.system.saveCount++; } };
  bridge.execute(352, { parameters: [] });
  assert.deepEqual(runtime.saveCalls, ['mv-event-command-352']);
  const scriptFrame = frame([{ code: 655, indent: 0, parameters: ['this.scriptValue += 2;'] }], 0); scriptFrame.parameters = ['this.scriptValue = 3;'];
  bridge.execute(355, scriptFrame);
  assert.equal(scope.scriptValue, 5);
  bridge.execute(356, { parameters: ['PING one two'], context: { mapId: 'map-a', eventId: 1 } });
  assert.deepEqual(calls.at(-1), ['PLUGIN_COMMAND', ['PING one two']]);
});
