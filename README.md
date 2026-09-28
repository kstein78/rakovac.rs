# rakovac.rs

Made by Konstantin (Kosta) Stein together with Claude (Anthropic).

Unofficial visitor portal of the village of Rakovac (Beočin municipality, Fruška Gora, Serbia).
Static site built with [Hugo](https://gohugo.io/) (extended, v0.139.4), deployed by GitHub Actions to a Hetzner server.

- **Draft status (2026-09-26):** all five languages live (en, sr, ru, de, hu), all pages drafted. Photos are borrowed open-licence
  images marked **TEMP PHOTO**. Yellow **Editor's note** boxes list what still has to be checked or filmed.
- **Languages:** English is the source; sr (Latin), ru, de and hu are translated automatically (see below).
- All translations were drafted by Claude: have native speakers review them, Serbian, German and Hungarian especially.

## Run locally

```bash
hugo server            # http://localhost:1313/en/
hugo --gc --minify     # production build into ./public
./scripts/make-preview.sh   # offline, clickable preview in ./preview (no server needed)
```

## Structure

```
content/en/            one folder per section; _index.md = section page, other .md = places
  nature/  routes/  monastery/  history/  stay/  eat-drink/  local-products/
  shops/   business/  people/  kids/  useful/  map/  support/  about/
content/sr|ru|de|hu/   translations, same file names (kept in sync automatically, see below)
data/photos.yaml       every photo: source URL, author, licence, temp flag
data/nav.yaml          menu order and map marker colours per category
i18n/*.yaml            interface strings in 5 languages
layouts/               templates (no external theme)
assets/css, assets/js  styles, menu, click-to-load YouTube, Leaflet maps
static/fonts, static/vendor/leaflet   self-hosted fonts (Rakovac Common, Rakovac Capital) and Leaflet (no Google Fonts, no CDN)
static/downloads       font ZIP and font guides (PDF) offered on /fonts/
static/favicon.*       the R favicon set + site.webmanifest
scripts/               translate.py (automatic translation), make-preview.sh
deploy/                nginx config and server setup guide
FACTS.md               fact log: where every statement comes from
PHOTOS-TODO.md         shot list to replace the temporary photos
```

## Everyday editing

### Add a place (house for rent, producer, shop …)

Create e.g. `content/en/stay/vila-primer.md`:

```yaml
---
title: "Vila Primer"
kicker: "Villa · Ledinačka"
weight: 10
category: stay            # nature | heritage | stay | food | products | shops | business | services | kids
summary: "One or two sentences for the card."
coords: [45.2001, 19.7801]  # right-click in Google Maps → copy coordinates
address: "Ledinačka 1, 21299 Rakovac"
phone: "+381 60 000 0000"
website: "https://example.rs/"
photo: vila-primer         # key in data/photos.yaml
status: unconfirmed        # remove once the owner has checked the page
supporter: true            # shows the "Supporter of rakovac.rs" badge
---
Text of the page.
```

It appears automatically in its section, on the site map and in the "More in…" block.

### Add a YouTube video

In the front matter of any page:

```yaml
videos:
  - { id: "VIDEO_ID", title: "How to get to Beli Majdan" }
  - { id: "", title: "Planned video" }     # empty id = "Video coming soon" box
```

or inside the text: `{{< video id="VIDEO_ID" title="…" >}}`.
Videos load from youtube-nocookie.com only after the visitor presses play.

### Add a person (local journalism)

Copy `content/en/people/_person-template.md` to `content/en/people/firstname-lastname.md`,
remove `draft: true`, fill in. Publish only with the person's written consent.
The historical list is chronological: set `weight` to the person's place in time
(10 Raka, 11 Teofan … 16 Isaija … 19–21 the partisans of 1942 (commander Marković, commissar Paunović, courier Hunjadi), 22 Hegumeness Gavrila; leave gaps free by renumbering).

### Replace a temporary photo

1. Put your photo in `static/img/` (JPEG, 1600–2000 px wide, under ~400 KB).
2. In `data/photos.yaml` change `src: img/your-file.jpg` (no leading slash), `author`, `license`, and set `temp: false`.

Credits are printed under every photo and collected on the *About this site* page.

### Editor's notes

`{{< todo >}}…{{< /todo >}}` boxes are visible while `showTodos = true` in `hugo.toml`.
Before launch set `showTodos = false` and `showPhotoBadges = false`.

## Automatic translation

**Write and edit texts in English only** (`content/en/`, `i18n/en.yaml`, `alt` in `data/photos.yaml`).
After the push, the *Translate* workflow translates what changed into sr, ru, de and hu with Claude,
checks the result, commits it to `main` and starts the deploy. Nothing else to do.

- Only pages whose English text changed are sent (`.translations.json` stores what each translation was made from).
  The current translation goes along as the base, so corrections made by a native speaker survive later updates
  wherever the English meaning did not change.
- Every result is validated before it is written: photo keys, video ids, coordinates, phone numbers, links, shortcodes
  and headings must match the English page, otherwise the answer is rejected and requested again.
- To fix a translation by hand, just edit `content/<lang>/…`. To protect a page completely, add
  `translation_locked: true` to its front matter.
- Recurring terms and place names (e.g. Tarcal-hegység, Einsiedelei) live in `scripts/translate-glossary.yaml`.
- Deleting an English page deletes its translations on the next run.

One-time setup: repository **Settings → Secrets and variables → Actions → New repository secret**
`ANTHROPIC_API_KEY` (a key from console.anthropic.com). Optional variable `TRANSLATE_MODEL` (default `claude-sonnet-5`).
Without the key the workflow only validates and prints a warning.

Cost with Claude Sonnet 5 ($2 / $10 per million input / output tokens, September 2026): an edited page into all four
languages is about $0.04; re-translating the whole site from scratch is about $3. Each run prints its real token count.

Locally:

```bash
python3 scripts/translate.py --status          # what is out of date (no API calls)
python3 scripts/translate.py --check           # validate all translations
ANTHROPIC_API_KEY=… python3 scripts/translate.py --langs de --force nature/isposnica.md
```

### Adding another language

1. Add it under `[languages]` in `hugo.toml` and create an empty `i18n/<lang>.yaml` (the script fills in every missing string).
2. Add it to `LANGS` and `LANG_NAMES` in `scripts/translate.py` and a section in `scripts/translate-glossary.yaml`.
3. Run the *Translate* workflow by hand (Actions → Translate → Run workflow) with that language.

## Deployment

Push to `main` → GitHub Actions builds the site → uploads with rsync to the server.
One-time server setup: [deploy/SERVER-SETUP.md](deploy/SERVER-SETUP.md).

## Licences

| What | Licence |
|---|---|
| Source code (layouts, CSS, JS, config, workflows) | **MIT**, see [LICENSE](LICENSE) |
| Texts (`content/`, `i18n/`) | **CC BY 4.0**: reuse allowed with credit to rakovac.rs, see [LICENSE-CONTENT.md](LICENSE-CONTENT.md) |
| Our own photos, videos, interviews | **© Konstantin Stein / rakovac.rs, all rights reserved** |
| Rakovac Capital font | © Konstantin Stein / rakovac.rs, own free licence (static/fonts/LICENSE-RakovacCapital.txt) |
| Temporary Wikimedia photos, Rakovac Common (OFL), Leaflet, map tiles | their own licences, listed in LICENSE-CONTENT.md |

## Typography

- **Rakovac Common** (Literata, OFL) is used for headings and body text, never Bold in headings: `h1`/`h2`, the home
  title and big numbers are Light (300), `h3`, card titles, labels and the menu are Regular (400). Bold/Semibold is
  left to buttons, chips and `<strong>`. The shield initial is the heaviest thing in a title, as in manuscripts:
  stem of the Capital R ≈ 82/1000 em, Common Light 71, Regular 93, Bold 159. On page titles the initial is
  1.3 × the title size (`--rk-cap-scale`, Claude Design patch v1.2).
- **Rakovac Capital** is the shield initial. Write a first letter as `<span class="rk-cap">R</span>akovac` (colour) or add
  `rk-cap-mono` on dark backgrounds. Page titles get it automatically through `.page-head h1::first-letter`;
  `class="rk-dropcap"` on a paragraph makes a drop cap.
- **Kids section rule:** story paragraphs start with a shield initial (drop cap, three lines) and the subheadings
  are in the kids colour. `layouts/partials/content.html` marks every paragraph of a kids page that starts with a
  letter and is at least ~80 characters long (`class="kcap"`); paragraphs starting with a digit, link-only lines
  and short notes keep a normal letter. New kids pages get this automatically in all languages.
- **Language order:** Serbian first in the language switcher (`weight` in hugo.toml: sr 1, en 2, ru 3, de 4, hu 5).
  English stays the source language for translations and the fallback for browsers in other languages.
- **Local identity page** (`content/*/fonts/`, URL `/<lang>/fonts/`; the old `/fonts/` redirects to English): the short
  guideline for local businesses and residents. `{{< identity-kit logos|colours|downloads >}}` draws the logo lockups,
  the five colours and the download list (file sizes are read from `static/` at build time). The shield R is the portal's
  sign, **not** an official coat of arms of the village or of Beočin municipality: never call it one.
- `layouts/partials/fonts-cta.html` puts the short guideline and the ZIP downloads on the business, eat-drink, stay,
  shops, local-products and support pages. `static/downloads/rakovac-logo.zip` is the logo pack;
  `rakovac-fonts.zip` has everything, including a `Logo/` folder.
- `aliases` in front matter are English-only: `translate.py` strips them before translating and rejects them in translations.
