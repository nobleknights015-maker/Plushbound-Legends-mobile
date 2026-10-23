# Plushbound Editor MV-Parity Tracker

Target: mature RPG Maker MV-class authoring capability adapted to Plushbound Legends, existing runtime/content/assets contracts, and an Android-first workflow.

## Non-negotiable boundary

- Frozen Engine v1 is not modified for editor convenience.
- Editor changes operate on game/content, game/runtime authoring data, asset manifests, validation, preview, and build tooling.
- Engine changes require a demonstrated engine defect and dedicated regression proof.

## Status legend

- **Mature** — usable, regression-covered, and integrated with current contracts.
- **Functional** — core workflow exists; more MV-level polish/breadth remains.
- **Partial** — useful slice exists but major capability remains.
- **Missing** — not yet implemented as an authoring workflow.

## Authoring systems

| System | Status | Current coverage | Next maturity step |
| --- | --- | --- | --- |
| Map/world editor | Mature | Map switching, tile/layer painting, Z/visibility, regions, collision, events, transfers, asset assignment, validation, project search, runtime playtest, same-map duplication and cross-map event copy/paste with undo/redo | Map duplication/management and richer brush operations |
| Runtime playtest | Mature | Real PlushboundGameSession path in-editor, movement/interact/encounter coverage, runtime Common Events | Richer debug overlays and launch presets |
| Event pages | Mature | Pages, triggers, conditions, summaries, safe preservation, undo/redo, duplicate/reorder/delete with last-page protection | Rich visual condition builder and condition reference pickers |
| Event commands | Mature | Full Engine v1 registry exposed; rich visual forms; command copy/paste/duplicate/reorder/delete; unknown future commands preserved and protected from destructive deletion | Branch/choice structure visualization and richer reference pickers |
| Common events | Functional | Dedicated visual library, create/rename/delete, command editing/reorder, import/export, graph validation, authoring-time expansion and runtime COMMON_EVENT support | Project-integrated persistence/reference pickers and richer branch editing |
| Visual database | Functional | Project package discovery, collections, search, create/duplicate/delete, domain-aware forms, primitive lists, structured encounter/drop/quest rows, Advanced JSON, validation, export, undo/redo | Deeper item/equipment domains and more cross-record references |
| Database safety | Mature | Array/keyed registries preserved, transactional replacement, duplicate-ID validation, rollback tests, package-wide export validation | Broader cross-package dependency diagnostics |
| Guardians | Functional | Guardian identity/species/role/bond/assets forms and safe templates | Stats/skills/bond progression editor |
| NPCs | Partial | Named NPC domain profiles and editable identity/world/story fields | Route/event linking and schedule editor |
| Enemies/bosses | Functional | Level/stats/tags/skills/rewards/assets plus structured drop and encounter editing | AI/behavior authoring only when explicit runtime behavior contracts exist |
| Quests/events | Functional | Structured prerequisites, objectives, reward items, unlocks, stage/giver fields, project reference audits and runtime-owned quest hooks | State-flow visualization, objective/reference pickers and broader dependency diagnostics |
| Items/equipment | Partial | Runtime item registries editable; accessory stats and asset bindings preserved; hook references audited | Dedicated item/equipment profiles and effect builder grounded in explicit schemas |
| Skills/abilities | Missing | Enemy skill IDs exist as references, but no standalone explicit authoring schema is established | Add a visual skill database only when a concrete game/runtime definition schema exists |
| Battle/encounter tooling | Functional | Runtime-backed Battle & Encounter Test workspace, runtime-map switching, region-filtered encounter candidates, weighted EncounterManager picks, enemy definition inspection, victory/escape/defeat resolution and isolated battle-quest progress testing; Android Chromium gate covers real Elyndor content | Richer battle diagnostics, encounter-table deep links, deterministic RNG controls and battle-adapter previews |
| Tileset/passability | Functional | Logical tileset IDs, map layers, observed tile palette, numeric tile painting, regions, blocked-cell paint/erase, layer visibility/Z, validation/export | Real asset-backed tile thumbnails, multi-tile brushes and runtime-backed terrain metadata if/when a contract exists |
| Project search | Mature | Manifest-driven search across all declared content packages, runtime packages and asset manifest with source filtering; Android simulation covered | Deep-link results directly into specific editor selections |
| Reference diagnostics | Functional | Transfer, asset, encounter table, SHOP and runtime-owned SCRIPT_HOOK references validated with map/event locations | Quest objective/reward/prerequisite dependency diagnostics and deep links |
| Animation/effects tooling | Missing | Screen-effect commands and asset hooks only | Timeline/effect authoring surface |
| Audio tooling | Functional | BGM/BGS/ME/SE visual command forms and runtime audio contracts | Audio browser, preview and assignment UI |
| Plugin/extension management | Missing | No editor-facing manager | Plushbound-safe extension registry and compatibility checks |
| Build/deployment UI | Partial | CI builds Android debug APK, verifies installability and frozen Engine v1 baseline, and validates content | Editor-facing build/export controls and diagnostics |
| Mobile/Android ergonomics | Functional | Responsive map/database/common-event/search/passability/battle workspaces, touch tools, dedicated 412x915 Chromium gates, touch-first event/page/command structural actions | Larger touch affordances, compact navigation and device workflow polish |

