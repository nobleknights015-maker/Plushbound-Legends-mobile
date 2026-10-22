export class EncounterManager {
  constructor({ state, rng = Math.random, tables = {} } = {}) {
    if (!state) throw new Error('EncounterManager requires state');
    this.state = state;
    this.rng = rng;
    this.tables = new Map(Object.entries(tables || {}));
    this.progress = 0;
    this.threshold = 0;
    this.resetThreshold();
  }

  registerTable(key, entries = []) {
    this.tables.set(String(key), entries.map(entry => ({ ...entry })));
  }

  resetThreshold(base = 20, variance = 10) {
    const b = Math.max(1, Number(base) || 1);
    const v = Math.max(0, Number(variance) || 0);
    this.progress = 0;
    this.threshold = b + Math.floor(this.rng() * (v + 1));
    return this.threshold;
  }

  step({ regionId = 0, table = 'default', disabled = false, disableSwitchId = null, rate = 1 } = {}) {
    if (disabled) return null;
    if (disableSwitchId != null && this.state.sw(disableSwitchId)) return null;
    this.progress += Math.max(0, Number(rate) || 0);
    if (this.progress < this.threshold) return null;
    const encounter = this.pick({ regionId, table });
    this.resetThreshold();
    return encounter;
  }

  pick({ regionId = 0, table = 'default' } = {}) {
    const entries = this.tables.get(String(table)) || [];
    const candidates = entries.filter(entry => {
      const regions = entry.regions;
      return !Array.isArray(regions) || regions.length === 0 || regions.map(Number).includes(Number(regionId));
    });
    if (!candidates.length) return null;
    const total = candidates.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight ?? 1)), 0);
    if (total <= 0) return null;
    let roll = this.rng() * total;
    for (const entry of candidates) {
      roll -= Math.max(0, Number(entry.weight ?? 1));
      if (roll < 0) return structuredClone(entry);
    }
    return structuredClone(candidates.at(-1));
  }

  eventEncounter(entry) {
    if (!entry) throw new Error('eventEncounter requires encounter data');
    return structuredClone(entry);
  }
}
