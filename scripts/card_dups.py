"""Warn when two cards on one page (news list, section listings, "more in this section") show the same photo.
Each card should have its own picture: give a gallery album a different share_photo, or a page its own photo/cover.
Usage: python3 scripts/card_dups.py public   (prints GitHub warnings, never fails the build)"""
import re, sys, glob, os, collections
root = sys.argv[1] if len(sys.argv) > 1 else 'public'
pat = re.compile(r'<a\s+class="?(?:n?card-img)"?\s[^>]*?href="?([^"\s>]+)"?[^>]*>\s*(?:<picture>.*?)?<img[^>]*?\ssrc="?([^"\s>]+)', re.S)
found = collections.defaultdict(set)
for f in sorted(glob.glob(f'{root}/**/index.html', recursive=True)):
    s = open(f, encoding='utf-8').read()
    seen = collections.defaultdict(set)
    for href, src in pat.findall(s):
        seen[os.path.basename(src.split('?')[0])].add(href)
    for img, hrefs in seen.items():
        if len(hrefs) > 1:
            found[(img, tuple(sorted(hrefs)))].add(os.path.relpath(f, root))
for (img, hrefs), pages in sorted(found.items()):
    print(f'::warning::same card photo {img} for {", ".join(hrefs)} (on {len(pages)} page(s), e.g. {sorted(pages)[0]})')
print(f'card_dups: {len(found)} duplicate card photo(s)')
