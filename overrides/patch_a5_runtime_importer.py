from __future__ import annotations

import binascii
import hashlib
import json
import shutil
import struct
import zlib
from pathlib import Path

ROOT = Path('.')
ASSETS = ROOT / 'app/src/main/assets'
OVERRIDES = ROOT / 'overrides'
IMPORTER_SOURCE = OVERRIDES / 'a5_runtime_importer.js'
SMOKE_SOURCE = OVERRIDES / 'a5_runtime_smoke.html'
REGION_ASSET_ROOT = OVERRIDES / 'region_assets'
REGION_MANIFEST_GLOB = 'a5_runtime_*_manifest.json'


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as fh:
        for block in iter(lambda: fh.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def png_chunk(kind: bytes, data: bytes) -> bytes:
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', binascii.crc32(kind + data) & 0xFFFFFFFF)


def write_runtime_fixture(path: Path) -> None:
    width, height = 384, 768
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        tile_row = y // 48
        local_y = y % 48
        for x in range(width):
            tile_col = x // 48
            local_x = x % 48
            index = tile_row * 8 + tile_col
            r = (index * 37 + local_x * 3) & 0xFF
            g = (index * 73 + local_y * 5) & 0xFF
            b = (index * 109 + (local_x ^ local_y) * 2) & 0xFF
            raw.extend((r, g, b, 255))
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    png.extend(png_chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)))
    png.extend(png_chunk(b'IDAT', zlib.compress(bytes(raw), 9)))
    png.extend(png_chunk(b'IEND', b''))
    path.write_bytes(bytes(png))


def png_contract(path: Path) -> tuple[int, int, int, int]:
    data = path.read_bytes()[:33]
    if len(data) < 33 or data[:8] != b'\x89PNG\r\n\x1a\n':
        raise SystemExit(f'{path} is not a PNG')
    if data[12:16] != b'IHDR':
        raise SystemExit(f'{path} has no IHDR at expected position')
    width, height = struct.unpack('>II', data[16:24])
    return width, height, data[24], data[25]


def validate_package(png: Path, manifest: dict) -> dict:
    if manifest.get('schema') != 'plushbound.a5_runtime_package.v1':
        raise SystemExit('unexpected A5 runtime manifest schema')
    if manifest.get('profile') != 'mv_tileset_a5':
        raise SystemExit('unexpected A5 runtime profile')
    region_id = manifest.get('regionId')
    if not isinstance(region_id, str) or not region_id:
        raise SystemExit('A5 runtime manifest regionId is required')
    if manifest.get('stableSheetId') != f'tileset.{region_id}.a5':
        raise SystemExit('stable sheet id does not match region')
    expected_runtime_path = f'../../tilesets/{region_id}_A5.png'
    if manifest.get('assetPath') != expected_runtime_path:
        raise SystemExit(f'A5 runtime assetPath must be {expected_runtime_path}')
    actual_sha = sha256(png)
    if actual_sha != manifest.get('sha256'):
        raise SystemExit(f'A5 source hash mismatch: {actual_sha} != {manifest.get("sha256")}')
    width, height, bit_depth, color_type = png_contract(png)
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
    return {
        'regionId': region_id,
        'stableSheetId': manifest['stableSheetId'],
        'sha256': actual_sha,
        'width': width,
        'height': height,
    }


def discover_production_packages() -> list[tuple[Path, Path, dict]]:
    packages: list[tuple[Path, Path, dict]] = []
    seen_regions: set[str] = set()
    for manifest_path in sorted(OVERRIDES.glob(REGION_MANIFEST_GLOB)):
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        region_id = manifest.get('regionId')
        if not isinstance(region_id, str) or not region_id:
            raise SystemExit(f'{manifest_path}: missing regionId')
        if region_id == 'runtime_fixture':
            raise SystemExit('production manifest may not claim runtime_fixture')
        if region_id in seen_regions:
            raise SystemExit(f'duplicate A5 runtime region manifest: {region_id}')
        seen_regions.add(region_id)
        png_path = REGION_ASSET_ROOT / f'{region_id}_A5.png'
        if not png_path.is_file():
            # A manifest may be banked before the binary is copied into this repo.
            # Missing local bytes are retrieval/packaging state, never rerender authority.
            continue
        packages.append((png_path, manifest_path, manifest))
    return packages


(ASSETS / 'tilesets').mkdir(parents=True, exist_ok=True)
(ASSETS / 'data/tilesets').mkdir(parents=True, exist_ok=True)
shutil.copy2(IMPORTER_SOURCE, ASSETS / 'a5_runtime_importer.js')
shutil.copy2(SMOKE_SOURCE, ASSETS / 'a5_runtime_smoke.html')

fixture_png = ASSETS / 'tilesets/runtime_fixture_A5.png'
write_runtime_fixture(fixture_png)
fixture_sha = sha256(fixture_png)
fixture_manifest = {
    'schema': 'plushbound.a5_runtime_package.v1',
    'regionId': 'runtime_fixture',
    'stableSheetId': 'tileset.runtime_fixture.a5',
    'profile': 'mv_tileset_a5',
    'assetPath': '../../tilesets/runtime_fixture_A5.png',
    'sha256': fixture_sha,
    'width': 384,
    'height': 768,
    'tileWidth': 48,
    'tileHeight': 48,
    'columns': 8,
    'rows': 16,
    'slotCount': 128,
    'hashVerifiedAtBuild': True,
    'sourcePipeline': 'runtime-import-ci-fixture',
}
fixture_manifest_path = ASSETS / 'data/tilesets/runtime_fixture_a5.json'
fixture_manifest_path.write_text(json.dumps(fixture_manifest, indent=2, sort_keys=True), encoding='utf-8')
fixture_receipt = validate_package(fixture_png, fixture_manifest)

production_packages = []
for png_path, manifest_path, manifest in discover_production_packages():
    receipt = validate_package(png_path, manifest)
    region_id = receipt['regionId']
    production_packages.append(receipt)
    shutil.copy2(png_path, ASSETS / f'tilesets/{region_id}_A5.png')
    shutil.copy2(manifest_path, ASSETS / f'data/tilesets/{region_id}_a5.json')

index_path = ASSETS / 'index.html'
index = index_path.read_text(encoding='utf-8')
script_tag = '<script src="a5_runtime_importer.js"></script>'
if script_tag not in index:
    candidates = ['<script src="game.js"></script>', "<script src='game.js'></script>"]
    inserted = False
    for anchor in candidates:
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
    'schema': 'plushbound.a5_runtime_install_receipt.v2',
    'status': 'PASS_BUILD_TIME_ENGINE_V1_A5_IMPORTER_INSTALL',
    'profile': 'mv_tileset_a5',
    'fixture': fixture_receipt,
    'productionPackagesInstalled': production_packages,
    'productionPackageCount': len(production_packages),
    'productionPackageDiscovery': 'overrides/a5_runtime_*_manifest.json + overrides/region_assets/<region>_A5.png',
    'regionSpecificInstallerCodeRequired': False,
    'width': 384,
    'height': 768,
    'tileWidth': 48,
    'tileHeight': 48,
    'columns': 8,
    'rows': 16,
    'slotCount': 128,
    'importerInstalled': True,
    'smokePageInstalled': True,
    'missingProductionPackageIsNotRerenderAuthority': True,
}
(ASSETS / 'data/tilesets/a5_runtime_importer_receipt.json').write_text(
    json.dumps(receipt, indent=2, sort_keys=True), encoding='utf-8'
)
print(json.dumps(receipt, sort_keys=True))
