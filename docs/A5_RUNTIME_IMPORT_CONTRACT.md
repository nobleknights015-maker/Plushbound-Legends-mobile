# Plushbound Legends — Engine v1 A5 Runtime Import Contract

## Purpose

This is the receiving-side contract for regional A5 tilesets produced by the FreeFrame / World Asset Pipeline V2 lane. It exists so `Engine v1 compatible` means more than matching dimensions: the game runtime has a deterministic importer that consumes the package, maps all slots, draws them, and releases the region again.

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

The importer must reject mismatched schema, profile, stable ID, geometry, slot count, or unverified packages instead of guessing.

## Runtime API

`window.PlushboundA5Importer` is installed into the game assets during the Android build.

- `importManifest(manifestUrl)` — validates the manifest, decodes the PNG, validates decoded dimensions, builds the locked 128 slot map, and caches the active region package.
- `getRegion(regionId)` — returns the currently loaded package for the region or `null`.
- `drawSlot(ctx, regionId, slotIndex, dx, dy, dw, dh)` — draws one deterministic A5 slot using the fixed source rectangle.
- `releaseRegion(regionId)` — removes the region package from the runtime cache.

Slot order is row-major. Slot 0 is `(0,0,48,48)` and slot 127 is `(336,720,48,48)`.

## Region streaming rule

Only the active region should retain its heavy tileset package. Region transitions must release the previous package before or as the next region becomes active. This aligns with `WORLD_SCALE_ARCHITECTURE.md` and the 4 GB mobile baseline.

## Production handoff

A production package consists of:

1. the qualified A5 PNG,
2. its runtime manifest,
3. the exact SHA-256 already banked by the production pipeline.

A missing local production package is a retrieval/integration problem. It is never authorization to rerender an accepted source or sheet.

## Required qualification

CI must prove the importer with a deterministic contract-equivalent fixture before the APK is built. The smoke test must:

1. import the manifest,
2. decode a 384x768 PNG,
3. expose exactly 128 slots,
4. confirm slot 0 and slot 127 source rectangles,
5. draw both slots to canvas,
6. prove the drawn results are not blank/collapsed,
7. release the region and confirm it leaves the cache.

The resulting APK must contain the importer, fixture manifest, fixture sheet, and runtime receipt.

## Evidence scope

The deterministic fixture proves the receiving runtime contract. Real Gloamfen data is independently hash-qualified by World Asset Pipeline V2 and its A5 handoff bridge. The fixture is not Gloamfen art and must never be represented as such.
