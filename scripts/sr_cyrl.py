#!/usr/bin/env python3
"""Serbian Cyrillic version of rakovac.rs, generated from the Serbian Latin text.

Serbian Latin and Cyrillic map one to one (lj = љ, nj = њ, dž = џ), so the Cyrillic pages are not translated but
transliterated automatically:
  content/sr/**        -> content/cyr/**           (text only: links, shortcode settings, code, URLs stay as they are)
  i18n/sr.yaml         -> i18n/cyr.yaml
  data/photos.yaml     alt_sr -> alt_cyr
  hugo.toml            [languages.cyr.params] tagline/description from [languages.sr.params]
Kept in Latin: foreign words and names (letters q w x y or foreign accents, KEEP_WORDS, KEEP_PHRASES),
Roman numerals, units such as °C, URLs and e-mail addresses.

Usage:  python3 scripts/sr_cyrl.py          regenerate everything
        python3 scripts/sr_cyrl.py --check  exit 1 if the generated files are out of date (used in CI)
Edit only the Latin files; the Cyrillic ones are overwritten on every run."""
import glob, os, re, sys, yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, DST = os.path.join(ROOT, 'content', 'sr'), os.path.join(ROOT, 'content', 'cyr')
CHECK = '--check' in sys.argv

# ------------------------------------------------------------------ transliteration of one word
DI = {'dž': 'џ', 'Dž': 'Џ', 'DŽ': 'Џ', 'lj': 'љ', 'Lj': 'Љ', 'LJ': 'Љ', 'nj': 'њ', 'Nj': 'Њ', 'NJ': 'Њ'}
MONO = dict(zip('abvgdđežzijklmnoprstćufhcčšABVGDĐEŽZIJKLMNOPRSTĆUFHCČŠ',
                'абвгдђежзијклмнопрстћуфхцчшАБВГДЂЕЖЗИЈКЛМНОПРСТЋУФХЦЧШ'))
SERBIAN_LATIN = set(MONO) | set('Ǆǅǆ')
KEEP_WORDS = {
    # foreign names, brands and abbreviations that Serbian Cyrillic texts also write in Latin
    'Google', 'YouTube', 'Facebook', 'Instagram', 'Threads', 'Telegram', 'Viber', 'WhatsApp', 'WhatsAppa',
    'OpenStreetMap', 'Wikiloc', 'Strava', 'GPX', 'GPS', 'QR', 'CSS', 'HTML', 'PDF', 'ZIP', 'SVG', 'PNG', 'MIT',
    'CC', 'BY', 'SA', 'OFL', 'Anthropic', 'Claude', 'Claude-om', 'Wikimedia', 'Commons', 'Booking', 'Windows',
    'Leaflet', 'Mistrowitz', 'Futtak', 'Neusatz', 'Forrest', 'Relax', 'Spa', 'Resort', 'Mövenpick', 'Salaxia',
    'Imperator', 'Demeter', 'Invent', 'SR', 'MAS', 'IPA', 'AMSS', 'Literata', 'Rakovac.rs', 'rakovac', 'rs',
    'Machine', 'review', 'Black', 'Capital', 'Common', 'Design', 'Lat', 'Windy', 'ECMWF', 'GeoPortOst', 'Fig', 'Salaxia',
}
KEEP_PHRASES = [
    'Abbas de Dombo', 'castellani de Dombo', 'Ilok und Ruma', 'zu Neusatz', 'Griechisches Kloster Rakovatz',
    'Donau-Ansichten', 'Uj-Futtak', 'O-Futtak', 'Mövenpick Resort & Spa', 'rakovac.rs', 'Rakovac Capital',
    'Rakovac Common', 'Claude Design', 'Fig Restaurant', 'Imperator & Salaxia', 'Robin Hood', 'Open-Meteo', 'SIL Open Font License',
]
# Foreign names with an established Serbian Cyrillic spelling (not letter by letter).
OVERRIDES = {'Stein': 'Штајн', 'Steina': 'Штајна', 'Steinom': 'Штајном', 'Steinu': 'Штајну'}
ROMAN = re.compile(r'^(?=[MDCLXVI]{2,}$)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$')


def keep_word(w):
    if w in KEEP_WORDS or ROMAN.match(w):
        return True
    if any(c.isalpha() and c.isascii() is False and c not in SERBIAN_LATIN for c in w):
        return 'Ѐ' <= w[0] <= 'ӿ' and False or not all('Ѐ' <= c <= 'ӿ' for c in w if c.isalpha())
    if re.search(r'[qwxyQWXY]', w):
        return True
    return False


