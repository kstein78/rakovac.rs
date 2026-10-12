#!/usr/bin/env python3
"""Air quality for rakovac.rs from the Serbian Environmental Protection Agency (SEPA / AZŽS).

Reads the public portal https://vazduh.sepa.gov.rs/ (the station data is embedded in the page as
window.PORTAL_MOBILE_CONFIG), keeps the nearest stations (Beočin Centar first, Novi Sad as fallback)
and writes a small JSON for the site:

    python3 scripts/air_fetch.py OUT_DIR            -> OUT_DIR/air.json (+ history of the last 72 h)
    python3 scripts/air_fetch.py OUT_DIR --alert    -> also writes a news item into content/<lang>/news/
                                                       when the morning check finds poor air (see below)

The GitHub workflow .github/workflows/air.yml runs it every 30 minutes and publishes air.json on the
branch "air-data"; Caddy serves it as https://rakovac.rs/air.json (deploy/Caddyfile).

Index: SEPA uses the six levels and colours of the European Air Quality Index
(1 good, 2 fair, 3 moderate, 4 poor, 5 very poor, 6 extremely poor). The label shown in Serbian is
SEPA's own (index_label); the other languages use the EEA level names (i18n air_1 … air_6).

Morning alert (--alert, run between 5 and 8 a.m. Belgrade time): a news item is written when, at
Beočin Centar, the index of the latest hour is 4 (poor) or worse, or SEPA shows a regulatory alert
for the station. At most one alert per day.
"""
import datetime as dt, hashlib, json, os, re, sys, urllib.request

URL = 'https://vazduh.sepa.gov.rs/'
STATIONS = [4, 3, 2]            # Beočin Centar, Novi Sad Liman, Novi Sad Rumenačka
MAIN = 4
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEEP_H = 72
TZ = dt.timezone(dt.timedelta(hours=2))  # replaced below by the real Belgrade offset


def belgrade_now():
    try:
        from zoneinfo import ZoneInfo
        return dt.datetime.now(ZoneInfo('Europe/Belgrade'))
    except Exception:
        return dt.datetime.now(TZ)


def fetch():
    if os.environ.get('AIR_HTML'):          # local test: a saved copy of the portal page
        html = open(os.environ['AIR_HTML'], encoding='utf-8').read()
        m = re.search(r'window\.PORTAL_MOBILE_CONFIG\s*=\s*(\{.*?\});\s*\n', html, re.S)
        return json.loads(m.group(1))['stations']
    req = urllib.request.Request(URL, headers={'User-Agent': 'rakovac.rs air-quality bot (+https://rakovac.rs)'})
    with urllib.request.urlopen(req, timeout=60) as r:
        html = r.read().decode('utf-8', 'replace')
    m = re.search(r'window\.PORTAL_MOBILE_CONFIG\s*=\s*(\{.*?\});\s*\n', html, re.S)
    if not m:
        raise SystemExit('PORTAL_MOBILE_CONFIG not found on ' + URL)
    return json.loads(m.group(1))['stations']


def slim(s):
    comps = [{'n': c['name'], 'v': c.get('value'), 'u': c.get('unit'), 'i': c.get('index')} for c in s.get('components', [])]
    d = s.get('dominant_component') or {}
    return {
        'id': s['station_id'], 'name': s['name'], 'index': s.get('index'), 'label': s.get('index_label'),
        'color': s.get('index_color'), 'interval': s.get('measurement_interval_label'),
        'dominant': {'n': d.get('name'), 'v': d.get('value'), 'u': d.get('unit')} if d else None,
        'alert': bool(s.get('has_alert')), 'alert_text': s.get('alert_text') or '', 'components': comps,
    }


def interval_start(label):
    m = re.match(r'(\d{1,2})\.(\d{1,2})\.(\d{4})\.\s*(\d{1,2}):(\d{2})', label or '')
    if not m:
        return None
    d, mo, y, h, mi = map(int, m.groups())
    return f'{y:04d}-{mo:02d}-{d:02d}T{h:02d}:{mi:02d}'


