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
| 8 | Finnhub (Analyst Data) | 1 | Free (60 calls/min) | Easy |
| 9 | Apple IAP (Direct StoreKit 2) | 4 | Free (Apple takes 30% commission) | Medium |
| 10 | yfinance (Stock Data) | 0 | Free | N/A (pip install) |
| 11 | Apple Sign In (Web OAuth) | 2 | Free | Medium |

**Total: 18 secrets to replace across 9 services.** All free tier.

---

## 8. Finnhub (Analyst Data Supplement) — FREE, 60 calls/min

**What you need:** API key for supplementing analyst consensus data on stocks where yfinance has gaps.

**Steps:**

1. Go to https://finnhub.io — Sign up (free, no credit card required)
2. **Dashboard** — Copy your **API Key**

**Note:** Finnhub is optional. The Python discovery script (`scripts/discover.py`) works without it — yfinance provides the primary data. Finnhub only supplements stocks where yfinance returned 0 analyst recommendations.

**Secrets to update (both envs):**

| Secret | Value |
|--------|-------|
| `FINNHUB_API_KEY` | Your Finnhub API key |

**Update command:**

```bash
SSH="/c/Windows/System32/OpenSSH/ssh.exe root@159.69.180.183"

# Dev
$SSH "docker stack rm bonistock-dev && sleep 5"
$SSH "docker secret rm bonistock_dev_FINNHUB_API_KEY"
echo -n 'your-finnhub-key' | $SSH "docker secret create bonistock_dev_FINNHUB_API_KEY -"
$SSH "cd /home/deploy/bonistock-dev && docker stack deploy -c docker-stack.dev.yml bonistock-dev"

# Prod
$SSH "docker stack rm bonistock-prod && sleep 5"
$SSH "docker secret rm bonistock_prod_FINNHUB_API_KEY"
echo -n 'your-finnhub-key' | $SSH "docker secret create bonistock_prod_FINNHUB_API_KEY -"
$SSH "cd /home/deploy/bonistock-prod && docker stack deploy -c docker-stack.prod.yml bonistock-prod"
```

---

## 9. Apple IAP (Direct StoreKit 2) — No third-party service

**What you need:** Direct Apple In-App Purchase integration using StoreKit 2 on the client and Apple's App Store Server API on the server. No RevenueCat dependency — fully self-managed.

**Prerequisites (Apple side):**

1. **Apple Developer Account** ($99/year) — https://developer.apple.com — You need this for any iOS app distribution anyway
2. **App Store Connect** — Create IAP products:
   - Subscription Group "Bonistock Plus":
     - `com.bonifatus.bonistock.plus.monthly` (auto-renewable)
     - `com.bonifatus.bonistock.plus.annual` (auto-renewable)
   - Non-consumable IAPs (day passes):
     - `com.bonifatus.bonistock.pass.1day`
     - `com.bonifatus.bonistock.pass.3day`
     - `com.bonifatus.bonistock.pass.12day`
   - Set prices via Apple's price tier system (should be higher than Stripe prices to offset Apple's 30% commission)
3. **In-App Purchase Key** — Go to App Store Connect > Users & Access > Integrations > In-App Purchase. Generate a key. Download the `.p8` file. Note the Key ID and Issuer ID.
4. **Apple App ID** — Go to App Store Connect > App Information > General Information. Note the **Apple ID** (numeric).
5. **Server Notifications V2** — Go to App Store Connect > App Information > App Store Server Notifications:
   - Production URL: `https://bonistock.com/api/apple/webhook`
   - Sandbox URL: `https://dev.bonistock.com/api/apple/webhook`
   - Version: **V2**

**Secrets to update (4 total):**

| Secret | Value |
|--------|-------|
| `APPLE_IAP_KEY_P8` | Contents of the `.p8` key file |
| `APPLE_IAP_KEY_ID` | Key ID shown in App Store Connect after generating |
| `APPLE_IAP_ISSUER_ID` | Issuer ID from App Store Connect (UUID format) |
| `APPLE_APP_ID` | Numeric Apple ID from App Store Connect |

**Update command (secrets):**