## Automated gates

- Plushbound Visual Editor CI: real Chromium map authoring + runtime playtest simulation.
- Plushbound Database CI: Android-class Chromium database authoring, rollback, structured row and Common Event coverage.
- Plushbound Command Forms CI: Android visual command serialization against runtime parameter tuples.
- Plushbound Event Copy UI CI: same-map/cross-map event copy-paste with deep-copy, clamping, selection and undo/redo history coverage at 412x915.
- Plushbound Event Page UI CI: page duplicate/reorder/delete, unknown-command preservation and undo selection continuity at 412x915.
- Plushbound Event Command UI CI: command copy/paste/duplicate/reorder/delete and history coverage at 412x915.
- Plushbound Battle Test CI: real runtime encounter selection, Elyndor enemy resolution and battle-quest objective advancement at 412x915.
- Plushbound Quest Authoring CI: structured quest prerequisite/objective/reward/unlock editing against live project content at 412x915.
- Plushbound Project Search CI: manifest-driven project indexing/search at 412x915.
- Plushbound Tile & Passability CI: tile, blocked-cell and region painting against runtime-native map contracts at 412x915.
- Game Content CI: JSON syntax, asset root, runtime/content/asset contract tests.
- Android game debug APK workflow: current application build compatibility, installability and frozen-engine baseline verification.

## Current priority order

1. Dedicated item/equipment authoring grounded in the existing item/accessory/stat schemas, plus broader quest/item/waystitch dependency diagnostics.
2. Richer battle/encounter diagnostics and deep links into encounter/enemy database records.
3. Skills/status-effect authoring only when explicit game/runtime schemas exist; do not invent unsupported definitions.
4. Asset-backed tileset palette/brush ergonomics without inventing unsupported runtime metadata.
5. Audio browser/preview plus animation/effects workflows.
6. Editor-facing build/deploy and extension management.
7. Continue Android-first UX polish and regression simulations.

## Current checkpoint

The editor suite now has mature map/world foundations, runtime playtest, transaction-safe event copy/paste, mature page and command structural editing, manifest-driven project search, a dedicated tile/passability workspace, domain-aware database authoring, structured quest editing, reusable Common Events with runtime support and cycle validation, rich visual parameter forms for the Engine v1 command vocabulary, reference diagnostics for runtime-owned IDs, and a runtime-backed Battle & Encounter Test workspace verified against real Elyndor battle-objective progress on an Android-class viewport. The largest remaining gaps are dedicated item/equipment depth, explicit-schema skills/status effects, richer asset-backed tileset ergonomics, animation tooling and editor-facing deployment. Frozen Engine v1 remains unchanged.
