#!/usr/bin/env python3
"""Fetch the official JGSP Novi Sad suburban timetable (gspns.co.rs) for the lines that serve Rakovac.

Runs in GitHub Actions (.github/workflows/bus.yml), because the site is not reachable from everywhere.
Step 1 (discovery): saves the raw pages into bus-raw/ so the format can be checked.
Step 2: parses the departures into data/bus.yaml (see parse())."""
import os, re, sys, json, urllib.request, urllib.parse, html

BASE = 'http://www.gspns.co.rs'
LINES = ['77', '78']          # 78SR is not a separate line: departures of 78 marked "kroz Stari Rakovac"
OUT = 'bus-raw'
UA = {'User-Agent': 'rakovac.rs timetable bot (+https://rakovac.rs; contact konstantin.stein@gmail.com)'}

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode('utf-8', 'replace')

def save(name, text):
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, name), 'w', encoding='utf-8').write(text)

def main():
    log = {}
    idx = get(BASE + '/red-voznje/prigradski')
    save('index-prigradski.html', idx)
    # the form lists validity dates (vaziod) and the lines with their values
    dates = re.findall(r'<option[^>]*value="(\d{4}-\d{2}-\d{2})"', idx)
    opts = re.findall(r'<option[^>]*value="([^"]+)"[^>]*>([^<]*)</option>', idx)
    log['dates'] = dates
    log['options'] = opts[:400]
    vaziod = dates[0] if dates else ''
    for line in LINES:
        vals = [v for v, t in opts if re.match(rf'^\s*{line}\b', html.unescape(t)) or v.startswith(line)]
        log.setdefault('line_values', {})[line] = vals
        for v in vals or [line]:
            for dan in ('R', 'S', 'N'):
                q = urllib.parse.urlencode([('rv', 'rvp'), ('vaziod', vaziod), ('dan', dan), ('linija[]', v)])
                url = f'{BASE}/red-voznje/ispis-polazaka?{q}'
                try:
                    save(f'line-{re.sub(r"[^0-9A-Za-z]+", "_", v)}-{dan}.html', get(url))
                    log.setdefault('fetched', []).append(url)
                except Exception as e:
                    log.setdefault('errors', []).append(f'{url}: {e}')
    save('log.json', json.dumps(log, ensure_ascii=False, indent=1))
    print(json.dumps({k: (v if k != 'options' else len(v)) for k, v in log.items()}, ensure_ascii=False, indent=1))

if __name__ == '__main__':
    main()