def main():
    out = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else '.'
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, 'air.json')
    old = {}
    if os.path.exists(path):
        try:
            old = json.load(open(path, encoding='utf-8'))
        except Exception:
            old = {}
    stations = {s['station_id']: s for s in fetch()}
    data = {'source': URL, 'fetched': belgrade_now().isoformat(timespec='minutes'), 'stations': []}
    for sid in STATIONS:
        if sid in stations:
            data['stations'].append(slim(stations[sid]))
    if not data['stations']:
        raise SystemExit('none of the stations found')
    # history of the main station, one entry per measured hour
    hist = [h for h in old.get('history', []) if isinstance(h, dict)]
    main_st = next((s for s in data['stations'] if s['id'] == MAIN), None)
    if main_st and main_st['index'] and interval_start(main_st['interval']):
        t = interval_start(main_st['interval'])
        hist = [h for h in hist if h.get('t') != t]
        hist.append({'t': t, 'i': main_st['index'], 'c': {c['n']: c['v'] for c in main_st['components'] if c['v'] is not None}})
    hist.sort(key=lambda h: h['t'])
    cutoff = (belgrade_now() - dt.timedelta(hours=KEEP_H)).strftime('%Y-%m-%dT%H:%M')
    data['history'] = [h for h in hist if h['t'] >= cutoff]
    data['alerts_sent'] = [d for d in old.get('alerts_sent', []) if d >= (belgrade_now() - dt.timedelta(days=30)).strftime('%Y-%m-%d')]
    if '--alert' in sys.argv and main_st:
        alert(main_st, data)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(json.dumps({s['name']: [s['index'], s['label'], s['interval']] for s in data['stations']}, ensure_ascii=False))


# ------------------------------------------------------------------ morning alert news
NAMES = {
    'en': ['good', 'fair', 'moderate', 'poor', 'very poor', 'extremely poor'],
    'ru': ['хорошее', 'приемлемое', 'умеренное', 'плохое', 'очень плохое', 'крайне плохое'],
    'sr': ['dobar', 'prihvatljiv', 'umeren', 'loš', 'veoma loš', 'izuzetno loš'],
    'de': ['gut', 'mäßig gut', 'mäßig', 'schlecht', 'sehr schlecht', 'extrem schlecht'],
    'hu': ['jó', 'elfogadható', 'mérsékelt', 'rossz', 'nagyon rossz', 'rendkívül rossz'],
}
TXT = {
    'en': ('Poor air in Beočin this morning', 'At {time} the air quality at the SEPA station Beočin Centar was **{name}** ({idx} of 6).{dom}',
           'Main pollutant: {pn}, {pv} {pu}.', 'If you have asthma or heart or lung problems, and with small children and older people, avoid long or strenuous activity outdoors today, and keep windows closed while the air is poor. Current values: [Useful info → Air quality]({useful}) and on the [SEPA portal](https://vazduh.sepa.gov.rs/).',
           'This message was created automatically from the measurements of the Serbian Environmental Protection Agency (SEPA). The values are hourly and not yet verified.'),
    'ru': ('Плохой воздух в Беочине этим утром', 'В {time} качество воздуха на станции SEPA «Беочин Центар» — **{name}** ({idx} из 6).{dom}',
           'Основной загрязнитель: {pn}, {pv} {pu}.', 'Людям с астмой, болезнями сердца и лёгких, а также маленьким детям и пожилым сегодня лучше не проводить долго время на улице и не нагружаться, а окна держать закрытыми, пока воздух плохой. Текущие значения: [Полезное → Качество воздуха]({useful}) и на [портале SEPA](https://vazduh.sepa.gov.rs/).',
           'Сообщение создано автоматически по измерениям Агентства по охране окружающей среды Сербии (SEPA). Значения часовые и ещё не проверены.'),
    'sr': ('Loš vazduh u Beočinu jutros', 'U {time} kvalitet vazduha na stanici SEPA „Beočin Centar” bio je **{name}** ({idx} od 6).{dom}',
           'Glavni zagađivač: {pn}, {pv} {pu}.', 'Osobe sa astmom i bolestima srca i pluća, kao i mala deca i stariji, danas treba da izbegavaju duži boravak i napor napolju, a prozore držite zatvorenim dok je vazduh loš. Trenutne vrednosti: [Korisno → Kvalitet vazduha]({useful}) i na [portalu SEPA](https://vazduh.sepa.gov.rs/).',
           'Ova poruka je napravljena automatski na osnovu merenja Agencije za zaštitu životne sredine (SEPA). Vrednosti su satne i još nisu verifikovane.'),
    'de': ('Schlechte Luft in Beočin heute Morgen', 'Um {time} war die Luftqualität an der SEPA-Station Beočin Centar **{name}** ({idx} von 6).{dom}',
           'Hauptschadstoff: {pn}, {pv} {pu}.', 'Wer Asthma oder Herz- und Lungenerkrankungen hat, sowie kleine Kinder und ältere Menschen sollten heute lange oder anstrengende Aktivitäten im Freien meiden; halten Sie die Fenster geschlossen, solange die Luft schlecht ist. Aktuelle Werte: [Nützliches → Luftqualität]({useful}) und im [SEPA-Portal](https://vazduh.sepa.gov.rs/).',
           'Diese Meldung wurde automatisch aus den Messungen der serbischen Umweltschutzagentur (SEPA) erstellt. Die Werte sind stündlich und noch nicht geprüft.'),
    'hu': ('Rossz a levegő ma reggel Beočinban', '{time}-kor a SEPA „Beočin Centar” állomásán a levegő minősége **{name}** volt (6-ból {idx}).{dom}',
           'Fő szennyező: {pn}, {pv} {pu}.', 'Asztmával, szív- vagy tüdőbetegséggel élők, kisgyerekek és idősek ma kerüljék a hosszú vagy megerőltető szabadtéri tevékenységet, és amíg rossz a levegő, tartsák zárva az ablakokat. Aktuális értékek: [Hasznos → Levegőminőség]({useful}) és a [SEPA portálon](https://vazduh.sepa.gov.rs/).',
           'Ezt az üzenetet automatikusan készítettük a Szerb Környezetvédelmi Ügynökség (SEPA) mérései alapján. Az értékek óránkéntiek, és még nincsenek ellenőrizve.'),
}


