#!/usr/bin/env python3
"""Make 720-px thumbnails for every local photo listed in data/gallery.yaml (static/img/thumb/<file>).
Run after adding photos: python3 scripts/gallery_thumbs.py"""
import os, yaml
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
photos = yaml.safe_load(open(os.path.join(ROOT, 'data', 'photos.yaml'), encoding='utf-8'))
for item in yaml.safe_load(open(os.path.join(ROOT, 'data', 'gallery.yaml'), encoding='utf-8')):
    src = photos[item['photo']]['src']
    if src.startswith('http'):
        continue
    out = os.path.join(ROOT, 'static', 'img', 'thumb', os.path.basename(src))
    if os.path.exists(out):
        continue
    im = Image.open(os.path.join(ROOT, 'static', src)).convert('RGB')
    im.thumbnail((720, 720))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im.save(out, 'JPEG', quality=80, optimize=True, progressive=True)
    print('thumb', out)