def tr_word(w):
    if w in OVERRIDES:
        return OVERRIDES[w]
    if keep_word(w):
        return w
    out, i = [], 0
    upper = w.isupper() and len(w) > 1
    while i < len(w):
        two = w[i:i + 2]
        if two in DI:
            ch = DI[two]
            out.append(ch.upper() if upper else ch)
            i += 2
            continue
        out.append(MONO.get(w[i], w[i]))
        i += 1
    return ''.join(out)


WORD = re.compile(r"[^\W\d_]+(?:[-'’][^\W\d_]+)*|\d+[^\W\d_]+\w*|\w+")


def tr_text(s):
    """Transliterate plain text (no markup inside)."""
    def word(m):
        w = m.group(0)
        if re.search(r'\d', w):                      # 7pro8, 4G, 1200x630: leave mixed tokens alone
            return w
        return '-'.join(tr_word(p) for p in w.split('-')) if '-' in w and not keep_word(w) else tr_word(w)
    return WORD.sub(word, s)


# ------------------------------------------------------------------ protected spans in markdown / html
PROTECT = re.compile(
    r'(`[^`]*`'                                   # inline code
    r'|<[^>]+>'                                   # html tags
    r'|\]\([^)]*\)'                               # markdown link targets
    r'|https?://[^\s)\]>"]+'                      # bare urls
    r'|[\w.+-]+@[\w-]+\.[\w.]+'                   # e-mail
    r'|\b[\w-]+(?:\.[\w-]+)*\.(?:com|rs|org|net|de|hu|ru|eu|info|travel|io|app)\b(?:/[^\s)\]]*)?'  # domain names
    r'|°C'                                        # Celsius stays in Latin
    r'|' + '|'.join(re.escape(p) for p in sorted(KEEP_PHRASES, key=len, reverse=True)) + r')')
SHORTCODE = re.compile(r'\{\{[<%]\s*(/?)(\w[\w-]*)(.*?)[>%]\}\}', re.S)
PARAM = re.compile(r'(\w+)=("(?:[^"\\]|\\.)*"|\S+)')
LOCKED_PARAMS = {'key', 'id', 'class', 'type', 'level', 'start', 'src', 'poster', 'link', 'x', 'y', 'map', 'icon', 'url'}


def tr_markup(s):
    parts, last = [], 0
    for m in PROTECT.finditer(s):
        parts.append(tr_text(s[last:m.start()]))
        kept = m.group(0)
        if kept.startswith(']('):                    # links to Latin Serbian pages point to their Cyrillic twin
            kept = kept.replace('](/sr/', '](/cyr/')
        parts.append(kept)
        last = m.end()
    parts.append(tr_text(s[last:]))
    return ''.join(parts)


def tr_shortcode(m):
    close, name, args = m.group(1), m.group(2), m.group(3)
    def param(pm):
        k, v = pm.group(1), pm.group(2)
        if k in LOCKED_PARAMS or not v.startswith('"'):
            return pm.group(0)
        return f'{k}="{tr_markup(v[1:-1])}"'
    return m.group(0).replace(args, PARAM.sub(param, args)) if args.strip() and not close else m.group(0)


def tr_body(s):
    out, last = [], 0
    for m in SHORTCODE.finditer(s):
        out.append(tr_markup(s[last:m.start()]))
        out.append(tr_shortcode(m))
        last = m.end()
    out.append(tr_markup(s[last:]))
    return ''.join(out)


# ------------------------------------------------------------------ front matter
TEXT_KEYS = {'title', 'linkTitle', 'kicker', 'slogan', 'summary', 'lead', 'tile', 'list_title', 'featured_title',
             'sections_title', 'years', 'sort_name', 'address', 'after', 'description'}
STRUCT_KEYS = {'facts', 'videos', 'keyfacts', 'groups', 'group_titles'}
LOCKED_LEAVES = {'id', 'url', 'url_label', 'coords', 'phone', 'website', 'email', 'key', 'map', 'photo', 'icon'}


def tr_value(v, locked=False):
    if isinstance(v, str):
        return v if locked else tr_body(v)
    if isinstance(v, list):
        return [tr_value(x, locked) for x in v]
    if isinstance(v, dict):
        return {k: tr_value(x, locked or k in LOCKED_LEAVES) for k, x in v.items()}
    return v


