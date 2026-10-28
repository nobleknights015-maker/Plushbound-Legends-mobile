from __future__ import annotations

import hashlib
import json
import shutil
import struct
from pathlib import Path

ROOT = Path('.')
ASSETS = ROOT / 'app/src/main/assets'
OVERRIDES = ROOT / 'overrides'
PNG_SOURCE = OVERRIDES / 'region_assets/gloamfen_A5.png'
MANIFEST_SOURCE = OVERRIDES / 'a5_runtime_gloamfen_manifest.json'
IMPORTER_SOURCE = OVERRIDES / 'a5_runtime_importer.js'
SMOKE_SOURCE = OVERRIDES / 'a5_runtime_smoke.html'


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as fh:
        for block in iter(lambda: fh.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def png_contract(path: Path) -> tuple[int, int, int, int]:
    data = path.read_bytes()[:33]
    if len(data) < 33 or data[:8] != b'\x89PNG\r\n\x1a\n':
        raise SystemExit('A5 source is not a PNG')
    if data[12:16] != b'IHDR':
        raise SystemExit('A5 source has no IHDR at expected position')
    width, height = struct.unpack('>II', data[16:24])
    bit_depth = data[24]
    color_type = data[25]
    return width, height, bit_depth, color_type


manifest = json.loads(MANIFEST_SOURCE.read_text(encoding='utf-8'))
if manifest.get('schema') != 'plushbound.a5_runtime_package.v1':
    raise SystemExit('unexpected A5 runtime manifest schema')
if manifest.get('profile') != 'mv_tileset_a5':
    raise SystemExit('unexpected A5 runtime profile')
if manifest.get('stableSheetId') != f"tileset.{manifest.get('regionId')}.a5":
    raise SystemExit('stable sheet id does not match region')

if not PNG_SOURCE.is_file():
    raise SystemExit(f'missing qualified A5 PNG: {PNG_SOURCE}')
actual_sha = sha256(PNG_SOURCE)
if actual_sha != manifest.get('sha256'):
    raise SystemExit(f'A5 source hash mismatch: {actual_sha} != {manifest.get("sha256")}')

width, height, bit_depth, color_type = png_contract(PNG_SOURCE)
if (width, height) != (384, 768):
    raise SystemExit(f'A5 dimensions are {width}x{height}, expected 384x768')
if bit_depth != 8 or color_type != 6:
    raise SystemExit(f'A5 PNG must be 8-bit RGBA; bit_depth={bit_depth}, color_type={color_type}')
if [manifest.get('width'), manifest.get('height')] != [384, 768]:
    raise SystemExit('manifest sheet dimensions differ from runtime contract')
if [manifest.get('tileWidth'), manifest.get('tileHeight')] != [48, 48]:
    raise SystemExit('manifest tile dimensions differ from runtime contract')
if [manifest.get('columns'), manifest.get('rows'), manifest.get('slotCount')] != [8, 16, 128]:
    raise SystemExit('manifest grid/slot contract differs from runtime contract')
if manifest.get('hashVerifiedAtBuild') is not True:
    raise SystemExit('manifest must declare build-time hash verification')

(ASSETS / 'tilesets').mkdir(parents=True, exist_ok=True)
(ASSETS / 'data/tilesets').mkdir(parents=True, exist_ok=True)
shutil.copy2(PNG_SOURCE, ASSETS / 'tilesets/gloamfen_A5.png')
shutil.copy2(MANIFEST_SOURCE, ASSETS / 'data/tilesets/gloamfen_a5.json')
shutil.copy2(IMPORTER_SOURCE, ASSETS / 'a5_runtime_importer.js')
shutil.copy2(SMOKE_SOURCE, ASSETS / 'a5_runtime_smoke.html')

index_path = ASSETS / 'index.html'
index = index_path.read_text(encoding='utf-8')
script_tag = '<script src="a5_runtime_importer.js"></script>'
if script_tag not in index:
    game_script_candidates = [
        '<script src="game.js"></script>',
        "<script src='game.js'></script>",
    ]
    inserted = False
    for anchor in game_script_candidates:
        if anchor in index:
            index = index.replace(anchor, script_tag + '\n  ' + anchor, 1)
            inserted = True
            break
    if not inserted:
        if '</body>' not in index:
            raise SystemExit('could not find a safe index.html script insertion point')
        index = index.replace('</body>', '  ' + script_tag + '\n</body>', 1)
    index_path.write_text(index, encoding='utf-8')

receipt = {
    'schema': 'plushbound.a5_runtime_install_receipt.v1',
    'status': 'PASS_BUILD_TIME_ENGINE_V1_A5_PACKAGE_INSTALL',
    'regionId': manifest['regionId'],
    'stableSheetId': manifest['stableSheetId'],
    'profile': manifest['profile'],
    'sha256': actual_sha,
    'width': width,
    'height': height,
    'tileWidth': 48,
    'tileHeight': 48,
    'columns': 8,
    'rows': 16,
    'slotCount': 128,
    'importerInstalled': True,
    'smokePageInstalled': True,
}
(ASSETS / 'data/tilesets/gloamfen_a5.runtime_receipt.json').write_text(
    json.dumps(receipt, indent=2, sort_keys=True), encoding='utf-8'
)
print(json.dumps(receipt, sort_keys=True))
