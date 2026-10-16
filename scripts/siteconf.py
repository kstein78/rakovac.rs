"""Where the site is and what it is called, for the engine scripts (shared by all sites of the network).

The scripts live in the engine (themes/selo/scripts/) but work on the site that runs them:
  cd <site repo> && python3 themes/selo/scripts/<script>.py
SITE_ROOT overrides the folder. Site name, address and translator context come from hugo.toml."""
import os, tomllib
from urllib.parse import urlparse

ROOT = os.path.abspath(os.environ.get('SITE_ROOT') or os.getcwd())


def config():
    with open(os.path.join(ROOT, 'hugo.toml'), 'rb') as f:
        return tomllib.load(f)


CFG = config()
PARAMS = CFG.get('params', {})
BASE = CFG.get('baseURL', 'https://example.org/').rstrip('/') + '/'
HOST = urlparse(BASE).hostname or ''
# One line for the translator prompt, e.g. "rakovac.rs, an unofficial visitor portal of the village of Rakovac (Fruška Gora, Serbia)"
CONTEXT = PARAMS.get('translatorContext') or f"{HOST}, a local visitor portal in Vojvodina, Serbia"
