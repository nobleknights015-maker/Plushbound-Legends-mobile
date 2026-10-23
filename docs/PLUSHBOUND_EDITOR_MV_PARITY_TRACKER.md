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
| Map/world editor | Mature | Map switching, tile/layer painting, Z/visibility, regions, collision, events, transfers, asset assignment, validation, project search, runtime playtest | Map duplication/management, multi-map copy/paste and richer brush operations |
| Runtime playtest | Mature | Real PlushboundGameSession path in-editor, movement/interact/encounter coverage, runtime Common Events | Richer debug overlays and launch presets |
| Event pages | Functional | Pages, triggers, conditions, summaries, safe preservation, undo/redo | Visual condition builders, duplicate/reorder/delete page operations |
| Event commands | Functional | Full Engine v1 command registry exposed; rich visual forms for common message/state/flow/movement/screen/audio/battle/shop/hook commands; unknown future extensions preserved read-only | Branch/choice structure ergonomics, command copy/paste and reference pickers |
| Common events | Functional | Dedicated visual library, create/rename/delete, command editing/reorder, import/export, graph validation, authoring-time expansion and runtime COMMON_EVENT support | Project-integrated persistence/reference pickers and richer branch editing |
| Visual database | Functional | Project package discovery, collections, search, create/duplicate/delete, domain-aware forms, primitive lists, structured encounter/drop rows, Advanced JSON, validation, export, undo/redo | Deeper domain editors and more cross-record references |
| Database safety | Mature | Array/keyed registries preserved, transactional replacement, duplicate-ID validation, rollback tests, package-wide export validation | Broader cross-package dependency diagnostics |
| Guardians | Functional | Guardian identity/species/role/bond/assets forms and safe templates | Stats/skills/bond progression editor |
| NPCs | Partial | Named NPC domain profiles and editable identity/world/story fields | Route/event linking and schedule editor |
| Enemies/bosses | Functional | Level/stats/tags/skills/rewards/assets plus structured drop and encounter editing | AI/behavior and battle-test integration |
| Quests/events | Partial | Existing content editable plus project reference audits for runtime-owned quest hooks | Objective/reward/prerequisite/state-flow editor |
| Items/equipment | Partial | Runtime item registries editable where present; hook references audited | Dedicated item/equipment panels and effect builder |
| Skills/abilities | Missing | Runtime/content-specific data only | Visual skill database and effect builder |
| Battle/troop tooling | Partial | BATTLE visual command authoring and enemy/encounter database surfaces | Enemy-group/troop editor and battle test |
| Tileset/passability | Functional | Logical tileset IDs, map layers, observed tile palette, numeric tile painting, regions, blocked-cell paint/erase, layer visibility/Z, validation/export | Real asset-backed tile thumbnails, multi-tile brushes and runtime-backed terrain metadata if/when a contract exists |
| Project search | Mature | Manifest-driven search across all declared content packages, runtime packages and asset manifest with source filtering; Android simulation covered | Deep-link results directly into specific editor selections |
| Reference diagnostics | Functional | Transfer, asset, encounter table, SHOP and runtime-owned SCRIPT_HOOK references validated with map/event locations | Expand only as additional runtime registries become explicit |
| Animation/effects tooling | Missing | Screen-effect commands and asset hooks only | Timeline/effect authoring surface |
| Audio tooling | Functional | BGM/BGS/ME/SE visual command forms and runtime audio contracts | Audio browser, preview and assignment UI |
| Plugin/extension management | Missing | No editor-facing manager | Plushbound-safe extension registry and compatibility checks |
| Build/deployment UI | Partial | CI builds Android debug APK and validates content | Editor-facing build/export controls and diagnostics |
| Mobile/Android ergonomics | Functional | Responsive map/database/common-event/search/passability workspaces, touch tools, dedicated 412x915 Chromium gates | Larger touch affordances, compact navigation and device workflow polish |

## Automated gates

- Plushbound Visual Editor CI: real Chromium map authoring + runtime playtest simulation.
- Plushbound Database CI: Android-class Chromium database authoring, rollback, structured row and Common Event coverage.
- Plushbound Command Forms CI: Android visual command serialization against runtime parameter tuples.
- Plushbound Project Search CI: manifest-driven project indexing/search at 412x915.
- Plushbound Tile & Passability CI: tile, blocked-cell and region painting against runtime-native map contracts at 412x915.
- Game Content CI: JSON syntax, asset root, runtime/content/asset contract tests.
- Android game debug APK workflow: current application build compatibility and frozen-engine baseline verification.

## Current priority order

1. Safe event/page/command duplication and copy/paste integrated with editor undo/redo.
2. Battle/troop, skills, equipment and status-effect authoring surfaces.
3. Asset-backed tileset palette/brush ergonomics without inventing unsupported runtime metadata.
4. Quest objective/reward/prerequisite flow tooling and broader dependency diagnostics.
5. Audio browser/preview plus animation/effects workflows.
6. Editor-facing build/deploy and extension management.
7. Continue Android-first UX polish and regression simulations.

## Current checkpoint

The editor suite now has mature map/world foundations, runtime playtest, manifest-driven project search, a dedicated tile/passability workspace, domain-aware database authoring, reusable Common Events with runtime support and cycle validation, rich visual parameter forms for the Engine v1 command vocabulary, and reference diagnostics for runtime-owned IDs. The largest remaining gaps are deeper battle/skills/equipment/animation authoring and transaction-aware copy/duplication ergonomics. Frozen Engine v1 remains unchanged.
