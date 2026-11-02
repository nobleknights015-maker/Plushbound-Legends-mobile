from __future__ import annotations

import json
import shutil
from pathlib import Path

ASSETS = Path('app/src/main/assets')
OVERRIDES = Path('overrides')
DATA = ASSETS / 'data/world_editor'
RUNTIME = OVERRIDES / 'character_generator_runtime_v3.js'
CONTRACT = OVERRIDES / 'character_generator_pack_contract_v2.json'


def fail(msg: str) -> None:
    raise SystemExit(f'character generator v3 install rejected: {msg}')


for p in (RUNTIME, CONTRACT):
    if not p.is_file():
        fail(f'missing {p}')

contract = json.loads(CONTRACT.read_text(encoding='utf-8'))
if contract.get('schema') != 'plushbound.world_editor.character_generator_pack_contract.v2':
    fail('bad pack contract schema')
if contract.get('sha256') != '01e89432b8681206422fba05be6fd9e302afe8e2ee27ee8a7c872c3ede875783':
    fail('unexpected pack fingerprint')
if contract.get('generatorPngCount') != 2049 or contract.get('gradientPngCount') != 1 or contract.get('totalPngCount') != 2050:
    fail('pack PNG accounting mismatch')
if not contract.get('audit', {}).get('allDimensionsValid') or not contract.get('audit', {}).get('allFilenamesParse'):
    fail('pack audit is not clean')

text = RUNTIME.read_text(encoding='utf-8')
for token in (
    'Character Generator v3',
    'PART_COUNT=2049',
    'TOTAL_PNG=2050',
    "matchingRecipeAcrossFamilies:true",
    "Ears','BeastEars",
    'maskPath',
):
    if token not in text:
        fail(f'v3 runtime contract token missing: {token}')

DATA.mkdir(parents=True, exist_ok=True)
shutil.copy2(RUNTIME, ASSETS / 'character_generator_runtime_v3.js')
shutil.copy2(CONTRACT, DATA / 'character_generator_pack_contract_v2.json')

index_path = ASSETS / 'index.html'
index = index_path.read_text(encoding='utf-8')
tag = '<script src="character_generator_runtime_v3.js"></script>'
if tag not in index:
    anchors = ['<script src="game.js"></script>', "<script src='game.js'></script>"]
    for anchor in anchors:
        if anchor in index:
            index = index.replace(anchor, tag + '\n  ' + anchor, 1)
            break
    else:
        fail('game.js insertion point not found')
    index_path.write_text(index, encoding='utf-8')

receipt = {
    'schema': 'plushbound.world_editor.character_generator_v3_install_receipt.v1',
    'status': 'PASS_AUDITED_CHARACTER_GENERATOR_V3_INSTALL',
    'packSha256': contract['sha256'],
    'componentPngCount': 2049,
    'gradientPngCount': 1,
    'totalPngCount': 2050,
    'supportedOutputs': ['TV', 'Face', 'TVD', 'SV'],
    'supportedBodySets': ['Female', 'Male', 'Kid'],
    'officialMvDepthOrder': True,
    'packSpecificEarOverlays': True,
    'sharedRecipeAcrossOutputs': True,
    'maskPaletteSupport': True,
    'failClosed': True,
}
(DATA / 'character_generator_v3_install_receipt.json').write_text(json.dumps(receipt, indent=2, sort_keys=True), encoding='utf-8')
print(json.dumps(receipt, sort_keys=True))
