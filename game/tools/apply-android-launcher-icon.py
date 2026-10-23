from pathlib import Path
import re

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit("Pillow is required to generate Android launcher icons") from exc

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "game/assets/ui/branding/plushbound-launcher-icon.webp"
APP = ROOT / "app/src/main"
MANIFEST = APP / "AndroidManifest.xml"
RES = APP / "res"

if not SOURCE.is_file():
    raise SystemExit(f"Missing launcher icon source: {SOURCE}")
if not MANIFEST.is_file():
    raise SystemExit(f"Missing reconstructed Android manifest: {MANIFEST}")

source = Image.open(SOURCE).convert("RGBA")

# Keep the wolf face and forehead sigil comfortably inside common Android masks.
def render(size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (5, 3, 7, 255))
    inset = max(1, round(size * 0.06))
    target = source.resize((size - inset * 2, size - inset * 2), Image.Resampling.LANCZOS)
    canvas.alpha_composite(target, (inset, inset))
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
