from pathlib import Path

src = Path('overrides/patch_visuals_v2.py').read_text(encoding='utf-8')

old_replace = '''def replace_function(name, replacement):
    global js
    pat = rf"function {re.escape(name)}\\([^)]*\\)\\{{.*?\\n\\}}"
    js2, n = re.subn(pat, replacement, js, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f'Could not replace required function: {name}')
    js = js2
    print('Replaced', name)
'''

new_replace = '''def replace_function(name, replacement):
    global js
    marker = f"function {name}("
    start = js.find(marker)
    if start < 0:
        print(f'Skipped optional renderer hook: {name} (not present in this source revision)')
        return False
    brace = js.find('{', start)
    if brace < 0:
        raise SystemExit(f'Malformed function declaration: {name}')
    depth = 0
    quote = None
    escaped = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(js):
        ch = js[i]
        nxt = js[i + 1] if i + 1 < len(js) else ''
        if line_comment:
            if ch == '\\n': line_comment = False
        elif block_comment:
            if ch == '*' and nxt == '/': block_comment = False; i += 1
        elif quote:
            if escaped: escaped = False
            elif ch == '\\\\': escaped = True
            elif ch == quote: quote = None
        else:
            if ch == '/' and nxt == '/': line_comment = True; i += 1
            elif ch == '/' and nxt == '*': block_comment = True; i += 1
            elif ch in ("'", '"', '`'): quote = ch
            elif ch == '{': depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    js = js[:start] + replacement + js[i + 1:]
                    print('Replaced', name)
                    return True
        i += 1
    raise SystemExit(f'Unterminated function body: {name}')
'''

if old_replace not in src:
    raise SystemExit('visual v2 replace_function target not found')

patched = src.replace(old_replace, new_replace, 1)
namespace = {'__name__': '__main__'}
exec(compile(patched, 'patch_visuals_v2_compat_runtime.py', 'exec'), namespace)
