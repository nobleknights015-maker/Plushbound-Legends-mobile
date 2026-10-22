function clone(value) { return value == null ? value : structuredClone(value); }

export class GameContentRuntime {
  constructor({ state, contentPackages = [] } = {}) {
    if (!state) throw new Error('GameContentRuntime requires state');
    this.state = state;
    this.quests = new Map();
    this.items = new Map();
    this.shops = new Map();
    this.waystitches = new Map();
    for (const content of contentPackages) this.register(content);
    this.hooks = { emit: (name, payload) => this.emit(name, payload) };
  }

  register(content = {}) {
    for (const quest of content.quests || []) this.quests.set(String(quest.id), clone(quest));
    for (const item of content.items || []) this.items.set(String(item.id), clone(item));
    for (const shop of content.shops || []) this.shops.set(String(shop.id), clone(shop));
    for (const waystitch of content.waystitches || []) this.waystitches.set(String(waystitch.id), clone(waystitch));
    return this;
  }

  questDefinition(id) { return clone(this.quests.get(String(id)) || null); }
  questState(id) { return clone(this.state.quests.get(String(id)) || null); }
  shop(id) { return clone(this.shops.get(String(id)) || null); }

  startQuest(id) {
    const key = String(id);
    const definition = this.quests.get(key);
    if (!definition) throw new Error(`Unknown quest ${id}`);
    const existing = this.state.quests.get(key);
    if (existing?.status === 'complete') return clone(existing);
    if (existing?.status === 'active' || existing?.status === 'ready') return clone(existing);

    for (const prerequisite of definition.prerequisites || []) {
      if (prerequisite.questComplete) {
        const required = this.state.quests.get(String(prerequisite.questComplete));
        if (required?.status !== 'complete') throw new Error(`Quest ${id} prerequisite not met: ${prerequisite.questComplete}`);
      }
      if (prerequisite.switchId && this.state.sw(prerequisite.switchId) !== (prerequisite.switchValue ?? true)) {
        throw new Error(`Quest ${id} prerequisite switch not met: ${prerequisite.switchId}`);
      }
    }

    const objectives = {};
    for (const objective of definition.objectives || []) objectives[objective.id] = 0;
    const firstTalk = (definition.objectives || []).find(objective => objective.type === 'talk' && objective.target === definition.giver && /^speak-|^meet-|^talk-/.test(objective.id));
    if (firstTalk) objectives[firstTalk.id] = Math.min(Number(firstTalk.count) || 1, 1);

    const quest = {
      id: key,
      name: definition.name,
      stage: Number(definition.stage) || 0,
      status: 'active',
      objectives,
      started: true
    };
    this.state.quests.set(key, quest);
    this.state.setSw(`quest:${key}:active`, true);
    this.#refreshQuest(key);
    return this.questState(key);
  }

  progressObjective(questId, objectiveId, amount = 1) {
    const key = String(questId);
    const definition = this.quests.get(key);
    const quest = this.state.quests.get(key);
    if (!definition || !quest || quest.status === 'complete') return null;
    const objective = (definition.objectives || []).find(entry => String(entry.id) === String(objectiveId));
    if (!objective) throw new Error(`Unknown objective ${objectiveId} for quest ${questId}`);
    const target = Math.max(1, Number(objective.count) || 1);
    quest.objectives[objective.id] = Math.min(target, Math.max(0, Number(quest.objectives[objective.id]) || 0) + Number(amount || 0));
    this.state.quests.set(key, quest);
    this.#refreshQuest(key);
    return this.questState(key);
  }

  recordBattle(enemyTags = []) {
    const tags = new Set((enemyTags || []).map(String));
    for (const [questId, quest] of this.state.quests) {
      if (!['active', 'ready'].includes(quest.status)) continue;
      const definition = this.quests.get(questId);
      for (const objective of definition?.objectives || []) {
        if (objective.type !== 'battle' || !objective.targetTag || !tags.has(String(objective.targetTag))) continue;
        this.progressObjective(questId, objective.id, 1);
      }
    }
  }

