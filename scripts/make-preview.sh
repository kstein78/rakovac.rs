#!/usr/bin/env bash
# Builds a self-contained, clickable offline preview in ./preview
# (relative links, .html file names, photos replaced by labelled placeholders).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf preview
hugo --environment preview -d preview --gc --quiet
# Directory links like "../en/" -> "../en/index.html" so they work without a web server.
find preview -name '*.html' -print0 | xargs -0 sed -i -E 's#href="((\.\./)*|\./)?en/"#href="\1en/index.html"#g'
# Root page: plain redirect to the English home page.
cat > preview/index.html <<'HTML'
<title>Rakovac preview</title>
<meta http-equiv="refresh" content="0; url=en/index.html">
<p style="font-family:sans-serif;padding:2rem"><a href="en/index.html">Open the Rakovac site preview</a></p>
HTML
echo "Preview ready: preview/index.html"
