#!/usr/bin/env python3
"""SEO check of the built site (public/): run after `hugo`, fails the CI build on errors.

Every page must have: <html lang>, a title, a meta description in its own language (not the English one,
Cyrillic on Russian pages), a canonical URL on https://rakovac.rs/, hreflang links incl. x-default,
og:title/description/image/locale, and valid JSON-LD. Usage: python3 scripts/seo_check.py [public]"""
import glob, html, json, os, re, sys

PUB = sys.argv[1] if len(sys.argv) > 1 else 'public'
SITE = 'https://rakovac.rs/'
errors, warnings = [], []


def meta(s, attr, name):
    # the minifier writes content="...", content='...' (when the value has a ") or content=bare
    m = re.search(rf'<meta {attr}="?{re.escape(name)}"? content=(?:"([^"]*)"|\'([^\']*)\'|([^\s>]+))', s)
    return html.unescape(next(g for g in m.groups() if g is not None)) if m else None


pages = {}
for f in sorted(glob.glob(os.path.join(PUB, '*', '**', 'index.html'), recursive=True)):
    s = open(f, encoding='utf-8').read()
    if 'http-equiv=refresh' in s or 'http-equiv="refresh"' in s:
        continue                                   # alias redirect
    rel = os.path.relpath(f, PUB)
    lang = rel.split(os.sep)[0]
    if lang not in ('sr', 'en', 'ru', 'de', 'hu'):
        continue
    pages[rel] = (lang, s)

descs = {}
for rel, (lang, s) in pages.items():
    key = rel.split(os.sep, 1)[1]
    def err(msg): errors.append(f'{rel}: {msg}')
    if not re.search(r'<html lang="?[a-zA-Z-]+', s): err('no <html lang>')
    t = re.search(r'<title>(.*?)</title>', s, re.S)
    if not t or not t.group(1).strip(): err('no <title>')
    d = meta(s, 'name', 'description')
    if not d: err('no meta description')
    else:
        if len(d) < 40: warnings.append(f'{rel}: short description ({len(d)}): {d}')
        if len(d) > 170: err(f'description too long ({len(d)})')
        if lang == 'ru' and not re.search('[а-яё]', d, re.I): err(f'Russian page, description has no Cyrillic: {d[:60]}')
        descs[(lang, key)] = d
    c = re.search(r'<link rel=canonical href="?([^" >]+)', s)
    if not c or not c.group(1).startswith(SITE): err(f'canonical missing or not on {SITE}')
    if 'hreflang=x-default' not in s and 'hreflang="x-default"' not in s: err('no hreflang x-default')
    for p in ('og:title', 'og:description', 'og:image', 'og:locale', 'og:url'):
        v = meta(s, 'property', p)
        if not v: err(f'no {p}')
        elif p == 'og:image' and not v.startswith('http'): err('og:image not absolute')
    for m in re.findall(r'<script type="?application/ld\+json"?>(.*?)</script>', s, re.S):
        try: json.loads(m)
        except Exception as e: err(f'invalid JSON-LD: {e}')

for (lang, key), d in descs.items():
    if lang != 'en' and descs.get(('en', key)) == d:
        errors.append(f'{lang}/{key}: description is the same as the English one: {d[:60]}')

print(f'SEO check: {len(pages)} pages, {len(errors)} errors, {len(warnings)} warnings')
for w in warnings[:30]: print('warning:', w)
for e in errors[:100]: print('ERROR:', e)
sys.exit(1 if errors else 0)
