#!/usr/bin/env python3
"""Link-preview images (Open Graph, 1200x630) for rakovac.rs.

1. Every local photo used as a page's main photo (front matter "photo:" or "portrait:") is cropped to
   1200x630 into static/img/share/<same file name> (respecting "position:" from data/photos.yaml).
2. A branded card per language (shield R, name, tagline, rakovac.rs) for pages without a photo:
   static/img/share/default-<lang>.jpg, rendered with the site fonts in headless Chromium (Playwright).
Run after adding photos: python3 scripts/share_images.py   (only missing files are made; --force remakes all)"""
import os, re, sys, glob, asyncio, yaml
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'static', 'img', 'share')
W, H = 1200, 630
FORCE = '--force' in sys.argv


def used_photo_keys():
    keys = set()
    for f in glob.glob(os.path.join(ROOT, 'content', '*', '**', '*.md'), recursive=True):
        head = open(f, encoding='utf-8').read().split('---')
        if len(head) < 3:
            continue
        for k in re.findall(r'^(?:photo|portrait):\s*["\']?([\w-]+)', head[1], re.M):
            keys.add(k)
    return keys


def crop(src, dst, position=None):
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
    print('photo cards made:', n)


CARD = '''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:C;font-weight:300;src:url("FONTS/rakovac-common-latin-300-normal.woff2")}
@font-face{font-family:C;font-weight:300;src:url("FONTS/rakovac-common-latin-ext-300-normal.woff2");unicode-range:U+0100-02AF}
@font-face{font-family:C;font-weight:300;src:url("FONTS/rakovac-common-cyrillic-300-normal.woff2");unicode-range:U+0400-045F}
@font-face{font-family:C;font-weight:400;src:url("FONTS/rakovac-common-latin-400-normal.woff2")}
@font-face{font-family:C;font-weight:400;src:url("FONTS/rakovac-common-latin-ext-400-normal.woff2");unicode-range:U+0100-02AF}
@font-face{font-family:C;font-weight:400;src:url("FONTS/rakovac-common-cyrillic-400-normal.woff2");unicode-range:U+0400-045F}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{display:grid;grid-template-columns:640px 560px;background:#1f3a2e;color:#f5f0e6;font-family:C,serif}
.l{padding:64px 56px 56px 72px;display:flex;flex-direction:column}
.l img{width:118px;height:auto;margin-bottom:28px}
h1{font-weight:300;font-size:104px;line-height:1;margin:0 0 22px;letter-spacing:-.01em}
p{font-weight:400;font-size:34px;line-height:1.25;margin:0;color:#dfe8dc}
.u{margin-top:auto;font-size:26px;letter-spacing:.06em;color:#e07a2e}
.r{background:url("PHOTO") center/cover}
</style></head><body><div class="l"><img src="LOGO" alt=""><h1>NAME</h1><p>TAGLINE</p><div class="u">rakovac.rs</div></div><div class="r"></div></body></html>'''


async def cards():
    from playwright.async_api import async_playwright
    cfg = open(os.path.join(ROOT, 'hugo.toml'), encoding='utf-8').read()
    taglines = dict(re.findall(r'\[languages\.(\w+)\.params\]\s*\n\s*tagline = "([^"]+)"', cfg))
    names = {l: yaml.safe_load(open(os.path.join(ROOT, 'i18n', f'{l}.yaml'), encoding='utf-8'))['brand_name'] for l in taglines}
    photo = os.path.join(ROOT, 'static', 'img', 'monastery-fence-summer.jpg')
    logo = os.path.join(ROOT, 'static', 'downloads', 'logo', 'rakovac-logo-R-colour.svg')
    fonts = os.path.join(ROOT, 'static', 'fonts')
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': W, 'height': H})
        for lang, tag in taglines.items():
            dst = os.path.join(OUT, f'default-{lang}.jpg')
            if os.path.exists(dst) and not FORCE:
                continue
            page = (CARD.replace('FONTS', 'file://' + fonts).replace('PHOTO', 'file://' + photo)
                    .replace('LOGO', 'file://' + logo).replace('NAME', names[lang]).replace('TAGLINE', tag))
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
