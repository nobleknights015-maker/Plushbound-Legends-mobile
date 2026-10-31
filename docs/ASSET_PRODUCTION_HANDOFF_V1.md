# Plushbound Legends — Asset Production Handoff V1

This is the human-readable companion to `game/assets/ASSET_COMPATIBILITY_V1.json`.

## Status

Asset production may target this contract now. The World Editor, Engine v1, game manifest and Android build all use the same 48 px tile baseline and stable logical asset IDs. RPG Maker MV material is a geometry/category/behavior reference only; production pixels, audio and code must be original Plushbound work.

## Non-negotiable production rules

- Runtime art is newly created Plushbound artwork. Do not crop, repack or ship reference-project pixels.
- Stable logical IDs come from `game/assets/asset-manifest.json`; filenames are implementation paths, not semantic identity.
- Never infer a sheet visually. Use the locked dimensions, slot order and manifests.
- Do not arbitrarily resize a generated sheet after production.
- Normal production images use RGB or RGBA; transparent runtime art uses RGBA.
- Ready/placeholder manifest entries must point to physical files. Planned entries may be empty until produced.
- Undefined asset categories may be generated as source art, but runtime integration waits for an explicit slicing/manifest contract rather than guesswork.

## Tilesets — MV-compatible runtime target

Tile size is **48×48 px**.

| Sheet | Canvas | Purpose |
| --- | ---: | --- |
| A1 | 768×576 | animated water / autotiles |
| A2 | 768×576 | ground autotiles |
| A3 | 768×384 | wall autotiles |
| A4 | 768×720 | wall / roof autotiles |
| A5 | 384×768 | normal ground tiles |
| B | 768×768 | upper normal tiles |
| C | 768×768 | upper normal tiles |
| D | 768×768 | upper normal tiles |
| E | 768×768 | upper normal tiles |

The existing manifest `tileset/...` ID is the stable **tileset-set identity** used by maps. It is not a single packed replacement image. Each parent deterministically owns nine child sheets. For example:

- Parent map ID: `tileset/elyndor/sunny-plains`
- A1 child ID: `tileset/elyndor/sunny-plains/A1`
- A1 file: `tilesets/elyndor/sunny-plains/A1.png`
- Continue identically through `A2`, `A3`, `A4`, `A5`, `B`, `C`, `D`, and `E`.

Engine v1 derives and registers those nine child descriptors automatically from the parent manifest entry. Maps continue storing only the parent ID. An explicitly declared child entry may override its derived descriptor later without changing the parent map contract.

A5 is also the locked deterministic material-sheet production format already used by the Plushbound pipeline: **384×768 PNG, 8×16 grid, 128 slots, 48×48 px each, no margins, no padding, origin (0,0), no post-generation scaling**.

A1–A4 are composed from **24×24 quarter tiles**. The editor and Engine v1 are cross-tested against the same observable MV geometry: 48 floor shapes, 16 wall shapes and 4 waterfall shapes, including A1 animation phases. Asset authors should create sheets in the locked A1–A4 geometry; they do not need to pre-render every map tile variant. Engine v1 resolves those same quarter recipes and the Canvas runtime renders the four resolved source quadrants directly.

## Character production

The master Plushbound character authoring format remains **Character Atlas V1**:

- 1536×1024 PNG
- template id `plushbound-character-atlas-v1`
- template version `1.0`
- fixed deterministic slots defined in `tools/editor/character-atlas-v1-core.js`
- no visual slot detection or scaling

The Character Atlas builder now exports three deterministic files for a ready build: the 1536×1024 master atlas PNG, the compiled 144×192 field-runtime PNG, and a JSON export manifest containing the exact crop/destination plan.

The runtime-native field character target is a **single-character 3×4 sheet**:

- 144×192 PNG
- 48×48 frame cells
- columns: 3
- rows: 4
- row order: down, left, right, up
- movement pattern: 0 → 1 → 2 → 1
- bottom-center runtime anchor

The Character Atlas V1 field authoring boxes are **75×64 px**, but the runtime frame inside every one is a locked **48×48 safe area**. Put all gameplay-critical field-sprite pixels inside that safe area. The compiler crops it **centered horizontally and bottom-aligned** inside each 75×64 field slot: 13 px from the left, 14 px remaining on the right, and 16 px of authoring/headroom above the runtime crop. It then assembles the twelve exact 48×48 crops into the 144×192 runtime sheet. **No resampling or post-crop scaling occurs.**

