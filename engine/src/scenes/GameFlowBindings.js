export class GameFlowBindings {
  constructor({ frontDoor = null, saves = null, shop = null, battle = null, state = null, onNavigate = null, onNotify = null } = {}) {
    this.frontDoor = frontDoor;
    this.saves = saves;
    this.shop = shop;
    this.battle = battle;
    this.state = state;
    this.onNavigate = typeof onNavigate === 'function' ? onNavigate : null;
    this.onNotify = typeof onNotify === 'function' ? onNotify : null;
  }

  notify(type, detail = {}) {
    const event = { type, ...detail };
    this.onNotify?.(event);
    return event;
  }

  navigate(target, detail = {}) {
    const event = { target, ...detail };
    this.onNavigate?.(event);
    return event;
  }

  handlersFor(sceneType, context = {}) {
    switch (sceneType) {
      case 'title': return this.titleHandlers(context);
      case 'save': return this.saveHandlers(context);
      case 'load': return this.loadHandlers(context);
      case 'shop': return this.shopHandlers(context);
      case 'quests': return this.questHandlers(context);
      case 'battle': return this.battleHandlers(context);
      default: return { back: () => this.navigate('back') };
    }
  }

  titleHandlers() {
    return {
      'new-game': async () => {
        const result = this.frontDoor?.beginNewGame?.();
        this.navigate('creator', { result });
        return result;
      },
      continue: async () => {
        const result = await this.frontDoor?.continueLatest?.();
        if (!result) return this.notify('continue-unavailable');
        this.navigate('field', { result });
        return result;
      },
      options: async () => this.navigate('options'),
      back: async () => this.notify('back-ignored', { scene: 'title' })
    };
  }

  saveHandlers({ slots = [] } = {}) {
    const handlers = { back: async () => this.navigate('menu') };
    for (const slot of slots) {
      const id = String(slot.id ?? slot.slot ?? '');
      if (!id) continue;
      handlers[id] = async () => {
        const slotValue = slot.slot ?? slot.id;
        const result = await this.saves?.save?.(slotValue, { label: slot.label ?? null, extra: slot.extra ?? null });
        this.notify('saved', { slot: slotValue, result });
        return result;
      };
    }
    return handlers;
  }

  loadHandlers({ slots = [] } = {}) {
    const handlers = { back: async () => this.navigate('menu') };
    for (const slot of slots) {
      const id = String(slot.id ?? slot.slot ?? '');
      if (!id || slot.valid === false) continue;
      handlers[id] = async () => {
        const slotValue = slot.slot ?? slot.id;
        const result = await this.saves?.load?.(slotValue);
        if (!result) return this.notify('load-missing', { slot: slotValue });
        this.navigate('field', { slot: slotValue, result });
        return result;
      };
    }
    return handlers;
  }

  shopHandlers({ mode = 'buy', rows = [] } = {}) {
    const handlers = { back: async () => { this.shop?.close?.(); return this.navigate('field'); } };
    for (const row of rows) {
      const id = String(row.id ?? row.commandId ?? '');
      if (!id) continue;
      handlers[id] = async () => {
        let ok = false;
        if (mode === 'sell') {
          ok = !!this.shop?.sell?.(row.kind || 'items', row.itemId ?? row.id, row.amount ?? 1, row.unitPrice ?? row.price ?? 0);
        } else {
          const index = Number.isInteger(row.shopIndex) ? row.shopIndex : Number(row.index);
          ok = !!this.shop?.buy?.(index, row.amount ?? 1);
        }
        this.notify(ok ? 'shop-transaction-complete' : 'shop-transaction-rejected', { id, mode });
        return ok;
      };
    }
    return handlers;
  }

  questHandlers({ rows = [] } = {}) {
    const handlers = { back: async () => this.navigate('menu') };
    for (const row of rows) {
      const id = String(row.id ?? row.questId ?? '');
      if (!id) continue;
      handlers[id] = async () => {
        const questId = String(row.questId ?? row.id);
        const quest = this.state?.quests?.get?.(questId) ?? row.quest ?? null;
        this.notify('quest-selected', { questId, quest });
        return quest;
      };
    }
    return handlers;
  }

  battleHandlers({ commands = [] } = {}) {
    const handlers = { back: async () => this.notify('battle-back') };
    for (const command of commands) {
      const id = String(command.id ?? command.commandId ?? '');
      if (!id) continue;
      handlers[id] = async () => {
        if (typeof command.execute === 'function') return command.execute(this.battle);
        if (typeof this.battle?.command === 'function') return this.battle.command(command);
        if (typeof this.battle?.act === 'function') return this.battle.act(command);
        return this.notify('battle-command-selected', { id, command });
      };
    }
    return handlers;
  }
}
