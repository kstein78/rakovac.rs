#!/usr/bin/env python3
"""Link-preview images (Open Graph, 1200x630) and Google Discover crops for a site of the network.

1. Every local photo used as a page's main photo (front matter "photo:" or "portrait:") is cropped to
   1200x630 into static/img/share/<same file name> (respecting "position:" from data/photos.yaml).
2. A branded card per language (shield R, name, tagline, rakovac.rs) for pages without a photo:
   static/img/share/default-<lang>.jpg, rendered with the site fonts in headless Chromium (Playwright).
3. Discover crops of the same photos, at least 1200 px wide: static/img/discover/{16x9,4x3,1x1}/<file name>
   (Google asks for large images in several aspect ratios; layouts/partials/jsonld.html lists them).
Card look: [params.share] in hugo.toml (bg, ink, sub, accent, photo, logo).
Run after adding photos, from the site folder: python3 themes/selo/scripts/share_images.py  (--force remakes all)"""
import os, re, sys, glob, asyncio, yaml
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from siteconf import ROOT, HOST, PARAMS  # noqa: E402
SHARE = PARAMS.get('share', {})
DISCOVER = {'16x9': (1600, 900), '4x3': (1600, 1200), '1x1': (1200, 1200)}
OUT = os.path.join(ROOT, 'static', 'img', 'share')
W, H = 1200, 630
FORCE = '--force' in sys.argv


def used_photo_keys():
    keys = set()
    for f in glob.glob(os.path.join(ROOT, 'content', '*', '**', '*.md'), recursive=True):
        head = open(f, encoding='utf-8').read().split('---')
        if len(head) < 3:
            continue
        for k in re.findall(r'^(?:photo|cover|portrait|share_photo):\s*["\']?([\w-]+)', head[1], re.M):
            keys.add(k)
    # card pictures of pages without a photo of their own (data/cardphotos.yaml: "path: key")
    cp = os.path.join(ROOT, 'data', 'cardphotos.yaml')
    if os.path.exists(cp):
        for line in open(cp, encoding='utf-8'):
            m = re.match(r'^[\w/.-]+:\s*([\w-]+)\s*$', line)
            if m:
                keys.add(m.group(1))
    return keys


def crop(src, dst, position=None, size=None):
    W, H = size or (1200, 630)
    im = Image.open(src).convert('RGB')
    fx, fy = 0.5, 0.5
    if position:
        m = re.findall(r'(\d+(?:\.\d+)?)%', position)
        if len(m) >= 2:
            fx, fy = float(m[0]) / 100, float(m[1]) / 100
    scale = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    x = round((im.width - W) * fx)
    y = round((im.height - H) * fy)
    im.crop((x, y, x + W, y + H)).save(dst, 'JPEG', quality=84, optimize=True, progressive=True)


def photos():
    data = yaml.safe_load(open(os.path.join(ROOT, 'data', 'photos.yaml'), encoding='utf-8'))
    n = 0
    for k in sorted(used_photo_keys()):
        p = data.get(k)
        if not p or p['src'].startswith('http'):
            continue
        dst = os.path.join(OUT, os.path.basename(p['src']))
        if os.path.exists(dst) and not FORCE:
            continue
        pos = p.get('position') or ('50% 20%' if k.startswith('author') else None)
        crop(os.path.join(ROOT, 'static', p['src']), dst, pos)
        n += 1
    for k in sorted(used_photo_keys()):
        p = data.get(k)
        if not p or p['src'].startswith('http'):
            continue
        src = os.path.join(ROOT, 'static', p['src'])
        w0 = Image.open(src).width
        for name, size in DISCOVER.items():
            if name not in SHARE.get('discover', list(DISCOVER)):
                continue
            if w0 < 1200:
                break  # too small for Discover: better no image than an upscaled one
            d = os.path.join(ROOT, 'static', 'img', 'discover', name)
            os.makedirs(d, exist_ok=True)
            dst = os.path.join(d, os.path.basename(p['src']))
            if os.path.exists(dst) and not FORCE:
                continue
            sz = size if w0 >= size[0] else (w0, round(w0 * size[1] / size[0]))
            crop(src, dst, p.get('position'), sz)
    print('photo cards made:', n)


