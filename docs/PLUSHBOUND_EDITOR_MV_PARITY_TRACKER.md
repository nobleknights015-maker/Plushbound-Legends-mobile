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
| Map/world editor | Mature | Map switching, tile/layer painting, Z/visibility, regions, collision, events, transfers, asset assignment, validation, project search, runtime playtest, same-map duplication and cross-map event copy/paste with undo/redo | Richer brush operations and direct deep links from diagnostics |
| Map management | Functional | Dedicated package-safe workspace for blank-map creation, deep-copy duplication, rename with inbound TRANSFER retargeting, guarded deletion, export, undo/redo and Android-first layout | Resize/crop tools with explicit event/collision handling and integration back into the canvas selection |
| Runtime playtest | Mature | Real PlushboundGameSession path in-editor, movement/interact/encounter coverage, runtime Common Events | Richer debug overlays and launch presets |
| Event pages | Mature | Pages, triggers, conditions, summaries, safe preservation, undo/redo, duplicate/reorder/delete with last-page protection | Rich visual condition builder and condition reference pickers |
| Event commands | Mature | Full Engine v1 registry exposed; rich visual forms; command copy/paste/duplicate/reorder/delete; unknown future commands preserved and protected from destructive deletion | Branch/choice structure visualization and richer reference pickers |
| Common events | Functional | Dedicated visual library, create/rename/delete, command editing/reorder, import/export, graph validation, authoring-time expansion and runtime COMMON_EVENT support | Project-integrated persistence/reference pickers and richer branch editing |
| Visual database | Functional | Project package discovery, collections, search, create/duplicate/delete, domain-aware forms, primitive lists, structured encounter/drop/quest rows, Advanced JSON, validation, export, undo/redo, cross-record datalist suggestions for proven IDs | More domain-specific panels and deep links while retaining freeform extensibility |
| Database safety | Mature | Array/keyed registries preserved, transactional replacement, duplicate-ID validation, rollback tests, package-wide export validation, live-project dependency audit | Deep-link diagnostics directly to offending records |
| Guardians | Functional | Guardian identity/species/role/bond/assets forms and safe templates | Stats/skills/bond progression only when explicit runtime schemas exist |
| NPCs | Partial | Named NPC domain profiles and editable identity/world/story fields | Route/event linking and schedule editor |
| Enemies/bosses | Functional | Enemy level/stats/tags/skills/rewards/assets, structured drops/encounters, boss definitions registered by the game runtime, one-time availability and declared completion-switch behavior | AI/behavior authoring only when explicit runtime behavior contracts exist |
| Quests/events | Functional | Structured prerequisites, objectives, reward items, unlocks, stage/giver fields, project reference audits, runtime-owned quest hooks and reference suggestions | State-flow visualization and deep links |
| Items/equipment | Functional | Dedicated Items & Equipment workspace over the shared runtime items registry; consumable/accessory authoring, generic numeric accessory stats, icon IDs, source-package export, undo/redo, duplicate-safe IDs and inbound usage tracing | Item effects/equipment slots only when explicit runtime schemas exist |
| Skills/abilities | Missing | Enemy skill IDs exist as references, but no standalone explicit authoring schema is established | Add a visual skill database only when a concrete game/runtime definition schema exists |
| Battle/encounter tooling | Functional | Runtime-backed Battle & Encounter Test, runtime-map switching, region-filtered candidates, weighted EncounterManager picks, enemy inspection, quest battle progress, boss loading, victory/escape/defeat handling, one-time boss completion and replay prevention | Deeper encounter/enemy links, deterministic RNG controls and richer battle-adapter previews |
| Tileset/passability | Functional | Logical tileset IDs, map layers, observed tile palette, numeric tile painting, regions, blocked-cell paint/erase, layer visibility/Z, validation/export | Real asset-backed tile thumbnails, multi-tile brushes and runtime-backed terrain metadata if/when a contract exists |
| Project search | Mature | Manifest-driven search across all declared content packages, runtime packages and asset manifest with source filtering; Android simulation covered | Deep-link results directly into specific editor selections |
| Reference diagnostics | Mature | Map/asset/encounter/SHOP/runtime hook references plus quest prerequisites/objectives/rewards, shop stock, enemy drops/tags, Waystitch dependencies and live-project cross-package audit | Deep-link each issue into the relevant workspace/record |
| Animation/effects tooling | Missing | Screen-effect commands and asset hooks only | Timeline/effect authoring only after a concrete effect/animation asset contract is established |
| Audio tooling | Functional | BGM/BGS/ME/SE command forms plus manifest-driven Audio Browser, type/status filtering, exact command tuples and ready-only preview policy | Assignment deep links and richer preview controls once ready audio assets exist |
| Plugin/extension management | Missing | No editor-facing manager | Plushbound-safe extension registry and compatibility checks |
| Build/deployment UI | Partial | CI builds Android debug APK, verifies installability and frozen Engine v1 baseline, and validates content | Editor-facing build/export status and diagnostics |
| Mobile/Android ergonomics | Functional | Responsive map/database/common-event/search/passability/battle/item/audio/map-management workspaces, touch tools and dedicated 412x915 Chromium gates | Larger touch affordances, compact navigation and device workflow polish |

