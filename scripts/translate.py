#!/usr/bin/env python3
"""Keep the translations of rakovac.rs in sync with the English source, using Claude.

English is the source language:
    content/en/**.md   ->  content/<lang>/**.md
    i18n/en.yaml       ->  i18n/<lang>.yaml        (new or changed keys only)
    data/photos.yaml   ->  alt_<lang> of every photo (new or changed alt text only)

.translations.json remembers, per language, a hash of the English text each translation was
made from. Only files whose English source changed (or whose translation is missing) are sent
to the API, and the current translation goes along as the base, so wording a human has already
polished is kept wherever the English meaning did not change.

A translated page with `translation_locked: true` in its front matter is never touched.

Usage:
    python3 scripts/translate.py                 # translate whatever is out of date (needs ANTHROPIC_API_KEY)
    python3 scripts/translate.py --status        # list what is out of date, no API calls
    python3 scripts/translate.py --check         # validate every translation against the English structure
    python3 scripts/translate.py --init          # mark all existing translations as up to date
    python3 scripts/translate.py --langs de,hu --force nature/isposnica.md

Environment: ANTHROPIC_API_KEY (required for translating), TRANSLATE_MODEL (default below),
TRANSLATE_API_URL (default https://api.anthropic.com).
"""
import argparse, hashlib, json, os, re, sys, time, urllib.error, urllib.request
import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CONTENT = os.path.join(ROOT, 'content')
MANIFEST = os.path.join(ROOT, '.translations.json')
GLOSSARY = os.path.join(ROOT, 'scripts', 'translate-glossary.yaml')
LANGS = ['sr', 'ru', 'de', 'hu']
MODEL = os.environ.get('TRANSLATE_MODEL') or 'claude-sonnet-5'
API_URL = (os.environ.get('TRANSLATE_API_URL') or 'https://api.anthropic.com').rstrip('/')

# Front matter: free text / structured fields with text inside / everything else must stay identical.
TEXT_KEYS = {'title', 'linkTitle', 'kicker', 'slogan', 'summary', 'lead', 'tile', 'list_title',
             'featured_title', 'sections_title', 'years', 'sort_name', 'address'}
STRUCT_KEYS = {'facts', 'videos', 'keyfacts', 'groups', 'group_titles'}
LOCKED_LEAVES = {'id', 'url', 'coords', 'phone', 'website', 'email', 'key', 'map'}
# Shortcode parameters that must not change (the rest, e.g. title/caption/name, are text).
LOCKED_PARAMS = {'key', 'id', 'class', 'type', 'level', 'start', 'src'}
LOCAL_KEYS = {'translation_locked'}


