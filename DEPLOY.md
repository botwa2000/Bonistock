# Bonistock — Deployment Guide

Bonistock is deployed to a **Hetzner VPS** using **Docker Swarm**. Two environments (dev, prod) run on the same server, fully isolated from the other app (Bonifatus Calculator) also hosted there.

## Live URLs

| Env  | Domain              | Port | Stack           | Image           | Repo dir                     |
|------|---------------------|------|-----------------|-----------------|------------------------------|
| Dev  | dev.bonistock.com   | 3003 | bonistock-dev   | bonistock:dev   | /home/deploy/bonistock-dev   |
| Prod | bonistock.com       | 3002 | bonistock-prod  | bonistock:prod  | /home/deploy/bonistock       |

**GitHub Repo:** https://github.com/botwa2000/Bonistock

## Server Architecture

```
                    ┌─────────────────────────────────────────────────┐
                    │           Hetzner VPS  159.69.180.183           │
                    │                                                 │
Internet ──► Nginx (TLS) ──┬──► :3000  bonifatus-prod  (bonifatus.com)
                    │      ├──► :3001  bonifatus-dev   (dev.bonifatus.com)
                    │      ├──► :3002  bonistock-prod  (bonistock.com)
                    │      └──► :3003  bonistock-dev   (dev.bonistock.com)
                    │                                                 │
                    │  PostgreSQL 14 ─┬─ bonifatus_prod               │
                    │                 ├─ bonifatus_dev                │
                    │                 ├─ bonistock_prod               │
                    │                 └─ bonistock_dev                │
                    └─────────────────────────────────────────────────┘
```

## SSH

All commands use the Windows OpenSSH client from Git Bash:

```bash
SSH="/c/Windows/System32/OpenSSH/ssh.exe root@159.69.180.183"
```

Test connection:

```bash
$SSH "echo connected"
```

## Branch Strategy

| Branch   | Purpose                                  |
|----------|------------------------------------------|
| `dev`    | Development. Deploy to dev.bonistock.com |
| `main`   | Production. Deploy to bonistock.com      |

All work happens on `dev`. When tested and ready, merge to `main` and deploy to prod.

---

## Deploy to Dev (one command)

Commit your changes first, then run this single block:

```bash
SSH="/c/Windows/System32/OpenSSH/ssh.exe root@159.69.180.183" && npm run build && git push origin dev && $SSH "cd /home/deploy/bonistock-dev && git fetch origin && git checkout dev && git pull origin dev && docker build --build-arg NEXT_PUBLIC_APP_URL=https://dev.bonistock.com -t bonistock:dev . && docker stack deploy -c docker-stack.dev.yml bonistock-dev && docker service update --force --image bonistock:dev bonistock-dev_app && sleep 20 && curl -sf http://localhost:3003/api/health"
```

**What it does:**
1. Builds locally (catches errors before pushing)
2. Pushes `dev` branch to GitHub
3. SSHs to server: pulls code, builds Docker image, deploys stack, forces service update
4. Waits 20s for convergence, then health-checks

## Test on Dev

After deploying to dev:

1. Open https://dev.bonistock.com
2. Verify all pages load correctly
3. Test key user flows (login, pricing, stock list, auto-mix)
4. Check browser console for errors
5. Confirm no regressions

---

## Deploy to Prod (one command)

Only after testing on dev:

```bash
SSH="/c/Windows/System32/OpenSSH/ssh.exe root@159.69.180.183" && git checkout main && git merge dev && git push origin main && $SSH "cd /home/deploy/bonistock && git fetch origin && git checkout main && git pull origin main && docker build --build-arg NEXT_PUBLIC_APP_URL=https://bonistock.com -t bonistock:prod . && docker stack deploy -c docker-stack.prod.yml bonistock-prod && docker service update --force --image bonistock:prod bonistock-prod_app && sleep 20 && curl -sf http://localhost:3002/api/health" && git checkout dev
```

**What it does:**
1. Merges `dev` → `main` locally, pushes to GitHub
2. SSHs to server: pulls code, builds Docker image, deploys stack, forces service update
3. Waits 20s for convergence, then health-checks
4. Switches back to `dev` branch locally

---

## Database (Prisma 7)

Prisma 7 manages all database operations. The connection URL is configured in two places:
- **CLI operations** (migrate, db push, seed): reads from `prisma.config.ts` via `DATABASE_URL` env var
- **Runtime** (PrismaClient in the app): uses `@prisma/adapter-pg` with `DATABASE_URL` from Docker secrets

### Connection details

| Env  | Host (from host)  | Host (from Docker) | Database       | User      |
|------|-------------------|--------------------|----------------|-----------|
| Dev  | localhost         | 172.18.0.1         | bonistock_dev  | bonifatus |
| Prod | localhost         | 172.18.0.1         | bonistock_prod | bonifatus |

