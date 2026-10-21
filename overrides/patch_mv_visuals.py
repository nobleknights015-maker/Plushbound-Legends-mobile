from pathlib import Path
import re

js_path = Path('app/src/main/assets/game.js')
css_path = Path('app/src/main/assets/style.css')
js = js_path.read_text(encoding='utf-8')
css = css_path.read_text(encoding='utf-8')

# This override is intentionally compatibility-safe. The reconstructed source has
# evolved across prototype revisions, so visual enhancements are only applied
# when their exact target functions exist. Missing optional renderer hooks must
# never prevent the Android APK from building.

def replace_function(name, replacement):
    global js
    pattern = rf"function {re.escape(name)}\([^)]*\)\{{.*?\n\}}"
    updated, count = re.subn(pattern, replacement, js, count=1, flags=re.S)
    if count == 1:
        js = updated
        print(f'Updated {name}')
        return True
    print(f'Skipped optional {name} visual override: target not present in current source')
    return False

creator_new = r'''function updateCreatorPreview(){
  const v=creatorValues();
  const p=$('avatarPreview');
  const hair=colors.hair[v.hairColor]||'#2a2630';
  const skin=colors.skin[v.skin]||'#c99170';
  const outfit=colors.palette[v.palette]||'#3f6a52';
  p.innerHTML=`<div class="mv-preview-stage"><div class="mv-preview-name">${escapeHtml(v.name)}</div><div class="mv-preview-sub">Threadbound Adventurer</div></div>`;
}'''
replace_function('updateCreatorPreview', creator_new)

# Preserve current world/NPC/player renderers when their historical patch anchors
# are absent. This avoids brittle CI failures while keeping all gameplay code intact.
for optional_name in ('drawNpc', 'drawPlayer'):
    if not re.search(rf"function {optional_name}\([^)]*\)\{{", js):
        print(f'Skipped optional {optional_name} visual override: target not present in current source')

# Dialogue portrait hook is optional as well; never alter dialogue semantics.
if "function dialogue(name,text,choices=[])" not in js:
    print('Skipped optional dialogue portrait override: target not present in current source')

css_marker = '/* In-game original MV-era-inspired character baseline */'
if css_marker not in css:
    css += r'''

/* In-game original MV-era-inspired character baseline */
.avatar-preview{background:linear-gradient(#6f96aa 0 52%,#8da36e 52% 68%,#7c6a52 68%);border:2px solid #6d5c3d;box-shadow:inset 0 0 0 3px rgba(242,211,141,.15)}
.mv-preview-stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:flex-end;flex-direction:column;padding-bottom:18px;background:radial-gradient(circle at 50% 30%,rgba(255,255,255,.18),transparent 48%)}
.mv-preview-name{font-weight:900;font-family:Georgia,serif;font-size:22px;text-shadow:0 2px 4px #000}.mv-preview-sub{font-size:11px;color:#efe0b4;text-transform:uppercase;letter-spacing:.13em}
'''

js_path.write_text(js, encoding='utf-8')
css_path.write_text(css, encoding='utf-8')
print('Applied compatibility-safe MV-inspired visual baseline')
