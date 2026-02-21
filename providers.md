# Bonistock — Provider Setup Guide

Step-by-step instructions for replacing all placeholder Docker Swarm secrets with real values. Organized by service, in recommended order (easiest/free-tier first).

## How to Update Secrets (General Pattern)

Since Docker Swarm secrets are immutable, updating any secret requires:

```bash
SSH="/c/Windows/System32/OpenSSH/ssh.exe root@159.69.180.183"

# 1. Remove the stack (frees secret references)
$SSH "docker stack rm bonistock-dev && sleep 5"

# 2. Remove old secret, create new one
$SSH "docker secret rm bonistock_dev_SECRET_NAME"
echo -n 'real-value-here' | $SSH "docker secret create bonistock_dev_SECRET_NAME -"

# 3. Redeploy
$SSH "cd /home/deploy/bonistock-dev && docker stack deploy -c docker-stack.dev.yml bonistock-dev"
```

You can batch multiple secret replacements in step 2 before redeploying.

---

## 1. Brevo (Email) — FREE, 300 emails/day

**What you need:** SMTP credentials for transactional email (verification, password reset, purchase confirmations)

**Steps:**

1. Go to https://app.brevo.com — Sign up (free)
2. **Settings > Senders & IPs > Senders** — Add sender: `no-reply@bonistock.com`
3. **Settings > Senders & IPs > Domains** — Add `bonistock.com`, add the DNS records (DKIM, SPF, DMARC) in Cloudflare
4. **Settings > SMTP & API > SMTP** — Your SMTP credentials are shown:
   - **Login** = your Brevo account email (this is `BREVO_SMTP_USER`)
   - **SMTP Key** = click "Generate" (this is `BREVO_SMTP_KEY`)

**Secrets to update:**

| Secret | Value |
|--------|-------|
| `BREVO_SMTP_USER` | Your Brevo login email |
| `BREVO_SMTP_KEY` | The generated SMTP key (starts with `xkeysib-`) |
| `EMAIL_FROM` | `Bonistock <no-reply@bonistock.com>` (already correct) |

**Update command:**

```bash
SSH="/c/Windows/System32/OpenSSH/ssh.exe root@159.69.180.183"
$SSH "docker stack rm bonistock-dev && sleep 5"
$SSH "docker secret rm bonistock_dev_BREVO_SMTP_USER && docker secret rm bonistock_dev_BREVO_SMTP_KEY"
echo -n 'your-brevo-email@example.com' | $SSH "docker secret create bonistock_dev_BREVO_SMTP_USER -"
echo -n 'xkeysib-your-key-here' | $SSH "docker secret create bonistock_dev_BREVO_SMTP_KEY -"
$SSH "cd /home/deploy/bonistock-dev && docker stack deploy -c docker-stack.dev.yml bonistock-dev"
```

---

## 2. Sentry (Error Tracking) — FREE, 5K errors/month

**Steps:**

1. Go to https://sentry.io — Sign up (free)
2. **Create Project** — Platform: Next.js — Name: `bonistock-dev`
3. Copy the **DSN** from the setup page (looks like `https://abc123@o123456.ingest.sentry.io/789`)

**Secret to update:**

| Secret | Value |
|--------|-------|
| `SENTRY_DSN` | The DSN URL from Sentry |

**Update command:**

```bash
SSH="/c/Windows/System32/OpenSSH/ssh.exe root@159.69.180.183"
$SSH "docker stack rm bonistock-dev && sleep 5"
$SSH "docker secret rm bonistock_dev_SENTRY_DSN"
echo -n 'https://your-key@o123456.ingest.sentry.io/789' | $SSH "docker secret create bonistock_dev_SENTRY_DSN -"
$SSH "cd /home/deploy/bonistock-dev && docker stack deploy -c docker-stack.dev.yml bonistock-dev"
```

---

## 3. Financial Modeling Prep (Stock Data) — FREE, 250 req/day

**Steps:**

1. Go to https://site.financialmodelingprep.com — Sign up (free)
2. **Dashboard** — Copy your **API Key**

**Secret to update:**

| Secret | Value |
|--------|-------|
| `FMP_API_KEY` | Your FMP API key |

**Update command:**

```bash
SSH="/c/Windows/System32/OpenSSH/ssh.exe root@159.69.180.183"
$SSH "docker stack rm bonistock-dev && sleep 5"
$SSH "docker secret rm bonistock_dev_FMP_API_KEY"
echo -n 'your-fmp-api-key' | $SSH "docker secret create bonistock_dev_FMP_API_KEY -"
$SSH "cd /home/deploy/bonistock-dev && docker stack deploy -c docker-stack.dev.yml bonistock-dev"
```

