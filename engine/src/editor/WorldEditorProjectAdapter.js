const EDITOR_FORMAT = 'plushbound-world-editor-mv-adapter';
const EDITOR_ADAPTER_VERSION = 1;
const DATABASE_TABLES = Object.freeze({
  Actors: 'actors', Classes: 'classes', Skills: 'skills', Items: 'items', Weapons: 'weapons',
  Armors: 'armor', Enemies: 'enemies', Troops: 'troops', States: 'states', Animations: 'animations'
});
const ENGINE_COMMANDS = new Set([
  'WAIT','SWITCH','VARIABLE','VARIABLE_OP','SELF_SWITCH','CONDITIONAL','JUMP','EXIT_EVENT','COMMON_EVENT',
  'MESSAGE','CHOICE','INPUT_NUMBER','TRANSFER','MOVE_ROUTE','RELOCATE_EVENT','ERASE_EVENT','TRANSPARENCY',
  'FADE_SCREEN','TINT_SCREEN','FLASH_SCREEN','SHAKE_SCREEN','BGM','BGM_STOP','BGM_FADE','BGS','BGS_STOP',
  'BGS_FADE','ME','SE','BATTLE','SHOP','SCRIPT_HOOK'
]);

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function assert(condition, message, code = 'EDITOR_PROJECT_INVALID') {
  if (condition) return;
  const error = new Error(message);
  error.code = code;
  throw error;
}

function normalizeLayerData(layer, count, mapId, z) {
  const data = layer?.data;
  assert(Array.isArray(data), `Editor map ${mapId} layer ${z} is missing tile data`);
  assert(data.length === count, `Editor map ${mapId} layer ${z} must contain exactly ${count} cells`);
  return data.map(value => Number(value) || 0);
}

function adaptPage(page = {}) {
  const mv = page.mv && typeof page.mv === 'object' ? clone(page.mv) : {};
  return {
    ...mv,
    trigger: page.trigger ?? mv.trigger ?? 'action',
    priority: page.priority ?? mv.priority ?? 'same',
    conditions: clone(page.conditions ?? mv.conditions ?? {}),
    commands: clone(page.commands ?? []),
    through: page.through ?? mv.through ?? false,
    active: page.active ?? true
  };
}

function adaptEvent(event = {}) {
  assert(event.id != null, 'Editor event requires an id');
  return {
    ...clone(event.mv || {}),
    id: String(event.id),
    name: event.name || `Event ${event.id}`,
    x: Number(event.x) || 0,
    y: Number(event.y) || 0,
    pages: Array.isArray(event.pages) ? event.pages.map(adaptPage) : []
  };
}

function adaptMap(map = {}) {
  const id = String(map.id ?? map.mvMapId ?? '');
  assert(id, 'Editor map requires an id');
  const width = Number(map.width);
  const height = Number(map.height);
  assert(Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0,
    `Editor map ${id} requires positive integer width and height`);
  const count = width * height;
  assert(Array.isArray(map.layers) && map.layers.length >= 4, `Editor map ${id} requires four MV tile layers`);
  const layerData = [0,1,2,3].map(z => normalizeLayerData(map.layers[z], count, id, z));
  const regions = Array.isArray(map.regions) ? map.regions.map(value => Math.max(0, Math.floor(Number(value) || 0))) : new Array(count).fill(0);
  assert(regions.length === count, `Editor map ${id} regions must contain exactly ${count} cells`);
  const shadowBits = Array.isArray(map.mvShadowBits) ? map.mvShadowBits.map(value => Number(value) || 0) : new Array(count).fill(0);
  assert(shadowBits.length === count, `Editor map ${id} shadow bits must contain exactly ${count} cells`);
  return {
    ...clone(map.mv || {}),
    id,
    mvMapId: Number(map.mvMapId ?? map.id) || 0,
    name: map.name || `Map ${id}`,
    width,
    height,
    tilesetId: Number(map.tilesetId) || 0,
    layers: {
      ground: layerData[0],
      lower: layerData[1],
      upper: layerData[2],
      overlay: layerData[3]
    },
    mvLayers: layerData,
    regions,
    mvShadowBits: shadowBits,
    events: Array.isArray(map.events) ? map.events.map(adaptEvent) : [],
    encounterList: clone(map.encounterList || [])
  };
}

function adaptCommonEvents(project) {
  const source = Array.isArray(project.commonEvents) ? project.commonEvents : [];
  const map = new Map();
  for (const record of source) {
    if (!record || record.id == null) continue;
    map.set(String(record.id), clone(record.commands || []));
  }
  return map;
}

