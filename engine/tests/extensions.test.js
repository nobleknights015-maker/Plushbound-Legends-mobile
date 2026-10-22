import test from 'node:test';
import assert from 'node:assert/strict';
import { ModuleRegistry } from '../src/extensions/ModuleRegistry.js';
import { EventCommandRegistry } from '../src/events/EventInterpreter.js';

test('modules enable required dependencies in deterministic order', () => {
  const order = [];
  const registry = new ModuleRegistry();
  registry.register({ id: 'core-ui', setup: () => order.push('core-ui') });
  registry.register({ id: 'guardian-ui', requires: ['core-ui'], setup: () => order.push('guardian-ui') });
  registry.enable('guardian-ui');
  assert.deepEqual(order, ['core-ui', 'guardian-ui']);
  assert.equal(registry.isEnabled('core-ui'), true);
  assert.equal(registry.isEnabled('guardian-ui'), true);
});

test('missing dependencies and cycles fail loudly before partial activation', () => {
  const missing = new ModuleRegistry();
  missing.register({ id: 'bad', requires: ['nope'] });
  assert.throws(() => missing.enable('bad'), /requires missing module nope/);
  assert.equal(missing.isEnabled('bad'), false);

  const cyclic = new ModuleRegistry();
  cyclic.register({ id: 'a', requires: ['b'] });
  cyclic.register({ id: 'b', requires: ['a'] });
  assert.throws(() => cyclic.enable('a'), /dependency cycle/);
  assert.deepEqual(cyclic.snapshot().enabled, []);
});

test('services are protected from accidental duplicate registration but may be deliberately replaced', () => {
  const registry = new ModuleRegistry({ services: { audio: { kind: 'base' } } });
  assert.equal(registry.service('audio').kind, 'base');
  assert.throws(() => registry.provide('audio', {}), /already registered/);
  registry.replaceService('audio', { kind: 'custom' });
  assert.equal(registry.service('audio').kind, 'custom');
});

test('module hooks only fire while the module is enabled', () => {
  const seen = [];
  const registry = new ModuleRegistry();
  registry.register({ id: 'weather', hooks: { 'map:enter': payload => seen.push(payload.mapId) } });
  registry.enable('weather');
  registry.emit('map:enter', { mapId: 8 });
  assert.deepEqual(seen, [8]);
  registry.disable('weather');
  registry.emit('map:enter', { mapId: 9 });
  assert.deepEqual(seen, [8]);
});

test('required modules cannot be disabled out from under enabled dependents', () => {
  const registry = new ModuleRegistry();
  registry.register({ id: 'base' });
  registry.register({ id: 'feature', requires: ['base'] });
  registry.enable('feature');
  assert.throws(() => registry.disable('base'), /required by feature/);
  assert.equal(registry.disable('feature'), true);
  assert.equal(registry.disable('base'), true);
});

test('extensions can add event commands through the supported registry boundary', () => {
  const commands = new EventCommandRegistry();
  const registry = new ModuleRegistry({ commands });
  registry.register({
    id: 'guardian-events',
    setup: ({ registerCommand }) => registerCommand('GUARDIAN_BOND', ({ state, parameters }) => state.setVariable('bond', parameters[0]))
  });
  registry.enable('guardian-events');
  assert.equal(commands.has('GUARDIAN_BOND'), true);
});

test('failed setup does not leave module hooks active or mark the module enabled', () => {
  let hits = 0;
  const registry = new ModuleRegistry();
  registry.register({
    id: 'broken',
    hooks: { tick: () => { hits += 1; } },
    setup: () => { throw new Error('boom'); }
  });
  assert.throws(() => registry.enable('broken'), /boom/);
  registry.emit('tick');
  assert.equal(hits, 0);
  assert.equal(registry.isEnabled('broken'), false);
});
