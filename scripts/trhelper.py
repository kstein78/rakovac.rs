"""Helper used to create translated content files from content/en.
tr(lang, path, fields, body): copies front matter from the English file,
overrides the translated fields, writes content/<lang>/<path>."""
import yaml, os
ROOT = os.path.join(os.path.dirname(__file__), '..', 'content')
def load(path):
    s = open(os.path.join(ROOT, 'en', path), encoding='utf-8').read()
    _, fm, body = s.split('---\n', 2)
    return yaml.safe_load(fm), body
def tr(lang, path, fields, body):
    fm, _ = load(path)
    for k, v in fields.items():
        if isinstance(v, dict) and isinstance(fm.get(k), dict):
            fm[k].update(v)
        else:
            fm[k] = v
    out = os.path.join(ROOT, lang, path)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        f.write('---\n' + yaml.safe_dump(fm, allow_unicode=True, sort_keys=False, width=1000) + '---\n\n' + body.strip() + '\n')
