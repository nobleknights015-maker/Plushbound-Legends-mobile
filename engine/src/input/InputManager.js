export class InputManager {
  constructor({ bindings = {}, touchDeadzone = 12 } = {}) {
    this.bindings = new Map();
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.context = 'default';
    this.locked = false;
    this.touchDeadzone = Math.max(0, Number(touchDeadzone) || 0);
    this.pointer = { active: false, id: null, startX: 0, startY: 0, x: 0, y: 0 };
    for (const [context, map] of Object.entries(bindings)) this.setBindings(context, map);
  }

  setBindings(context, map = {}) {
    this.bindings.set(String(context), { ...map });
  }

  setContext(context = 'default') {
    this.context = String(context || 'default');
    this.clearTransient();
  }

  setLocked(locked = true) {
    const next = locked === true;
    if (this.locked === next) return this.locked;
    this.locked = next;
    this.clearAll();
    return this.locked;
  }

  isLocked() { return this.locked; }

  actionForPhysical(key) {
    if (this.locked) return null;
    const current = this.bindings.get(this.context) || {};
    const fallback = this.bindings.get('default') || {};
    return current[key] || fallback[key] || null;
  }

  keyDown(key) {
    if (this.locked) return false;
    const action = this.actionForPhysical(key);
    if (!action) return false;
    if (!this.down.has(action)) this.pressed.add(action);
    this.down.add(action);
    return true;
  }

  keyUp(key) {
    if (this.locked) return false;
    const action = this.actionForPhysical(key);
    if (!action) return false;
    if (this.down.delete(action)) this.released.add(action);
    return true;
  }

  isDown(action) { return !this.locked && this.down.has(action); }
  wasPressed(action) { return !this.locked && this.pressed.has(action); }
  wasReleased(action) { return !this.locked && this.released.has(action); }

  update() { this.clearTransient(); }

  clearTransient() {
    this.pressed.clear();
    this.released.clear();
  }

  clearAll() {
    this.down.clear();
    this.clearTransient();
    this.pointer = { active: false, id: null, startX: 0, startY: 0, x: 0, y: 0 };
  }

  pointerDown({ id = 0, x = 0, y = 0 } = {}) {
    if (this.locked) return false;
    this.pointer = { active: true, id, startX: x, startY: y, x, y };
    return true;
  }

  pointerMove({ id = 0, x = 0, y = 0 } = {}) {
    if (this.locked || !this.pointer.active || this.pointer.id !== id) return null;
    this.pointer.x = x;
    this.pointer.y = y;
    const dx = x - this.pointer.startX;
    const dy = y - this.pointer.startY;
    if (Math.hypot(dx, dy) < this.touchDeadzone) return null;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  pointerUp({ id = 0, x = 0, y = 0 } = {}) {
    if (this.locked || !this.pointer.active || this.pointer.id !== id) return null;
    const dx = x - this.pointer.startX;
    const dy = y - this.pointer.startY;
    const distance = Math.hypot(dx, dy);
    const result = distance < this.touchDeadzone ? { type: 'tap', x, y } : { type: 'swipe', direction: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'), x, y };
    this.pointer = { active: false, id: null, startX: 0, startY: 0, x: 0, y: 0 };
    return result;
  }
}
