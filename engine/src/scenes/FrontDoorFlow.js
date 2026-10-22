const STARTER_GUARDIANS = Object.freeze({
  cinder: Object.freeze({ id: 'cinder', name: 'Cinder', species: 'Emberfox', role: 'Striker', affinity: 'ember' }),
  mallow: Object.freeze({ id: 'mallow', name: 'Mallow', species: 'Grovebear', role: 'Guardian', affinity: 'grove' }),
  ripple: Object.freeze({ id: 'ripple', name: 'Ripple', species: 'Tideotter', role: 'Controller', affinity: 'tide' }),
  wisp: Object.freeze({ id: 'wisp', name: 'Wisp', species: 'Galebun', role: 'Skirmisher', affinity: 'gale' })
});

function clone(value) { return value == null ? value : structuredClone(value); }

export class FrontDoorFlow {
  constructor({ state, saves, startMap = { id: 'elyndor-start', x: 6, y: 8, direction: 2 }, starters = STARTER_GUARDIANS } = {}) {
    if (!state) throw new Error('FrontDoorFlow requires state');
    if (!saves) throw new Error('FrontDoorFlow requires saves');
    this.state = state;
    this.saves = saves;
    this.startMap = { ...startMap };
    this.starters = new Map(Object.entries(starters).map(([id, value]) => [String(id), clone(value)]));
    this.phase = 'title';
  }

  async titleState() {
    const slots = await this.saves.listSlots();
    const valid = slots.filter(slot => slot.valid);
    return {
      phase: 'title',
      canContinue: valid.length > 0,
      latest: valid[0] ?? null,
      commands: [
        { id: 'new-game', enabled: true },
        { id: 'continue', enabled: valid.length > 0 },
        { id: 'options', enabled: true }
      ]
    };
  }

  returnToTitle({ discardRuntime = true } = {}) {
    if (discardRuntime) this.state.reset();
    this.phase = 'title';
    return { phase: this.phase };
  }

  beginNewGame() {
    this.state.reset();
    this.phase = 'creator';
    return { phase: this.phase, traveler: null, guardian: null };
  }

  setTraveler({ name, appearance = {}, pronouns = null } = {}) {
    if (this.phase !== 'creator') throw new Error('Traveler creation is not active');
    const cleanName = String(name ?? '').trim();
    if (!cleanName || cleanName.length > 24) throw new Error('Traveler name must be 1-24 characters');
    const traveler = { id: 'player', name: cleanName, pronouns, appearance: clone(appearance) };
    this.state.actors.set('player', traveler);
    this.state.party = ['player'];
    this.phase = 'guardian';
    return clone(traveler);
  }

  availableGuardians() {
    return [...this.starters.values()].map(clone);
  }

  chooseGuardian(id) {
    if (this.phase !== 'guardian') throw new Error('Guardian selection is not active');
    const guardian = this.starters.get(String(id));
    if (!guardian) throw new Error(`Unknown starter Guardian: ${id}`);
    this.state.guardian = { ...clone(guardian), bond: { firstThread: true, level: 1 } };
    Object.assign(this.state.map, this.startMap);
    this.state.quests.set('a-thread-begins', { id: 'a-thread-begins', stage: 0, status: 'active' });
    this.phase = 'opening';
    return clone(this.state.guardian);
  }

  startOpening() {
    if (this.phase !== 'opening') throw new Error('Opening is not ready');
    const player = this.state.actors.get('player');
    if (!player || !this.state.guardian) throw new Error('Opening requires traveler and Guardian');
    this.phase = 'field';
    return {
      phase: this.phase,
      map: clone(this.state.map),
      player: clone(player),
      guardian: clone(this.state.guardian),
      quest: clone(this.state.quests.get('a-thread-begins'))
    };
  }

  async continueLatest() {
    const slots = (await this.saves.listSlots()).filter(slot => slot.valid);
    if (!slots.length) return null;
    let lastError = null;
    for (const meta of slots) {
      try {
        const payload = await this.saves.load(meta.slot);
        if (!payload) continue;
        this.phase = 'field';
        return { phase: this.phase, slot: meta.slot, payload };
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) throw lastError;
    return null;
  }
}

export { STARTER_GUARDIANS };
