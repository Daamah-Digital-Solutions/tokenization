# Capimax Deployment — capimaxrt.tech

Serves **capimaxrt.tech** (and `www.capimaxrt.tech`) on the Hostinger VPS at `72.62.38.231`.

Runs side-by-side with the existing `capimaxrt.com` deploy. The two share
the edge nginx (port 80/443) but have completely isolated Postgres, Redis,
application code, and data.

Internal naming uses the `staging` prefix (`capimax_staging_*` containers,
`/docker/staging/` on the VPS, `deploy/staging/` in the repo) because this
is the second, freshly-built deployment running latest `main`. The
user-facing URL is `capimaxrt.tech`.

---

## Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | The stack: db, redis, frontend builder, frontend nginx, web (Daphne) |
| `frontend-nginx.conf` | Internal nginx config inside the `capimax_staging_frontend` container |
| `edge-staging.conf` | Server block mounted into the existing edge nginx for capimaxrt.tech |
| `env.example` | Template — copy to `.env` on the VPS and fill in secrets |

---

## Architecture

```
Internet
   │
   ▼
:443/:80 capimax_nginx (existing edge)
   │
   ├── server_name capimaxrt.com         ──► capimax_web (existing)
   │
   └── server_name capimaxrt.tech
            ├── /api/, /admin/, /ws/, /static/, /media/  ──► staging_web:8000
            └── everything else                          ──► staging_frontend:80
```

The edge nginx reaches the new containers via the shared `capimax_net`
network using DNS aliases `staging_web` and `staging_frontend`.

---

## First-time deployment

### 1. SSH to the VPS

```bash
ssh -i ~/.ssh/capimax_staging_ed25519 root@72.62.38.231
```

### 2. Pull the latest config

```bash
mkdir -p /docker/staging
cd /docker/staging
curl -fsSL https://github.com/Daamah-Digital-Solutions/tokenization/archive/main.tar.gz \
  | tar -xz --strip-components=2 tokenization-main/deploy/staging
```

### 3. Create `.env`

```bash
cp env.example .env
nano .env   # fill in all __REPLACE_WITH_...__ values
```

Required secrets:
- `SECRET_KEY` — generate with `python3 -c 'import secrets; print(secrets.token_urlsafe(50))'`
- `POSTGRES_PASSWORD` — strong password; also update the password inside `DATABASE_URL` to match
- `EMAIL_HOST_PASSWORD` — Hostinger SMTP password for `noreply@capimaxrt.tech`
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`
- `DEPLOYER_PRIVATE_KEY`, `BLOCKCHAIN_PRIVATE_KEY`

### 4. Set DNS

In Hostinger's DNS panel for **capimaxrt.tech**, add two A records:

```
Type: A    Name: @      Value: 72.62.38.231    TTL: 300
Type: A    Name: www    Value: 72.62.38.231    TTL: 300
```

Wait ~5 min for propagation. Verify with:
```bash
dig +short capimaxrt.tech       # should print 72.62.38.231
dig +short www.capimaxrt.tech   # should print 72.62.38.231
```

### 5. Bring up the application stack

```bash
cd /docker/staging
docker compose up -d db redis
docker compose up frontend_builder    # one-shot; watches build to completion
docker compose up -d frontend web
docker compose logs -f web            # watch migrations + collectstatic + daphne start
```

The first run takes ~3-5 min (downloads code, installs Python deps, runs
migrations, builds the React bundle).

### 6. Wire the edge nginx

Mount `edge-staging.conf` into the existing nginx container. From
`/docker/capimax`, add a bind-mount entry under the `nginx` service's
`volumes:` list in `docker-compose.yml`:

```yaml
    volumes:
      - /docker/staging/edge-staging.conf:/etc/nginx/conf.d/capimaxrt-tech.conf:ro
      # …existing volumes…
```

Then **validate before reloading**:
```bash
cd /docker/capimax
docker compose up -d --no-deps nginx     # recreates nginx with new mount
docker exec capimax_nginx nginx -t       # MUST print "syntax is ok"
```

If `nginx -t` fails because the cert hasn't been issued yet, that's expected
— see step 7. The HTTP server block still works because nginx ignores the
443 block on cert error in most builds. If it doesn't, temporarily comment
out the HTTPS blocks until the cert exists.

### 7. Issue the Let's Encrypt cert

```bash
docker run --rm \
  -v capimax_certbot_conf:/etc/letsencrypt \
  -v capimax_certbot_www:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d capimaxrt.tech -d www.capimaxrt.tech \
  --email admin@capimaxrt.tech --agree-tos --non-interactive
```

Reload nginx so the new cert is picked up:
```bash
docker exec capimax_nginx nginx -s reload
```

Visit `https://capimaxrt.tech/` — you should see the SPA.

---

## Updating after code changes on `main`

```bash
cd /docker/staging
docker compose stop web frontend frontend_builder
docker volume rm capimax_staging_app_src capimax_staging_frontend_dist
docker compose up -d db redis
docker compose up frontend_builder
docker compose up -d frontend web
```

Setting `GIT_REF=<commit-sha>` in `.env` pins to a specific commit instead
of `main`.

---

## Useful commands

```bash
# Tail backend logs
docker compose -f /docker/staging/docker-compose.yml logs -f web

# Tail frontend builder (to debug Vite errors)
docker logs capimax_staging_frontend_builder

# Open Django shell
docker exec -it capimax_staging_web python /app/capimax_backend/manage.py shell

# Postgres shell
docker exec -it capimax_staging_db psql -U capimax_staging_user capimax_staging

# Full teardown (KEEPS volumes, so data survives)
docker compose -f /docker/staging/docker-compose.yml down

# Nuclear: also wipes volumes (loses DB data)
docker compose -f /docker/staging/docker-compose.yml down -v
```

---

## Rollback

If the new server block breaks the edge nginx (e.g., syntax error):

```bash
cd /docker/capimax
# 1) remove the bind-mount line you added to docker-compose.yml
# 2) recreate nginx without it
docker compose up -d --no-deps nginx
```

That restores the previous-known-good edge config. The new containers
keep running; they're just not reachable until the edge is fixed.

---

## Why two deployments?

- The capimaxrt.com deploy has 5 weeks of operational data and behavior
  to compare against — useful as a regression baseline.
- The capimaxrt.tech deploy runs latest `main` with fresh DB, fresh
  contracts state, and the post-P1.5 codebase — what testers should hit.
- When `.tech` is proven solid, we either retire `.com` or update it
  to the same `GIT_REF`.