def tr_page(text):
    m = re.match(r'---\n(.*?)\n---\n', text, re.S)
    if not m:
        return tr_body(text)
    fm = yaml.safe_load(m.group(1)) or {}
    for k in list(fm):
        if k in TEXT_KEYS:
            fm[k] = tr_value(fm[k])
        elif k in STRUCT_KEYS:
            fm[k] = tr_value(fm[k])
    head = yaml.safe_dump(fm, allow_unicode=True, sort_keys=False, width=1000)
    note = '# Generated by scripts/sr_cyrl.py from content/sr: do not edit, edit the Latin page instead.\n'
    return '---\n' + note + head + '---\n' + tr_body(text[m.end():])


# ------------------------------------------------------------------ files
def quote(v):
    return '"' + v.replace('\\', '\\\\').replace('"', '\\"') + '"'


def write(path, text, changed):
    old = open(path, encoding='utf-8').read() if os.path.exists(path) else None
    if old != text:
        changed.append(os.path.relpath(path, ROOT))
        if not CHECK:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            open(path, 'w', encoding='utf-8').write(text)


def main():
    changed = []
    wanted = set()
    for src in glob.glob(os.path.join(SRC, '**', '*.md'), recursive=True):
        rel = os.path.relpath(src, SRC)
        dst = os.path.join(DST, rel)
        wanted.add(dst)
        write(dst, tr_page(open(src, encoding='utf-8').read()), changed)
    for old in glob.glob(os.path.join(DST, '**', '*.md'), recursive=True):
        if old not in wanted:
            changed.append(os.path.relpath(old, ROOT) + ' (removed)')
            if not CHECK:
                os.remove(old)

    # interface strings
    lines = open(os.path.join(ROOT, 'i18n', 'sr.yaml'), encoding='utf-8').read().split('\n')
    out = ['# Generated by scripts/sr_cyrl.py from i18n/sr.yaml: do not edit.']
    for ln in lines:
        m = re.match(r'^([\w-]+):\s*(.*)$', ln)
        if not m or ln.startswith('#'):
            continue
        k, raw = m.groups()
        v = yaml.safe_load(raw) if raw else ''
        v = tr_markup(str(v)) if k not in ('brand_name',) else 'Раковац'
        out.append(f'{k}: ' + quote(v))
    write(os.path.join(ROOT, 'i18n', 'cyr.yaml'), '\n'.join(out) + '\n', changed)

    # photo descriptions
    p = os.path.join(ROOT, 'data', 'photos.yaml')
    lines = open(p, encoding='utf-8').read().split('\n')
    lines = [ln for ln in lines if not ln.startswith('  alt_cyr:')]
    res = []
    for ln in lines:
        res.append(ln)
        m = re.match(r'^  alt_sr:\s*(.*)$', ln)
        if m:
            v = yaml.safe_load(m.group(1))
            v = tr_markup(str(v))
            res.append('  alt_cyr: ' + quote(v))
    write(p, '\n'.join(res), changed)

    # site tagline and description
    p = os.path.join(ROOT, 'hugo.toml')
    cfg = open(p, encoding='utf-8').read()
    sr = re.search(r'\[languages\.sr\.params\]\n((?:\s+\w+ = ".*"\n)+)', cfg).group(1)
    vals = dict(re.findall(r'(\w+) = "(.*)"', sr))
    block = ''.join(f'      {k} = "{tr_markup(v) if k in ("tagline", "description") else v}"\n' for k, v in vals.items())
    new = re.sub(r'(\[languages\.cyr\.params\]\n)((?:\s+\w+ = ".*"\n)+)', lambda m: m.group(1) + block, cfg)
    write(p, new, changed)

    # sanity: the generated files must parse
    if not CHECK:
        yaml.safe_load(open(os.path.join(ROOT, 'i18n', 'cyr.yaml'), encoding='utf-8'))
        yaml.safe_load(open(os.path.join(ROOT, 'data', 'photos.yaml'), encoding='utf-8'))
    if changed:
        print(('OUT OF DATE (run python3 scripts/sr_cyrl.py):\n  ' if CHECK else 'updated:\n  ') + '\n  '.join(changed[:50]),
              f'\n  … {len(changed)} files' if len(changed) > 50 else '')
        if CHECK:
            sys.exit(1)
    else:
        print('Serbian Cyrillic is up to date.')


if __name__ == '__main__':
    main()