Docker containers cannot reach PostgreSQL via `localhost`. They use the Docker bridge IP `172.18.0.1`.

### One-time setup (per server directory)

Prisma CLI runs directly on the server (not in Docker). Install deps once per project directory:

```bash
$SSH "cd /home/deploy/bonistock && npm install prisma @prisma/client @prisma/adapter-pg pg"
$SSH "cd /home/deploy/bonistock-dev && npm install prisma @prisma/client @prisma/adapter-pg pg"
```

Re-run after major Prisma version upgrades.

### Schema changes (db push)

After modifying `prisma/schema.prisma`, push changes to the database:

```bash
# Dev
$SSH "cd /home/deploy/bonistock-dev && DATABASE_URL='postgresql://bonifatus:Bon1fatusPr0d2026@localhost:5432/bonistock_dev' npx prisma db push"

# Prod
$SSH "cd /home/deploy/bonistock && DATABASE_URL='postgresql://bonifatus:Bon1fatusPr0d2026@localhost:5432/bonistock_prod' npx prisma db push"
```

This runs on the **server** (not from Docker) so it uses `localhost` to reach PostgreSQL.

### Seed data

Seed stocks, ETFs, brokers, and demo portfolios:

```bash
# Dev
$SSH "cd /home/deploy/bonistock-dev && DATABASE_URL='postgresql://bonifatus:Bon1fatusPr0d2026@localhost:5432/bonistock_dev' npx tsx prisma/seed.ts"

# Prod
$SSH "cd /home/deploy/bonistock && DATABASE_URL='postgresql://bonifatus:Bon1fatusPr0d2026@localhost:5432/bonistock_prod' npx tsx prisma/seed.ts"
```

### Run psql

```bash
# Direct psql connection
$SSH "PGPASSWORD=Bon1fatusPr0d2026 psql -h localhost -U bonifatus -d bonistock_dev"
$SSH "PGPASSWORD=Bon1fatusPr0d2026 psql -h localhost -U bonifatus -d bonistock_prod"

# Read DATABASE_URL from running container
$SSH 'docker exec $(docker ps -q --filter name=bonistock-dev_app) cat /run/secrets/bonistock_dev_DATABASE_URL'
$SSH 'docker exec $(docker ps -q --filter name=bonistock-prod_app) cat /run/secrets/bonistock_prod_DATABASE_URL'
```

### Full database workflow

When you change the Prisma schema:

1. Edit `prisma/schema.prisma`
2. Run `npx prisma generate` locally (regenerates client types)
3. Fix any TypeScript errors from schema changes
4. `npm run build` (verify build passes)
5. Commit, push, deploy (see deploy commands above)
6. After deploy, run `db push` on the server (see above)
7. Optionally run seed if new seed data was added

---

## Secrets Management

Secrets are stored as **Docker Swarm external secrets**, prefixed by app and environment (`bonistock_prod_` or `bonistock_dev_`). The `docker-entrypoint.sh` reads them from `/run/secrets/`, strips the prefix, and exports as env vars.

**No secrets are stored in files, environment variables, or code on the server. Ever.**

Local reference: see `.secrets` file (git-ignored).

### Naming convention

All four apps on this server use distinct prefixes:

| App + Env          | Secret prefix       | Example                       |
|--------------------|---------------------|-------------------------------|
| Bonifatus Prod     | `prod_`             | `prod_DATABASE_URL`           |
| Bonifatus Dev      | `dev_`              | `dev_DATABASE_URL`            |
| Bonistock Prod     | `bonistock_prod_`   | `bonistock_prod_DATABASE_URL` |
| Bonistock Dev      | `bonistock_dev_`    | `bonistock_dev_DATABASE_URL`  |

### Current secrets (20 per environment)

