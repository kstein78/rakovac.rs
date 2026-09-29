#!/usr/bin/env python3
"""Tell Bing, Yandex, Seznam and other IndexNow search engines which rakovac.rs pages changed.

Called by the "live" job in .github/workflows/deploy.yml after the server serves the new commit:
    python3 scripts/indexnow.py <before-sha> <after-sha>
Content files map to their URLs in the same language; a change to layouts, config or i18n resubmits
every page (read from the live sitemaps); data/bus.yaml -> Useful info, gallery data -> Photos.
The key file is static/<key>.txt (IndexNow proves site ownership with it). Google does not use IndexNow."""
import glob, json, os, re, subprocess, sys, urllib.request

HOST = 'rakovac.rs'
BASE = f'https://{HOST}'
LANGS = ['sr', 'cyr', 'en', 'ru', 'de', 'hu']
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def key():
    for f in glob.glob(os.path.join(ROOT, 'static', '*.txt')):
        k = open(f).read().strip()
        if re.fullmatch(r'[0-9a-f]{32}', k) and os.path.basename(f) == k + '.txt':
            return k
    sys.exit('IndexNow key file not found in static/')


def changed(before, after):
    if not before or set(before) == {'0'}:
        return []
    out = subprocess.run(['git', 'diff', '--name-only', before, after], cwd=ROOT, capture_output=True, text=True)
    return out.stdout.split() if out.returncode == 0 else []


def url_for(path):
    m = re.match(r'content/(\w+)/(.*)\.md$', path)
    if not m or m.group(1) not in LANGS or os.path.basename(path).startswith('_') and not path.endswith('_index.md'):
        return None
    lang, rel = m.groups()
    rel = re.sub(r'(^|/)_index$', '', rel)
    return f'{BASE}/{lang}/' + (rel + '/' if rel else '')


def all_urls():
    urls = []
    for lang in LANGS:
        try:
            xml = urllib.request.urlopen(f'{BASE}/{lang}/sitemap.xml', timeout=30).read().decode()
            urls += re.findall(r'<loc>([^<]+)</loc>', xml)
        except Exception as e:
            print('sitemap', lang, e)
    return urls


def main():
    files = changed(*sys.argv[1:3]) if len(sys.argv) >= 3 else []
    urls = set()
    # Cyrillic pages are generated from the Latin ones: a Latin change also changes the Cyrillic page
    files = files + [re.sub(r'^content/sr/', 'content/cyr/', f) for f in files if f.startswith('content/sr/')]
    if any(f.startswith(('layouts/', 'i18n/', 'assets/')) or f == 'hugo.toml' for f in files):
        urls.update(all_urls())
    for f in files:
        u = url_for(f)
        if u and os.path.exists(os.path.join(ROOT, f)):
            urls.add(u)
        if f == 'data/bus.yaml':
            urls.update(f'{BASE}/{l}/useful/' for l in LANGS)
        if f in ('data/gallery.yaml', 'data/photos.yaml'):
            urls.update(f'{BASE}/{l}/gallery/' for l in LANGS)
    urls = sorted(urls)[:10000]
    if not urls:
        print('IndexNow: nothing to submit')
        return
    k = key()
    body = json.dumps({'host': HOST, 'key': k, 'keyLocation': f'{BASE}/{k}.txt', 'urlList': urls}).encode()
    req = urllib.request.Request('https://api.indexnow.org/indexnow', data=body,
                                 headers={'Content-Type': 'application/json; charset=utf-8'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print('IndexNow:', r.status, len(urls), 'URLs')
    except urllib.error.HTTPError as e:
        print('IndexNow HTTP', e.code, e.read()[:300])   # 202 = accepted, 422/403 = check key file


if __name__ == '__main__':
    main()
