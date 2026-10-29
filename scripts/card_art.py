"""Drawn cover cards (1890x810) for pages that have no photo of their own and no free photo to borrow:
line drawings in cream on the site's dark background, in the style of the atlas cards (scripts/atlas_glyphs.py).
Rule of the network: no empty covers. Own photo > freely licensed photo (Commons) > a drawn card from this script.
Businesses (stay, food, shops, producers) get photos when they join, not drawn cards.

Usage: python3 scripts/card_art.py NAME [NAME ...]   writes static/img/card-NAME.jpg (needs Playwright + Chromium)
Add a card: put its glyph list in CARDS below; glyphs come from atlas_glyphs.G or EXTRA (64x64 grid, stroked paths)."""
import os, sys, asyncio
sys.path.insert(0, os.path.dirname(__file__))
from atlas_glyphs import G

EXTRA = {
 'book': ["M8 16 C18 13 26 14 32 19 C38 14 46 13 56 16 V50 C46 47 38 48 32 53 C26 48 18 47 8 50Z", "M32 19 V53",
          "M14 24 C19 23 24 24 28 26 M14 31 C19 30 24 31 28 33 M14 38 C19 37 24 38 28 40",
          "M36 26 C40 24 45 23 50 24 M36 33 C40 31 45 30 50 31 M36 40 C40 38 45 37 50 38"],
 'quill': ["M50 6 C36 12 24 26 18 46 C30 38 42 26 50 6Z", "M18 46 L13 58", "M44 14 C36 22 28 32 22 42",
           "M8 58 H24"],
 'inkwell': ["M18 30 H46 L50 54 H14Z", "M24 30 V24 H40 V30", "M22 22 H42", "M20 44 H44"],
 'scroll': ["M14 12 H46 C50 12 52 16 52 20 V50 C52 54 48 56 44 56 H18 C14 56 12 52 12 48",
            "M14 12 C10 12 8 15 8 18 C8 21 10 24 14 24 H18 V12", "M22 22 H44 M22 29 H44 M22 36 H38",
            ("c", 38, 46, 6), "M35 46 L38 43 L41 46 L38 49Z"],
 'church': ["M12 56 H52", "M18 56 V34 H46 V56", "M14 36 L32 24 L50 36", "M26 24 C26 16 38 16 38 24",
            "M32 16 V6 M28 10 H36", "M28 56 V46 C28 42 36 42 36 46 V56", "M22 40 V46 M42 40 V46"],
 'candle': ["M26 30 H38 V58 H26Z", "M32 30 V24", "M32 24 C26 18 30 10 32 6 C34 10 38 18 32 24Z", "M22 58 H42"],
 'fountain': ["M10 58 H54", "M14 58 V22 H50 V58", "M10 22 L32 8 L54 22", "M24 30 H40 V40 H24Z", "M32 40 V46",
              "M28 46 C28 52 36 52 36 46", "M20 58 V54 H44 V58", "M30 50 V53 M34 50 V53"],
 'drops': ["M32 10 C26 22 22 28 22 34 C22 40 27 44 32 44 C37 44 42 40 42 34 C42 28 38 22 32 10Z",
           "M27 34 C27 38 30 40 33 40", "M14 46 C11 52 11 56 14 58 C17 56 17 52 14 46Z",
           "M50 46 C47 52 47 56 50 58 C53 56 53 52 50 46Z"],
 'basket': ["M8 28 H56 L50 56 H14Z", "M18 28 C18 12 46 12 46 28", "M10 38 H54 M12 47 H52", "M24 28 L26 56 M40 28 L38 56 M32 28 V56"],
 'bread': ["M8 40 C8 24 56 24 56 40 C56 46 52 50 46 50 H18 C12 50 8 46 8 40Z", "M18 32 L22 40 M28 29 L32 38 M38 29 L42 38 M47 32 L50 39"],
 'scales': ["M32 8 V52", "M22 56 H42 M26 52 H38", "M12 16 H52", "M12 16 L6 34 M12 16 L18 34 M52 16 L46 34 M52 16 L58 34",
            "M4 34 C4 42 20 42 20 34Z", "M44 34 C44 42 60 42 60 34Z", ("c", 32, 8, 2.5, 1)],
 'bow': ["M16 6 C40 18 40 46 16 58", "M16 6 V58", "M8 32 H54", "M48 26 L56 32 L48 38", "M12 28 L8 32 L12 36"],
 'crosier': ["M32 14 V60", "M32 14 C32 6 22 4 18 10 C16 14 20 18 24 16", "M32 14 C32 6 42 4 46 10 C48 14 44 18 40 16",
             "M26 24 H38"],
}
CARDS = {  # name -> glyphs left to right (the middle one is drawn larger)
 'pahomije': ['inkwell', 'book', 'quill'],
 'teofan': ['scroll', 'church', 'crosier'],
 'raka-milosevic': ['bow', 'deer', 'church'],
 'stari-majdan-spring': ['oakleaf', 'fountain', 'drops'],
 'shops': ['bread', 'basket', 'scales'],
}

def svg(glyphs, bg=('#2b4a3c', '#1d382c'), ink='#f2ead8'):
    W, H = 1890, 810
    n = len(glyphs); out = []
    xs = [W * (i + 1) / (n + 1) for i in range(n)]
    for i, (g, x) in enumerate(zip(glyphs, xs)):
        big = (i == n // 2); s = 7.0 if big else 5.0
        parts = []
        for p in (G.get(g) or EXTRA[g]):
            if isinstance(p, tuple):
                _, cx, cy, r, *f = p
                parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{ink if f else "none"}"/>')
            else:
                parts.append(f'<path d="{p}"/>')
        out.append(f'<g transform="translate({x - 32 * s:.1f},{H / 2 - 32 * s:.1f}) scale({s})" stroke-width="{1.9 if big else 2.2}">{"".join(parts)}</g>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
            f'<defs><radialGradient id="g" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="{bg[0]}"/><stop offset="1" stop-color="{bg[1]}"/></radialGradient></defs>'
            f'<rect width="{W}" height="{H}" fill="url(#g)"/><rect x="30" y="30" width="{W - 60}" height="{H - 60}" fill="none" stroke="{ink}" stroke-opacity=".35" stroke-width="2"/>'
            f'<g fill="none" stroke="{ink}" stroke-linecap="round" stroke-linejoin="round">{"".join(out)}</g></svg>')

async def render(names, outdir, **kw):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1890, 'height': 810})
        for n in names:
            await pg.set_content(f'<html><body style="margin:0">{svg(CARDS[n], **kw)}</body></html>')
            path = os.path.join(outdir, f'card-{n}.png'); await pg.screenshot(path=path)
            from PIL import Image
            Image.open(path).convert('RGB').save(path[:-4] + '.jpg', quality=90); os.remove(path); print('card', path[:-4] + '.jpg')
        await b.close()

if __name__ == '__main__':
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    names = sys.argv[1:] or list(CARDS)
    asyncio.run(render(names, os.path.join(root, 'static', 'img')))
