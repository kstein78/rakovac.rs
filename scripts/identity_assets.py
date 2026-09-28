"""Builds the local-identity graphics of rakovac.rs from the logo and the Rakovac Common font.

    pip install fonttools uharfbuzz segno
    python3 scripts/identity_assets.py

Writes
  static/downloads/logo/rakovac-lockup-colour.svg        shield R, "Rakovac", rakovac.rs, QR code (for light backgrounds)
  static/downloads/logo/rakovac-lockup-one-colour.svg    the same in cream only (for dark backgrounds, glass, vinyl)
  static/downloads/logo/rakovac-lockup-colour-noqr.svg   without the QR code (small sizes)
  static/downloads/logo/rakovac-lockup-one-colour-noqr.svg
  static/downloads/logo/rakovac-qr.svg                   QR code to https://rakovac.rs alone
  static/downloads/logo/rakovac-lockup-{colour,one-colour}-1800px.png   PNG copies (needs Playwright + Chromium)
  static/img/identity/mockup-{car,mug,tshirt}.svg        branding sketches for the identity page
All text is converted to outlines, so the files look the same without the fonts installed.
"""
import io, os, re, zipfile

import segno
import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
LOGO = os.path.join(ROOT, 'static', 'downloads', 'logo')
MOCK = os.path.join(ROOT, 'static', 'img', 'identity')
FOREST, VINE, GRAPE, PAPER, INK = '#1f3a2e', '#3d7a34', '#e07a2e', '#f5f0e6', '#1b1d17'
URL = 'https://rakovac.rs'


# ---------------------------------------------------------------- font and text
def load_font():
    with zipfile.ZipFile(os.path.join(ROOT, 'static', 'downloads', 'rakovac-fonts.zip')) as z:
        data = z.read('Rakovac Fonts/Rakovac Common/RakovacCommon-Variable.ttf')
    return data


FONT_DATA = load_font()
_cache = {}


def instance(wght):
    if wght not in _cache:
        f = TTFont(io.BytesIO(FONT_DATA))
        f = instancer.instantiateVariableFont(f, {'wght': wght, 'opsz': 72})
        buf = io.BytesIO(); f.save(buf)
        _cache[wght] = (TTFont(io.BytesIO(buf.getvalue())), buf.getvalue())
    return _cache[wght]


def text_path(text, size, wght=600, tracking=0.0):
    """Outline of `text` with its baseline at y=0 and left edge at x=0; returns (path d, width)."""
    font, data = instance(wght)
    upem = font['head'].unitsPerEm
    face = hb.Face(data); hbf = hb.Font(face)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(hbf, buf, {'kern': True, 'liga': True})
    gs = font.getGlyphSet(); order = font.getGlyphOrder()
    pen = SVGPathPen(gs)
    s = size / upem
    x = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        gs[name].draw(TransformPen(pen, (s, 0, 0, -s, (x + pos.x_offset) * s, -pos.y_offset * s)))
        x += pos.x_advance + tracking * upem
    width = (x - tracking * upem) * s
    return pen.getCommands(), width


# ---------------------------------------------------------------- shield and QR
def shield_inner(kind):
    svg = open(os.path.join(LOGO, f'rakovac-logo-R-{kind}.svg'), encoding='utf-8').read()
    svg = re.sub(r'<metadata>.*?</metadata>', '', svg, flags=re.S)
    return re.search(r'<svg[^>]*>(.*)</svg>', svg, re.S).group(1)


SHIELD_VB = (14, 14, 172, 224)          # viewBox of the logo files


def shield(kind, x, y, h, ink=PAPER):
    """kind 'colour': the full-colour shield. kind 'one-colour': a single ink (`ink`), with the R, leaves and
    grapes cut out so the background shows through (like the shield in the site header)."""
    s = h / SHIELD_VB[3]
    t = f'translate({x:.2f} {y:.2f}) scale({s:.4f}) translate({-SHIELD_VB[0]} {-SHIELD_VB[1]})'
    if kind == 'colour':
        return f'<g transform="{t}">{shield_inner("colour")}</g>', SHIELD_VB[2] * s
    inner = shield_inner('one-colour').replace('#1b1d17', '#fff##').replace('#ffffff', '#000000').replace('#fff##', '#ffffff')
    mid = f'rk-knockout-{abs(hash((x, y, h))) % 10**6}'
    vx, vy, vw, vh = SHIELD_VB
    return (f'<g transform="{t}"><mask id="{mid}" maskUnits="userSpaceOnUse" x="{vx}" y="{vy}" width="{vw}" height="{vh}">'
            f'<rect x="{vx}" y="{vy}" width="{vw}" height="{vh}" fill="#000"/>{inner}</mask>'
            f'<rect x="{vx}" y="{vy}" width="{vw}" height="{vh}" fill="{ink}" mask="url(#{mid})"/></g>'), vw * s


