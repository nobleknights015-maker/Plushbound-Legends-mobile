# Plushbound — RPG Maker MV Reference Compatibility Contract

## Purpose

Use the user-supplied `data.zip` only as a static behavioral/format reference so the Plushbound World Editor can understand and emit MV-compatible project data while all Plushbound runtime code and production assets remain independently authored.

No RPG Maker runtime JavaScript, art, audio, fonts, icons, plugins, or other proprietary bytes from the reference archive are redistributed by this compatibility layer.

## Reference package observations

The audited archive contains an MV-shaped project under `NewData/` with 1,126 archive entries.

Observed project shell:

- root `index.html` and `package.json`
- directories: `audio/`, `data/`, `fonts/`, `icon/`, `img/`, `js/`
- NW.js window geometry: 816×624
- serialized plugin descriptor array in `js/plugins.js`
- standard boot-script ordering culminating in `js/plugins.js` and `js/main.js`

Observed database/project data:

- 14 core database JSON files plus `Map001.json`
- null-at-index-zero numbered database arrays
- six map layers stored in one flat `width × height × 6` data array
- map start position stored in `System.json`
- tileset records with nine A1–E name slots and 8,192 tile flags
- event command objects serialized as `code`, `indent`, `parameters`
- command lists terminate with command code `0`
- troop pages serialize `conditions`, `list`, and `span`
- damage records allow `elementId: -1` as the normal-attack element sentinel

Observed asset banks:

- PNG image banks: animations, battlebacks1, battlebacks2, characters, enemies, faces, parallaxes, sv_actors, sv_enemies, system, tilesets, titles1, titles2
- audio banks: bgm, bgs, me, se
- observed audio resources are paired `.ogg` and `.m4a`
- character-sheet, face-sheet and A1–E tileset geometries are represented by independent validators in `tools/editor/mv-project-core.js`

## Plushbound implementation boundary

The compatibility implementation is split into three independent modules:

1. `tools/editor/mv-project-core.js` — project detection, archive layout, map data, sheet geometry, tileset flags and serialized command fundamentals.
2. `tools/editor/mv-database-contracts.js` — database records, System, MapInfo, map events/pages, movement routes, encounters, audio references and extended validation.
3. `tools/editor/mv-shell-contracts.js` — package/window, plugin descriptors, boot-script order and asset-bank conventions.

The CI gate syntax-checks all three modules, runs all associated tests, and rejects any change under frozen `engine/` relative to the Engine v1 freeze commit.

## Compatibility policy

- Preserve IDs and unknown JSON fields rather than visually guessing or normalizing them away.
- Fail closed on malformed structures.
- Never execute JavaScript or plugins merely to identify/import an MV project.
- Never import reference-project proprietary bytes into Plushbound production content.
- Compatibility targets observable project/data contracts, not source-code cloning.
