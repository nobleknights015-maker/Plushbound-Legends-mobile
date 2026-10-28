# Plushbound Legends — Engine v1 A5 Runtime Import Contract

## Purpose

This is the receiving-side contract for regional A5 tilesets produced by the Vera/Modal → World Asset Pipeline V2 lane. It exists so `Engine v1 compatible` means more than matching dimensions: the game runtime has a deterministic importer that consumes the package, maps all slots, draws them, and releases the region again.

## Mandatory source-art pipeline

Reference sheets are visual-authority inputs for Vera. They are not runtime assets and their pixels must never be cropped, resized, sliced, recolored, or repackaged directly into an Engine v1 tileset.

The only valid production flow is:

1. accepted reference sheets define the visual target,
2. Vera/Modal generates the final source artwork from those references,
3. the generated source artwork is saved separately and hash-qualified,
4. the deterministic compiler slices and packs only that Vera/Modal-generated artwork,
5. World Editor validates the fixed manifest/geometry,
6. Engine v1 imports the qualified runtime package.

A production runtime manifest must therefore declare:

- `sourceArtProvenance: "vera-modal-generated"`
- `referenceSheetPixelsUsedAsRuntimeArt: false`
- `sourceGenerationProof.producer: "vera-modal"`
- `sourceGenerationProof.generatedOutputSha256`: lowercase 64-character SHA-256 of the generated source output

The runtime importer rejects production packages that do not meet this provenance gate. The deterministic `runtime_fixture` smoke package is the only synthetic exception.

## Locked package contract

- Manifest schema: `plushbound.a5_runtime_package.v1`
- Engine profile: `mv_tileset_a5`
- Stable sheet ID: `tileset.<region>.a5`
- PNG size: `384x768`
- PNG mode at build gate: 8-bit RGBA
- Tile size: `48x48`
- Grid: `8x16`
- Slots: `128`
- Manifest SHA-256: required, lowercase 64-character hex
- Build-time hash verification: required
- Vera/Modal source-art provenance: required for every production region

The importer must reject mismatched schema, profile, stable ID, geometry, slot count, hash status, or source-art provenance instead of guessing.

## Runtime API

`window.PlushboundA5Importer` is installed into the game assets during the Android build.

- `importManifest(manifestUrl)` — validates the manifest and Vera/Modal provenance, decodes the PNG, validates decoded dimensions, builds the locked 128 slot map, and caches the active region package.
- `getRegion(regionId)` — returns the currently loaded package for the region or `null`.
- `drawSlot(ctx, regionId, slotIndex, dx, dy, dw, dh)` — draws one deterministic A5 slot using the fixed source rectangle.
- `releaseRegion(regionId)` — removes the region package from the runtime cache.

Slot order is row-major. Slot 0 is `(0,0,48,48)` and slot 127 is `(336,720,48,48)`.

## Region streaming rule

Only the active region should retain its heavy tileset package. Region transitions must release the previous package before or as the next region becomes active. This aligns with `WORLD_SCALE_ARCHITECTURE.md` and the 4 GB mobile baseline.

## Production handoff

A production package consists of:

1. Vera/Modal-generated final source art with recorded generation proof,
2. the deterministic compiled A5 PNG,
3. its runtime manifest,
4. the exact SHA-256 already banked by the production pipeline.

Accepted reference sheets remain immutable reference material. A missing production package is a retrieval/integration problem; it is never authorization to promote a reference sheet directly into runtime art.

## Required qualification

CI must prove the importer with a deterministic contract-equivalent fixture before the APK is built. The smoke test must:

1. import the manifest,
2. decode a 384x768 PNG,
3. expose exactly 128 slots,
4. confirm slot 0 and slot 127 source rectangles,
5. draw both slots to canvas,
6. prove the drawn results are not blank/collapsed,
7. release the region and confirm it leaves the cache.

Production-region qualification additionally requires the Vera/Modal provenance gate above.

## Evidence scope

The deterministic fixture proves only the receiving runtime geometry and drawing contract. It is synthetic test data and is never evidence that a region's production art is complete. Regional production is complete only after Vera/Modal-generated source art, deterministic compilation, hashing, World Editor validation, and Engine v1 validation all pass.

`overrides/a5_runtime_provenance_quarantine.json` is authoritative for any regional package whose provenance was unclear or reference-derived during the earlier production pass.
