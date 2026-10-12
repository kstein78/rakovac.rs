#!/usr/bin/env bash
# Builds one commit of the site and makes it live. Called by /usr/local/sbin/rakovac-update
# (installed by deploy/cloud-init.yaml) as the "deploy" user, after the repo was reset to that commit.
#   bash deploy/build.sh <commit-sha>
# The Hugo version is read from .github/workflows/deploy.yml, so the server always builds
# with the same Hugo as GitHub Actions. Releases are kept in $BASE/releases/<sha>; the last
# KEEP stay on disk, and $BASE/current (what Caddy serves) is switched atomically.
set -euo pipefail

sha=${1:?usage: build.sh <commit-sha>}
BASE=${RAKOVAC_BASE:-/srv/rakovac}
KEEP=3
repo=$BASE/repo
rel=$BASE/releases
mkdir -p "$rel" "$BASE/bin"
cd "$repo"

ver=$(sed -n 's/^ *HUGO_VERSION: *\([0-9.]*\).*/\1/p' .github/workflows/deploy.yml | head -1)
[ -n "$ver" ] || { echo "HUGO_VERSION not found in .github/workflows/deploy.yml" >&2; exit 1; }
hugo=$BASE/bin/hugo-$ver
if [ ! -x "$hugo" ]; then
  case $(uname -m) in x86_64) arch=amd64 ;; aarch64) arch=arm64 ;; *) echo "unsupported CPU $(uname -m)" >&2; exit 1 ;; esac
  tmp=$(mktemp -d)
  curl -fsSL "https://github.com/gohugoio/hugo/releases/download/v${ver}/hugo_extended_${ver}_linux-${arch}.tar.gz" | tar -xz -C "$tmp" hugo
  install -m 755 "$tmp/hugo" "$hugo"
  rm -rf "$tmp"
  echo "installed Hugo $ver"
fi

# Serbian Cyrillic pages are generated from the Latin ones (normally already committed; this makes sure).
if [ -f scripts/sr_cyrl.py ] && python3 -c "import yaml" 2>/dev/null; then
  python3 scripts/sr_cyrl.py >/dev/null || echo "warning: scripts/sr_cyrl.py failed, building with the committed Cyrillic files" >&2
fi

# Pagefind (site search): standalone binary, version from the same workflow file. If it cannot be
# installed or fails, the site still goes live, only the search page shows no results.
pfver=$(sed -n 's/^ *PAGEFIND_VERSION: *\([0-9.]*\).*/\1/p' .github/workflows/deploy.yml | head -1)
pagefind=""
if [ -n "$pfver" ]; then
  pagefind=$BASE/bin/pagefind-$pfver
  if [ ! -x "$pagefind" ]; then
    case $(uname -m) in x86_64) pfarch=x86_64 ;; aarch64) pfarch=aarch64 ;; *) pfarch="" ;; esac
    tmp=$(mktemp -d)
    if [ -n "$pfarch" ] && curl -fsSL "https://github.com/Pagefind/pagefind/releases/download/v${pfver}/pagefind-v${pfver}-${pfarch}-unknown-linux-musl.tar.gz" | tar -xz -C "$tmp" pagefind; then
      install -m 755 "$tmp/pagefind" "$pagefind"; echo "installed Pagefind $pfver"
    else
      echo "warning: could not install Pagefind $pfver, building without search index" >&2; pagefind=""
    fi
    rm -rf "$tmp"
  fi
fi

out=$rel/$sha
rm -rf "$out"
"$hugo" --quiet --gc --minify --destination "$out"
if [ -n "$pagefind" ]; then
  "$pagefind" --site "$out" --quiet || echo "warning: Pagefind failed, the search page will show no results" >&2
fi
printf '%s\n' "$sha" > "$out/version.txt"

ln -sfn "$out" "$BASE/current.new"
mv -Tf "$BASE/current.new" "$BASE/current"
echo "live: $sha (Hugo $ver)"

# keep the newest KEEP releases (the live one is always the newest)
ls -1dt "$rel"/*/ | tail -n +$((KEEP + 1)) | xargs -r rm -rf
