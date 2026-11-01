from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

ASSETS = Path('app/src/main/assets')
OVERRIDES = Path('overrides')
DATA_DIR = ASSETS / 'data/world_editor'
RUNTIME_SOURCE = OVERRIDES / 'character_generator_runtime.js'
PACK_RUNTIME_SOURCE = OVERRIDES / 'character_generator_pack_runtime.js'
REGISTRY_SOURCE = OVERRIDES / 'character_generator_components_v1.json'


def fail(message: str) -> None:
    raise SystemExit(f'character generator install rejected: {message}')


for required_path in (RUNTIME_SOURCE, PACK_RUNTIME_SOURCE, REGISTRY_SOURCE):
    if not required_path.is_file():
        fail(f'missing required source {required_path}')

registry = json.loads(REGISTRY_SOURCE.read_text(encoding='utf-8'))
if registry.get('schema') != 'plushbound.world_editor.character_generator_components.v1':
    fail('unexpected component registry schema')
if registry.get('version') != 1:
    fail('component registry must be version 1')
if registry.get('failClosed') is not True or registry.get('visualGuessingForbidden') is not True:
    fail('generator must be fail-closed with visual guessing forbidden')
layer_order = registry.get('layerOrder')
if not isinstance(layer_order, list) or len(layer_order) != len(set(layer_order)) or not layer_order:
    fail('layerOrder must be a non-empty unique list')
for required in registry.get('requiredSlots', []):
    if required not in layer_order:
        fail(f'required slot {required!r} is not in layerOrder')

seen = set()
for pack in registry.get('componentPacks', []):
    pack_id = pack.get('packId')
    if not isinstance(pack_id, str) or not pack_id:
        fail('component pack missing packId')
    for component in pack.get('components', []):
        cid = component.get('id')
        if not isinstance(cid, str) or not cid or cid in seen:
            fail(f'invalid or duplicate component id {cid!r}')
        seen.add(cid)
        if component.get('slot') not in layer_order:
            fail(f'{cid}: invalid slot {component.get("slot")!r}')
        if not isinstance(component.get('source'), str) or not component['source']:
            fail(f'{cid}: source required')

pack_runtime_text = PACK_RUNTIME_SOURCE.read_text(encoding='utf-8')
expected_pack_sha = '01e89432b8681206422fba05be6fd9e302afe8e2ee27ee8a7c872c3ede875783'
for token in (
    expected_pack_sha,
    'plushbound-character-creator-full-outfits-glasses-only-v1',
    'expected 2050 generator PNGs',
    "window.PlushboundCharacterPack",
    "NPC Generator",
):
    if token not in pack_runtime_text:
        fail(f'pack runtime contract token missing: {token}')

DATA_DIR.mkdir(parents=True, exist_ok=True)
registry_target = DATA_DIR / 'character_generator_components_v1.json'
shutil.copy2(REGISTRY_SOURCE, registry_target)
shutil.copy2(RUNTIME_SOURCE, ASSETS / 'character_generator_runtime.js')
shutil.copy2(PACK_RUNTIME_SOURCE, ASSETS / 'character_generator_pack_runtime.js')

index_path = ASSETS / 'index.html'
index = index_path.read_text(encoding='utf-8')
script_tags = [
    '<script src="character_generator_runtime.js"></script>',
    '<script src="character_generator_pack_runtime.js"></script>',
]
anchors = ['<script src="game.js"></script>', "<script src='game.js'></script>"]
for script_tag in script_tags:
    if script_tag in index:
        continue
    for anchor in anchors:
        if anchor in index:
            index = index.replace(anchor, script_tag + '\n  ' + anchor, 1)
            break
    else:
        fail(f'could not find game.js insertion point for {script_tag}')
index_path.write_text(index, encoding='utf-8')

registry_sha = hashlib.sha256(registry_target.read_bytes()).hexdigest()
runtime_sha = hashlib.sha256((ASSETS / 'character_generator_runtime.js').read_bytes()).hexdigest()
pack_runtime_sha = hashlib.sha256((ASSETS / 'character_generator_pack_runtime.js').read_bytes()).hexdigest()
receipt = {
    'schema': 'plushbound.world_editor.character_generator_install_receipt.v1',
    'status': 'PASS_BUILD_TIME_CHARACTER_GENERATOR_INSTALL',
    'registrySha256': registry_sha,
    'runtimeSha256': runtime_sha,
    'packRuntimeSha256': pack_runtime_sha,
    'approvedPackSha256': expected_pack_sha,
    'approvedPackPngCount': 2050,
    'componentCount': len(seen),
    'generatorInstalled': True,
    'packImporterInstalled': True,
    'npcGeneratorUiInstalled': True,
    'persistentIndexedDbPackStorage': True,
    'supportedOutputs': ['TV', 'Face', 'TVD', 'SV'],
    'supportedBodySets': ['Female', 'Male', 'Kid'],
    'failClosed': True,
    'visualGuessingForbidden': True,
    'deterministicLayerOrder': layer_order,
}
(DATA_DIR / 'character_generator_install_receipt.json').write_text(
    json.dumps(receipt, indent=2, sort_keys=True), encoding='utf-8'
)
print(json.dumps(receipt, sort_keys=True))