```bash
SSH="/c/Windows/System32/OpenSSH/ssh.exe root@159.69.180.183"

# Dev
$SSH "docker stack rm bonistock-dev && sleep 5"
cat SubscriptionKey_XXXXXX.p8 | $SSH "docker secret create bonistock_dev_APPLE_IAP_KEY_P8 -"
echo -n 'YOUR_KEY_ID' | $SSH "docker secret create bonistock_dev_APPLE_IAP_KEY_ID -"
echo -n 'f58049da9ac04d5b981edd4b689dcba3' | $SSH "docker secret create bonistock_dev_APPLE_IAP_ISSUER_ID -"
echo -n '123456789' | $SSH "docker secret create bonistock_dev_APPLE_APP_ID -"
$SSH "cd /home/deploy/bonistock-dev && docker stack deploy -c docker-stack.dev.yml bonistock-dev"

# Prod
$SSH "docker stack rm bonistock-prod && sleep 5"
cat SubscriptionKey_XXXXXX.p8 | $SSH "docker secret create bonistock_prod_APPLE_IAP_KEY_P8 -"
echo -n 'YOUR_KEY_ID' | $SSH "docker secret create bonistock_prod_APPLE_IAP_KEY_ID -"
echo -n 'f58049da9ac04d5b981edd4b689dcba3' | $SSH "docker secret create bonistock_prod_APPLE_IAP_ISSUER_ID -"
echo -n '123456789' | $SSH "docker secret create bonistock_prod_APPLE_APP_ID -"
$SSH "cd /home/deploy/bonistock-prod && docker stack deploy -c docker-stack.prod.yml bonistock-prod"
```

**iOS Payment Flow (how it works):**

1. User opens pricing page on iOS app (Capacitor wrapper)
2. App detects iOS → fetches product info directly from StoreKit 2 (Apple-localized prices)
3. User taps Subscribe/Buy → native Apple payment sheet appears
4. User authenticates with Face ID / Apple ID and pays
5. StoreKit 2 returns `transactionId` to the app
6. App POSTs `{ transactionId }` to `/api/apple/verify`
7. Server verifies transaction with Apple App Store Server API (JWT auth)
8. Server creates Subscription or PassPurchase in DB (with `paymentSource: APPLE`)
9. App calls `refreshUser()` → user gets Plus tier or pass activations

**Webhook (subscription lifecycle):**

Apple sends JWS-signed Server Notifications V2 to `/api/apple/webhook`. No shared secret needed — verification uses Apple root CA certificates bundled in `certs/`. Handles: DID_RENEW, DID_CHANGE_RENEWAL_STATUS, EXPIRED, DID_FAIL_TO_RENEW, REFUND.

