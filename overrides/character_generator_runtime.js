/* Plushbound Legends World Editor Character Generator v1
 * Deterministic modular NPC assembly. Fail-closed: only registered source layers
 * may be used; missing/incompatible slots are rejected rather than guessed.
 */
(() => {
  'use strict';

  const SCHEMA = 'plushbound.world_editor.character_generator_recipe.v1';
  const REGISTRY_URL = 'data/world_editor/character_generator_components_v1.json';
  let registryPromise = null;

  function fail(message) {
    throw new Error(`Character Generator rejected: ${message}`);
  }

  async function loadRegistry() {
    if (!registryPromise) {
      registryPromise = fetch(REGISTRY_URL, { cache: 'no-store' })
        .then(r => { if (!r.ok) fail(`component registry HTTP ${r.status}`); return r.json(); })
        .then(doc => {
          if (doc.schema !== 'plushbound.world_editor.character_generator_components.v1') fail('unexpected component registry schema');
          if (doc.version !== 1 || !Array.isArray(doc.layerOrder) || !Array.isArray(doc.componentPacks)) fail('malformed component registry');
          return doc;
        });
    }
    return registryPromise;
  }

  function indexComponents(registry) {
    const byId = new Map();
    for (const pack of registry.componentPacks) {
      const packId = pack && pack.packId;
      if (typeof packId !== 'string' || !packId) fail('component pack missing packId');
      if (!Array.isArray(pack.components)) fail(`${packId}: components must be an array`);
      for (const c of pack.components) {
        if (!c || typeof c.id !== 'string' || !c.id) fail(`${packId}: component missing stable id`);
        if (byId.has(c.id)) fail(`duplicate component id ${c.id}`);
        if (!registry.layerOrder.includes(c.slot)) fail(`${c.id}: unknown slot ${c.slot}`);
        if (typeof c.source !== 'string' || !c.source) fail(`${c.id}: source path required`);
        byId.set(c.id, { ...c, packId });
      }
    }
    return byId;
  }

  function normalizeRecipe(input) {
    if (!input || typeof input !== 'object') fail('recipe must be an object');
    const id = String(input.characterId || '').trim();
    if (!id) fail('characterId required');
    const selections = input.selections && typeof input.selections === 'object' ? input.selections : {};
    const palette = input.palette && typeof input.palette === 'object' ? input.palette : {};
    return {
      schema: SCHEMA,
      version: 1,
      characterId: id,
      displayName: String(input.displayName || id),
      selections: { ...selections },
      palette: { ...palette },
      metadata: input.metadata && typeof input.metadata === 'object' ? { ...input.metadata } : {}
    };
  }

  function compatibilityAllows(component, recipe) {
    const rules = component.compatibility || {};
    const tags = new Set(Array.isArray(recipe.metadata.tags) ? recipe.metadata.tags : []);
    if (Array.isArray(rules.requireTags) && rules.requireTags.some(t => !tags.has(t))) return false;
    if (Array.isArray(rules.forbidTags) && rules.forbidTags.some(t => tags.has(t))) return false;
    return true;
  }

  async function validateRecipe(input) {
    const registry = await loadRegistry();
    const byId = indexComponents(registry);
    const recipe = normalizeRecipe(input);
    const resolved = [];

    for (const [slot, componentId] of Object.entries(recipe.selections)) {
      if (!registry.layerOrder.includes(slot)) fail(`unknown recipe slot ${slot}`);
      if (componentId == null || componentId === '') continue;
      const c = byId.get(componentId);
      if (!c) fail(`${slot}: unregistered component ${componentId}`);
      if (c.slot !== slot) fail(`${componentId}: belongs to ${c.slot}, not ${slot}`);
      if (!compatibilityAllows(c, recipe)) fail(`${componentId}: incompatible with recipe metadata`);
      resolved.push(c);
    }

    for (const slot of registry.requiredSlots || []) {
      if (!recipe.selections[slot]) fail(`required slot ${slot} is empty`);
    }

    resolved.sort((a, b) => registry.layerOrder.indexOf(a.slot) - registry.layerOrder.indexOf(b.slot));
    return { registry, recipe, resolved };
  }

  async function buildManifest(input) {
    const { registry, recipe, resolved } = await validateRecipe(input);
    return {
      schema: SCHEMA,
      version: 1,
      generatorId: registry.generatorId,
      characterId: recipe.characterId,
      displayName: recipe.displayName,
      palette: recipe.palette,
      metadata: recipe.metadata,
      selections: recipe.selections,
      orderedLayers: resolved.map(c => ({
        componentId: c.id,
        slot: c.slot,
        source: c.source,
        packId: c.packId,
        paletteChannels: Array.isArray(c.paletteChannels) ? c.paletteChannels : []
      })),
      deterministic: true,
      failClosed: true,
      visualGuessingForbidden: true
    };
  }

  async function renderToCanvas(input, canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) fail('render target must be a canvas');
    const manifest = await buildManifest(input);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const layer of manifest.orderedLayers) {
      const img = new Image();
      img.decoding = 'async';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error(`Character Generator rejected: failed to load ${layer.componentId}`));
        img.src = layer.source;
      });
      if (img.width !== canvas.width || img.height !== canvas.height) {
        fail(`${layer.componentId}: layer dimensions ${img.width}x${img.height} do not match canvas ${canvas.width}x${canvas.height}`);
      }
      ctx.drawImage(img, 0, 0);
    }
    return manifest;
  }

  function downloadRecipe(manifest) {
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${manifest.characterId}.character-recipe.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  window.PlushboundCharacterGenerator = Object.freeze({
    schema: SCHEMA,
    loadRegistry,
    validateRecipe,
    buildManifest,
    renderToCanvas,
    downloadRecipe
  });
})();
