from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

ASSETS = Path('app/src/main/assets')
OVERRIDES = Path('overrides')
RUNTIME_SOURCE = OVERRIDES / 'environment_registry_runtime.js'
READY_SOURCE = OVERRIDES / 'environment_registry_ready30.json'
SMOKE_SOURCE = OVERRIDES / 'environment_registry_smoke.html'
DATA_DIR = ASSETS / 'data/world_editor'

REGIONS = [
    'elyndor', 'crownweave', 'silkspire', 'gloamfen', 'verdancia',
    'tideglass-coast', 'moonpatch-steppe', 'sunspool-desert', 'cinderreach',
    'frostlace', 'akatsukiyama', 'yan-kana', 'florentia', 'frostvale',
    'gearborn', 'emberhold', 'shadofell', 'auralis',
]
SCENE_SLOTS = [
    'settlement_core', 'settlement_secondary', 'wilderness_route',
    'wilderness_open', 'wilderness_special', 'interior_public',
    'interior_private', 'dungeon_entry', 'dungeon_depths',
    'landmark_waystitch', 'major_encounter', 'story_special',
]


def fail(message: str) -> None:
    raise SystemExit(f'environment registry install rejected: {message}')


ready_doc = json.loads(READY_SOURCE.read_text(encoding='utf-8'))
if ready_doc.get('schema') != 'plushbound.environment.ready_bindings.v1':
    fail('unexpected ready-binding schema')
if ready_doc.get('version') != 1 or ready_doc.get('count') != 30:
    fail('ready-binding header must be version 1 with count 30')

ready_by_id = {}
for binding in ready_doc.get('bindings', []):
    scene_id = binding.get('sceneId')
    if not isinstance(scene_id, str) or scene_id in ready_by_id:
        fail(f'invalid or duplicate ready scene id {scene_id!r}')
    if not isinstance(binding.get('runtimeAssetId'), str) or not binding['runtimeAssetId']:
        fail(f'{scene_id}: runtimeAssetId required')
    if not isinstance(binding.get('runtimePath'), str) or not binding['runtimePath']:
        fail(f'{scene_id}: runtimePath required')
    sha = str(binding.get('sha256') or '')
    if len(sha) != 64 or any(c not in '0123456789abcdef' for c in sha):
        fail(f'{scene_id}: invalid sha256')
    ready_by_id[scene_id] = binding

if len(ready_by_id) != 30:
    fail(f'expected 30 unique ready bindings, got {len(ready_by_id)}')

scenes = []
for region_id in REGIONS:
    for scene_slot in SCENE_SLOTS:
        scene_id = f'environment/{region_id}/{scene_slot}'
        binding = ready_by_id.get(scene_id)
        if binding:
            scene = {
                'sceneId': scene_id,
                'regionId': region_id,
                'sceneSlot': scene_slot,
                'status': 'RUNTIME_READY_VERIFIED',
                'runtimeAssetId': binding['runtimeAssetId'],
                'runtimePath': binding['runtimePath'],
                'sha256': binding['sha256'],
                'dimensions': '816x624',
                'mode': 'RGB',
            }
        else:
            scene = {
                'sceneId': scene_id,
                'regionId': region_id,
                'sceneSlot': scene_slot,
                'status': 'AWAITING_NEW_SOURCE',
                'runtimeAssetId': None,
                'runtimePath': None,
                'sha256': None,
                'dimensions': None,
                'mode': None,
            }
        scenes.append(scene)

if len(scenes) != 216:
    fail(f'expected 216 canonical scene slots, got {len(scenes)}')

scene_ids = [s['sceneId'] for s in scenes]
if len(set(scene_ids)) != 216:
    fail('canonical scene IDs are not unique')

ready_count = sum(s['status'] == 'RUNTIME_READY_VERIFIED' for s in scenes)
waiting_count = sum(s['status'] == 'AWAITING_NEW_SOURCE' for s in scenes)
if (ready_count, waiting_count) != (30, 186):
    fail(f'expected status totals 30/186, got {ready_count}/{waiting_count}')

registry = {
    'schema': 'plushbound.world_editor.environment_registry.v1',
    'version': 1,
    'sceneCount': 216,
    'runtimeReady': 30,
    'awaitingNewSource': 186,
    'failClosed': True,
    'visualGuessingForbidden': True,
    'fallbackSubstitutionForbidden': True,
    'scenes': scenes,
}

DATA_DIR.mkdir(parents=True, exist_ok=True)
registry_path = DATA_DIR / 'environment_registry_v1.json'
registry_path.write_text(json.dumps(registry, indent=2, sort_keys=True), encoding='utf-8')

shutil.copy2(RUNTIME_SOURCE, ASSETS / 'environment_registry_runtime.js')
shutil.copy2(SMOKE_SOURCE, ASSETS / 'environment_registry_smoke.html')

index_path = ASSETS / 'index.html'
index = index_path.read_text(encoding='utf-8')
script_tag = '<script src="environment_registry_runtime.js"></script>'
if script_tag not in index:
    anchors = ['<script src="game.js"></script>', "<script src='game.js'></script>"]
    inserted = False
    for anchor in anchors:
        if anchor in index:
            index = index.replace(anchor, script_tag + '\n  ' + anchor, 1)
            inserted = True
            break
    if not inserted:
        fail('could not find game.js script insertion point')
    index_path.write_text(index, encoding='utf-8')

registry_sha = hashlib.sha256(registry_path.read_bytes()).hexdigest()
receipt = {
    'schema': 'plushbound.environment_registry_install_receipt.v1',
    'status': 'PASS_BUILD_TIME_ENVIRONMENT_REGISTRY_INSTALL',
    'sceneCount': 216,
    'runtimeReady': 30,
    'awaitingNewSource': 186,
    'failClosed': True,
    'visualGuessingForbidden': True,
    'fallbackSubstitutionForbidden': True,
    'registrySha256': registry_sha,
    'runtimeInstalled': True,
    'registryInstalled': True,
    'smokePageInstalled': True,
}
(DATA_DIR / 'environment_registry_install_receipt.json').write_text(
    json.dumps(receipt, indent=2, sort_keys=True), encoding='utf-8'
)
print(json.dumps(receipt, sort_keys=True))