QR = segno.make(URL, error='q', micro=False)
QR_MATRIX = [list(row) for row in QR.matrix]
QR_N = len(QR_MATRIX)


def qr_modules(x, y, size, quiet=2):
    """Path of the dark modules, drawn in a square of `size` including a quiet zone of `quiet` modules."""
    m = size / (QR_N + 2 * quiet)
    d = []
    for r, row in enumerate(QR_MATRIX):
        c = 0
        while c < QR_N:
            if row[c]:
                start = c
                while c < QR_N and row[c]:
                    c += 1
                d.append(f'M{x + (start + quiet) * m:.2f} {y + (r + quiet) * m:.2f}h{(c - start) * m:.2f}v{m:.2f}h{-(c - start) * m:.2f}z')
            else:
                c += 1
    return ''.join(d)


def qr_tile(x, y, size, ink, tile, one_colour=False, radius=None):
    """QR on a rounded tile. one_colour: the tile is `ink` with the modules cut out, so only one ink is printed."""
    r = size * 0.06 if radius is None else radius
    tile_d = (f'M{x + r:.2f} {y:.2f}h{size - 2 * r:.2f}a{r:.2f} {r:.2f} 0 0 1 {r:.2f} {r:.2f}v{size - 2 * r:.2f}'
              f'a{r:.2f} {r:.2f} 0 0 1 {-r:.2f} {r:.2f}h{-(size - 2 * r):.2f}a{r:.2f} {r:.2f} 0 0 1 {-r:.2f} {-r:.2f}'
              f'v{-(size - 2 * r):.2f}a{r:.2f} {r:.2f} 0 0 1 {r:.2f} {-r:.2f}z')
    mods = qr_modules(x, y, size)
    if one_colour:
        return f'<path d="{tile_d}{mods}" fill="{ink}" fill-rule="evenodd"/>'
    return f'<path d="{tile_d}" fill="{tile}"/><path d="{mods}" fill="{ink}"/>'


# ---------------------------------------------------------------- lockup
def lockup(one_colour=False, with_qr=True):
    """Vertical lockup. Returns (svg elements, width, height) in its own coordinates."""
    W = 600
    name_col = PAPER if one_colour else FOREST
    url_col = PAPER if one_colour else VINE
    parts = []
    sh_h = 250
    sh_svg, sh_w = shield('one-colour' if one_colour else 'colour', (W - 250 * SHIELD_VB[2] / SHIELD_VB[3]) / 2, 30, sh_h)
    parts.append(sh_svg)
    d, w = text_path('Rakovac', 132, wght=560)
    base = 30 + sh_h + 128
    parts.append(f'<path d="{d}" transform="translate({(W - w) / 2:.2f} {base})" fill="{name_col}"/>')
    d2, w2 = text_path('rakovac.rs', 44, wght=500, tracking=0.06)
    base2 = base + 70
    parts.append(f'<path d="{d2}" transform="translate({(W - w2) / 2:.2f} {base2})" fill="{url_col}"/>')
    H = base2 + 40
    if with_qr:
        q = 170
        parts.append(qr_tile((W - q) / 2, H, q, name_col if not one_colour else PAPER, '#ffffff00' if not one_colour else None,
                             one_colour=one_colour))
        H += q + 30
    return ''.join(parts), W, H


def svg_doc(body, w, h, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}">'
            f'<title>{title}</title>{body}</svg>\n')


def place(elem, w, h, x, y, width):
    s = width / w
    return f'<g transform="translate({x:.2f} {y:.2f}) scale({s:.4f})">{elem}</g>', h * s


