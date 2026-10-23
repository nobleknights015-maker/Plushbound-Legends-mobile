import { PlushboundGameSession } from '../../game/runtime/PlushboundGameSession.js';
import { clone } from './editor-core.js';

export class EditorPlaytest {
  constructor({ mapPackage, contentPackages = [], mapId, x = 0, y = 0, direction = 2, encounter = {} } = {}) {
    if (!mapPackage?.maps?.length) throw new Error('Playtest requires a map package');
    const startMap = mapPackage.maps.find(map => map.id === mapId) || mapPackage.maps[0];
    this.session = new PlushboundGameSession({
      mapPackage: clone(mapPackage),
      contentPackages: clone(contentPackages),
      encounter,
      logger: { error() {} }
    });
    const start = this.findPassableStart(startMap, x, y);
    this.session.enter(startMap.id, start.x, start.y, direction);
  }

  findPassableStart(map, preferredX = 0, preferredY = 0) {
    const px = Math.max(0, Math.min(map.width - 1, Number(preferredX) || 0));
    const py = Math.max(0, Math.min(map.height - 1, Number(preferredY) || 0));
    const blocked = new Set(map.blocked || []);
    const occupied = new Set((map.events || []).filter(event => event.through !== true).map(event => `${event.x},${event.y}`));
    if (!blocked.has(`${px},${py}`) && !occupied.has(`${px},${py}`)) return { x: px, y: py };
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      if (!blocked.has(`${x},${y}`) && !occupied.has(`${x},${y}`)) return { x, y };
    }
    throw new Error(`No passable preview start on ${map.id}`);
  }

  move(dx, dy) {
    return this.session.move(dx, dy);
  }

  interactableEvents() {
    const { x, y } = this.session.state.map;
    const positions = [
      [x, y], [x, y + 1], [x - 1, y], [x + 1, y], [x, y - 1]
    ];
    const result = [];
    for (const [tx, ty] of positions) {
      for (const event of this.session.maps.eventsAt(tx, ty)) {
        if ((event.trigger || 'action') !== 'action') continue;
        if (!result.some(item => item.id === event.id)) result.push({ id: event.id, x: tx, y: ty, assetId: event.assetId || null });
      }
    }
    return result;
  }

  interact(eventId) {
    return this.session.interact(eventId);
  }

  snapshot() {
    const snapshot = this.session.snapshot();
    return {
      ...snapshot,
      encounterPreview: this.session.encounterPreview(),
      interactableEvents: this.interactableEvents()
    };
  }
}
