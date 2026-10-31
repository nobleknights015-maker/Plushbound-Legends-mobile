# Plushbound Legends — Environment Registry Runtime Contract

## Purpose

Bind the canonical 216 environment scene roles to exact runtime assets without visual guessing.

The registry is separate from the A5 tileset importer. A5 owns map-tile geometry; this registry owns scene/background identity.

## Locked registry

- schema: `plushbound.world_editor.environment_registry.v1`
- version: `1`
- scene slots: `216`
- currently runtime-ready: `30`
- awaiting new source: `186`
- runtime-ready battleback geometry: `816x624 RGB PNG`

Stable identity is:

`environment/<region>/<scene_slot>`

The numbered legacy battleback ID is provenance/runtime binding only. It is never semantic identity.

## Runtime API

`window.PlushboundEnvironmentRegistry`

- `load(url)` — validates and loads the 216-scene registry.
- `getScene(sceneId)` — returns the scene record or `null`.
- `requireReady(sceneId)` — returns a runtime-ready scene or throws.
- `resolveRuntimePath(sceneId)` — returns the exact bound runtime path, but only for a ready scene.
- `stats()` — returns scene/ready/waiting totals.

## Fail-closed rules

The runtime rejects:

- duplicate scene IDs;
- malformed stable IDs;
- unexpected status values;
- ready scenes without a 64-character SHA-256;
- ready scenes without `816x624` / `RGB`;
- unresolved scenes carrying a guessed runtime binding;
- fallback substitution for `AWAITING_NEW_SOURCE`.

Unknown scene IDs never resolve by appearance or nearest-number logic.

## Build integration

`overrides/patch_runtime_startup.py` invokes `overrides/patch_environment_registry.py`, which installs:

- `environment_registry_runtime.js`
- `data/world_editor/environment_registry_v1.json`
- `environment_registry_smoke.html`
- `data/world_editor/environment_registry_install_receipt.json`

and injects the runtime script before `game.js`.

The dedicated browser smoke proves:

1. all 216 scene records load;
2. totals are exactly 30 ready / 186 waiting;
3. a known ready stable ID resolves to its exact runtime path;
4. an unresolved stable ID throws instead of falling back;
5. an unknown stable ID returns `null`.

## Asset availability

Registry readiness is identity/integration metadata. Actual production battleback bytes remain governed by the verified Round 36 drop-in/hash ledger. The registry does not authorize regeneration or substitution if bytes are absent.
