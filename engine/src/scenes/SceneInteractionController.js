function clone(value) { return value == null ? value : structuredClone(value); }

function interactiveItems(scene = {}) {
  const items = [];
  for (const layer of scene.layers || []) {
    for (const item of layer.model?.items || []) items.push(item);
  }
  for (const collection of [scene.commands, scene.items, scene.rows, scene.slots]) {
    if (Array.isArray(collection)) items.push(...collection);
  }
  return items.filter(item => item && item.enabled !== false);
}

export class SceneInteractionController {
  constructor({ render = null, handlers = {}, onBack = null } = {}) {
    this.render = typeof render === 'function' ? render : null;
    this.handlers = new Map();
    this.onBack = typeof onBack === 'function' ? onBack : null;
    this.scene = null;
    this.selectedIndex = 0;
    for (const [sceneType, sceneHandlers] of Object.entries(handlers)) {
      for (const [id, handler] of Object.entries(sceneHandlers || {})) this.register(sceneType, id, handler);
    }
  }

  register(sceneType, id, handler) {
    if (typeof handler !== 'function') throw new Error('Scene interaction handler must be a function');
    this.handlers.set(`${String(sceneType || '*')}:${String(id)}`, handler);
    return this;
  }

  setScene(scene = null, { preserveSelection = false } = {}) {
    this.scene = scene;
    const items = interactiveItems(scene);
    if (!preserveSelection || this.selectedIndex >= items.length) {
      const selected = items.findIndex(item => item.selected === true);
      this.selectedIndex = selected >= 0 ? selected : 0;
    }
    this.#applySelection(false);
    return this.scene;
  }

  currentItem() {
    return interactiveItems(this.scene)[this.selectedIndex] || null;
  }

  navigate(direction) {
    const items = interactiveItems(this.scene);
    if (!items.length) return null;
    const delta = direction === 'up' || direction === 'left' ? -1 : direction === 'down' || direction === 'right' ? 1 : 0;
    if (!delta) return this.currentItem();
    this.selectedIndex = (this.selectedIndex + delta + items.length) % items.length;
    this.#applySelection(true);
    return this.currentItem();
  }

  async activate(id = null, action = {}) {
    const item = id == null ? this.currentItem() : interactiveItems(this.scene).find(entry => String(entry.id ?? entry.commandId ?? entry.slotId) === String(id));
    if (!item || item.enabled === false) return null;
    const itemId = item.id ?? item.commandId ?? item.slotId ?? null;
    const sceneType = String(this.scene?.type || '*');
    const handler = this.handlers.get(`${sceneType}:${String(itemId)}`) || this.handlers.get(`*:${String(itemId)}`) || null;
    if (!handler) return { type: 'activate', id: itemId, item: clone(item), unhandled: true };
    return handler({ id: itemId, item: clone(item), scene: this.scene, action, controller: this });
  }

  async back(action = {}) {
    if (!this.onBack) return { type: 'back', unhandled: true };
    return this.onBack({ scene: this.scene, action, controller: this });
  }

  async handle(action = {}) {
    if (!action) return null;
    if (action.type === 'navigate') return this.navigate(action.direction);
    if (action.type === 'activate') return this.activate(action.id, action);
    if (action.type === 'back') return this.back(action);
    return action;
  }

  #applySelection(shouldRender) {
    const items = interactiveItems(this.scene);
    for (let index = 0; index < items.length; index += 1) items[index].selected = index === this.selectedIndex;
    if (shouldRender) this.render?.(this.scene);
  }
}