  recordTalk(npcId) {
    for (const [questId, quest] of this.state.quests) {
      if (quest.status !== 'active') continue;
      const definition = this.quests.get(questId);
      const pending = (definition?.objectives || []).find(objective => {
        if (objective.type !== 'talk' || String(objective.target) !== String(npcId)) return false;
        const target = Math.max(1, Number(objective.count) || 1);
        return (Number(quest.objectives[objective.id]) || 0) < target && !/^return-/.test(objective.id);
      });
      if (pending) this.progressObjective(questId, pending.id, 1);
    }
  }

  completeQuest(id) {
    const key = String(id);
    const definition = this.quests.get(key);
    const quest = this.state.quests.get(key);
    if (!definition || !quest) throw new Error(`Cannot complete inactive quest ${id}`);
    if (quest.status === 'complete') return clone(quest);
    if (quest.status !== 'ready') throw new Error(`Quest ${id} is not ready to complete`);

    for (const objective of definition.objectives || []) {
      if (objective.type === 'talk' && /^return-/.test(objective.id)) quest.objectives[objective.id] = Math.max(1, Number(objective.count) || 1);
    }
    quest.status = 'complete';
    quest.completed = true;
    this.state.quests.set(key, quest);
    this.state.setSw(`quest:${key}:active`, false);
    this.state.setSw(`quest:${key}:ready`, false);
    this.state.setSw(`quest:${key}:complete`, true);

    const rewards = definition.rewards || {};
    if (Number(rewards.gold)) this.state.setVariable('gold', Number(this.state.variable('gold')) + Number(rewards.gold));
    for (const reward of rewards.items || []) this.state.gain('items', reward.id, Number(reward.count) || 1);
    for (const unlock of definition.unlocks || []) {
      const suffix = String(unlock).replace(/^waystitch-/, '');
      this.state.setSw(`waystitch:${suffix}:unlocked`, true);
    }
    return this.questState(key);
  }

  giveItem(itemId, count = 1) {
    if (!this.items.has(String(itemId))) throw new Error(`Unknown item ${itemId}`);
    return this.state.gain('items', itemId, Number(count) || 1);
  }

  activateWaystitch(id) {
    const key = String(id);
    if (key !== 'elyndor-first-waystitch' && !this.waystitches.has(key)) throw new Error(`Unknown Waystitch ${id}`);
    const suffix = key === 'elyndor-first-waystitch' ? 'elyndor-first' : key.replace(/^waystitch-/, '');
    this.state.setSw(`waystitch:${suffix}:active`, true);
    return true;
  }

  emit(name, payload = {}) {
    if (name === 'quest.start') return this.startQuest(payload.questId);
    if (name === 'quest.objective') return this.progressObjective(payload.questId, payload.objectiveId, payload.amount ?? 1);
    if (name === 'quest.complete') return this.completeQuest(payload.questId);
    if (name === 'inventory.give') return this.giveItem(payload.itemId, payload.count ?? 1);
    if (name === 'waystitch.activate') return this.activateWaystitch(payload.waystitchId);
    throw new Error(`Unknown Plushbound game hook ${name}`);
  }

  #refreshQuest(id) {
    const key = String(id);
    const definition = this.quests.get(key);
    const quest = this.state.quests.get(key);
    if (!definition || !quest || quest.status === 'complete') return;
    const requiredBeforeTurnIn = (definition.objectives || []).filter(objective => !(objective.type === 'talk' && /^return-/.test(objective.id)));
    const ready = requiredBeforeTurnIn.every(objective => {
      const target = Math.max(1, Number(objective.count) || 1);
      return (Number(quest.objectives[objective.id]) || 0) >= target;
    });
    quest.status = ready ? 'ready' : 'active';
    this.state.quests.set(key, quest);
    this.state.setSw(`quest:${key}:active`, !ready);
    this.state.setSw(`quest:${key}:ready`, ready);
  }
}