function scanCommands(project) {
  const unsupported = [];
  const visit = (commands, location) => {
    for (const command of commands || []) {
      const code = String(command?.code || '');
      if (!ENGINE_COMMANDS.has(code)) unsupported.push({ location, code: code || '<missing>' });
    }
  };
  for (const map of project.maps || []) {
    for (const event of map.events || []) for (let i = 0; i < (event.pages || []).length; i += 1) {
      visit(event.pages[i]?.commands, `map:${map.id}/event:${event.id}/page:${i}`);
    }
  }
  for (const common of project.commonEvents || []) visit(common?.commands, `common-event:${common?.id}`);
  return unsupported;
}

export function inspectWorldEditorProject(project) {
  const errors = [];
  if (!project || typeof project !== 'object') errors.push('Project must be an object');
  else {
    if (project.format !== EDITOR_FORMAT) errors.push(`Unsupported editor project format: ${project.format || '<missing>'}`);
    if (project.adapterVersion !== EDITOR_ADAPTER_VERSION) errors.push(`Unsupported editor adapter version: ${project.adapterVersion}`);
    if (!Array.isArray(project.maps) || project.maps.length === 0) errors.push('Editor project requires at least one map');
    if (!project.start || project.start.mapId == null) errors.push('Editor project requires a start map');
  }
  const unsupportedCommands = errors.length ? [] : scanCommands(project);
  return {
    valid: errors.length === 0,
    format: project?.format || null,
    adapterVersion: project?.adapterVersion ?? null,
    errors,
    unsupportedCommands,
    runtimeExecutable: errors.length === 0 && unsupportedCommands.length === 0
  };
}

export function adaptWorldEditorProject(project) {
  const report = inspectWorldEditorProject(project);
  assert(report.valid, report.errors[0] || 'Invalid editor project');
  const maps = new Map();
  for (const source of project.maps) {
    const map = adaptMap(source);
    assert(!maps.has(map.id), `Duplicate editor map id: ${map.id}`);
    maps.set(map.id, map);
  }
  const start = {
    mapId: String(project.start.mapId),
    x: Math.max(0, Math.floor(Number(project.start.x) || 0)),
    y: Math.max(0, Math.floor(Number(project.start.y) || 0)),
    direction: Number(project.start.direction) || 2
  };
  assert(maps.has(start.mapId), `Editor start map ${start.mapId} is not present`);
  const startMap = maps.get(start.mapId);
  assert(start.x < startMap.width && start.y < startMap.height,
    `Editor start position ${start.x},${start.y} is outside map ${start.mapId}`);
  return {
    format: 'plushbound-engine-v1-editor-project',
    compatibilityVersion: 1,
    sourceFormat: project.format,
    adapterVersion: project.adapterVersion,
    start,
    maps,
    commonEvents: adaptCommonEvents(project),
    mvDatabase: clone(project.mvDatabase || {}),
    report
  };
}

export function loadEditorDatabase(dataRegistry, mvDatabase = {}) {
  if (!dataRegistry) return null;
  for (const [mvName, engineType] of Object.entries(DATABASE_TABLES)) {
    const records = Array.isArray(mvDatabase[mvName]) ? mvDatabase[mvName].slice(1).filter(Boolean) : [];
    dataRegistry.load(engineType, records);
  }
  if (dataRegistry.hasType?.('commonEvents')) {
    const records = Array.isArray(mvDatabase.CommonEvents) ? mvDatabase.CommonEvents.slice(1).filter(Boolean) : [];
    dataRegistry.load('commonEvents', records);
  }
  if (dataRegistry.hasType?.('system') && mvDatabase.System) {
    dataRegistry.load('system', [{ ...clone(mvDatabase.System), id: 'system' }]);
  }
  return dataRegistry;
}

export function installWorldEditorProject({ project, state, mapRuntime, dataRegistry = null, requireExecutable = false } = {}) {
  assert(state, 'Engine editor-project installation requires GameState', 'EDITOR_ENGINE_STATE_REQUIRED');
  assert(mapRuntime, 'Engine editor-project installation requires MapRuntime', 'EDITOR_ENGINE_MAP_RUNTIME_REQUIRED');
  const bundle = adaptWorldEditorProject(project);
  if (requireExecutable) {
    assert(bundle.report.runtimeExecutable,
      `Editor project contains unsupported runtime commands: ${bundle.report.unsupportedCommands.map(x => x.code).join(', ')}`,
      'EDITOR_PROJECT_UNSUPPORTED_COMMANDS');
  }
  for (const map of bundle.maps.values()) mapRuntime.register(map);
  mapRuntime.setCommonEvents?.(bundle.commonEvents);
  loadEditorDatabase(dataRegistry, bundle.mvDatabase);
  mapRuntime.load(bundle.start.mapId, bundle.start.x, bundle.start.y, bundle.start.direction);
  return bundle;
}

export const WorldEditorCompatibility = Object.freeze({
  format: EDITOR_FORMAT,
  adapterVersion: EDITOR_ADAPTER_VERSION,
  engineBundleVersion: 1
});
