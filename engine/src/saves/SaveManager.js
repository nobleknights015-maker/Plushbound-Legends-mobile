export class MemorySaveStorage {
  constructor(seed = {}) {
    this.records = new Map(Object.entries(seed));
  }
  async get(key) { return this.records.has(key) ? this.records.get(key) : null; }
  async set(key, value) { this.records.set(key, value); }
  async remove(key) { this.records.delete(key); }
  async keys() { return [...this.records.keys()]; }
}

export class SaveManager {
  constructor({ storage, gameState, clock = () => Date.now(), prefix = 'plushbound:v1', schemaVersion = 1 }) {
    if (!storage) throw new Error('SaveManager requires storage');
    if (!gameState) throw new Error('SaveManager requires gameState');
    this.storage = storage;
    this.gameState = gameState;
    this.clock = clock;
    this.prefix = prefix;
    this.schemaVersion = schemaVersion;
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
    return this.listSlots();
  }

  slotKey(slot) {
    if (slot === 'auto') return `${this.prefix}:auto`;
    const n = Number(slot);
    if (!Number.isInteger(n) || n < 1) throw new Error(`Invalid save slot: ${slot}`);
    return `${this.prefix}:slot:${n}`;
  }

  async save(slot, { label = null, extra = null } = {}) {
    const key = this.slotKey(slot);
    const now = this.clock();
    const previousSaveCount = Number(this.gameState.system.saveCount || 0);
    this.gameState.system.saveCount = previousSaveCount + 1;

    const payload = {
      schemaVersion: this.schemaVersion,
      savedAt: now,
      slot,
      label,
      extra,
      state: this.gameState.serialize()
    };

    try {
      const encoded = JSON.stringify(payload);
      await this.storage.set(key, encoded);
    } catch (error) {
      this.gameState.system.saveCount = previousSaveCount;
      throw error;
    }

    return { ...payload, state: undefined };
  }

  async autosave(meta = {}) {
    return this.save('auto', meta);
  }

  async load(slot) {
    const key = this.slotKey(slot);
    const encoded = await this.storage.get(key);
    if (encoded == null) return null;
    let payload;
    try {
      payload = JSON.parse(encoded);
    } catch {
      throw new Error(`Save slot ${slot} is corrupted`);
    }
    if (!payload || typeof payload !== 'object' || !payload.state) {
      throw new Error(`Save slot ${slot} is invalid`);
    }
    if (payload.schemaVersion !== this.schemaVersion) {
      throw new Error(`Unsupported save schema ${payload.schemaVersion}`);
    }
    this.gameState.restore(payload.state);
    return payload;
  }

  async exists(slot) {
    return (await this.storage.get(this.slotKey(slot))) != null;
  }

  async delete(slot) {
    await this.storage.remove(this.slotKey(slot));
  }

  async listSlots() {
    const keys = await this.storage.keys();
    const results = [];
    for (const key of keys) {
      if (!key.startsWith(`${this.prefix}:`)) continue;
      const raw = await this.storage.get(key);
      try {
        const payload = JSON.parse(raw);
        results.push({
          slot: payload.slot,
          savedAt: payload.savedAt,
          label: payload.label ?? null,
          extra: payload.extra ?? null,
          valid: payload.schemaVersion === this.schemaVersion && !!payload.state
        });
      } catch {
        results.push({ slot: key, savedAt: null, label: null, extra: null, valid: false });
      }
    }
    return results.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  }
}
