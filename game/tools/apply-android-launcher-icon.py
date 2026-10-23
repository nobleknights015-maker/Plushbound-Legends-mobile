from pathlib import Path
from io import BytesIO
import base64
import hashlib
import re

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit("Pillow is required to generate Android launcher icons") from exc

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "game/assets/ui/branding/plushbound-launcher-icon.webp"
CHUNK_DIR = ROOT / "game/assets/ui/branding/launcher-source"
EXPECTED_SOURCE_SHA256 = "ae1ba97e7df969d0451fce2413edc2b50a7b95bbc55e5f9f5cc849e0377ef9eb"
APP = ROOT / "app/src/main"
MANIFEST = APP / "AndroidManifest.xml"
RES = APP / "res"
BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

if not MANIFEST.is_file():
    raise SystemExit(f"Missing reconstructed Android manifest: {MANIFEST}")


def normalized_chunk(part: Path) -> str:
    return "".join(part.read_text(encoding="ascii").split())


def verified_decode(encoded: str):
    try:
        decoded = base64.b64decode(encoded, validate=True)
    except Exception:
        return None
    return decoded if hashlib.sha256(decoded).hexdigest() == EXPECTED_SOURCE_SHA256 else None


def decode_verified_chunks(parts):
    chunks = [normalized_chunk(part) for part in parts]
    encoded = "".join(chunks)
    decoded = verified_decode(encoded)
    if decoded is not None:
        return decoded, "direct"

    # The launcher source is checksum-pinned, so a one-character transport loss can
    # be repaired without guessing the artwork. Try only legal Base64 characters
    # at original chunk boundaries and accept exclusively the byte stream whose
    # SHA-256 equals the committed source checksum.
    boundaries = []
    offset = 0
    for chunk in chunks[:-1]:
        offset += len(chunk)
        boundaries.append(offset)

    for boundary in boundaries:
        for character in BASE64_ALPHABET:
            candidate = encoded[:boundary] + character + encoded[boundary:]
            decoded = verified_decode(candidate)
            if decoded is not None:
                return decoded, f"repaired missing Base64 character at chunk boundary {boundary}"

    raise SystemExit(
        "Launcher source chunks cannot be reconstructed to the pinned SHA-256; "
        "refusing to generate launcher resources from unverified artwork"
    )


def load_source() -> Image.Image:
    parts = sorted(CHUNK_DIR.glob("part_*.b64")) if CHUNK_DIR.is_dir() else []
    if parts:
        expected_names = [f"part_{index:02}.b64" for index in range(len(parts))]
        actual_names = [part.name for part in parts]
        if actual_names != expected_names:
            raise SystemExit(
                f"Launcher source chunks are incomplete or misnumbered: {actual_names}"
            )
        source_bytes, mode = decode_verified_chunks(parts)
        digest = hashlib.sha256(source_bytes).hexdigest()
        try:
            image = Image.open(BytesIO(source_bytes))
            image.load()
        except Exception as exc:
            raise SystemExit("Verified launcher source bytes are not a valid image") from exc
        if image.width < 128 or image.height < 128:
            raise SystemExit(
                f"Launcher source is too small: {image.width}x{image.height}"
            )
        print(
            f"Loaded verified launcher source from {len(parts)} text chunk(s): "
            f"{image.width}x{image.height}, sha256={digest}, mode={mode}"
        )
        return image.convert("RGBA")

    if not SOURCE.is_file():
        raise SystemExit(
            f"Missing launcher icon source chunks under {CHUNK_DIR} and fallback {SOURCE}"
        )
    image = Image.open(SOURCE)
    image.load()
    print(f"Loaded fallback launcher source: {SOURCE}")
    return image.convert("RGBA")


source = load_source()

# Keep the wolf face and forehead sigil comfortably inside common Android masks.
def render(size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (5, 3, 7, 255))
    inset = max(1, round(size * 0.06))
    available = size - inset * 2
    scale = min(available / source.width, available / source.height)
    target_size = (
        max(1, round(source.width * scale)),
        max(1, round(source.height * scale)),
    )
    target = source.resize(target_size, Image.Resampling.LANCZOS)
    offset = ((size - target.width) // 2, (size - target.height) // 2)
    canvas.alpha_composite(target, offset)
    return canvas


sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
for folder, size in sizes.items():
    out_dir = RES / folder
    out_dir.mkdir(parents=True, exist_ok=True)
    icon = render(size).convert("RGB")
    icon.save(out_dir / "plushbound_launcher.webp", "WEBP", quality=96, method=6)
    icon.save(out_dir / "plushbound_launcher_round.webp", "WEBP", quality=96, method=6)

# Adaptive icon foreground. Android masks the final icon shape; the inset protects ears/sigil.
drawable = RES / "drawable-nodpi"
drawable.mkdir(parents=True, exist_ok=True)
render(432).convert("RGB").save(
    drawable / "plushbound_launcher_foreground.webp", "WEBP", quality=96, method=6
)

values = RES / "values"
values.mkdir(parents=True, exist_ok=True)
(values / "plushbound_launcher_colors.xml").write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<resources>\n'
    '    <color name="plushbound_launcher_background">#050307</color>\n'
    '</resources>\n',
    encoding="utf-8",
)

adaptive = RES / "mipmap-anydpi-v26"
adaptive.mkdir(parents=True, exist_ok=True)
adaptive_xml = (
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
    '    <background android:drawable="@color/plushbound_launcher_background" />\n'
    '    <foreground android:drawable="@drawable/plushbound_launcher_foreground" />\n'
    '</adaptive-icon>\n'
)
(adaptive / "plushbound_launcher.xml").write_text(adaptive_xml, encoding="utf-8")
(adaptive / "plushbound_launcher_round.xml").write_text(adaptive_xml, encoding="utf-8")

text = MANIFEST.read_text(encoding="utf-8")

# Keep package/activity declarations untouched; only normalize application launcher resources.
app_match = re.search(r"<application\b[^>]*>", text, flags=re.DOTALL)
if not app_match:
    raise SystemExit("AndroidManifest.xml has no <application> element")
application = app_match.group(0)
if re.search(r'android:icon="[^"]*"', application):
    application = re.sub(
        r'android:icon="[^"]*"',
        'android:icon="@mipmap/plushbound_launcher"',
        application,
    )
else:
    application = application[:-1] + ' android:icon="@mipmap/plushbound_launcher">'
if re.search(r'android:roundIcon="[^"]*"', application):
    application = re.sub(
        r'android:roundIcon="[^"]*"',
        'android:roundIcon="@mipmap/plushbound_launcher_round"',
        application,
    )
else:
    application = application[:-1] + ' android:roundIcon="@mipmap/plushbound_launcher_round">'
text = text[:app_match.start()] + application + text[app_match.end():]
MANIFEST.write_text(text, encoding="utf-8")

print("Applied Plushbound wolf launcher icon to reconstructed Android project")
