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
| Map/world editor | Mature | Map switching, tile/layer painting, Z/visibility, regions, collision, events, transfers, asset assignment, validation | Tileset palette/brush ergonomics and map-management polish |
| Runtime playtest | Mature | Real PlushboundGameSession path in-editor, movement/interact/encounter coverage | Richer debug overlays and launch presets |
| Event pages | Functional | Pages, triggers, conditions, summaries, safe preservation | More visual condition builders and page operations |
| Event commands | Partial | MESSAGE, SWITCH, TRANSFER, SHOP, SE, SCRIPT_HOOK; unknown commands preserved read-only | Choices, branches, variables, movement, inventory, battle, common-event calls |
| Visual database | Functional | Project package discovery, collections, search, create/duplicate/delete, visual scalar fields, advanced JSON, validation, export, undo/redo | Domain-specific editors and cross-record references |
| Database safety | Mature | Array/keyed registries preserved, transactional replacement, duplicate-ID validation, rollback tests | Cross-package reference validation |
| Guardians | Partial | Existing content editable through generic database | Guardian-specific stats/skills/bond/assets form |
| NPCs | Partial | Existing content editable through generic database | NPC-specific identity/role/route/event linking form |
| Enemies/bosses | Partial | Existing content editable through generic database | Stats/skills/drops/AI/encounter tags visual editor |
| Quests/events | Partial | Existing content editable through generic database | Objective/reward/prerequisite/state-flow editor |
| Items/equipment | Partial | Runtime registries supported where present | Dedicated item/equipment database panels |
| Skills/abilities | Missing | Runtime/content-specific data only | Visual skill database and effect builder |
| Common events | Missing | No first-class reusable event workspace | Common-event library + CALL_COMMON_EVENT command |
| Battle/troop tooling | Missing | Runtime handles battles outside a mature editor surface | Enemy group/troop encounter editor and battle test |
| Tileset configuration | Partial | Logical tileset assets + native layers/regions | Palette, passability, flags, terrain metadata UI |
| Animation/effects tooling | Missing | Asset/event hooks only | Timeline/effect authoring surface |
| Audio tooling | Partial | SE command + runtime audio contracts | BGM/BGS/ME/SE browser and preview controls |
| Plugin/extension management | Missing | No editor-facing manager | Plushbound-safe extension registry and compatibility checks |
| Build/deployment UI | Partial | CI builds Android debug APK and validates content | Editor-facing build/export controls and diagnostics |
| Mobile/Android ergonomics | Functional | Responsive map/database layouts, touch tools, mobile DB simulation | Larger touch affordances, compact navigation, device workflow polish |

## Automated gates

- Plushbound Visual Editor CI: real Chromium map authoring + runtime playtest simulation.
- Plushbound Database CI: Android-class 412x915 Chromium simulation for database load, scalar editing, nested-data preservation, undo/redo, and invalid-edit rollback.
- Game Content CI: JSON syntax, asset root, runtime/content/asset contract tests.
- Android game debug APK workflow: current application build compatibility.

## Current priority order

1. Mature visual database forms for major Plushbound domains.
2. Expand event command builder toward MV-class breadth.
3. Add common events/reusable logic.
4. Add battle/enemy/skills/items/equipment authoring surfaces.
5. Improve tileset/passability/palette tooling.
6. Add audio/animation/effects workflows.
7. Add editor-facing build/deploy and extension management.
8. Continue Android-first UX polish and regression simulations.

## Current checkpoint

Database foundation now includes schema-safe scalar controls, Advanced JSON fallback, transactional edits, duplicate-ID protection, undo/redo, and dedicated mobile browser CI. Engine v1 remains unchanged.
