#!/usr/bin/env python3
"""Drawn cover card for vajska.rs / provala.rs (selo engine) in the site's palette, with any glyphs from
rakovac.rs (scripts/atlas_glyphs.G + EXTRA in scripts/card_art.py) or the engine's own.

Lives in rakovac.rs branch news-monitor. Copy it out (git show origin/news-monitor:tools/card_selo.py > card_selo.py),
then run from the SITE root (vajska.rs or provala.rs), RAKOVAC = path to a rakovac.rs checkout of main:
  python3 card_selo.py RAKOVAC NAME glyph1,glyph2,glyph3 '#bg1,#bg2' '#ink'
  vajska:  '#5e1d22,#3e1015' '#f7efe0'      provala: '#0e4657,#08303d' '#eef7f6'
Writes static/img/card-NAME.jpg (Playwright + Chromium). Then add card-NAME to data/photos.yaml
(author: <site>, license: ilustracija / illustration, alt + alt_sr/alt_cyr/alt_hr/alt_ru)."""
import sys, os, asyncio, importlib.util

def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m); return m

rak, name, glyphs, bg, ink = sys.argv[1], sys.argv[2], sys.argv[3].split(','), tuple(sys.argv[4].split(',')), sys.argv[5]
eng_dir = os.path.join(os.getcwd(), 'themes', 'selo', 'scripts')
sys.path.insert(0, eng_dir)
eng = load(os.path.join(eng_dir, 'card_art.py'), 'eng_card_art')
sys.path.insert(0, os.path.join(rak, 'scripts'))
src = load(os.path.join(rak, 'scripts', 'card_art.py'), 'rak_card_art')
for k, v in src.EXTRA.items():
    eng.EXTRA.setdefault(k, v)
eng.CARDS[name] = glyphs
asyncio.run(eng.render([name], os.path.join(os.getcwd(), 'static', 'img'), bg=bg, ink=ink))