CARD = '''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:C;font-weight:300;src:url("FONTS/rakovac-common-latin-300-normal.woff2")}
@font-face{font-family:C;font-weight:300;src:url("FONTS/rakovac-common-latin-ext-300-normal.woff2");unicode-range:U+0100-02AF}
@font-face{font-family:C;font-weight:300;src:url("FONTS/rakovac-common-cyrillic-300-normal.woff2");unicode-range:U+0400-045F}
@font-face{font-family:C;font-weight:400;src:url("FONTS/rakovac-common-latin-400-normal.woff2")}
@font-face{font-family:C;font-weight:400;src:url("FONTS/rakovac-common-latin-ext-400-normal.woff2");unicode-range:U+0100-02AF}
@font-face{font-family:C;font-weight:400;src:url("FONTS/rakovac-common-cyrillic-400-normal.woff2");unicode-range:U+0400-045F}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{display:grid;grid-template-columns:640px 560px;background:BG;color:INK;font-family:C,serif}
.l{padding:64px 56px 56px 72px;display:flex;flex-direction:column}
.l img{width:118px;height:auto;margin-bottom:28px}
h1{font-weight:300;font-size:104px;line-height:1;margin:0 0 22px;letter-spacing:-.01em}
p{font-weight:400;font-size:34px;line-height:1.25;margin:0;color:SUB}
.u{margin-top:auto;font-size:26px;letter-spacing:.06em;color:ACC}
.r{background:url("PHOTO") center/cover}
</style></head><body><div class="l"><img src="LOGO" alt=""><h1>NAME</h1><p>TAGLINE</p><div class="u">DOMAIN</div></div><div class="r"></div></body></html>'''


async def cards():
    from playwright.async_api import async_playwright
    cfg = open(os.path.join(ROOT, 'hugo.toml'), encoding='utf-8').read()
    taglines = dict(re.findall(r'\[languages\.(\w+)\.params\]\s*\n\s*tagline = "([^"]+)"', cfg))
    from siteconf import CFG
    off = set(CFG.get('disableLanguages') or [])
    taglines = {l: t for l, t in taglines.items() if l not in off}
    theme_i18n = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'i18n')

    def brand(l):
        for d in (os.path.join(ROOT, 'i18n'), theme_i18n):
            f = os.path.join(d, f'{l}.yaml')
            if os.path.exists(f):
                v = (yaml.safe_load(open(f, encoding='utf-8')) or {}).get('brand_name')
                if v:
                    return v
        return CFG.get('title', '')
    names = {l: brand(l) for l in taglines}
    photo = os.path.join(ROOT, 'static', SHARE.get('photo', 'img/share-photo.jpg'))
    logo = os.path.join(ROOT, 'static', SHARE.get('logo', 'img/brand-shield.svg'))
    fonts = os.path.join(ROOT, 'static', 'fonts')
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': W, 'height': H})
        for lang, tag in taglines.items():
            dst = os.path.join(OUT, f'default-{lang}.jpg')
            if os.path.exists(dst) and not FORCE:
                continue
            page = (CARD.replace('FONTS', 'file://' + fonts).replace('PHOTO', 'file://' + photo)
                    .replace('LOGO', 'file://' + logo).replace('NAME', names[lang]).replace('TAGLINE', tag)
                    .replace('BG', SHARE.get('bg', '#1f3a2e')).replace('INK', SHARE.get('ink', '#f5f0e6'))
                    .replace('SUB', SHARE.get('sub', '#dfe8dc')).replace('ACC', SHARE.get('accent', '#e07a2e')).replace('DOMAIN', HOST))
            tmp = os.path.join(OUT, f'.card-{lang}.html')
            open(tmp, 'w', encoding='utf-8').write(page)
            await pg.goto('file://' + tmp)
            await pg.evaluate('document.fonts.ready')
            await pg.wait_for_timeout(300)
            png = tmp + '.png'
            await pg.screenshot(path=png)
            Image.open(png).convert('RGB').save(dst, 'JPEG', quality=88, optimize=True, progressive=True)
            os.remove(png); os.remove(tmp)
            print('card', dst)
        await b.close()


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    photos()
    asyncio.run(cards())
