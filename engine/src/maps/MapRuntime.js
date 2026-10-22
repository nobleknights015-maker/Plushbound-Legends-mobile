export class MapRuntime {
  constructor({ state, maps = new Map(), logger = console } = {}) {
    if (!state) throw new Error('MapRuntime requires state');
    this.state = state;
    this.maps = maps instanceof Map ? maps : new Map(Object.entries(maps || {}));
    this.logger = logger;
    this.current = null;
  }

  register(mapData) {
    if (!mapData?.id) throw new Error('Map data requires id');
    this.maps.set(String(mapData.id), structuredClone(mapData));
  }

  load(mapId, x = 0, y = 0, direction = 2) {
    const map = this.maps.get(String(mapId));
    if (!map) throw new Error(`Unknown map ${mapId}`);
    this.current = structuredClone(map);
    this.state.map = { ...this.state.map, id: map.id, x, y, direction };
    return this.current;
  }

  transfer(mapId, x, y, direction = 2) {
    return this.load(mapId, x, y, direction);
  }

  inBounds(x, y) {
    if (!this.current) return false;
    return x >= 0 && y >= 0 && x < this.current.width && y < this.current.height;
  }

  tileIndex(x, y) {
    return y * this.current.width + x;
  }

  tileAt(x, y, layer = 'ground') {
    if (!this.inBounds(x, y)) return null;
    const source = this.current.layers?.[layer];
    if (!source) return null;
    return source[this.tileIndex(x, y)] ?? null;
  }

  regionAt(x, y) {
    if (!this.inBounds(x, y)) return 0;
    return Number(this.current.regions?.[this.tileIndex(x, y)] || 0);
  }

  isPassable(x, y) {
    if (!this.inBounds(x, y)) return false;
    if (this.current.blocked?.includes(`${x},${y}`)) return false;
    return true;
  }

  canMove(dx, dy) {
    const x = this.state.map.x + dx;
    const y = this.state.map.y + dy;
    return this.isPassable(x, y) && !this.eventsAt(x, y).some(event => event.through !== true && event.active !== false);
  }

  move(dx, dy) {
    if (!this.canMove(dx, dy)) return false;
    this.state.map.x += dx;
    this.state.map.y += dy;
    this.state.system.steps += 1;
    return true;
  }

  eventsAt(x, y) {
    if (!this.current) return [];
    return (this.current.events || [])
      .filter(event => event.x === x && event.y === y)
      .map(event => this.resolveEvent(event))
      .filter(Boolean);
  }

  resolveEvent(event) {
    const pages = event.pages || [];
    for (let index = pages.length - 1; index >= 0; index -= 1) {
      const page = pages[index];
      if (this.pageMatches(event, page)) {
        return { ...event, ...page, pageIndex: index, id: event.id, x: event.x, y: event.y };
      }
    }
    return null;
  }

  pageMatches(event, page) {
    const c = page.conditions || {};
    if (c.switchId != null && this.state.sw(c.switchId) !== (c.switchValue ?? true)) return false;
    if (c.variableId != null) {
      const value = Number(this.state.variable(c.variableId));
      const target = Number(c.variableValue ?? 0);
      const op = c.variableOp || '>=';
      if (op === '>=' && !(value >= target)) return false;
      if (op === '>' && !(value > target)) return false;
      if (op === '<=' && !(value <= target)) return false;
      if (op === '<' && !(value < target)) return false;
      if (op === '==' && !(value === target)) return false;
      if (op === '!=' && !(value !== target)) return false;
    }
    if (c.selfSwitch) {
      const expected = c.selfSwitchValue ?? true;
      if (this.state.selfSw(this.current.id, event.id, c.selfSwitch) !== expected) return false;
    }
    return true;
  }

  triggerEvents(trigger = 'action', x = this.state.map.x, y = this.state.map.y) {
    return this.eventsAt(x, y).filter(event => (event.trigger || 'action') === trigger);
  }
}
