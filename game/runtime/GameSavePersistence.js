export const DEFAULT_AUTOSAVE_KEY = 'plushbound.legends.autosave.v1';
export const AUTOSAVE_RECORD_VERSION = 1;

function makeEvent(scope, type, detail) {
  const EventCtor = scope?.CustomEvent || globalThis.CustomEvent || class CustomEvent {
    constructor(eventType, init = {}) { this.type = eventType; this.detail = init.detail; }
  };
  return new EventCtor(type, { detail });
}

function storageFor(scope) {
  try { return scope?.localStorage || null; }
  catch { return null; }
}

function errorText(error) { return String(error?.message || error || 'unknown persistence error'); }

export class GameSavePersistence {
  constructor({ scope = globalThis, storage = storageFor(scope), key = DEFAULT_AUTOSAVE_KEY, now = () => new Date().toISOString() } = {}) {
    this.scope = scope;
    this.storage = storage;
    this.key = String(key || DEFAULT_AUTOSAVE_KEY);
    this.now = now;
    this.session = null;
    this.bound = false;
    this.listeners = [];
    this.lastRecord = null;
    this.lastError = null;
  }

  available() {
    return !!this.storage && typeof this.storage.getItem === 'function' && typeof this.storage.setItem === 'function';
  }

  read() {
    if (!this.available()) return null;
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const save = parsed?.save || parsed;
      if (!save || typeof save !== 'object') throw new Error('Autosave payload is not an object');
      return save;
    } catch (error) {
      this.#recordError('read', error);
      this.clear({ silent: true });
      return null;
    }
  }

  restore(session = this.session) {
    if (!session?.restoreSave) return false;
    const save = this.read();
    if (!save) return false;
    try {
      session.restoreSave(save);
      this.scope?.dispatchEvent?.(makeEvent(this.scope, 'plushbound-save-restored', { key: this.key, schemaVersion: save.schemaVersion ?? null }));
      return true;
    } catch (error) {
      this.#recordError('restore', error);
      this.clear({ silent: true });
      return false;
    }
  }

  save(session = this.session, reason = 'autosave') {
    if (!this.available() || !session?.serializeSave) return null;
    try {
      const save = session.serializeSave();
      const record = {
        recordVersion: AUTOSAVE_RECORD_VERSION,
        savedAt: this.now(),
        reason: String(reason || 'autosave'),
        save
      };
      this.storage.setItem(this.key, JSON.stringify(record));
      this.lastRecord = record;
      this.lastError = null;
      this.scope?.dispatchEvent?.(makeEvent(this.scope, 'plushbound-save-persisted', {
        key: this.key,
        savedAt: record.savedAt,
        reason: record.reason,
        schemaVersion: save?.schemaVersion ?? null
      }));
      return record;
    } catch (error) {
      this.#recordError('save', error);
      return null;
    }
  }

  clear({ silent = false } = {}) {
    if (!this.storage?.removeItem) return false;
    try {
      this.storage.removeItem(this.key);
      this.lastRecord = null;
      if (!silent) this.scope?.dispatchEvent?.(makeEvent(this.scope, 'plushbound-save-cleared', { key: this.key }));
      return true;
    } catch (error) {
      if (!silent) this.#recordError('clear', error);
      return false;
    }
  }

  attach({ session } = {}) {
    if (session) this.session = session;
    if (this.bound || !this.session) return this;
    this.bound = true;

    const onShellUpdate = event => this.save(this.session, event?.detail?.reason || 'shell-update');
    const onPageHide = () => this.save(this.session, 'pagehide');
    const onVisibility = () => {
      if (this.scope?.document?.visibilityState === 'hidden') this.save(this.session, 'visibility-hidden');
    };

    this.scope?.addEventListener?.('plushbound-shell-update', onShellUpdate);
    this.scope?.addEventListener?.('pagehide', onPageHide);
    this.scope?.document?.addEventListener?.('visibilitychange', onVisibility);
    this.listeners.push(['scope', 'plushbound-shell-update', onShellUpdate], ['scope', 'pagehide', onPageHide], ['document', 'visibilitychange', onVisibility]);
    return this;
  }

  detach() {
    if (!this.bound) return this;
    for (const [target, type, listener] of this.listeners) {
      if (target === 'document') this.scope?.document?.removeEventListener?.(type, listener);
      else this.scope?.removeEventListener?.(type, listener);
    }
    this.listeners = [];
    this.bound = false;
    return this;
  }

  #recordError(operation, error) {
    this.lastError = { operation, message: errorText(error) };
    this.scope?.dispatchEvent?.(makeEvent(this.scope, 'plushbound-save-error', { operation, message: this.lastError.message, key: this.key }));
  }
}
