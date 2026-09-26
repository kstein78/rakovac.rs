# Server setup (Hetzner) — one-time

The site is plain static files. Any small Linux server with nginx is enough.
Steps below assume a fresh **Ubuntu 24.04** Hetzner Cloud server. Check current
plans and prices on hetzner.com before ordering.

## 1. DNS (at the registrar of rakovac.rs)

| Type | Name | Value |
|---|---|---|
| A    | @   | server IPv4 |
| AAAA | @   | server IPv6 |
| A    | www | server IPv4 |
| AAAA | www | server IPv6 |

## 2. Server packages

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install nginx certbot python3-certbot-nginx rsync ufw
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

## 3. Deploy user and web root

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo mkdir -p /var/www/rakovac.rs && sudo chown deploy:deploy /var/www/rakovac.rs
```

On your own computer create a key used **only** for deployment:

```bash
ssh-keygen -t ed25519 -f rakovac_deploy -C "github-actions rakovac.rs" -N ""
```

Put the **public** key (`rakovac_deploy.pub`) into `/home/deploy/.ssh/authorized_keys` on the server
(permissions: `.ssh` 700, `authorized_keys` 600, owner `deploy`).

## 4. nginx + HTTPS

```bash
sudo cp rakovac.rs.conf /etc/nginx/sites-available/rakovac.rs      # from deploy/nginx/
sudo ln -s /etc/nginx/sites-available/rakovac.rs /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d rakovac.rs -d www.rakovac.rs
```

## 5. GitHub secrets (repo → Settings → Secrets and variables → Actions)

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | server IP |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_PATH` | `/var/www/rakovac.rs` |
| `DEPLOY_KEY` | contents of the **private** key file `rakovac_deploy` |
| `DEPLOY_KNOWN_HOSTS` | output of `ssh-keyscan -t ed25519 <server IP>` |

After that, every push to `main` builds the site and uploads it.
Without `DEPLOY_HOST` the workflow still builds and checks the site, it just doesn't upload.
