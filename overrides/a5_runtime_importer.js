/* Plushbound Legends Engine v1 A5 runtime importer.
 * Consumes deterministic region A5 packages produced by the World Asset Pipeline.
 * Geometry is locked: 384x768 RGBA PNG, 48x48 tiles, 8x16 grid, 128 slots.
 * Production manifests must prove that source art came from Vera/Modal generation.
 */
(() => {
  'use strict';

  const CONTRACT = Object.freeze({
    schema: 'plushbound.a5_runtime_package.v1',
    profile: 'mv_tileset_a5',
    width: 384,
    height: 768,
    tileWidth: 48,
    tileHeight: 48,
    columns: 8,
    rows: 16,
    slotCount: 128,
    sourceArtProvenance: 'vera-modal-generated',
  });

  const loaded = new Map();

  function fail(message) {
    throw new Error(`Plushbound A5 import rejected: ${message}`);
  }

  function validateManifest(m) {
    if (!m || typeof m !== 'object') fail('manifest must be an object');
    if (m.schema !== CONTRACT.schema) fail(`schema ${m.schema || '<missing>'}`);
    if (m.profile !== CONTRACT.profile) fail(`profile ${m.profile || '<missing>'}`);
    if (!m.regionId || typeof m.regionId !== 'string') fail('regionId is required');
    if (m.stableSheetId !== `tileset.${m.regionId}.a5`) fail('stableSheetId does not match regionId');
    if (!m.assetPath || typeof m.assetPath !== 'string') fail('assetPath is required');
    if (!/^[0-9a-f]{64}$/.test(String(m.sha256 || ''))) fail('sha256 must be a lowercase SHA-256 hex digest');
    if (m.width !== CONTRACT.width || m.height !== CONTRACT.height) fail('sheet dimensions differ from Engine v1 contract');
    if (m.tileWidth !== CONTRACT.tileWidth || m.tileHeight !== CONTRACT.tileHeight) fail('tile dimensions differ from Engine v1 contract');
    if (m.columns !== CONTRACT.columns || m.rows !== CONTRACT.rows) fail('grid differs from Engine v1 contract');
    if (m.slotCount !== CONTRACT.slotCount) fail('slot count differs from Engine v1 contract');
    if (m.hashVerifiedAtBuild !== true) fail('package was not hash-verified at build time');

    // The deterministic smoke fixture is synthetic and is the only exception.
    if (m.regionId !== 'runtime_fixture') {
      if (m.sourceArtProvenance !== CONTRACT.sourceArtProvenance) {
        fail('source art provenance is not Vera/Modal generated');
      }
      if (m.referenceSheetPixelsUsedAsRuntimeArt !== false) {
        fail('reference-sheet pixels must never be used as runtime art');
      }
      if (!m.sourceGenerationProof || typeof m.sourceGenerationProof !== 'object') {
        fail('sourceGenerationProof is required');
      }
      if (m.sourceGenerationProof.producer !== 'vera-modal') {
        fail('sourceGenerationProof producer must be vera-modal');
      }
      if (!/^[0-9a-f]{64}$/.test(String(m.sourceGenerationProof.generatedOutputSha256 || ''))) {
        fail('sourceGenerationProof.generatedOutputSha256 must be a lowercase SHA-256 digest');
      }
    }
    return m;
  }

  function readJson(url) {
    if (typeof fetch === 'function') {
      return fetch(url, { cache: 'no-store' }).then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status} loading ${url}`);
        return response.json();
      }).catch(fetchError => new Promise((resolve, reject) => {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.onreadystatechange = () => {
            if (xhr.readyState !== 4) return;
            if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) {
              try { resolve(JSON.parse(xhr.responseText)); }
              catch (e) { reject(e); }
            } else reject(fetchError);
          };
          xhr.onerror = () => reject(fetchError);
          xhr.send();
        } catch (_) { reject(fetchError); }
      }));
    }
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = () => {
          if (xhr.readyState !== 4) return;
          if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch (e) { reject(e); }
          } else reject(new Error(`HTTP ${xhr.status} loading ${url}`));
        };
        xhr.onerror = () => reject(new Error(`failed loading ${url}`));
        xhr.send();
      } catch (e) { reject(e); }
    });
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`failed loading A5 PNG: ${url}`));
      image.src = url;
    });
  }

  function buildSlots() {
    const slots = [];
    for (let row = 0; row < CONTRACT.rows; row += 1) {
      for (let column = 0; column < CONTRACT.columns; column += 1) {
        const index = row * CONTRACT.columns + column;
        slots.push(Object.freeze({
          index,
          row,
          column,
          x: column * CONTRACT.tileWidth,
          y: row * CONTRACT.tileHeight,
          width: CONTRACT.tileWidth,
          height: CONTRACT.tileHeight,
        }));
      }
    }
    return Object.freeze(slots);
  }

  const SLOTS = buildSlots();

  async function importManifest(manifestUrl) {
    const manifest = validateManifest(await readJson(manifestUrl));
    const assetUrl = new URL(manifest.assetPath, new URL(manifestUrl, document.baseURI)).href;
    const image = await loadImage(assetUrl);
    if (image.naturalWidth !== CONTRACT.width || image.naturalHeight !== CONTRACT.height) {
      fail(`decoded PNG is ${image.naturalWidth}x${image.naturalHeight}, expected ${CONTRACT.width}x${CONTRACT.height}`);
    }

    const pkg = Object.freeze({
      regionId: manifest.regionId,
      stableSheetId: manifest.stableSheetId,
      profile: manifest.profile,
      sha256: manifest.sha256,
      sourceArtProvenance: manifest.sourceArtProvenance || 'synthetic-smoke-fixture',
      image,
      slots: SLOTS,
      slotCount: SLOTS.length,
      manifestUrl,
      assetUrl,
    });
    loaded.set(manifest.regionId, pkg);
    console.info(`PLUSHBOUND_A5_RUNTIME_IMPORT=PASS region=${manifest.regionId} sheet=${manifest.stableSheetId} slots=${SLOTS.length}`);
    return pkg;
  }

  function getRegion(regionId) {
    return loaded.get(regionId) || null;
  }

  function drawSlot(ctx, regionId, slotIndex, dx, dy, dw = CONTRACT.tileWidth, dh = CONTRACT.tileHeight) {
    const pkg = getRegion(regionId);
    if (!pkg) fail(`region ${regionId} is not loaded`);
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= SLOTS.length) fail(`invalid slot index ${slotIndex}`);
    if (!ctx || typeof ctx.drawImage !== 'function') fail('2D canvas context is required');
    const slot = SLOTS[slotIndex];
    ctx.drawImage(pkg.image, slot.x, slot.y, slot.width, slot.height, dx, dy, dw, dh);
    return slot;
  }

  function releaseRegion(regionId) {
    const pkg = loaded.get(regionId);
    if (!pkg) return false;
    loaded.delete(regionId);
    console.info(`PLUSHBOUND_A5_RUNTIME_RELEASE=PASS region=${regionId}`);
    return true;
  }

  window.PlushboundA5Importer = Object.freeze({
    contract: CONTRACT,
    importManifest,
    getRegion,
    drawSlot,
    releaseRegion,
  });
})();
