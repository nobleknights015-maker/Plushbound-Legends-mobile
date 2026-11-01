# World Editor Character Generator v1

## Purpose

The World Editor Character Generator exists to assemble ordinary Plushbound NPCs from approved modular source art. It is not a generative-image system and it does not replace bespoke character art.

Primary use cases include guards, merchants, villagers, workers, scholars, travelers, nobles, regional civilians, quest NPCs, and other repeatable population roles.

## Ownership split

- Vera / asset production creates approved visual component families.
- World Editor owns deterministic assembly, layer ordering, compatibility validation, palette metadata, recipe persistence, and runtime export.
- The atlas/compiler pipeline remains authoritative for bespoke story characters, Guardians, bosses, and any character whose art cannot be represented by the modular registry.

## Deterministic layer order

The v1 layer stack is fixed:

1. shadow
2. body
3. legs
4. feet
5. torso_under
6. torso_over
7. arms
8. hands
9. neck
10. hair_back
11. head
12. face
13. eyes
14. hair_front
15. headwear
16. accessory_back
17. accessory_front
18. equipment_back
19. equipment_front

The editor must never infer z-order visually.

## Fail-closed rules

A character recipe is rejected when:

- a required slot is empty,
- a component ID is not registered,
- a component is assigned to the wrong slot,
- compatibility metadata rejects the combination,
- a source image cannot be loaded,
- source layer dimensions do not match the render canvas,
- the registry schema/version is unknown.

No substitute component, fallback clothing, or visually guessed replacement may be inserted automatically.

## Recipe contract

Every assembled NPC stores a deterministic recipe containing:

- stable `characterId`
- display name
- selected stable component IDs by slot
- palette metadata
- character metadata/tags
- resolved ordered source layers
- generator ID and schema version

Reopening the same recipe against the same qualified component registry must reproduce the same layer stack.

## Component-pack contract

Each registered component must provide at minimum:

- stable component `id`
- fixed `slot`
- source image path

Optional metadata may include:

- palette channels
- required tags
- forbidden tags
- region/faction/role tags
- body-family compatibility
- outfit-family compatibility
- animation/pose-set linkage

## Important limitation

The initial registry intentionally ships with zero visual component packs. This installs and locks the generator architecture without inventing placeholder art or promoting unqualified layers. Component packs must be populated only from approved Plushbound source assets.

## Runtime API

`window.PlushboundCharacterGenerator` exposes:

- `loadRegistry()`
- `validateRecipe(recipe)`
- `buildManifest(recipe)`
- `renderToCanvas(recipe, canvas)`
- `downloadRecipe(manifest)`

The installed runtime reads `data/world_editor/character_generator_components_v1.json` and fails closed on malformed or incompatible data.
