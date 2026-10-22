function inside(rect, x, y) {
  if (!rect) return false;
  const rx = Number(rect.x) || 0;
  const ry = Number(rect.y) || 0;
  const rw = Number(rect.width) || 0;
  const rh = Number(rect.height) || 0;
  return x >= rx && y >= ry && x < rx + rw && y < ry + rh;
}

export class LiveInputRouter {
  constructor({ input = null, mapPoint = null, onAction = null } = {}) {
    this.input = input;
    this.mapPoint = typeof mapPoint === 'function' ? mapPoint : ((x, y) => ({ x, y }));
    this.onAction = typeof onAction === 'function' ? onAction : null;
    this.scene = null;
    this.element = null;
    this.listeners = null;
  }

  setScene(scene = null) {
    this.scene = scene;
    return this;
  }

  hitTest(x, y, scene = this.scene) {
    const items = [];
    for (const layer of scene?.layers || []) {
      for (const item of layer.model?.items || []) items.push(item);
    }
    for (const collection of [scene?.commands, scene?.items, scene?.rows, scene?.slots]) {
      if (Array.isArray(collection)) items.push(...collection);
    }
    return items.find(item => item?.enabled !== false && inside(item.rect, x, y)) || null;
  }

  actionFromTap(x, y, scene = this.scene) {
    const item = this.hitTest(x, y, scene);
    if (!item) return null;
    return {
      type: 'activate',
      id: item.id ?? item.commandId ?? item.slotId ?? null,
      index: Number.isInteger(item.index) ? item.index : null,
      item
    };
  }

  dispatch(action) {
    if (!action) return null;
    this.onAction?.(action);
    return action;
  }

  pointerDown(event = {}) {
    if (this.input?.isLocked?.()) return null;
    const point = this.mapPoint(event.clientX, event.clientY);
    this.input?.pointerDown?.({ id: event.pointerId ?? 0, ...point });
    return point;
  }

  pointerMove(event = {}) {
    if (this.input?.isLocked?.()) return null;
    const point = this.mapPoint(event.clientX, event.clientY);
    const direction = this.input?.pointerMove?.({ id: event.pointerId ?? 0, ...point }) || null;
    if (direction) return this.dispatch({ type: 'navigate', direction });
    return null;
  }

  pointerUp(event = {}) {
    if (this.input?.isLocked?.()) return null;
    const point = this.mapPoint(event.clientX, event.clientY);
    const gesture = this.input?.pointerUp?.({ id: event.pointerId ?? 0, ...point }) || null;
    if (!gesture) return null;
    if (gesture.type === 'tap') return this.dispatch(this.actionFromTap(gesture.x, gesture.y) || { type: 'tap', x: gesture.x, y: gesture.y });
    return this.dispatch({ type: 'navigate', direction: gesture.direction });
  }

  attach(element) {
    this.detach();
    if (!element?.addEventListener) return false;
    this.element = element;
    this.listeners = {
      down: event => { event.preventDefault?.(); element.setPointerCapture?.(event.pointerId); this.pointerDown(event); },
      move: event => { event.preventDefault?.(); this.pointerMove(event); },
      up: event => { event.preventDefault?.(); this.pointerUp(event); },
      cancel: () => this.input?.clearAll?.()
    };
    element.addEventListener('pointerdown', this.listeners.down, { passive: false });
    element.addEventListener('pointermove', this.listeners.move, { passive: false });
    element.addEventListener('pointerup', this.listeners.up, { passive: false });
    element.addEventListener('pointercancel', this.listeners.cancel, { passive: false });
    return true;
  }

  detach() {
    if (!this.element || !this.listeners) return false;
    this.element.removeEventListener?.('pointerdown', this.listeners.down);
    this.element.removeEventListener?.('pointermove', this.listeners.move);
    this.element.removeEventListener?.('pointerup', this.listeners.up);
    this.element.removeEventListener?.('pointercancel', this.listeners.cancel);
    this.element = null;
    this.listeners = null;
    return true;
  }
}
