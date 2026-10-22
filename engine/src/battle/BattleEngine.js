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
    const maxHp = Math.max(1, Number(raw.maxHp ?? raw.hp ?? 1));
    const maxMp = Math.max(0, Number(raw.maxMp ?? raw.mp ?? 0));
    return {
      id: raw.id,
      side,
      name: raw.name || String(raw.id),
      hp: Math.max(0, Math.min(maxHp, Number(raw.hp ?? maxHp))),
      maxHp,
      mp: Math.max(0, Math.min(maxMp, Number(raw.mp ?? maxMp))),
      maxMp,
      tp: Math.max(0, Math.min(100, Number(raw.tp ?? 0))),
      atk: Math.max(0, Number(raw.atk ?? 1)),
      def: Math.max(0, Number(raw.def ?? 0)),
      agi: Math.max(0, Number(raw.agi ?? 0)),
      guarding: false,
      states: Array.isArray(raw.states) ? raw.states.map(x => typeof x === 'string' ? { id: x, turns: null } : { ...x }) : [],
      buffs: { ...(raw.buffs || {}) }
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
      this.#resolveAction(actor, action, log);
      this.#checkEnd();
    }
    if (this.active) {
      this.#tickStates(log);
      this.#checkEnd();
    }
    if (this.active) this.turn += 1;
    return { log, result: this.result, turn: this.turn };
  }

  #resolveAction(actor, action, log) {
    if (action.type === 'guard') {
      actor.guarding = true;
      log.push({ type: 'guard', actorId: actor.id });
      return;
    }
    if (action.type === 'attack') {
      const target = this.#find(action.targetId);
      if (!target || target.hp <= 0) return;
      this.#damage(actor, target, Math.max(1, actor.atk - Math.floor(target.def / 2)), action.variance, log, 'attack');
      return;
    }
    if (action.type === 'skill') {
      const skill = action.skill || {};
      const mpCost = Math.max(0, Number(skill.mpCost || 0));
      const tpCost = Math.max(0, Number(skill.tpCost || 0));
      if (actor.mp < mpCost || actor.tp < tpCost) {
        log.push({ type: 'skill-failed', actorId: actor.id, reason: 'resource' });
        return;
      }
      actor.mp -= mpCost;
      actor.tp -= tpCost;
      const targets = this.#targetsFor(actor, action, skill.scope || 'one-enemy');
      for (const target of targets) this.#applyEffect(actor, target, skill, log, 'skill');
      log.push({ type: 'skill', actorId: actor.id, skillId: skill.id ?? null, mp: actor.mp, tp: actor.tp });
      return;
    }
    if (action.type === 'item') {
      const item = action.item || {};
      const targets = this.#targetsFor(actor, action, item.scope || 'one-ally');
      for (const target of targets) this.#applyEffect(actor, target, item, log, 'item');
      if (actor.side === 'ally' && this.state && item.id != null && item.consume !== false) {
        const count = this.state.count?.('items', item.id) ?? 0;
        if (count <= 0) {
          log.push({ type: 'item-failed', actorId: actor.id, itemId: item.id, reason: 'missing' });
          return;
        }
        this.state.gain('items', item.id, -1);
      }
      log.push({ type: 'item', actorId: actor.id, itemId: item.id ?? null });
      return;
    }
    if (action.type === 'escape') {
      const chance = Math.max(0, Math.min(1, Number(action.chance ?? 0.5)));
      const success = action.force === true || this.rng() < chance;
      log.push({ type: 'escape', actorId: actor.id, success });
      if (success) this.#finish('escape');
    }
  }

  #targetsFor(actor, action, scope) {
    const allyList = actor.side === 'ally' ? this.party : this.enemies;
    const enemyList = actor.side === 'ally' ? this.enemies : this.party;
    if (scope === 'self') return [actor];
    if (scope === 'all-allies') return allyList.filter(x => x.hp > 0);
    if (scope === 'all-enemies') return enemyList.filter(x => x.hp > 0);
    const target = this.#find(action.targetId);
    return target ? [target] : [];
  }

  #applyEffect(actor, target, effect, log, source) {
    if (!target || target.hp <= 0) return;
    if (Number(effect.power || 0) > 0) {
      const base = Math.max(1, Number(effect.power) + actor.atk - Math.floor(target.def / 2));
      this.#damage(actor, target, base, effect.variance, log, source);
    }
    if (Number(effect.heal || 0) > 0) {
      const amount = Math.max(0, Math.floor(Number(effect.heal)));
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + amount);
      log.push({ type: 'heal', actorId: actor.id, targetId: target.id, amount: target.hp - before, targetHp: target.hp, source });
    }
    if (effect.addState) {
      const state = typeof effect.addState === 'string' ? { id: effect.addState, turns: null } : { ...effect.addState };
      if (!target.states.some(s => String(s.id) === String(state.id))) target.states.push(state);
      log.push({ type: 'state-add', targetId: target.id, stateId: state.id });
    }
    if (effect.removeState) {
      const id = typeof effect.removeState === 'string' ? effect.removeState : effect.removeState.id;
      target.states = target.states.filter(s => String(s.id) !== String(id));
      log.push({ type: 'state-remove', targetId: target.id, stateId: id });
    }
    if (effect.buff) {
      const stat = effect.buff.stat;
      const amount = Number(effect.buff.amount || 0);
      target.buffs[stat] = Number(target.buffs[stat] || 0) + amount;
      log.push({ type: 'buff', targetId: target.id, stat, amount: target.buffs[stat] });
    }
  }

  #damage(actor, target, base, variance = 0, log, source) {
    const spread = Number(variance ?? 0);
    const swing = spread ? Math.floor((this.rng() * 2 - 1) * spread) : 0;
    let raw = Math.max(1, Math.floor(base + swing));
    if (target.guarding) raw = Math.max(1, Math.floor(raw / 2));
    target.hp = Math.max(0, target.hp - raw);
    actor.tp = Math.min(100, actor.tp + 5);
    target.tp = Math.min(100, target.tp + 5);
    log.push({ type: 'damage', actorId: actor.id, targetId: target.id, damage: raw, targetHp: target.hp, source });
  }

  #tickStates(log) {
    for (const target of [...this.party, ...this.enemies]) {
      const next = [];
      for (const state of target.states) {
        if (target.hp > 0 && Number(state.damagePerTurn || 0) > 0) {
          const damage = Math.max(1, Math.floor(Number(state.damagePerTurn)));
          target.hp = Math.max(0, target.hp - damage);
          log.push({ type: 'state-damage', targetId: target.id, stateId: state.id, damage, targetHp: target.hp });
        }
        if (state.turns == null) {
          next.push(state);
        } else {
          const turns = Number(state.turns) - 1;
          if (turns > 0) next.push({ ...state, turns });
          else log.push({ type: 'state-expire', targetId: target.id, stateId: state.id });
        }
      }
      target.states = next;
    }
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
      party: this.party.map(x => ({ ...x, states: x.states.map(s => ({ ...s })), buffs: { ...x.buffs } })),
      enemies: this.enemies.map(x => ({ ...x, states: x.states.map(s => ({ ...s })), buffs: { ...x.buffs } })),
      rewards: { ...this.rewards, items: this.rewards.items.map(x => ({ ...x })) }
    };
  }
}
