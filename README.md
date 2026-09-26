# rakovac.rs

Unofficial visitor portal of the village of Rakovac (Beočin municipality, Fruška Gora, Serbia).
Static site built with [Hugo](https://gohugo.io/) (extended, v0.139.4), deployed by GitHub Actions to a Hetzner server.

- **Draft status (2026-09-26):** English, Serbian (Latin) and Russian live, all pages drafted. Photos are borrowed open-licence
  images marked **TEMP PHOTO**. Yellow **Editor's note** boxes list what still has to be checked or filmed.
- **Languages:** en, sr (Latin) and ru are live; de and hu are configured (UI strings in `i18n/`) and switched off until their content exists.
- Translations of `content/ru` and `content/sr` were drafted by Claude: have native speakers review them, Serbian especially.

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
data/photos.yaml       every photo: source URL, author, licence, temp flag
data/nav.yaml          menu order and map marker colours per category
i18n/*.yaml            interface strings in 5 languages
layouts/               templates (no external theme)
assets/css, assets/js  styles, menu, click-to-load YouTube, Leaflet maps
static/fonts, static/vendor/leaflet   self-hosted fonts and Leaflet (no Google Fonts, no CDN)
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

### Replace a temporary photo

1. Put your photo in `static/img/` (JPEG, 1600–2000 px wide, under ~400 KB).
2. In `data/photos.yaml` change `src: /img/your-file.jpg`, `author`, `license`, and set `temp: false`.

Credits are printed under every photo and collected on the *About this site* page.

### Editor's notes

`{{< todo >}}…{{< /todo >}}` boxes are visible while `showTodos = true` in `hugo.toml`.
Before launch set `showTodos = false` and `showPhotoBadges = false`.

## Adding a language

1. Copy `content/en` to `content/sr` (or ru/de/hu) and translate. Keep the file names identical:
   pages are linked across languages by path.
2. Remove the language from `disableLanguages` in `hugo.toml`.
3. Have a native speaker check `i18n/<lang>.yaml` (drafted by Claude).
4. The language switcher in the header appears automatically once two or more languages are live.

## Deployment

Push to `main` → GitHub Actions builds the site → uploads with rsync to the server.
One-time server setup: [deploy/SERVER-SETUP.md](deploy/SERVER-SETUP.md).

## Licences

| What | Licence |
|---|---|
| Source code (layouts, CSS, JS, config, workflows) | **MIT**, see [LICENSE](LICENSE) |
| Texts (`content/`, `i18n/`) | **CC BY 4.0**: reuse allowed with credit to rakovac.rs, see [LICENSE-CONTENT.md](LICENSE-CONTENT.md) |
| Our own photos, videos, interviews | **© Konstantin Stein / rakovac.rs, all rights reserved** |
| Temporary Wikimedia photos, fonts, Leaflet, map tiles | their own licences, listed in LICENSE-CONTENT.md |
