export class MenuModel {
  constructor({ commands = [], wrap = true } = {}) {
    this.commands = commands.map(normalizeCommand);
    this.wrap = !!wrap;
    this.index = this.#firstEnabledIndex();
    this.opened = false;
  }

  open(index = null) {
    this.opened = true;
    if (Number.isInteger(index) && this.#isEnabled(index)) this.index = index;
    else if (!this.#isEnabled(this.index)) this.index = this.#firstEnabledIndex();
    return this.current();
  }

  close() {
    this.opened = false;
  }

  current() {
    return this.commands[this.index] ?? null;
  }

  setEnabled(id, enabled) {
    const command = this.commands.find(c => c.id === String(id));
    if (!command) return false;
    command.enabled = !!enabled;
    if (!this.#isEnabled(this.index)) this.index = this.#firstEnabledIndex();
    return true;
  }

  move(delta) {
    if (!this.commands.length || !this.commands.some(c => c.enabled)) return null;
    const step = Math.sign(Number(delta) || 0);
    if (!step) return this.current();
    let next = this.index;
    for (let attempts = 0; attempts < this.commands.length; attempts++) {
      next += step;
      if (this.wrap) next = (next + this.commands.length) % this.commands.length;
      else next = Math.max(0, Math.min(this.commands.length - 1, next));
      if (this.#isEnabled(next)) {
        this.index = next;
        break;
      }
      if (!this.wrap && (next === 0 || next === this.commands.length - 1)) break;
    }
    return this.current();
  }

  select() {
    if (!this.opened) return { accepted: false, reason: 'closed' };
    const command = this.current();
    if (!command?.enabled) return { accepted: false, reason: 'disabled' };
    return { accepted: true, command: { ...command } };
  }

  snapshot() {
    return { index: this.index, opened: this.opened, enabled: Object.fromEntries(this.commands.map(c => [c.id, c.enabled])) };
  }

  restore(raw = {}) {
    for (const command of this.commands) {
      if (raw.enabled && Object.hasOwn(raw.enabled, command.id)) command.enabled = !!raw.enabled[command.id];
    }
    this.opened = !!raw.opened;
    const requested = Number(raw.index);
    this.index = this.#isEnabled(requested) ? requested : this.#firstEnabledIndex();
  }

  #isEnabled(index) {
    return Number.isInteger(index) && !!this.commands[index]?.enabled;
  }

  #firstEnabledIndex() {
    const index = this.commands.findIndex(c => c.enabled);
    return index >= 0 ? index : 0;
  }
}

function normalizeCommand(command, index) {
  if (typeof command === 'string') return { id: command, label: command, enabled: true };
  const id = command?.id ?? `command-${index}`;
  return { id: String(id), label: String(command?.label ?? id), enabled: command?.enabled !== false, symbol: command?.symbol ?? null };
}