# ---------------------------------------------------------------- mockups
def mockup_car():
    """Side view of a small silver electric hatchback (a 2018 Renault Zoe shape), facing left."""
    W, H = 1200, 560
    body = []
    body.append('<defs>'
                '<linearGradient id="silver" x1="0" y1="0" x2="0" y2="1">'
                '<stop offset="0" stop-color="#eef0f2"/><stop offset=".45" stop-color="#cfd3d7"/>'
                '<stop offset=".7" stop-color="#b9bec3"/><stop offset="1" stop-color="#9aa0a6"/></linearGradient>'
                '<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">'
                '<stop offset="0" stop-color="#3a4550"/><stop offset=".55" stop-color="#232b33"/><stop offset="1" stop-color="#151a1f"/></linearGradient>'
                '<radialGradient id="tyre"><stop offset=".62" stop-color="#2a2d30"/><stop offset="1" stop-color="#111315"/></radialGradient>'
                '</defs>')
    body.append(f'<rect width="{W}" height="{H}" fill="#eef1ec"/>')
    body.append('<ellipse cx="610" cy="520" rx="530" ry="20" fill="#000" opacity=".16"/>')
    # body shell (short steep bonnet, tall rounded roof, rear door handle hidden in the C-pillar)
    body.append('<path d="M130 424 C112 418 104 404 104 386 L106 352 C108 336 120 326 140 322 '
                'L300 290 C334 284 356 272 378 254 L456 180 C476 163 500 156 530 155 L846 153 '
                'C900 153 938 164 968 186 L1028 232 C1062 258 1086 290 1096 322 L1102 350 '
                'C1106 370 1104 392 1098 410 L1092 424 C1088 432 1078 436 1066 436 L1018 436 '
                'A90 90 0 0 0 838 436 L392 436 A90 90 0 0 0 212 436 L150 436 C140 436 134 432 130 424 Z" '
                'fill="url(#silver)" stroke="#8b9197" stroke-width="2"/>')
    # windows
    body.append('<path d="M394 262 L466 192 C480 180 498 173 522 172 L640 170 L640 262 Z" fill="url(#glass)"/>')
    body.append('<path d="M656 170 L840 169 C872 169 898 176 920 192 L962 226 C972 234 968 250 954 252 L656 262 Z" fill="url(#glass)"/>')
    body.append('<path d="M640 170 H656 V262 H640 Z" fill="#20262c"/>')
    body.append('<path d="M408 254 L472 194 C482 186 494 181 508 180 L520 180 L446 254 Z" fill="#fff" opacity=".08"/>')
    # door cuts and handles
    body.append('<path d="M648 266 V430 M390 264 C384 320 386 380 392 430 M905 258 C914 290 914 320 900 350" '
                'fill="none" stroke="#8b9197" stroke-width="2"/>')
    body.append('<rect x="580" y="278" width="44" height="9" rx="4.5" fill="#a3a9ae"/>')
    body.append('<path d="M930 196 L948 210" stroke="#20262c" stroke-width="6" stroke-linecap="round"/>')
    # lights and details
    body.append('<path d="M112 348 C118 336 136 330 160 328 L200 322 C186 334 162 346 130 352 Z" fill="#dfe8ee" stroke="#8b9197" stroke-width="1.5"/>')
    body.append('<path d="M1088 296 C1096 312 1100 330 1100 348 L1080 342 C1078 326 1074 312 1066 296 Z" fill="#b3281e"/>')
    body.append('<path d="M106 396 H178" stroke="#7c8288" stroke-width="3" stroke-linecap="round"/>')
    body.append('<path d="M306 294 C330 294 356 288 372 280" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>')
    body.append('<path d="M150 362 C400 344 700 338 1086 348" fill="none" stroke="#fff" stroke-width="2" opacity=".55"/>')
    # mirror
    body.append('<path d="M392 256 C382 250 368 250 362 258 C358 266 364 274 376 274 L394 272 Z" fill="#c4c9ce" stroke="#8b9197" stroke-width="1.5"/>')
    # wheels
    for cx in (302, 928):
        body.append(f'<circle cx="{cx}" cy="440" r="78" fill="url(#tyre)"/>')
        body.append(f'<circle cx="{cx}" cy="440" r="50" fill="#c3c8cd" stroke="#6d737a" stroke-width="3"/>')
        spokes = ''.join(f'<path d="M{cx} 440 L{cx + 44 * __import__("math").cos(a * 3.14159 / 5):.1f} {440 + 44 * __import__("math").sin(a * 3.14159 / 5):.1f}" '
                         f'stroke="#7d848b" stroke-width="9" stroke-linecap="round"/>' for a in range(10))
        body.append(spokes)
        body.append(f'<circle cx="{cx}" cy="440" r="14" fill="#5d646b"/>')
    # branding: lockup (no QR) on the front door, QR decal on the rear door
    lk, lw, lh = lockup(one_colour=False, with_qr=False)
    g, h = place(lk, lw, lh, 428, 270, 180)
    body.append(g)
    body.append(qr_tile(706, 278, 100, FOREST, '#ffffff'))
    d, w = text_path('rakovac.rs', 17, wght=600, tracking=0.04)
    body.append(f'<path d="{d}" transform="translate({756 - w / 2:.2f} 404)" fill="{VINE}"/>')
    return svg_doc(''.join(body), W, H, 'rakovac.rs on a small silver electric car')