def alert(st, data):
    now = belgrade_now()
    today = now.strftime('%Y-%m-%d')
    if not (5 <= now.hour < 8):
        print('alert: outside 5–8 a.m., skipped'); return
    if today in data['alerts_sent']:
        print('alert: already sent today'); return
    idx = st['index'] or 0
    if idx < 4 and not st['alert']:
        print(f'alert: index {idx}, nothing to report'); return
    t = interval_start(st['interval']) or now.strftime('%Y-%m-%dT%H:00')
    hhmm = t[11:16]
    slug = f'{today}-air-quality-beocin'
    for lang, (title, line, dom, advice, note) in TXT.items():
        name = NAMES[lang][max(1, min(idx, 6)) - 1] if lang != 'sr' else (st['label'] or NAMES['sr'][idx - 1]).lower()
        d = st.get('dominant') or {}
        dom_txt = (' ' + dom.format(pn=d['n'], pv=d['v'], pu=d['u'])) if d.get('n') else ''
        useful = '{{< relref "useful" >}}#air'
        body = line.format(time=hhmm, name=name, idx=idx, dom=dom_txt) + '\n\n'
        if st['alert'] and st['alert_text']:
            body += f'SEPA: *{st["alert_text"]}*\n\n'
        body += advice.format(useful=useful) + '\n\n' + f'<small>{note}</small>\n'
        lead = line.format(time=hhmm, name=name, idx=idx, dom='').replace('**', '')
        fm = {'title': title, 'date': f'{t}:00{now.strftime("%z")[:3]}:{now.strftime("%z")[3:]}', 'feed': 'local',
              'cover': 'lookout-slopes-novi-sad', 'lead': lead, 'related': ['useful'], 'auto': True}
        d_ = os.path.join(ROOT, 'content', lang, 'news')
        os.makedirs(d_, exist_ok=True)
        with open(os.path.join(d_, slug + '.md'), 'w', encoding='utf-8') as f:
            f.write('---\n' + ''.join(f'{k}: {json.dumps(v, ensure_ascii=False)}\n' for k, v in fm.items()) + '---\n\n' + body)
    # mark the translations as made from this English text, so the translation workflow leaves them alone
    man = os.path.join(ROOT, '.translations.json')
    if os.path.exists(man):
        m = json.load(open(man, encoding='utf-8'))
        en = open(os.path.join(ROOT, 'content', 'en', 'news', slug + '.md'), encoding='utf-8').read()
        hv = hashlib.sha256(en.encode('utf-8')).hexdigest()[:16]
        for lang in ('sr', 'ru', 'de', 'hu'):
            m.setdefault('pages', {}).setdefault(lang, {})[f'news/{slug}.md'] = hv
        with open(man, 'w', encoding='utf-8') as f:
            f.write(json.dumps(m, ensure_ascii=False, sort_keys=True, indent=1) + '\n')
    data['alerts_sent'].append(today)
    print('alert: news written', slug)


if __name__ == '__main__':
    main()
