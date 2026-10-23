import test from 'node:test';
import assert from 'node:assert/strict';
import { GameSavePersistence, DEFAULT_AUTOSAVE_KEY } from '../runtime/GameSavePersistence.js';

function makeStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    value(key) { return values.get(key) ?? null; }
  };
}

function makeScope() {
  const listeners = new Map();
  const documentListeners = new Map();
  const events = [];
  const scope = {
    events,
    document: {
      visibilityState: 'visible',
      addEventListener(type, fn) { if (!documentListeners.has(type)) documentListeners.set(type, new Set()); documentListeners.get(type).add(fn); },
      removeEventListener(type, fn) { documentListeners.get(type)?.delete(fn); },
      emit(type) { for (const fn of documentListeners.get(type) || []) fn({ type }); }
    },
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    dispatchEvent(event) { events.push(event); for (const fn of listeners.get(event.type) || []) fn(event); },
    emit(type, detail = {}) { for (const fn of listeners.get(type) || []) fn({ type, detail }); }
  };
  return scope;
}

function makeSession() {
  const restored = [];
  let counter = 1;
  return {
    restored,
    serializeSave() { return { schemaVersion: 1, game: 'Plushbound Legends', state: { counter } }; },
    restoreSave(save) { restored.push(save); counter = Number(save?.state?.counter) || 0; },
    setCounter(value) { counter = value; },
    counter() { return counter; }
  };
}

test('autosave persistence writes on shell updates and page lifecycle events', () => {
  const scope = makeScope();
  const storage = makeStorage();
  const session = makeSession();
  const persistence = new GameSavePersistence({ scope, storage, now: () => '2026-10-23T22:30:00.000Z' }).attach({ session });

  session.setCounter(7);
  scope.emit('plushbound-shell-update', { reason: 'move' });
  let record = JSON.parse(storage.value(DEFAULT_AUTOSAVE_KEY));
  assert.equal(record.reason, 'move');
  assert.equal(record.save.state.counter, 7);

  session.setCounter(9);
  scope.document.visibilityState = 'hidden';
  scope.document.emit('visibilitychange');
  record = JSON.parse(storage.value(DEFAULT_AUTOSAVE_KEY));
  assert.equal(record.reason, 'visibility-hidden');
  assert.equal(record.save.state.counter, 9);

  session.setCounter(11);
  scope.emit('pagehide');
  record = JSON.parse(storage.value(DEFAULT_AUTOSAVE_KEY));
  assert.equal(record.reason, 'pagehide');
  assert.equal(record.save.state.counter, 11);
  assert.ok(scope.events.some(event => event.type === 'plushbound-save-persisted'));

  persistence.detach();
});

test('autosave restores a valid prior session and accepts the wrapped record format', () => {
  const scope = makeScope();
  const storage = makeStorage({
    [DEFAULT_AUTOSAVE_KEY]: JSON.stringify({ recordVersion: 1, savedAt: 'earlier', reason: 'move', save: { schemaVersion: 1, state: { counter: 42 } } })
  });
  const session = makeSession();
  const persistence = new GameSavePersistence({ scope, storage });

  assert.equal(persistence.restore(session), true);
  assert.equal(session.counter(), 42);
  assert.equal(session.restored.length, 1);
  assert.ok(scope.events.some(event => event.type === 'plushbound-save-restored'));
});

test('corrupt or incompatible autosaves fail closed and are removed instead of bricking boot', () => {
  const scope = makeScope();
  const storage = makeStorage({ [DEFAULT_AUTOSAVE_KEY]: '{ definitely not json' });
  const persistence = new GameSavePersistence({ scope, storage });
  const session = makeSession();

  assert.equal(persistence.restore(session), false);
  assert.equal(storage.value(DEFAULT_AUTOSAVE_KEY), null);
  assert.equal(persistence.lastError.operation, 'read');
  assert.ok(scope.events.some(event => event.type === 'plushbound-save-error'));

  storage.setItem(DEFAULT_AUTOSAVE_KEY, JSON.stringify({ schemaVersion: 999, state: { counter: 1 } }));
  const rejectingSession = { restoreSave() { throw new Error('unsupported schema'); } };
  assert.equal(persistence.restore(rejectingSession), false);
  assert.equal(storage.value(DEFAULT_AUTOSAVE_KEY), null);
  assert.equal(persistence.lastError.operation, 'restore');
});

test('storage failures never crash game actions', () => {
  const scope = makeScope();
  const storage = {
    getItem() { return null; },
    setItem() { throw new Error('quota denied'); },
    removeItem() {}
  };
  const persistence = new GameSavePersistence({ scope, storage });
  const session = makeSession();

  assert.equal(persistence.save(session, 'move'), null);
  assert.equal(persistence.lastError.operation, 'save');
  assert.ok(scope.events.some(event => event.type === 'plushbound-save-error'));
});