**Key differences from Stripe flow:**
- No redirect to external checkout — native Apple payment sheet
- Prices are set in App Store Connect (Apple's price tier system), not in our DB
- Apple takes 30% commission (15% for small developers under $1M revenue)
- Subscription management (cancel/refund) happens through Apple Settings, not our app
- Transaction verification done directly with Apple — no third-party service

---

## 10. yfinance (Primary Stock Data) — FREE, no API key

**No setup required.** yfinance uses Yahoo Finance's public API. Just install the Python package:

```bash
pip3 install yfinance
```

This is the primary data source for the Python discovery script — provides stock screener, price targets, analyst recommendations, and company info globally (US, EU, Asia).

---

## Python Discovery Script — Server Setup

The Python discovery script (`scripts/discover.py`) runs on the **Hetzner host** (not inside Docker). It reads DB credentials and Finnhub API key from Docker Swarm secrets via the running containers. Data is fetched once and written to both prod and dev databases in a single run.

### Install Dependencies

```bash
ssh root@159.69.180.183
pip3 install -r /home/deploy/bonistock/scripts/requirements.txt
```

### Manual Test Run

```bash
# Dry run (no DB writes, just prints results):
python3 /home/deploy/bonistock/scripts/discover.py --dry-run

# Real run (fetches data → writes to prod → copies to dev):
python3 /home/deploy/bonistock/scripts/discover.py

# Prod only (skip dev copy):
python3 /home/deploy/bonistock/scripts/discover.py --prod-only
```

### Crontab Setup

```bash
crontab -e
```

Add this entry (single job handles both prod and dev):

```cron
# Bonistock stock discovery — daily 2 AM UTC (fetches once, writes prod + dev)
0 2 * * * python3 /home/deploy/bonistock/scripts/discover.py >> /var/log/bonistock-discover.log 2>&1
```

### Monitor

```bash
# Check last run output:
tail -100 /var/log/bonistock-discover.log

# Check if cron ran:
grep bonistock /var/log/syslog
```

---

## 11. Apple Sign In (Web OAuth) — FREE

**What you need:** Apple OAuth credentials so users can "Sign In with Apple" on the web (login and register pages). This is separate from Apple IAP — it's the web OAuth flow using NextAuth's Apple provider.

**Prerequisites:**

1. **Apple Developer Account** ($99/year) — https://developer.apple.com — same account used for IAP
2. **App ID with Sign In with Apple enabled**

**Steps:**

1. Go to https://developer.apple.com/account/resources/identifiers/list
2. **Enable Sign In with Apple on your App ID:**
   - The page shows your identifiers filtered by "App IDs" (dropdown at top-right)
   - Click your existing App ID (`com.bonifatus.bonistock`)
   - Scroll down to **Capabilities**, check **Sign In with Apple**
   - Click **Save**
3. **Create a Services ID** (this is the OAuth client for the web):
   - Go back to the Identifiers list
   - Change the **dropdown filter at the top-right** from "App IDs" to **"Services IDs"**
   - Click the **+** button to register a new Services ID
   - Description: `Bonistock Web`
   - Identifier: `com.bonifatus.bonistock.web` (this becomes your `APPLE_OAUTH_CLIENT_ID`)
   - Click **Continue**, then **Register**
4. **Configure Sign In with Apple on the Services ID:**
   - Click the Services ID you just created (`com.bonifatus.bonistock.web`)
   - Check **Sign In with Apple**, then click **Configure**
   - Primary App ID: select `com.bonifatus.bonistock`
   - Domains: `bonistock.com`, `dev.bonistock.com`
   - Return URLs:
     - `https://dev.bonistock.com/api/auth/callback/apple`
     - `https://bonistock.com/api/auth/callback/apple`
   - Click **Save**, then **Continue**, then **Save** again
4. **Keys** — Go to https://developer.apple.com/account/resources/authkeys
   - Click **+** to create a new key
   - Name: `Bonistock Sign In`
   - Enable **Sign In with Apple**, click **Configure** → select your Primary App ID
   - Click **Continue**, then **Register**
   - **Download the `.p8` key file** (you can only download it once!)
   - Note the **Key ID** (e.g. `ABC123DEFG`)
5. Note your **Team ID** — visible at https://developer.apple.com/account (top-right, 10-character alphanumeric)

**Generate the client secret:**

Apple doesn't give you a static client secret. You must generate a JWT signed with your `.p8` key. This JWT is valid for up to 6 months and must be regenerated before it expires.

```bash
# Install ruby-jwt (one-time)
gem install jwt

# Generate the secret (replace placeholders)
ruby -e '
require "jwt"
key = OpenSSL::PKey::EC.new(File.read("AuthKey_XXXXXXXXXX.p8"))
now = Time.now.to_i
payload = {
  iss: "YOUR_TEAM_ID",
  iat: now,
  exp: now + 86400 * 180,  # 6 months
  aud: "https://appleid.apple.com",
  sub: "com.bonifatus.bonistock.web"
}
puts JWT.encode(payload, key, "ES256", { kid: "YOUR_KEY_ID" })
'
```

The output string is your `APPLE_OAUTH_CLIENT_SECRET`. Set a calendar reminder to regenerate it before it expires (every 6 months).

**Secrets to update:**

| Secret | Value |
|--------|-------|
| `APPLE_OAUTH_CLIENT_ID` | Services ID (e.g. `com.bonifatus.bonistock.web`) |
| `APPLE_OAUTH_CLIENT_SECRET` | Generated JWT (see above) |

**Update command:**

```bash
SSH="/c/Windows/System32/OpenSSH/ssh.exe root@159.69.180.183"

# Dev
$SSH "docker stack rm bonistock-dev && sleep 5"
$SSH "docker secret rm bonistock_dev_APPLE_OAUTH_CLIENT_ID && docker secret rm bonistock_dev_APPLE_OAUTH_CLIENT_SECRET"
echo -n 'com.bonifatus.bonistock.web' | $SSH "docker secret create bonistock_dev_APPLE_OAUTH_CLIENT_ID -"
echo -n 'eyJhbGciOiJFUzI1NiIs...' | $SSH "docker secret create bonistock_dev_APPLE_OAUTH_CLIENT_SECRET -"
$SSH "cd /home/deploy/bonistock-dev && docker stack deploy -c docker-stack.dev.yml bonistock-dev"
```

**Important notes:**

- The client secret JWT expires after 6 months. You must regenerate it and update the Docker secret before expiry, or Apple Sign In will stop working.
- Apple may hide the user's real email (Private Email Relay). The app handles this — NextAuth links accounts by Apple's stable user ID, not email.
- This is web-only OAuth. The native iOS app uses Apple's native Sign In with Apple flow separately (handled by Capacitor).

---

## Production Secrets

Once dev is fully tested, repeat the same process for production secrets using the `bonistock_prod_` prefix. Key differences:

- **Stripe:** Switch from Test Mode to Live Mode, create new webhook endpoint for `https://bonistock.com/api/stripe/webhook`
- **Google OAuth:** Add `https://bonistock.com/api/auth/callback/google` to redirect URIs
- **Facebook OAuth:** Submit app for review to go live, add `https://bonistock.com/api/auth/callback/facebook`
- **Apple Sign In:** Same Services ID works for both environments (both return URLs were added). Regenerate the client secret JWT every 6 months.
- **Sentry:** Create a separate `bonistock-prod` project (or use the same DSN with environment tagging)
- **Encryption Key:** Generate a NEW key for production (`openssl rand -hex 32`) — never reuse the dev key