# ---------------------------------------------------------------- helpers
def h(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()[:16]


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def write(p, text):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(text)


def split(text):
    if not text.startswith('---\n'):
        raise ValueError('no front matter')
    _, fm, body = text.split('---\n', 2)
    return (yaml.safe_load(fm) or {}), body


def load_manifest():
    if os.path.exists(MANIFEST):
        return json.loads(read(MANIFEST))
    return {'version': 1, 'pages': {}, 'i18n': {}, 'photos': {}}


def save_manifest(m):
    write(MANIFEST, json.dumps(m, ensure_ascii=False, indent=1, sort_keys=True) + '\n')


def source_pages():
    out = []
    base = os.path.join(CONTENT, 'en')
    for d, _, files in os.walk(base):
        for f in files:
            if not f.endswith('.md'):
                continue
            rel = os.path.relpath(os.path.join(d, f), base).replace(os.sep, '/')
            fm, _ = split(read(os.path.join(base, rel)))
            if fm.get('draft'):
                continue            # templates and drafts stay English-only
            out.append(rel)
    return sorted(out)


# ---------------------------------------------------------------- validation
SC_RE = re.compile(r'\{\{[<%]\s*(/?[\w.-]+)(.*?)\s*[>%]\}\}', re.S)
PARAM_RE = re.compile(r'(\w+)=("((?:[^"\\]|\\.)*)"|\S+)')
POS_RE = re.compile(r'(?<![=\w])"((?:[^"\\]|\\.)*)"')
LINK_RE = re.compile(r'\]\(([^)\s]+)')
HEAD_RE = re.compile(r'^#{1,6} ', re.M)


def signature(body):
    sig = []
    for name, args in SC_RE.findall(body):
        locked = tuple(sorted((k, (q or v).strip('"')) for k, v, q in PARAM_RE.findall(args) if k in LOCKED_PARAMS))
        positional = tuple(POS_RE.findall(PARAM_RE.sub('', args)))
        sig.append((name, locked, positional))
    return sig


def skeleton_diff(a, b, path):
    errs = []
    if isinstance(a, dict):
        if not isinstance(b, dict) or set(a) != set(b):
            return [f'{path}: keys differ']
        for k in a:
            if k in LOCKED_LEAVES:
                if a[k] != b[k]:
                    errs.append(f'{path}.{k}: must stay {a[k]!r}')
            else:
                errs += skeleton_diff(a[k], b[k], f'{path}.{k}')
    elif isinstance(a, list):
        if not isinstance(b, list) or len(a) != len(b):
            return [f'{path}: list length differs']
        for i, (x, y) in enumerate(zip(a, b)):
            errs += skeleton_diff(x, y, f'{path}[{i}]')
    elif isinstance(a, str):
        if not isinstance(b, str):
            errs.append(f'{path}: must be text')
    elif a != b:
        errs.append(f'{path}: must stay {a!r}')
    return errs


def validate(en_text, tr_text):
    """Return a list of problems (empty = the translation keeps every non-text part of the source)."""
    try:
        efm, ebody = split(en_text)
        tfm, tbody = split(tr_text)
    except Exception as e:
        return [f'front matter does not parse: {e}']
    errs = []
    tkeys = set(tfm) - LOCAL_KEYS
    if set(efm) != tkeys:
        errs.append(f'front matter keys differ: missing {sorted(set(efm) - tkeys)}, extra {sorted(tkeys - set(efm))}')
    for k, v in efm.items():
        if k not in tfm:
            continue
        if k in TEXT_KEYS:
            if isinstance(v, str) != isinstance(tfm[k], str):
                errs.append(f'{k}: must be text')
        elif k in STRUCT_KEYS:
            errs += skeleton_diff(v, tfm[k], k)
        elif v != tfm[k]:
            errs.append(f'{k}: must stay {v!r}')
    if signature(ebody) != signature(tbody):
        errs.append('shortcodes differ (names, order, or key/id/class/type/level/start/relref values)')
    if sorted(LINK_RE.findall(ebody)) != sorted(LINK_RE.findall(tbody)):
        errs.append('markdown link targets differ')
    if len(HEAD_RE.findall(ebody)) != len(HEAD_RE.findall(tbody)):
        errs.append('number of headings differs')
    if not tbody.strip() and ebody.strip():
        errs.append('body is empty')
    return errs


# ---------------------------------------------------------------- API
def call_claude(system, user, max_tokens=16000):
    key = os.environ.get('ANTHROPIC_API_KEY')
    if not key:
        sys.exit('ANTHROPIC_API_KEY is not set')
    body = json.dumps({'model': MODEL, 'max_tokens': max_tokens, 'system': system,
                       'messages': [{'role': 'user', 'content': user}]}).encode()
    for attempt in range(5):
        req = urllib.request.Request(API_URL + '/v1/messages', data=body, method='POST', headers={
            'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                data = json.loads(r.read())
            if data.get('stop_reason') == 'max_tokens':
                raise RuntimeError('answer was cut off (max_tokens)')
            usage = data.get('usage', {})
            STATS['in'] += usage.get('input_tokens', 0)
            STATS['out'] += usage.get('output_tokens', 0)
            return ''.join(b.get('text', '') for b in data['content'] if b.get('type') == 'text')
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf-8', 'replace')[:300]
            if e.code in (429, 500, 502, 503, 529) and attempt < 4:
                time.sleep(10 * (attempt + 1))
                continue
            raise RuntimeError(f'API error {e.code}: {msg}')
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < 4:
                time.sleep(10 * (attempt + 1))
                continue
            raise RuntimeError(f'network error: {e}')


STATS = {'in': 0, 'out': 0, 'pages': 0, 'failed': []}


def glossary(lang):
    g = yaml.safe_load(read(GLOSSARY))
    return g['common'].strip() + '\n\n' + g['languages'][lang].strip()


def page_prompt(lang):
    return f"""You translate pages of rakovac.rs, an unofficial visitor portal of the village of Rakovac
(Fruška Gora, Serbia), from English into {LANG_NAMES[lang]}. Each page is a Hugo Markdown file with YAML front matter.

Rules:
- Return the COMPLETE translated file between <file> and </file>, nothing else.
- Front matter: keep every key and the key order. Translate only these text fields: {', '.join(sorted(TEXT_KEYS))},
  and the human-readable strings inside {', '.join(sorted(STRUCT_KEYS))}. Keep numbers, ids, urls, coords, phones,
  photo keys, weights, categories, status and every other value exactly as in the English file
  (a top-level "address" normally stays as it is; translate it only when it is English words such as "Main road").
- Hugo shortcodes stay exactly as they are ({{{{< photo key=… >}}}}, {{{{< todo >}}}}, {{{{< note … >}}}}, {{{{< route … >}}}},
  {{{{< video … >}}}}, {{{{< relref "…" >}}}}): translate only human-readable parameters (title, caption, name, distance,
  time, climb) and the text between opening and closing shortcodes. Never change key, id, class, type, level, start or relref paths.
- Keep the Markdown structure identical: same headings, lists, tables, paragraph breaks, links (same targets), HTML.
- Text in Church Slavonic or Serbian Cyrillic quoted from inscriptions stays exactly as written.
- Keep every fact, name, number, date and distance; do not add or remove information.
- Readers are first-time visitors. Third person, friendly, precise, no marketing fluff.
  The author page (author/_index.md) is written in the first person by Konstantin (Kosta) Stein.
- When a current translation is given, it may have been corrected by a native speaker: keep its wording
  wherever the English meaning did not change, and change only what the English changed.

Terminology and names:
{glossary(lang)}"""


LANG_NAMES = {'sr': 'Serbian (Latin script)', 'ru': 'Russian', 'de': 'German', 'hu': 'Hungarian'}


def extract(tag, text):
    m = re.search(rf'<{tag}>\n?(.*?)\n?</{tag}>', text, re.S)
    if not m:
        raise RuntimeError(f'no <{tag}> block in the answer')
    return m.group(1)


# ---------------------------------------------------------------- pages
def page_state(lang, rel, manifest):
    en_text = read(os.path.join(CONTENT, 'en', rel))
    tp = os.path.join(CONTENT, lang, rel)
    if not os.path.exists(tp):
        return 'missing', en_text
    try:
        if split(read(tp))[0].get('translation_locked'):
            return 'locked', en_text
    except Exception:
        return 'stale', en_text
    if manifest['pages'].get(lang, {}).get(rel) != h(en_text):
        return 'stale', en_text
    return 'ok', en_text


def translate_page(lang, rel, en_text):
    tp = os.path.join(CONTENT, lang, rel)
    current = read(tp) if os.path.exists(tp) else None
    user = f'<english_source path="content/en/{rel}">\n{en_text}\n</english_source>\n'
    if current:
        user += f'\n<current_translation path="content/{lang}/{rel}">\n{current}\n</current_translation>\n' \
                '\nThe English source has changed since this translation was made. Update the translation.\n'
    else:
        user += f'\nTranslate this page into {LANG_NAMES[lang]}.\n'
    system = page_prompt(lang)
    answer = call_claude(system, user)
    for attempt in range(2):
        out = extract('file', answer).strip('\n') + '\n'
        errs = validate(en_text, out)
        if not errs:
            write(tp, out)
            return
        if attempt == 0:
            answer = call_claude(system, user + '\nYour previous answer was rejected by the validator:\n- '
                                 + '\n- '.join(errs) + '\nReturn the corrected complete file.')
    raise RuntimeError('; '.join(errs))


# ---------------------------------------------------------------- i18n and photo alt texts
def i18n_todo(lang, manifest):
    en = yaml.safe_load(read(os.path.join(ROOT, 'i18n', 'en.yaml')))
    tr = yaml.safe_load(read(os.path.join(ROOT, 'i18n', f'{lang}.yaml'))) or {}
    done = manifest['i18n'].get(lang, {})
    return {k: v for k, v in en.items() if k not in tr or (k in done and done[k] != h(str(v)))}


def photos_todo(lang, manifest):
    photos = yaml.safe_load(read(os.path.join(ROOT, 'data', 'photos.yaml')))
    done = manifest['photos'].get(lang, {})
    return {k: p['alt'] for k, p in photos.items()
            if f'alt_{lang}' not in p or (k in done and done[k] != h(p['alt']))}


def translate_strings(lang, strings, what):
    system = (f'You translate short interface strings of rakovac.rs (a visitor portal of the village of Rakovac, '
              f'Fruška Gora, Serbia) from English into {LANG_NAMES[lang]}. Keep HTML tags, placeholders and '
              f'numbers exactly. Answer with a JSON object with the same keys between <json> and </json>.\n\n'
              + glossary(lang))
    answer = call_claude(system, f'{what}:\n<json>\n{json.dumps(strings, ensure_ascii=False, indent=1)}\n</json>', 8000)
    out = json.loads(extract('json', answer))
    if set(out) != set(strings) or not all(isinstance(v, str) and v.strip() for v in out.values()):
        raise RuntimeError(f'{what}: keys or values do not match')
    for k, v in strings.items():
        if re.findall(r'<[^>]+>', v) != re.findall(r'<[^>]+>', out[k]):
            raise RuntimeError(f'{what}: HTML tags changed in {k}')
    return out


def one_line(v):
    return yaml.safe_dump(v, allow_unicode=True, width=10000, default_style='"').strip()


def apply_i18n(lang, new):
    p = os.path.join(ROOT, 'i18n', f'{lang}.yaml')
    lines = read(p).rstrip('\n').split('\n')
    for k, v in new.items():
        idx = [i for i, ln in enumerate(lines) if re.match(rf'^{re.escape(k)}\s*:', ln)]
        if idx:
            lines[idx[0]] = f'{k}: {one_line(v)}'
        else:
            lines.append(f'{k}: {one_line(v)}')
    write(p, '\n'.join(lines) + '\n')
    assert all(yaml.safe_load(read(p))[k] == v for k, v in new.items())


def apply_photos(lang, new):
    p = os.path.join(ROOT, 'data', 'photos.yaml')
    lines = read(p).rstrip('\n').split('\n')
    out, key, block = [], None, []

    def flush():
        if key in new:
            field = f'  alt_{lang}: {one_line(new[key])}'
            existing = [i for i, ln in enumerate(block) if ln.startswith(f'  alt_{lang}:')]
            if existing:
                block[existing[0]] = field
            else:
                last = max([i for i, ln in enumerate(block) if ln.startswith('  alt')] or [len(block) - 1])
                block.insert(last + 1, field)
        out.extend(block)

    for ln in lines:
        m = re.match(r'^([A-Za-z0-9_-]+):\s*$', ln)
        if m:
            flush()
            key, block = m.group(1), [ln]
        else:
            block.append(ln)
    flush()
    write(p, '\n'.join(out) + '\n')
    photos = yaml.safe_load(read(p))
    assert all(photos[k][f'alt_{lang}'] == v for k, v in new.items())


# ---------------------------------------------------------------- commands
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--langs', default=','.join(LANGS))
    ap.add_argument('--status', action='store_true', help='list what is out of date, no API calls')
    ap.add_argument('--check', action='store_true', help='validate translations that are marked up to date')
    ap.add_argument('--init', action='store_true', help='mark all existing translations as up to date')
    ap.add_argument('--force', action='append', default=[], help='page path to re-translate even if up to date')
    ap.add_argument('--max-pages', type=int, default=150, help='safety limit per run')
    a = ap.parse_args()
    langs = [l.strip() for l in a.langs.split(',') if l.strip()]
    for l in langs:
        if l not in LANG_NAMES:
            sys.exit(f'unknown language {l}')
    m = load_manifest()
    pages = source_pages()
    en_i18n = yaml.safe_load(read(os.path.join(ROOT, 'i18n', 'en.yaml')))
    photos = yaml.safe_load(read(os.path.join(ROOT, 'data', 'photos.yaml')))

    if a.init:
        for l in langs:
            m['pages'][l] = {r: h(read(os.path.join(CONTENT, 'en', r))) for r in pages
                             if os.path.exists(os.path.join(CONTENT, l, r))}
            tr = yaml.safe_load(read(os.path.join(ROOT, 'i18n', f'{l}.yaml'))) or {}
            m['i18n'][l] = {k: h(str(v)) for k, v in en_i18n.items() if k in tr}
            m['photos'][l] = {k: h(p['alt']) for k, p in photos.items() if f'alt_{l}' in p}
        save_manifest(m)
        print('manifest written:', {l: len(m['pages'][l]) for l in langs})
        return

    if a.check:
        bad = 0
        for l in langs:
            n = 0
            for r in pages:
                st, en_text = page_state(l, r, m)
                if st in ('missing', 'stale'):
                    print(f'  {l}/{r}: {st} (will be translated on the next run)')
                    continue
                errs = validate(en_text, read(os.path.join(CONTENT, l, r)))
                n += 1
                for e in errs:
                    bad += 1
                    print(f'ERROR {l}/{r}: {e}')
            orphans = [os.path.relpath(os.path.join(d, f), os.path.join(CONTENT, l)).replace(os.sep, '/')
                       for d, _, fs in os.walk(os.path.join(CONTENT, l)) for f in fs if f.endswith('.md')]
            orphans = [o for o in orphans if o not in pages]
            for o in orphans:
                print(f'  {l}/{o}: no English source (will be removed on the next run)')
            print(f'{l}: {n} pages checked')
        sys.exit(1 if bad else 0)

    todo = []
    for l in langs:
        for r in pages:
            st, en_text = page_state(l, r, m)
            if st in ('missing', 'stale') or (r in a.force and st != 'locked'):
                todo.append((l, r, en_text, st if st != 'ok' else 'forced'))
    removals = []
    for l in langs:
        base = os.path.join(CONTENT, l)
        for d, _, fs in os.walk(base):
            for f in fs:
                rel = os.path.relpath(os.path.join(d, f), base).replace(os.sep, '/')
                if f.endswith('.md') and rel not in pages and not split(read(os.path.join(d, f)))[0].get('translation_locked'):
                    removals.append((l, rel))
    strings = {l: (i18n_todo(l, m), photos_todo(l, m)) for l in langs}

    for l, r, _, st in todo:
        print(f'{st:8} {l}/{r}')
    for l, r in removals:
        print(f'remove   {l}/{r}')
    for l, (i, p) in strings.items():
        if i:
            print(f'i18n     {l}: {", ".join(i)}')
        if p:
            print(f'photos   {l}: {", ".join(p)}')
    if a.status:
        return
    if len(todo) > a.max_pages:
        sys.exit(f'{len(todo)} pages to translate, above --max-pages {a.max_pages}; raise it deliberately')

    for l, r in removals:
        os.remove(os.path.join(CONTENT, l, r))
        m['pages'].get(l, {}).pop(r, None)
    for l, r, en_text, _ in todo:
        try:
            translate_page(l, r, en_text)
            m['pages'].setdefault(l, {})[r] = h(en_text)
            STATS['pages'] += 1
            save_manifest(m)          # progress survives a crash half-way
            print(f'ok       {l}/{r}')
        except Exception as e:
            STATS['failed'].append(f'{l}/{r}: {e}')
            print(f'FAILED   {l}/{r}: {e}')
    for l, (i, p) in strings.items():
        try:
            if i:
                apply_i18n(l, translate_strings(l, i, 'Interface strings'))
                m['i18n'].setdefault(l, {}).update({k: h(str(v)) for k, v in i.items()})
            if p:
                apply_photos(l, translate_strings(l, p, 'Photo descriptions (alt texts)'))
                m['photos'].setdefault(l, {}).update({k: h(v) for k, v in p.items()})
            save_manifest(m)
        except Exception as e:
            STATS['failed'].append(f'{l} strings: {e}')
            print(f'FAILED   {l} strings: {e}')
    print(f"done: {STATS['pages']} pages, {STATS['in']} input + {STATS['out']} output tokens, model {MODEL}")
    if STATS['failed']:
        print('failures:\n  ' + '\n  '.join(STATS['failed']))
        sys.exit(1)


if __name__ == '__main__':
    main()
