import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/core/GameState.js';
import { DataRegistry } from '../src/data/DataRegistry.js';
import { PartyMenuService } from '../src/ui/PartyMenuService.js';

function setup() {
  const state = new GameState();
  state.party = ['1', '2'];
  state.actors.set('1', { level: 5, skills: ['10'], equipment: {} });
  state.actors.set('2', { level: 3, equipment: {} });
  state.gain('weapons', '20', 1);
  state.gain('armor', '30', 1);
  const data = new DataRegistry();
  data.load('actors', [
    { id: '1', name: 'Traveler', skills: [] },
    { id: '2', name: 'Ally', skills: [] }
  ]);
  data.load('skills', [{ id: '10', name: 'Thread Spark', mpCost: 3 }]);
  data.load('weapons', [{ id: '20', name: 'Needleblade', params: { atk: 4 } }]);
  data.load('armor', [{ id: '30', name: 'Stitch Coat', params: { def: 3 } }]);
  return { state, service: new PartyMenuService({ state, data }) };
}

test('party status and skill menus resolve runtime actor state against database records', () => {
  const { service } = setup();
  const party = service.partyStatus();
  assert.equal(party[0].name, 'Traveler');
  assert.equal(party[0].level, 5);
  assert.equal(service.skills('1')[0].name, 'Thread Spark');
});

test('equipment moves between inventory and actor slots without duplication', () => {
  const { state, service } = setup();
  const result = service.equip('1', 'weapon', '20');
  assert.equal(result.ok, true);
  assert.equal(state.count('weapons', '20'), 0);
  assert.equal(service.actor('1').equipment.weapon, '20');

  const removed = service.unequip('1', 'weapon');
  assert.equal(removed.ok, true);
  assert.equal(state.count('weapons', '20'), 1);
  assert.equal(service.actor('1').equipment.weapon, undefined);
});

test('equipment refuses items the party does not own', () => {
  const { service } = setup();
  const result = service.equip('1', 'weapon', '999');
  assert.throws(() => service.equip('1', 'weapon', '999'), /Missing weapons record/);
  assert.equal(result, undefined);
});

test('formation changes preserve party membership while reordering slots', () => {
  const { state, service } = setup();
  assert.equal(service.formationMove(0, 1), true);
  assert.deepEqual(state.party, ['2', '1']);
  assert.equal(service.formationMove(4, 0), false);
});

test('event state can disable and re-enable menu categories', () => {
  const { state, service } = setup();
  service.setMenuEnabled('save', false);
  assert.equal(service.isMenuEnabled('save'), false);
  assert.deepEqual(state.system.disabledMenus, ['save']);
  service.setMenuEnabled('save', true);
  assert.equal(service.isMenuEnabled('save'), true);
});