def mockup_mug():
    W, H = 700, 640
    b = [f'<rect width="{W}" height="{H}" fill="#eef1ec"/>',
         '<defs><linearGradient id="cer" x1="0" y1="0" x2="1" y2="0">'
         '<stop offset="0" stop-color="#d9d9d4"/><stop offset=".18" stop-color="#fbfbf8"/>'
         '<stop offset=".7" stop-color="#f4f4f0"/><stop offset="1" stop-color="#c9c9c3"/></linearGradient></defs>',
         '<ellipse cx="350" cy="498" rx="220" ry="18" fill="#000" opacity=".14"/>',
         # handle
         '<path d="M500 170 C600 160 628 230 616 300 C604 370 560 400 500 404" fill="none" stroke="#bdbdb6" stroke-width="46" stroke-linecap="round"/>',
         '<path d="M500 170 C600 160 628 230 616 300 C604 370 560 400 500 404" fill="none" stroke="#f7f7f3" stroke-width="42" stroke-linecap="round"/>',
         # body
         '<path d="M150 100 H520 V440 C520 474 496 494 462 494 H208 C174 494 150 474 150 440 Z" fill="url(#cer)" stroke="#bdbdb6" stroke-width="2"/>',
         '<ellipse cx="335" cy="100" rx="185" ry="22" fill="#e9e9e4" stroke="#bdbdb6" stroke-width="2"/>',
         '<ellipse cx="335" cy="102" rx="168" ry="16" fill="#3b2a20"/>']
    lk, lw, lh = lockup(one_colour=False, with_qr=True)
    g, h = place(lk, lw, lh, 335 - 110, 138, 220)
    b.append(g)
    # centre the 560-high drawing on the 640-high canvas (same size as the T-shirt)
    return svg_doc(b[0] + '<g transform="translate(0 40)">' + ''.join(b[1:]) + '</g>', W, H, 'rakovac.rs on a mug')


def mockup_tshirt():
    W, H = 700, 640
    b = [f'<rect width="{W}" height="{H}" fill="#eef1ec"/>',
         '<path d="M246 64 C270 92 306 106 350 106 C394 106 430 92 454 64 L560 104 L660 212 L586 280 L544 240 '
         'L544 600 C544 610 536 616 526 616 H174 C164 616 156 610 156 600 L156 240 L114 280 L40 212 L140 104 Z" '
         f'fill="{FOREST}" stroke="#15291f" stroke-width="2"/>',
         '<path d="M246 64 C270 92 306 106 350 106 C394 106 430 92 454 64 C446 80 420 124 350 124 C280 124 254 80 246 64 Z" fill="#15291f"/>',
         '<path d="M156 240 L156 300 M544 240 L544 300" stroke="#15291f" stroke-width="2"/>']
    lk, lw, lh = lockup(one_colour=True, with_qr=True)
    g, h = place(lk, lw, lh, 350 - 100, 150, 200)
    b.append(g)
    return svg_doc(''.join(b), W, H, 'rakovac.rs on a t-shirt')


def main():
    os.makedirs(MOCK, exist_ok=True)
    for one, name in ((False, 'colour'), (True, 'one-colour')):
        for qr, suffix in ((True, ''), (False, '-noqr')):
            body, w, h = lockup(one_colour=one, with_qr=qr)
            with open(os.path.join(LOGO, f'rakovac-lockup-{name}{suffix}.svg'), 'w', encoding='utf-8') as f:
                f.write(svg_doc(body, w, h, 'Rakovac · rakovac.rs'))
    q = 300
    with open(os.path.join(LOGO, 'rakovac-qr.svg'), 'w', encoding='utf-8') as f:
        f.write(svg_doc(f'<rect width="{q}" height="{q}" fill="#ffffff"/><path d="{qr_modules(0, 0, q, quiet=4)}" fill="{FOREST}"/>',
                        q, q, URL))
    for name, fn in (('car', mockup_car), ('mug', mockup_mug), ('tshirt', mockup_tshirt)):
        with open(os.path.join(MOCK, f'mockup-{name}.svg'), 'w', encoding='utf-8') as f:
            f.write(fn())
    export_png()
    print('QR', QR.version, QR.error, QR_N, 'modules')


def export_png(width=1800):
    """Transparent PNG copies of the two main lockups, rendered by Chromium."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('Playwright not installed: PNG files not updated')
        return
    import base64
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page()
        for name in ('colour', 'one-colour'):
            data = base64.b64encode(open(os.path.join(LOGO, f'rakovac-lockup-{name}.svg'), 'rb').read()).decode()
            pg.set_content(f'<body style="margin:0;background:transparent">'
                           f'<img src="data:image/svg+xml;base64,{data}" style="display:block;width:{width}px"></body>')
            pg.wait_for_timeout(200)
            pg.query_selector('img').screenshot(path=os.path.join(LOGO, f'rakovac-lockup-{name}-{width}px.png'), omit_background=True)
        b.close()


if __name__ == '__main__':
    main()