For MV visual comparison, a normal reference character sheet may be treated as 12×8 containing eight characters, while an MV `$` single-character sheet is 3×4. Plushbound compiles/uses the single-character runtime form rather than depending on filename guessing.

## Faces / portraits

MV-compatible face reference geometry is **576×288**, arranged 4×2 with **144×144** face cells.

Plushbound Character Atlas V1 portrait/expression slots remain their own master-art roles. Do not automatically stretch those atlas crops into 144×144 faces. If an asset needs an MV-compatible face output, produce/compile a dedicated 144×144 face asset under an explicit manifest role.

## Battle assets

- Battleback compatibility canvas: **816×624**.
- Enemy battlers: transparent background, bottom-center anchor, PNG preferred; canvas size may vary unless a later per-enemy contract fixes it.
- MV side-view actor reference geometry: **576×384**, 9×6 cells at 64×64. This is a reference layout, not a requirement to replace the Character Atlas V1 battle-slot pipeline.

## UI

- Compatibility screen canvas: **816×624**.
- Runtime icon target: **32×32 PNG**.
- MV icon atlas comparison uses 32×32 cells, 16 columns.
- MV windowskin comparison geometry: **192×192 PNG**.
- Title/background layers may target 816×624 unless a specific screen contract says otherwise.

## Environment

- Parallax preferred reference size: 816×624, but larger/scrollable originals are allowed.
- Map objects: transparent PNG preferred; design/placement aligns to the 48 px world grid, but objects are not forced into a 48×48 canvas.
- Overlays may use PNG/WebP with transparency and explicit manifest metadata.

## Animation / effects

MV legacy animation-sheet comparison geometry is **960×960**, 5×5 cells of 192×192. Plushbound runtime animation assets should use explicit manifest metadata for frame size, frame count, timing and loop behavior. The engine/editor must not infer animation slicing by looking at the pixels.

## Audio

Logical categories are `bgm`, `bgs`, `me`, and `se`.

- Plushbound Android/runtime preferred format: `.ogg`.
- MV comparison/export formats: `.ogg` and `.m4a`.
- Duplicate `.ogg`/`.m4a` encodes are only required when a deliberate MV-shaped export target needs them; native Plushbound production does not need to duplicate every audio asset.

## Manifest handoff

`game/assets/asset-manifest.json` is directly consumable by Engine v1. At minimum every asset entry has:

- `id`
- `type`
- `path`
- `status`

For sliced/runtime-geometry assets, add explicit metadata such as `width`, `height`, `layout`, `frameWidth`, `frameHeight`, `columns`, `rows`, `atlas`, `tags` or `meta` as appropriate. Engine v1 preserves that metadata instead of discarding it.

Statuses remain `planned`, `placeholder`, `ready`, and `retired`.

## What the assets chat should use

Use these as the production source of truth, in this order:

1. `game/assets/ASSET_COMPATIBILITY_V1.json` — machine-readable dimensions/layout rules.
2. `game/assets/asset-manifest.json` — stable parent/logical IDs and destination roots.
3. `tools/editor/character-atlas-v1-core.js` — exact Character Atlas V1 slots and runtime field extraction.
4. `tools/editor/mv-tile-id-contracts.js` and `tools/editor/mv-autotile-composition.js` — editor-side MV tile semantics.
5. `engine/src/render/MvTilesetResolver.js` — Engine v1 interpretation of generated A1–E sheets.
6. `engine/src/render/AssetBackedMapRenderer.js` — automatic parent-ID → A1–E runtime bridge.
7. `engine/src/render/Canvas2DRenderBackend.js` — runtime draw path for resolved normal/autotile sources.

The engine/editor CI cross-checks the editor and engine tile semantics so a sheet that is valid against this contract has one deterministic interpretation on both sides. Character Atlas CI separately proves the deterministic Atlas V1 → 144×192 runtime field-sheet extraction.

## Handoff verdict

The asset pipeline can proceed against Asset Compatibility V1. Future feature additions may extend the contract, but existing V1 geometry and logical-ID behavior are locked. Breaking changes require a new contract/template version rather than silently changing dimensions or slot meanings.
