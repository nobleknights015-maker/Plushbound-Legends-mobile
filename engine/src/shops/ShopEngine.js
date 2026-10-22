export class ShopEngine {
  constructor({ state } = {}) {
    if (!state) throw new Error('ShopEngine requires state');
    this.state = state;
    this.goods = [];
    this.active = false;
  }

  open(goods = []) {
    this.goods = goods.map(g => ({ kind: g.kind || 'items', id: g.id, price: Math.max(0, Number(g.price || 0)), stock: g.stock == null ? null : Math.max(0, Number(g.stock)) }));
    this.active = true;
    return this.snapshot();
  }

  close() { this.active = false; }

  gold() { return Number(this.state.system.gold || 0); }

  buy(index, amount = 1) {
    if (!this.active) throw new Error('Shop is not open');
    const good = this.goods[index];
    if (!good) throw new Error('Unknown shop good');
    const qty = Math.max(1, Math.floor(Number(amount) || 1));
    if (good.stock != null && qty > good.stock) return false;
    const total = good.price * qty;
    if (this.gold() < total) return false;
    this.state.system.gold = this.gold() - total;
    this.state.gain(good.kind, good.id, qty);
    if (good.stock != null) good.stock -= qty;
    return true;
  }

  sell(kind, id, amount = 1, unitPrice = 0) {
    if (!this.active) throw new Error('Shop is not open');
    const bag = this.state.inventory[kind];
    if (!bag) throw new Error(`Unknown inventory kind ${kind}`);
    const qty = Math.max(1, Math.floor(Number(amount) || 1));
    const have = Number(bag.get(String(id)) || 0);
    if (have < qty) return false;
    this.state.gain(kind, id, -qty);
    this.state.system.gold = this.gold() + Math.max(0, Number(unitPrice) || 0) * qty;
    return true;
  }

  snapshot() {
    return { active: this.active, gold: this.gold(), goods: this.goods.map(g => ({ ...g })) };
  }
}
