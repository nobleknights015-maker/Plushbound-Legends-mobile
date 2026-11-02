from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

ASSETS = Path('app/src/main/assets')
OVERRIDES = Path('overrides')
DATA_DIR = ASSETS / 'data/world_editor'
SOURCE = OVERRIDES / 'character_generator_mv_free_addon.js'
TARGET = ASSETS / 'character_generator_mv_free_addon.js'
EXPECTED_ADDON_SHA256 = '260f992eafc9df2b3e6164ce342561b8ae127e78e846ba6ff899524a938349b9'

if not SOURCE.is_file():
    raise SystemExit('MV Free Assets add-on importer source missing')
text = SOURCE.read_text(encoding='utf-8')
for token in (
    EXPECTED_ADDON_SHA256,
    'user-supplied-local-only',
    'redistributionForbidden:true',
    'window.PlushboundMVFreeAddon',
    'Import MV Free Assets',
):
    if token not in text:
        raise SystemExit(f'MV Free Assets importer contract token missing: {token}')

shutil.copy2(SOURCE, TARGET)
index_path = ASSETS / 'index.html'
index = index_path.read_text(encoding='utf-8')
tag = '<script src="character_generator_mv_free_addon.js"></script>'
anchors = [
    '<script src="character_generator_mv_runtime_v3.js"></script>',
    '<script src="character_generator_mv_runtime_v2.js"></script>',
    '<script src="game.js"></script>',
    "<script src='game.js'></script>",
]
if tag not in index:
    for anchor in anchors:
        if anchor in index:
            index = index.replace(anchor, anchor + '\n  ' + tag, 1)
            break
    else:
        raise SystemExit('could not find character generator insertion point for MV Free Assets add-on importer')
index_path.write_text(index, encoding='utf-8')

DATA_DIR.mkdir(parents=True, exist_ok=True)
receipt = {
    'schema': 'plushbound.world_editor.mv_free_addon_install_receipt.v1',
    'status': 'PASS_BUILD_TIME_MV_FREE_ADDON_IMPORTER_INSTALL',
    'expectedUserSuppliedZipSha256': EXPECTED_ADDON_SHA256,
    'importerSha256': hashlib.sha256(TARGET.read_bytes()).hexdigest(),
    'assetFilesBundled': False,
    'userSuppliedLocalOnly': True,
    'redistributionForbidden': True,
    'dimensionAuthority': {'TV': [144, 192], 'TVD': [144, 48]},
    'safeLayers': ['Clothing', 'Clothing1', 'Clothing2', 'AccA', 'AccB'],
    'mislabeledFilesHandledByDimensions': True,
    'ambiguousFilesQuarantined': True,
}
(DATA_DIR / 'mv_free_addon_install_receipt.json').write_text(
    json.dumps(receipt, indent=2, sort_keys=True), encoding='utf-8'
)
print(json.dumps(receipt, sort_keys=True))
