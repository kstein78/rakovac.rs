# Hosting rakovac.rs on Hetzner

How it works: we push to `main` on GitHub → within a minute the server notices, builds the
site with Hugo and switches to the new version → GitHub Actions (job `live` in
`.github/workflows/deploy.yml`) checks https://rakovac.rs/version.txt and turns red if the new
version is not live within 10 minutes. The repo is public, so the server needs no keys, tokens or
passwords, and there are no secrets in GitHub.

| File | What it is |
|---|---|
| `cloud-init.yaml` | Pasted once into Hetzner when creating the server. Installs Caddy, firewall, auto-updates, the update timer. |
| `build.sh` | Builds one commit (same Hugo version as GitHub Actions), switches `/srv/rakovac/current`, keeps the last 3 builds. |
| `Caddyfile` | Web server config: HTTPS, www → rakovac.rs, language redirect on `/`, caching, 404 pages. Changes here reach the server automatically. |

## One-time setup (about 15 minutes of clicks)

1. **Hetzner Console → project → Add server**
   - Location: Nuremberg or Falkenstein (Germany)
   - Image: Ubuntu 24.04
   - Type: Cost-Optimized, x86, **CX23** (2 vCPU, 4 GB RAM, 40 GB)
   - Networking: public IPv4 and IPv6
   - SSH key: add yours if you have one (not needed for deploys)
   - Backups: on
   - Cloud config: paste the whole `deploy/cloud-init.yaml`
   - Name: `rakovac-web` → Create & buy
2. After 3–5 minutes open `http://<server IPv4>/` : the site must be there (plain HTTP, marked noindex).
3. **Hetzner Console → DNS → Add zone** `rakovac.rs`, records:
   - `A` `@` → server IPv4, `AAAA` `@` → server IPv6
   - `A` `www` → server IPv4, `AAAA` `www` → server IPv6
4. **Webglobe → Moji domeni → rakovac.rs → Nameservers → "Koristi DNS servere (upisane ispod)"**:
   the NS values of the zone (for Hetzner Console DNS: `hydrogen.ns.hetzner.com`, `oxygen.ns.hetzner.com`, `helium.ns.hetzner.de`; servers 4–5 empty) → Izmeni Name servere.
5. Wait for DNS (usually 1–2 hours, up to 24). Caddy gets the HTTPS certificate by itself.

## On the server (only if something is wrong)

```
journalctl -u rakovac-update -n 50      # last deploys and build errors
cat /srv/rakovac/deployed /srv/rakovac/failed
systemctl start rakovac-update          # check GitHub right now
journalctl -u caddy -n 50               # web server / certificates
```

A failed build keeps the previous version live and is not retried until a new commit arrives.
To roll back, revert the commit on GitHub.