---

## 4. Google OAuth — FREE

**Steps:**

1. Go to https://console.cloud.google.com
2. **Create Project** — Name: `Bonistock`
3. **APIs & Services > OAuth consent screen** — External — Fill in app name, support email, authorized domains: `bonistock.com`
4. **APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID**
   - Type: Web application
   - Authorized redirect URIs:
     - `https://dev.bonistock.com/api/auth/callback/google` (dev)
     - `https://bonistock.com/api/auth/callback/google` (prod, add later)
5. Copy **Client ID** and **Client Secret**

**Secrets to update:**

| Secret | Value |
|--------|-------|
| `GOOGLE_CLIENT_ID` | `xxxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxx` |

**Update command:**

```bash
SSH="/c/Windows/System32/OpenSSH/ssh.exe root@159.69.180.183"
$SSH "docker stack rm bonistock-dev && sleep 5"
$SSH "docker secret rm bonistock_dev_GOOGLE_CLIENT_ID && docker secret rm bonistock_dev_GOOGLE_CLIENT_SECRET"
echo -n 'xxxxx.apps.googleusercontent.com' | $SSH "docker secret create bonistock_dev_GOOGLE_CLIENT_ID -"
echo -n 'GOCSPX-xxxxx' | $SSH "docker secret create bonistock_dev_GOOGLE_CLIENT_SECRET -"
$SSH "cd /home/deploy/bonistock-dev && docker stack deploy -c docker-stack.dev.yml bonistock-dev"
```

---

## 5. Facebook OAuth — FREE

**Steps:**

1. Go to https://developers.facebook.com — Create App — Type: Consumer
2. **Add Product > Facebook Login > Web** — Site URL: `https://bonistock.com`
3. **Facebook Login > Settings** — Valid OAuth Redirect URIs:
   - `https://dev.bonistock.com/api/auth/callback/facebook`
   - `https://bonistock.com/api/auth/callback/facebook`
4. **Settings > Basic** — Copy **App ID** and **App Secret**

**Secrets to update:**

| Secret | Value |
|--------|-------|
| `FACEBOOK_CLIENT_ID` | App ID |
| `FACEBOOK_CLIENT_SECRET` | App Secret |

**Update command:**

```bash
SSH="/c/Windows/System32/OpenSSH/ssh.exe root@159.69.180.183"
$SSH "docker stack rm bonistock-dev && sleep 5"
$SSH "docker secret rm bonistock_dev_FACEBOOK_CLIENT_ID && docker secret rm bonistock_dev_FACEBOOK_CLIENT_SECRET"
echo -n 'your-facebook-app-id' | $SSH "docker secret create bonistock_dev_FACEBOOK_CLIENT_ID -"
echo -n 'your-facebook-app-secret' | $SSH "docker secret create bonistock_dev_FACEBOOK_CLIENT_SECRET -"
$SSH "cd /home/deploy/bonistock-dev && docker stack deploy -c docker-stack.dev.yml bonistock-dev"
```

---

## 6. Stripe (Payments) — FREE to set up, 2.9% + 30c per transaction

**Steps:**

1. Go to https://dashboard.stripe.com — Sign up
2. Start in **Test Mode** (toggle at top-right) for dev environment
3. **Developers > API Keys** — Copy:
   - **Publishable key** (`pk_test_...`)
   - **Secret key** (`sk_test_...`)
4. **Products are created via the admin dashboard** — no manual Stripe Dashboard setup needed. The admin dashboard auto-creates Stripe products and prices via the API.
5. **Developers > Webhooks > Add Endpoint**:
   - URL: `https://dev.bonistock.com/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `payment_intent.succeeded`
   - Copy the **Webhook Signing Secret** (`whsec_...`)

**Secrets to update:**

| Secret | Value |
|--------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |

**Update command:**

```bash
SSH="/c/Windows/System32/OpenSSH/ssh.exe root@159.69.180.183"
$SSH "docker stack rm bonistock-dev && sleep 5"

# API keys
$SSH "docker secret rm bonistock_dev_STRIPE_SECRET_KEY && docker secret rm bonistock_dev_STRIPE_PUBLISHABLE_KEY && docker secret rm bonistock_dev_STRIPE_WEBHOOK_SECRET"
echo -n 'sk_test_...' | $SSH "docker secret create bonistock_dev_STRIPE_SECRET_KEY -"
echo -n 'pk_test_...' | $SSH "docker secret create bonistock_dev_STRIPE_PUBLISHABLE_KEY -"
echo -n 'whsec_...' | $SSH "docker secret create bonistock_dev_STRIPE_WEBHOOK_SECRET -"

