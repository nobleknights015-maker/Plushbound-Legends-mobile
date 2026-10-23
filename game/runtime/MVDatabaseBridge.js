const CATEGORY_DEFINITIONS = Object.freeze({
  actors: { global: '$dataActors', keys: ['actors'] },
  classes: { global: '$dataClasses', keys: ['classes'] },
  skills: { global: '$dataSkills', keys: ['skills'] },
  items: { global: '$dataItems', keys: ['items'] },
  weapons: { global: '$dataWeapons', keys: ['weapons'] },
  armors: { global: '$dataArmors', keys: ['armors', 'armor'] },
  enemies: { global: '$dataEnemies', keys: ['enemies'] },
  troops: { global: '$dataTroops', keys: ['troops'] },
  states: { global: '$dataStates', keys: ['states'] },
  animations: { global: '$dataAnimations', keys: ['animations'] },
  tilesets: { global: '$dataTilesets', keys: ['tilesets'] },
  commonEvents: { global: '$dataCommonEvents', keys: ['commonEvents', 'common_events'] }
});

function clone(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function records(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function sourceId(record) { return String(record?.id ?? '').trim(); }
function positiveInteger(value) { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : 0; }
function define(scope, name, value) {
  try { scope[name] = value; } catch { Object.defineProperty(scope, name, { configurable: true, writable: true, value }); }
  return value;
}

export function extractMVMetadata(note = '') {
  const meta = {};
  const text = String(note || '');
  const regexp = /<([^<>:]+)(:?)([^>]*)>/g;
  let match;
  while ((match = regexp.exec(text))) meta[match[1]] = match[2] === ':' ? match[3].trim() : true;
  return meta;
}

export function normalizeMVDatabaseIdRegistry(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const ids = {};
  for (const category of ['maps', ...Object.keys(CATEGORY_DEFINITIONS)]) {
    ids[category] = {};
    const entries = source.ids?.[category] || source[category] || {};
    for (const [id, numeric] of Object.entries(entries)) {
      const n = positiveInteger(numeric);
      if (id && n) ids[category][String(id)] = n;
    }
  }
  return { schemaVersion: Number(source.schemaVersion || 1), target: String(source.target || 'RPG Maker MV 1.6.x'), ids };
}

export function validateMVDatabaseIdRegistry(raw = {}) {
  const registry = normalizeMVDatabaseIdRegistry(raw), issues = [];
  for (const [category, entries] of Object.entries(registry.ids)) {
    const used = new Map();
    for (const [id, numeric] of Object.entries(entries)) {
      if (!id) issues.push({ severity: 'error', code: 'missing-source-id', category, message: `${category} contains an empty source id` });
      if (!positiveInteger(numeric)) issues.push({ severity: 'error', code: 'invalid-numeric-id', category, id, message: `${category}:${id} must use a positive MV id` });
      if (used.has(numeric)) issues.push({ severity: 'error', code: 'duplicate-numeric-id', category, id, message: `${category} MV id ${numeric} is already assigned to ${used.get(numeric)}` });
      used.set(numeric, id);
    }
  }
  return issues;
}

export function collectMVDatabaseRecords(contentPackages = []) {
  const output = Object.fromEntries(Object.keys(CATEGORY_DEFINITIONS).map(category => [category, []]));
  const seen = Object.fromEntries(Object.keys(CATEGORY_DEFINITIONS).map(category => [category, new Set()]));
  for (const pkg of contentPackages || []) {
    if (!pkg || typeof pkg !== 'object') continue;
    for (const [category, definition] of Object.entries(CATEGORY_DEFINITIONS)) {
      for (const key of definition.keys) {
        if (!Object.prototype.hasOwnProperty.call(pkg, key)) continue;
        for (const record of records(pkg[key])) {
          const id = sourceId(record);
          if (!id) continue;
          if (seen[category].has(id)) throw new Error(`Duplicate MV database source id ${category}:${id}`);
          seen[category].add(id);
          output[category].push(clone(record));
        }
      }
    }
  }
  return output;
}

function buildMapping(category, sourceRecords, registryEntries = {}) {
  const numericById = new Map(), idByNumeric = new Map(), missing = [];
  for (const [id, value] of Object.entries(registryEntries || {})) {
    const numeric = positiveInteger(value);
    if (!numeric) continue;
    if (idByNumeric.has(numeric) && idByNumeric.get(numeric) !== id) throw new Error(`Duplicate MV id ${numeric} in ${category}`);
    numericById.set(String(id), numeric); idByNumeric.set(numeric, String(id));
  }
  let next = Math.max(0, ...idByNumeric.keys()) + 1;
  for (const record of [...sourceRecords].sort((a, b) => sourceId(a).localeCompare(sourceId(b)))) {
    const id = sourceId(record);
    if (numericById.has(id)) continue;
    while (idByNumeric.has(next)) next++;
    numericById.set(id, next); idByNumeric.set(next, id); missing.push({ category, id, assigned: next }); next++;
  }
  return { numericById, idByNumeric, missing };
}

function baseRecord(record, id, kind) {
  const copy = clone(record) || {};
  const note = String(copy.note || '');
  return { ...copy, id, _plushboundId: sourceId(record), _plushboundKind: kind, name: String(copy.name || copy.title || sourceId(record)), note, meta: { ...extractMVMetadata(note), ...(copy.meta || {}) } };
}

function damageDefaults(damage = {}) {
  return { type: 0, elementId: 0, formula: '0', variance: 20, critical: false, ...clone(damage) };
}

function usableDefaults(record, id, kind) {
  const base = baseRecord(record, id, kind);
  return {
    scope: 0, occasion: 0, speed: 0, successRate: 100, repeats: 1, tpGain: 0, hitType: 0,
    animationId: 0, damage: damageDefaults(base.damage), effects: [], traits: [], ...base,
    damage: damageDefaults(base.damage), effects: Array.isArray(base.effects) ? base.effects : [], traits: Array.isArray(base.traits) ? base.traits : []
  };
}

function makeMVRecord(category, record, numericId, mappings) {
  const base = baseRecord(record, numericId, category);
  switch (category) {
    case 'actors': {
      const classId = mappings.classes.numericById.get(String(record.classId ?? record.class ?? '')) || positiveInteger(record.classId) || 1;
      return { nickname: '', profile: String(record.description || ''), characterName: '', characterIndex: 0, faceName: '', faceIndex: 0, battlerName: '', classId, initialLevel: 1, maxLevel: 99, equips: [], traits: [], ...base, classId, traits: Array.isArray(base.traits) ? base.traits : [] };
    }
    case 'classes': return { expParams: [30, 20, 30, 30], params: [], learnings: [], traits: [], ...base, traits: Array.isArray(base.traits) ? base.traits : [] };
    case 'skills': return { stypeId: 1, mpCost: 0, tpCost: 0, message1: '', message2: '', requiredWtypeId1: 0, requiredWtypeId2: 0, ...usableDefaults(record, numericId, category) };
    case 'items': return { itypeId: 1, price: Number(record.price) || 0, consumable: record.consumable ?? String(record.type || '').toLowerCase() === 'consumable', ...usableDefaults(record, numericId, category) };
    case 'weapons': return { wtypeId: 1, etypeId: 1, price: Number(record.price) || 0, animationId: 0, params: Array(8).fill(0), traits: [], ...base, params: Array.isArray(base.params) ? base.params : Array(8).fill(0), traits: Array.isArray(base.traits) ? base.traits : [] };
    case 'armors': return { atypeId: 1, etypeId: Number(record.etypeId) || 2, price: Number(record.price) || 0, params: Array(8).fill(0), traits: [], ...base, params: Array.isArray(base.params) ? base.params : Array(8).fill(0), traits: Array.isArray(base.traits) ? base.traits : [] };
    case 'enemies': {
      const stats = record.stats || {}, rewards = record.rewards || {};
      const params = Array.isArray(record.params) ? record.params : [Number(stats.hp)||1, Number(stats.mp)||0, Number(stats.attack)||1, Number(stats.defense)||1, Number(stats.spirit)||1, Number(stats.spirit)||1, Number(stats.agility)||1, Number(stats.luck)||0];
      const actions = (record.skills || []).map(skill => mappings.skills.numericById.get(String(skill))).filter(Boolean).map(skillId => ({ skillId, rating: 5, conditionType: 0, conditionParam1: 0, conditionParam2: 0 }));
      const dropItems = (rewards.drops || []).map(drop => ({ kind: 1, dataId: mappings.items.numericById.get(String(drop.itemId)) || 0, denominator: drop.chance > 0 ? Math.max(1, Math.round(1 / Number(drop.chance))) : 1 })).filter(drop => drop.dataId > 0);
      return { battlerName: String(record.assets?.battle || record.assetBindings?.battle || record.assetBindings?.sprite || ''), battlerHue: 0, params, exp: Number(rewards.exp)||0, gold: Number(rewards.gold)||0, dropItems, actions, traits: [], ...base, params, exp: Number(rewards.exp)||0, gold: Number(rewards.gold)||0, dropItems, actions, traits: Array.isArray(base.traits) ? base.traits : [] };
    }
    case 'troops': return { members: [], pages: [], ...base, members: Array.isArray(base.members) ? base.members : [], pages: Array.isArray(base.pages) ? base.pages : [] };
    case 'states': return { iconIndex: 0, restriction: 0, priority: 50, removeAtBattleEnd: false, removeByRestriction: false, autoRemovalTiming: 0, minTurns: 1, maxTurns: 1, removeByDamage: false, chanceByDamage: 100, removeByWalking: false, stepsToRemove: 100, message1: '', message2: '', message3: '', message4: '', motion: 0, overlay: 0, traits: [], ...base, traits: Array.isArray(base.traits) ? base.traits : [] };
    case 'animations': return { animation1Name: '', animation1Hue: 0, animation2Name: '', animation2Hue: 0, position: 1, frames: [], timings: [], ...base };
    case 'tilesets': return { mode: 0, tilesetNames: [], flags: [], traits: [], ...base, tilesetNames: Array.isArray(base.tilesetNames) ? base.tilesetNames : [], flags: Array.isArray(base.flags) ? base.flags : [] };
    case 'commonEvents': return { trigger: 0, switchId: 1, list: [], ...base, list: Array.isArray(base.list) ? base.list : [] };
    default: return base;
  }
}

export function buildMVDatabaseTables({ contentPackages = [], maps = [], idRegistry = {} } = {}) {
  const normalized = normalizeMVDatabaseIdRegistry(idRegistry);
  const issues = validateMVDatabaseIdRegistry(normalized).filter(issue => issue.severity === 'error');
  if (issues.length) throw new Error(issues[0].message);
  const source = collectMVDatabaseRecords(contentPackages);
  const mappings = {};
  mappings.maps = buildMapping('maps', maps.map(map => ({ id: map.id, name: map.name })), normalized.ids.maps);
  for (const category of Object.keys(CATEGORY_DEFINITIONS)) mappings[category] = buildMapping(category, source[category], normalized.ids[category]);
  const tables = {};
  for (const [category, definition] of Object.entries(CATEGORY_DEFINITIONS)) {
    const mapping = mappings[category];
    const maxId = Math.max(0, ...mapping.idByNumeric.keys());
    const table = Array(maxId + 1).fill(null); table[0] = null;
    for (const record of source[category]) {
      const id = mapping.numericById.get(sourceId(record));
      table[id] = makeMVRecord(category, record, id, mappings);
    }
    tables[category] = { ...mapping, global: definition.global, table };
  }
  const missing = Object.values(mappings).flatMap(mapping => mapping.missing || []);
  return { registry: normalized, source, mappings, tables, missing };
}

function systemRecord(contentPackages = []) {
  const found = (contentPackages || []).map(pkg => pkg?.system).find(value => value && typeof value === 'object') || {};
  return {
    gameTitle: 'Plushbound Legends', currencyUnit: 'G', locale: 'en_US', startMapId: 1, startX: 0, startY: 0,
    elements: [''], skillTypes: [''], weaponTypes: [''], armorTypes: [''], equipTypes: ['', 'Weapon', 'Shield', 'Head', 'Body', 'Accessory'],
    switches: [''], variables: [''], terms: { basic: [], commands: [], params: [], messages: {} }, ...clone(found)
  };
}

export class MVDatabaseBridge {
  constructor({ scope = globalThis, runtime, idRegistry = {} } = {}) {
    if (!runtime?.session) throw new Error('MVDatabaseBridge requires an initialized Plushbound runtime');
    this.scope = scope; this.runtime = runtime; this.idRegistry = normalizeMVDatabaseIdRegistry(idRegistry); this.snapshotData = null;
  }

  install({ mvPlugins = this.runtime.mvPlugins } = {}) {
    const maps = [...this.runtime.session.maps.maps.values()];
    this.snapshotData = buildMVDatabaseTables({ contentPackages: this.runtime.contentPackages || [], maps, idRegistry: this.idRegistry });
    for (const record of Object.values(this.snapshotData.tables)) define(this.scope, record.global, record.table);
    define(this.scope, '$dataSystem', systemRecord(this.runtime.contentPackages));
    const mapInfos = Array(Math.max(0, ...this.snapshotData.mappings.maps.idByNumeric.keys()) + 1).fill(null); mapInfos[0] = null;
    for (const [numeric, source] of this.snapshotData.mappings.maps.idByNumeric) {
      const map = this.runtime.session.maps.maps.get(source);
      if (map) mapInfos[numeric] = { id: numeric, name: String(map.name || source), order: numeric, expanded: false, scrollX: 0, scrollY: 0, _plushboundId: source };
    }
    define(this.scope, '$dataMapInfos', mapInfos);

    if (mvPlugins) {
      mvPlugins.mapIds = this.snapshotData.mappings.maps;
      mvPlugins.items = this.snapshotData.mappings.items;
      mvPlugins.enemies = this.snapshotData.mappings.enemies;
      mvPlugins.refreshDatabaseGlobals?.();
    }

    const dm = this.scope.DataManager || {};
    dm.isActor = value => value?._plushboundKind === 'actors';
    dm.isClass = value => value?._plushboundKind === 'classes';
    dm.isSkill = value => value?._plushboundKind === 'skills';
    dm.isItem = value => value?._plushboundKind === 'items';
    dm.isWeapon = value => value?._plushboundKind === 'weapons';
    dm.isArmor = value => value?._plushboundKind === 'armors';
    dm.isEnemy = value => value?._plushboundKind === 'enemies';
    dm.isState = value => value?._plushboundKind === 'states';
    dm.extractMetadata = data => { if (data && typeof data === 'object') data.meta = extractMVMetadata(data.note || ''); return data; };
    dm.onLoad = object => { if (Array.isArray(object)) { for (const record of object) if (record) dm.extractMetadata(record); } else if (object) dm.extractMetadata(object); };
    dm.isDatabaseLoaded = () => true;
    dm.loadDatabase = () => true;
    define(this.scope, 'DataManager', dm);
    return this;
  }

  numericId(category, id) { return this.snapshotData?.mappings?.[category]?.numericById?.get(String(id)) || 0; }
  sourceId(category, id) { return this.snapshotData?.mappings?.[category]?.idByNumeric?.get(Number(id)) || null; }
  missingRegistryEntries() { return clone(this.snapshotData?.missing || []); }
  snapshot() {
    const counts = {};
    for (const [category, table] of Object.entries(this.snapshotData?.tables || {})) counts[category] = Math.max(0, table.table.filter(Boolean).length);
    return { target: this.idRegistry.target, counts, missingRegistryEntries: this.missingRegistryEntries() };
  }
}

export function createMVDatabaseBridge(options = {}) { return new MVDatabaseBridge(options); }
export { CATEGORY_DEFINITIONS as MV_DATABASE_CATEGORIES };
