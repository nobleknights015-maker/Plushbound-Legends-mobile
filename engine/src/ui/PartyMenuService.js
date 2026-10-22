export class PartyMenuService {
  constructor({ state, data }) {
    if (!state) throw new Error('PartyMenuService requires game state');
    if (!data) throw new Error('PartyMenuService requires data registry');
    this.state = state;
    this.data = data;
  }

  actor(actorId) {
    const id = String(actorId);
    const base = this.data.require('actors', id);
    const runtime = this.state.actors.get(id) || {};
    return {
      ...base,
      ...runtime,
      id,
      equipment: { ...(runtime.equipment || {}) },
      skills: [...(runtime.skills || base.skills || [])],
      states: [...(runtime.states || base.states || [])]
    };
  }

  partyStatus() {
    return this.state.party.map(id => this.actor(id));
  }

  inventory(kind) {
    if (!this.state.inventory[kind]) throw new Error(`Unknown inventory kind ${kind}`);
    const type = kind === 'armor' ? 'armor' : kind;
    return [...this.state.inventory[kind].entries()]
      .filter(([, count]) => Number(count) > 0)
      .map(([id, count]) => ({ ...this.data.require(type, id), count: Number(count) }));
  }

  skills(actorId) {
    return this.actor(actorId).skills.map(id => this.data.require('skills', id));
  }

  equip(actorId, slot, itemId) {
    const id = String(actorId);
    const actor = this.actor(id);
    const type = slot === 'weapon' ? 'weapons' : 'armor';
    const item = this.data.require(type, itemId);
    const bag = type === 'weapons' ? 'weapons' : 'armor';
    if (this.state.count(bag, item.id) < 1) return { ok: false, reason: 'not-owned' };
    const runtime = { ...(this.state.actors.get(id) || {}) };
    const equipment = { ...(runtime.equipment || actor.equipment || {}) };
    const previous = equipment[slot] ?? null;
    if (previous != null) this.state.gain(bag, previous, 1);
    this.state.gain(bag, item.id, -1);
    equipment[slot] = item.id;
    runtime.equipment = equipment;
    this.state.actors.set(id, runtime);
    return { ok: true, actorId: id, slot, itemId: item.id, previous };
  }

  unequip(actorId, slot) {
    const id = String(actorId);
    const runtime = { ...(this.state.actors.get(id) || {}) };
    const equipment = { ...(runtime.equipment || {}) };
    const previous = equipment[slot];
    if (previous == null) return { ok: false, reason: 'empty' };
    const bag = slot === 'weapon' ? 'weapons' : 'armor';
    this.state.gain(bag, previous, 1);
    delete equipment[slot];
    runtime.equipment = equipment;
    this.state.actors.set(id, runtime);
    return { ok: true, itemId: String(previous) };
  }

  formationMove(fromIndex, toIndex) {
    const from = Number(fromIndex);
    const to = Number(toIndex);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= this.state.party.length || to >= this.state.party.length) {
      return false;
    }
    const next = [...this.state.party];
    const [actorId] = next.splice(from, 1);
    next.splice(to, 0, actorId);
    this.state.party = next;
    return true;
  }

  setMenuEnabled(menuId, enabled) {
    const disabled = new Set(this.state.system.disabledMenus || []);
    if (enabled) disabled.delete(String(menuId));
    else disabled.add(String(menuId));
    this.state.system.disabledMenus = [...disabled];
  }

  isMenuEnabled(menuId) {
    return !(this.state.system.disabledMenus || []).includes(String(menuId));
  }
}