$SSH "cd /home/deploy/bonistock-dev && docker stack deploy -c docker-stack.dev.yml bonistock-dev"
```

### Webhook Setup (required for payments to work)

Without webhooks, Stripe cannot notify the app when payments succeed, subscriptions renew, or customers cancel. **Payments will appear to work (checkout redirects) but the database will never update.**

**Events required (6 total):**

| Event | What it does in the app |
|-------|------------------------|
| `checkout.session.completed` | Activates a new subscription after checkout (sets tier to PLUS, stores Stripe subscription ID) and sends confirmation email |
| `invoice.paid` | Renews an existing subscription (updates period dates, confirms ACTIVE status) |
| `invoice.payment_failed` | Marks subscription as PAST_DUE and sends payment-failed email to the user |
| `customer.subscription.updated` | Syncs status changes (active, trialing, past_due, canceled) and cancel-at-period-end flag |
| `customer.subscription.deleted` | Downgrades user to FREE tier and sends cancellation email |
| `payment_intent.succeeded` | Records a day-pass purchase (creates PassPurchase row with activations) and sends confirmation email |

**Step-by-step setup (Dev):**

1. Go to https://dashboard.stripe.com — make sure **Test Mode** is toggled on (top-right)
2. **Developers > Webhooks** (left sidebar)
3. Click **Add endpoint**
4. **Endpoint URL:** `https://dev.bonistock.com/api/stripe/webhook`
5. Click **Select events** and check exactly these 6:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
6. Click **Add endpoint**
7. On the endpoint detail page, click **Reveal** under **Signing secret** — copy the `whsec_...` value
8. Store this as the `STRIPE_WEBHOOK_SECRET` Docker secret (see update command above)

**Step-by-step setup (Prod):**

1. Switch to **Live Mode** in the Stripe Dashboard (top-right toggle)
2. Repeat steps 2-7 above but with endpoint URL: `https://bonistock.com/api/stripe/webhook`
3. Store the new `whsec_...` as `bonistock_prod_STRIPE_WEBHOOK_SECRET`

> **Important:** Dev and prod use separate webhook endpoints with separate signing secrets. The dev endpoint uses test-mode keys, the prod endpoint uses live-mode keys. Never mix them.

**Testing webhooks locally (optional):**

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the whsec_... it prints and set as STRIPE_WEBHOOK_SECRET in your .env
```

**Verify webhook is working:**

After setting up the webhook, go to **Developers > Webhooks > your endpoint** in the Stripe Dashboard. The "Recent deliveries" tab shows all events sent to your endpoint with response codes. A `200` response means the app processed it successfully.

---

## 7. Encryption Key — Already done

The `ENCRYPTION_KEY` was auto-generated with `openssl rand -hex 32` when we created the placeholder secrets. This one is already a real 32-byte hex value. No action needed.

---

## Checklist

| # | Service | Secrets | Cost | Difficulty |
|---|---------|---------|------|------------|
| 1 | Brevo (Email) | 2 | Free (300 emails/day) | Easy |
| 2 | Sentry (Errors) | 1 | Free (5K errors/month) | Easy |
| 3 | FMP (Stock Data) | 1 | Free (250 req/day) | Easy |
| 4 | Google OAuth | 2 | Free | Medium |
| 5 | Facebook OAuth | 2 | Free | Medium |
| 6 | Stripe (Payments) | 3 | Free setup (2.9%+30c/tx) | Medium |
| 7 | Encryption Key | 0 | N/A | Already done |

**Total: 11 secrets to replace across 6 services.** All free tier.

---

## Production Secrets

Once dev is fully tested, repeat the same process for production secrets using the `bonistock_prod_` prefix. Key differences:

- **Stripe:** Switch from Test Mode to Live Mode, create new webhook endpoint for `https://bonistock.com/api/stripe/webhook`
- **Google OAuth:** Add `https://bonistock.com/api/auth/callback/google` to redirect URIs
- **Facebook OAuth:** Submit app for review to go live, add `https://bonistock.com/api/auth/callback/facebook`
- **Sentry:** Create a separate `bonistock-prod` project (or use the same DSN with environment tagging)
- **Encryption Key:** Generate a NEW key for production (`openssl rand -hex 32`) — never reuse the dev key
