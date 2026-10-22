export class BattleEngine {
  constructor({ state, rng = Math.random } = {}) {
    this.state = state;
    this.rng = rng;
    this.active = false;
    this.result = null;
    this.turn = 0;
    this.party = [];
    this.enemies = [];
    this.rewards = { gold: 0, exp: 0, items: [] };
  }

  start({ party = [], enemies = [], rewards = {} } = {}) {
    if (this.active) throw new Error('Battle already active');
    this.party = party.map(x => this.#combatant(x, 'ally'));
    this.enemies = enemies.map(x => this.#combatant(x, 'enemy'));
    this.rewards = {
      gold: Number(rewards.gold || 0),
      exp: Number(rewards.exp || 0),
      items: Array.isArray(rewards.items) ? rewards.items.map(x => ({ ...x })) : []
    };
    this.turn = 1;
    this.result = null;
    this.active = true;
    return this.snapshot();
  }

  #combatant(raw, side) {
    return {
      id: raw.id,
      side,
      name: raw.name || String(raw.id),
      hp: Math.max(0, Number(raw.hp ?? raw.maxHp ?? 1)),
      maxHp: Math.max(1, Number(raw.maxHp ?? raw.hp ?? 1)),
      atk: Math.max(0, Number(raw.atk ?? 1)),
      def: Math.max(0, Number(raw.def ?? 0)),
      agi: Math.max(0, Number(raw.agi ?? 0)),
      guarding: false,
      states: Array.isArray(raw.states) ? [...raw.states] : []
    };
  }

  living(side) {
    const list = side === 'ally' ? this.party : this.enemies;
    return list.filter(x => x.hp > 0);
  }

  order(actions = []) {
    return [...actions].sort((a, b) => {
      const ba = this.#find(a.actorId)?.agi ?? 0;
      const bb = this.#find(b.actorId)?.agi ?? 0;
      if (bb !== ba) return bb - ba;
      return String(a.actorId).localeCompare(String(b.actorId));
    });
  }

  resolveTurn(actions = []) {
    if (!this.active) throw new Error('No active battle');
    for (const c of [...this.party, ...this.enemies]) c.guarding = false;
    const log = [];
    for (const action of this.order(actions)) {
      if (!this.active) break;
      const actor = this.#find(action.actorId);
      if (!actor || actor.hp <= 0) continue;
      if (action.type === 'guard') {
        actor.guarding = true;
        log.push({ type: 'guard', actorId: actor.id });
      } else if (action.type === 'attack') {
        const target = this.#find(action.targetId);
        if (!target || target.hp <= 0) continue;
        const variance = Number(action.variance ?? 0);
        const base = Math.max(1, actor.atk - Math.floor(target.def / 2));
        const swing = variance ? Math.floor((this.rng() * 2 - 1) * variance) : 0;
        const raw = Math.max(1, base + swing);
        const damage = target.guarding ? Math.max(1, Math.floor(raw / 2)) : raw;
        target.hp = Math.max(0, target.hp - damage);
        log.push({ type: 'damage', actorId: actor.id, targetId: target.id, damage, targetHp: target.hp });
      }
      this.#checkEnd();
    }
    if (this.active) this.turn += 1;
    return { log, result: this.result, turn: this.turn };
  }

  #checkEnd() {
    if (this.living('enemy').length === 0) this.#finish('victory');
    else if (this.living('ally').length === 0) this.#finish('defeat');
  }

  #finish(result) {
    this.result = result;
    this.active = false;
    if (result === 'victory') this.#applyRewards();
  }

  #applyRewards() {
    if (!this.state) return;
    this.state.system.gold = Number(this.state.system.gold || 0) + this.rewards.gold;
    this.state.system.exp = Number(this.state.system.exp || 0) + this.rewards.exp;
    for (const item of this.rewards.items) {
      const kind = item.kind || 'items';
      this.state.gain(kind, item.id, Number(item.amount || 1));
    }
  }

  #find(id) {
    return [...this.party, ...this.enemies].find(x => String(x.id) === String(id)) || null;
  }

  snapshot() {
    return {
      active: this.active,
      result: this.result,
      turn: this.turn,
      party: this.party.map(x => ({ ...x, states: [...x.states] })),
      enemies: this.enemies.map(x => ({ ...x, states: [...x.states] })),
      rewards: { ...this.rewards, items: this.rewards.items.map(x => ({ ...x })) }
    };
  }
}
