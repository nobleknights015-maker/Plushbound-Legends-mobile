from pathlib import Path
import base64

root = Path('app/src/main')
manifest = root / 'AndroidManifest.xml'
icon_b64 = Path('overrides/plushbound_app_icon_256.png.b64')
icon_dir = root / 'res' / 'drawable-nodpi'
icon_dir.mkdir(parents=True, exist_ok=True)
(icon_dir / 'plushbound_app_icon.png').write_bytes(base64.b64decode(icon_b64.read_text(encoding='ascii')))

text = manifest.read_text(encoding='utf-8')
if 'android:icon=' not in text:
    text = text.replace('android:label="Plushbound Legends"', 'android:label="Plushbound Legends"\n        android:icon="@drawable/plushbound_app_icon"\n        android:roundIcon="@drawable/plushbound_app_icon"')
else:
    import re
    text = re.sub(r'android:icon="[^"]+"', 'android:icon="@drawable/plushbound_app_icon"', text)
    if 'android:roundIcon=' in text:
        text = re.sub(r'android:roundIcon="[^"]+"', 'android:roundIcon="@drawable/plushbound_app_icon"', text)
    else:
        text = text.replace('android:icon="@drawable/plushbound_app_icon"', 'android:icon="@drawable/plushbound_app_icon"\n        android:roundIcon="@drawable/plushbound_app_icon"')
manifest.write_text(text, encoding='utf-8')
print('Installed Plushbound Legends launcher icon')