| Secret                                | Description                     |
|---------------------------------------|---------------------------------|
| `bonistock_{env}_DATABASE_URL`        | PostgreSQL connection string    |
| `bonistock_{env}_NEXTAUTH_SECRET`     | Auth JWT signing secret         |
| `bonistock_{env}_BREVO_SMTP_USER`     | Brevo SMTP username             |
| `bonistock_{env}_BREVO_SMTP_KEY`      | Brevo SMTP password             |
| `bonistock_{env}_EMAIL_FROM`          | Sender address for emails       |
| `bonistock_{env}_GOOGLE_CLIENT_ID`    | Google OAuth client ID          |
| `bonistock_{env}_GOOGLE_CLIENT_SECRET`| Google OAuth client secret      |
| `bonistock_{env}_FACEBOOK_CLIENT_ID`  | Facebook OAuth client ID        |
| `bonistock_{env}_FACEBOOK_CLIENT_SECRET`| Facebook OAuth client secret  |
| `bonistock_{env}_FMP_API_KEY`         | Financial Modeling Prep API key |
| `bonistock_{env}_SENTRY_DSN`          | Sentry error tracking DSN       |
| `bonistock_{env}_ENCRYPTION_KEY`      | AES-256 key (32-byte hex)       |
| `bonistock_{env}_STRIPE_SECRET_KEY`   | Stripe API secret key           |
| `bonistock_{env}_STRIPE_PUBLISHABLE_KEY`| Stripe publishable key        |
| `bonistock_{env}_STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `bonistock_{env}_STRIPE_PRICE_PLUS_MONTHLY` | Stripe price ID           |
| `bonistock_{env}_STRIPE_PRICE_PLUS_ANNUAL`  | Stripe price ID           |
| `bonistock_{env}_STRIPE_PRICE_PASS_1DAY`    | Stripe price ID           |
| `bonistock_{env}_STRIPE_PRICE_PASS_3DAY`    | Stripe price ID           |
| `bonistock_{env}_STRIPE_PRICE_PASS_12DAY`   | Stripe price ID           |

### Add / update a secret

```bash
# Create new
echo -n "value" | $SSH "docker secret create bonistock_prod_SECRET_NAME -"

# Update (must remove stack first, then remove + recreate secret, then redeploy)
$SSH "docker stack rm bonistock-prod"
sleep 5
$SSH "docker secret rm bonistock_prod_SECRET_NAME"
echo -n "new_value" | $SSH "docker secret create bonistock_prod_SECRET_NAME -"
# Then redeploy (see deploy commands)

# List all
$SSH "docker secret ls | grep bonistock"
```

### Read a secret from a running container

```bash
$SSH 'docker exec $(docker ps -q --filter name=bonistock-prod_app) cat /run/secrets/bonistock_prod_DATABASE_URL'
$SSH 'docker exec $(docker ps -q --filter name=bonistock-dev_app) cat /run/secrets/bonistock_dev_DATABASE_URL'
```

## Build-Time Variables

Baked into the Next.js client bundle at build time. Not secrets — passed as `--build-arg` during `docker build`.

| Variable               | Dev                          | Prod                     |
|------------------------|------------------------------|--------------------------|
| `NEXT_PUBLIC_APP_URL`  | `https://dev.bonistock.com`  | `https://bonistock.com`  |

## Logs

```bash
# Dev (live tail)
$SSH "docker service logs bonistock-dev_app --tail 100 -f"

# Prod (live tail)
$SSH "docker service logs bonistock-prod_app --tail 100 -f"

# Last 50 lines (no follow)
$SSH "docker service logs bonistock-prod_app --tail 50"
```

## Service Status

```bash
# All stacks
$SSH "docker stack ls"

# Bonistock services
$SSH "docker stack services bonistock-prod && docker stack services bonistock-dev"

# All running containers
$SSH "docker ps --format 'table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}'"
```

## Rollback

```bash
# Instant rollback (uses previous Docker image)
$SSH "docker service rollback bonistock-prod_app"

# Full code rollback to a specific commit
$SSH "cd /home/deploy/bonistock && git log --oneline -10"
$SSH "cd /home/deploy/bonistock && git reset --hard <commit> && docker build --build-arg NEXT_PUBLIC_APP_URL=https://bonistock.com -t bonistock:prod . && docker service update --force --image bonistock:prod bonistock-prod_app"
```

## Nginx Configuration

Config file: `/etc/nginx/sites-available/bonistock.com`

- `bonistock.com` → `localhost:3002` (prod)
- `dev.bonistock.com` → `localhost:3003` (dev)
- `www.bonistock.com` → redirects to `bonistock.com`
- SSL: Cloudflare (frontend) + self-signed origin cert (backend), Cloudflare SSL mode = **Full**

## Troubleshooting

| Problem | Fix |
|---------|-----|
| 502 Bad Gateway | App not running. Check `docker stack services bonistock-prod` |
| Health check fails | Check logs: `docker service logs bonistock-prod_app --tail 50` |
| Build fails on server | Run `npm run build` locally first |
| Secret not found | Check `docker secret ls \| grep bonistock` and stack file references |
| DB schema out of sync | Run `db push` on server (see Database section) |
| Prisma generate error | Run `npx prisma generate` locally after any schema change |
| Redirect to bonifatus.com | Nginx misconfigured. Check `/etc/nginx/sites-available/bonistock.com` has 443 blocks |
| DNS not resolving | Check Cloudflare dashboard — A record must point to `159.69.180.183` |
| Disk full | Run `$SSH "docker builder prune -a -f && docker image prune -a -f"` |
