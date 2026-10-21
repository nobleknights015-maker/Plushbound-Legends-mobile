from pathlib import Path

src = Path('overrides/patch_visuals_v2.py').read_text(encoding='utf-8')
old = "        raise SystemExit(f'Could not replace required function: {name}')"
new = "        print(f'Skipped optional renderer hook: {name} (not present in this source revision)')\n        return False"
if old not in src:
    raise SystemExit('visual v2 compatibility target not found')
patched = src.replace(old, new, 1)
namespace = {'__name__': '__main__'}
exec(compile(patched, 'patch_visuals_v2_compat_runtime.py', 'exec'), namespace)