## Automated gates

- Plushbound Visual Editor CI: real Chromium map authoring + runtime playtest simulation.
- Plushbound Map Manager CI: map create/duplicate/rename/history behavior and Android 412x915 workflow simulation.
- Plushbound Database CI: Android-class Chromium database authoring, rollback, structured row and Common Event coverage.
- Plushbound Command Forms CI: Android visual command serialization against runtime parameter tuples.
- Plushbound Event Copy UI CI: same-map/cross-map event copy-paste with deep-copy, clamping, selection and undo/redo history coverage at 412x915.
- Plushbound Event Page UI CI: page duplicate/reorder/delete, unknown-command preservation and undo selection continuity at 412x915.
- Plushbound Event Command UI CI: command copy/paste/duplicate/reorder/delete and history coverage at 412x915.
- Plushbound Battle Test CI: real runtime encounter selection, Elyndor enemy resolution, battle-quest objective advancement and boss completion lifecycle at 412x915.
- Plushbound Quest Authoring CI: structured quest prerequisite/objective/reward/unlock editing against live project content at 412x915.
- Plushbound Items & Equipment CI: shared item-registry authoring, Woven Charm stat edit/undo, usage tracing and consumable filtering at 412x915.
- Plushbound Reference Picker CI: cross-record datalist suggestions for proven item/enemy/quest/NPC/map references at 412x915.
- Plushbound Audio Browser CI: manifest-driven BGM/BGS/ME/SE browsing, exact command tuples and planned-vs-ready preview policy at 412x915.
- Plushbound Project Search CI: manifest-driven project indexing/search at 412x915.
- Plushbound Tile & Passability CI: tile, blocked-cell and region painting against runtime-native map contracts at 412x915.
- Game Content CI: JSON syntax, asset root, runtime/content/asset contract tests.
- Android game debug APK workflow: current application build compatibility, installability and frozen-engine baseline verification.

## Current priority order

1. Finish map-management polish: resize/crop behavior only with explicit safeguards, plus deep links between manager and canvas editor.
2. Deep-link Project Search/reference diagnostics into exact editor records, maps and events.
3. Richer battle/encounter diagnostics and deterministic test controls while preserving the current runtime contract.
4. Skills/status effects and item effects/equipment slots only when explicit game/runtime schemas exist; do not invent unsupported definitions.
5. Animation/effects authoring only when an explicit asset/runtime contract exists.
6. Editor-facing build/deploy diagnostics and extension management.
7. Continue Android-first UX polish and regression simulations.

## Current checkpoint

The editor suite now has mature map/world foundations, runtime playtest, transaction-safe event copy/paste, mature page and command structural editing, a dedicated map-management workspace, manifest-driven project search, a dedicated tile/passability workspace, domain-aware database authoring with cross-record suggestions, structured quest editing, a dedicated item/accessory workspace, reusable Common Events with runtime support and cycle validation, rich visual parameter forms for the Engine v1 command vocabulary, mature cross-package reference diagnostics, a runtime-backed Battle & Encounter Test workspace with game-layer one-time boss completion semantics, and a manifest-driven Audio Browser with safe ready-only preview behavior. The largest remaining gaps are map resize/deep-link polish, explicit-schema skills/status effects, animation tooling and editor-facing deployment. Frozen Engine v1 remains unchanged.
