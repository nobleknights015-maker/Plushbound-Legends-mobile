function clone(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

const DIRECTIONS = new Set([2, 4, 6, 8]);

function diagnostic(severity, code, message, details = {}) {
  return { severity, code, message, ...details };
}

function normalizeLayer(layer, width, height, index) {
  const count = width * height;
  const source = Array.isArray(layer) ? { data: layer } : (layer && typeof layer === 'object' ? clone(layer) : {});
  let data = Array.isArray(source.data) ? source.data : [];
  if (Array.isArray(data[0])) {
    const flattened = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) flattened.push(Number(data[y]?.[x]) || 0);
    data = flattened;
  } else data = data.map(value => Number(value) || 0);
  data = data.slice(0, count);
  while (data.length < count) data.push(0);
  return {
    ...source,
    id: source.id || `layer-${index + 1}`,
    name: source.name || `Layer ${index + 1}`,
    z: Number.isFinite(Number(source.z)) ? Number(source.z) : index,
    visible: source.visible !== false,
    data
  };
}

export function validateEditorPackage(source, { assetIds = [], encounterTableIds = [] } = {}) {
  const errors = [];
  const warnings = [];
  if (!source || typeof source !== 'object') {
    errors.push(diagnostic('error', 'PACKAGE_INVALID', 'World Editor package must be an object'));
    return { ok: false, errors, warnings };
  }
  if (!Array.isArray(source.maps)) {
    errors.push(diagnostic('error', 'MAPS_MISSING', 'World Editor package must contain maps[]', { field: 'maps' }));
    return { ok: false, errors, warnings };
  }

  const maps = new Map();
  const knownAssets = new Set((assetIds || []).map(String));
  const knownTables = new Set((encounterTableIds || []).map(String));

  for (const map of source.maps) {
    if (!map || typeof map !== 'object' || !String(map.id || '').trim()) {
      errors.push(diagnostic('error', 'MAP_ID_MISSING', 'Every map must have a stable id'));
      continue;
    }
    const mapId = String(map.id);
    if (maps.has(mapId)) errors.push(diagnostic('error', 'MAP_ID_DUPLICATE', `Duplicate map id ${mapId}`, { objectId: mapId }));
    maps.set(mapId, map);
    if (!Number.isInteger(map.width) || map.width <= 0 || !Number.isInteger(map.height) || map.height <= 0) {
      errors.push(diagnostic('error', 'MAP_SIZE_INVALID', `Map ${mapId} has invalid dimensions`, { objectId: mapId }));
      continue;
    }
    const cells = map.width * map.height;
    for (const [index, layer] of (map.layers || []).entries()) {
      const raw = Array.isArray(layer) ? layer : layer?.data;
      const size = Array.isArray(raw?.[0]) ? raw.reduce((sum, row) => sum + (Array.isArray(row) ? row.length : 0), 0) : (Array.isArray(raw) ? raw.length : 0);
      if (size && size !== cells) warnings.push(diagnostic('warning', 'LAYER_SIZE_NORMALIZED', `Layer ${layer?.id || index + 1} on ${mapId} will be normalized to ${cells} cells`, { objectId: mapId, field: `layers.${index}.data` }));
    }
    if (map.encounterTable && knownTables.size && !knownTables.has(String(map.encounterTable))) errors.push(diagnostic('error', 'ENCOUNTER_TABLE_MISSING', `Unknown encounter table ${map.encounterTable}`, { objectId: mapId, field: 'encounterTable', value: map.encounterTable }));
    const eventIds = new Set();
    for (const event of map.events || []) {
      const eventId = String(event?.id || '');
      if (!eventId) { errors.push(diagnostic('error', 'EVENT_ID_MISSING', `Event on ${mapId} has no id`, { objectId: mapId })); continue; }
      if (eventIds.has(eventId)) errors.push(diagnostic('error', 'EVENT_ID_DUPLICATE', `Duplicate event ${eventId} on ${mapId}`, { objectId: eventId }));
      eventIds.add(eventId);
      if (!Number.isInteger(event.x) || !Number.isInteger(event.y) || event.x < 0 || event.y < 0 || event.x >= map.width || event.y >= map.height) errors.push(diagnostic('error', 'EVENT_POSITION_INVALID', `Event ${eventId} is outside ${mapId}`, { objectId: eventId, field: 'position' }));
      if (event.assetId && knownAssets.size && !knownAssets.has(String(event.assetId))) errors.push(diagnostic('error', 'MISSING_ASSET', `Asset ${event.assetId} could not be resolved`, { objectId: eventId, field: 'assetId', value: event.assetId }));
      for (const page of event.pages || []) for (const command of page.commands || []) {
        if (command?.code !== 'TRANSFER') continue;
        const [targetMapId, x, y, direction = 2] = command.parameters || [];
        const target = source.maps.find(candidate => String(candidate?.id) === String(targetMapId));
        if (!target) errors.push(diagnostic('error', 'TRANSFER_MAP_MISSING', `Transfer ${eventId} targets missing map ${targetMapId}`, { objectId: eventId, field: 'TRANSFER', value: targetMapId }));
        else if (Number(x) < 0 || Number(y) < 0 || Number(x) >= target.width || Number(y) >= target.height) errors.push(diagnostic('error', 'TRANSFER_POSITION_INVALID', `Transfer ${eventId} targets an invalid position on ${targetMapId}`, { objectId: eventId, field: 'TRANSFER', value: [targetMapId, x, y, direction] }));
        if (!DIRECTIONS.has(Number(direction))) errors.push(diagnostic('error', 'TRANSFER_DIRECTION_INVALID', `Transfer ${eventId} has invalid direction ${direction}`, { objectId: eventId, field: 'TRANSFER', value: direction }));
      }
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function adaptEditorPackage(source, options = {}) {
  const validation = validateEditorPackage(source, options);
  if (!validation.ok) {
    const error = new Error(`World Editor package failed Engine v1.1 validation (${validation.errors.length} error(s))`);
    error.code = 'ENGINE_V11_EDITOR_VALIDATION_FAILED';
    error.diagnostics = validation;
    throw error;
  }
  const pkg = clone(source);
  pkg.schemaVersion = pkg.schemaVersion ?? 1;
  pkg.engineV11 = { ...(pkg.engineV11 || {}), editorBridge: 1 };
  pkg.maps = pkg.maps.map(map => {
    const normalized = { ...map };
    normalized.id = String(map.id);
    normalized.events = Array.isArray(map.events) ? clone(map.events) : [];
    normalized.blocked = Array.isArray(map.blocked) ? [...map.blocked] : [];
    normalized.layers = (map.layers || []).map((layer, index) => normalizeLayer(layer, map.width, map.height, index));
    const cells = map.width * map.height;
    normalized.regions = Array.isArray(map.regions) ? map.regions.slice(0, cells).map(value => Math.max(0, Math.floor(Number(value) || 0))) : [];
    while (normalized.regions.length < cells) normalized.regions.push(0);
    return normalized;
  });
  return { package: pkg, validation };
}

export class EngineV11EditorBridge {
  constructor(options = {}) { this.options = { ...options }; }
  validate(source, options = {}) { return validateEditorPackage(source, { ...this.options, ...options }); }
  load(source, options = {}) { return adaptEditorPackage(source, { ...this.options, ...options }); }
}
