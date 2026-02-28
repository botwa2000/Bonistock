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

## 3. Financial Modeling Prep (FMP) — FREE, 250 req/day

**What you need:** API key for ISIN lookup. The discovery scripts use FMP's `/v3/profile/{symbol}` endpoint to fetch ISINs for stocks and ETFs where yfinance doesn't provide one.

**Why FMP for ISINs:** yfinance's built-in `ticker.isin` property is experimental and unreliable — it scrapes Business Insider and only returns valid ISINs for ~30-40% of tickers. FMP's profile endpoint returns ISINs directly from their database with much higher coverage.

**Steps:**

1. Go to https://site.financialmodelingprep.com — Sign up (free, no credit card)
2. **Dashboard** — Copy your **API Key**
3. The free tier allows 250 requests/day — more than enough for our ~200 stocks + 100 ETFs (batch queries of 50 per request = ~6 API calls total)

**How it's used in the scripts:**
- `scripts/discover.py` — Phase 3b: after yfinance data fetch, calls FMP for stocks missing ISIN
- `scripts/etf-discover.py` — Phase 1b: same for ETFs
- Uses batch profile endpoint: `GET /v3/profile/AAPL,MSFT,TSLA?apikey=KEY` (up to 50 symbols per call)
- Only calls FMP for items where yfinance returned no ISIN, so API usage is minimal

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
| 3 | FMP (ISIN Lookup) | 1 | Free (250 req/day) | Easy |
| 4 | Google OAuth | 2 | Free | Medium |
| 5 | Facebook OAuth | 2 | Free | Medium |
| 6 | Stripe (Payments) | 3 | Free setup (2.9%+30c/tx) | Medium |
| 7 | Encryption Key | 0 | N/A | Already done |
| 8 | Finnhub (Analyst Data) | 1 | Free (60 calls/min) | Easy |
| 9 | Apple IAP (Direct StoreKit 2) | 4 | Free (Apple takes 30% commission) | Medium |
| 10 | yfinance (Stock Data) | 0 | Free | N/A (pip install) |
| 11 | Apple Sign In (Web OAuth) | 2 | Free | Medium |
| 12 | PostHog (Product Analytics) | 0 (build args) | Free (1M events/month) | Easy |
| 13 | Google Analytics, Tag & Ads | 0 (build args) | Free (GA4) + Ads budget | Easy (code done) |

**Total: 18 secrets to replace across 9 services + 4 build-time variables.** All free tier (except Google Ads spend).

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

This is the primary data source for the Python discovery scripts — provides stock screener, price targets, analyst recommendations, and company info globally (US, EU, Asia).

**Sub-unit currency handling:** Some exchanges report prices in sub-units (pence instead of pounds, agorot instead of shekels). The discover scripts normalize these automatically:

| yfinance currency | Actual currency | Divisor | Example |
|------------------|-----------------|---------|---------|
| `GBp` / `GBX` | GBP (British Pounds) | 100 | 15542 GBp → £155.42 |
| `ILA` | ILS (Israeli Shekel) | 100 | 10610 ILA → ₪106.10 |
| `ZAc` | ZAR (South African Rand) | 100 | 88528 ZAc → R885.28 |

All other currencies (USD, EUR, CHF, JPY, HKD, etc.) pass through unchanged. Tested with 20+ exchanges worldwide — no other sub-unit currencies exist in yfinance.

**ISIN limitations:** yfinance's `ticker.isin` property is experimental — it scrapes Business Insider and returns valid ISINs for only ~30-40% of tickers. FMP is used as a supplement (see section 3). WKN (German security ID) is not available from yfinance at all.

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

## 12. PostHog (Product Analytics) — FREE, 1M events/month

**What you need:** Project API key for event tracking, session replays, and feature flags. PostHog only loads when the user accepts analytics cookies (GDPR-compliant).

**Steps:**

1. Go to https://posthog.com — Sign up (free, 1M events/month)
2. Create a new project named **Bonistock** (or **Bonistock Dev** for dev)
3. Choose **EU Cloud** (`eu.i.posthog.com`) — recommended for GDPR. US Cloud (`us.i.posthog.com`) is also available.
4. Go to **Settings → Project → Project API Key** — copy the key (starts with `phc_`)

**Important:** PostHog uses `NEXT_PUBLIC_*` build-time variables, not Docker Swarm secrets. The key gets baked into the Next.js client bundle at build time via `--build-arg`. See DEPLOY.md for the exact deploy commands — the keys are already included inline.

**Build args (already in docker-stack env + deploy commands):**

| Build Arg | Value |
|-----------|-------|
| `NEXT_PUBLIC_POSTHOG_KEY` | Your `phc_...` key |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` |

### PostHog Dashboard Setup

After the first deploy with events flowing, configure these in the PostHog dashboard:

1. **Session Replay** — Go to **Settings → Session Replay** → toggle **Enable** on. This records user sessions so you can replay exactly what a user did, which pages they visited, and where they dropped off. Essential for debugging UX issues and understanding conversion funnels.

2. **Autocapture** — Enabled by default. PostHog automatically captures every click, pageview, and form submission without you needing to define individual events. No action needed.

3. **Data Retention** — Go to **Settings → Data Management** → set retention to **1 year** (free tier default). This controls how long event data is kept.

4. **Persons & Privacy** — PostHog assigns anonymous IDs to visitors. No personal data (name, email) is sent. Analytics are fully anonymous.

### Verify PostHog Is Working — Complete Checklist

After deploying with the key set, walk through every item below. All checks should pass.

**Step 1 — Confirm the script loads:**

1. Open https://bonistock.com (or dev.bonistock.com)
2. Accept analytics cookies when the cookie banner appears
3. Open browser DevTools → **Network** tab
4. Filter by `posthog` — you should see requests to `eu.i.posthog.com`
5. If you see **no requests**: the cookie consent was not accepted, or the key is missing from the build

**Step 2 — Confirm events arrive in PostHog:**

1. Go to https://eu.posthog.com → your project
2. Click **Events** in the left sidebar
3. You should see `$pageview` events arriving within 1–2 minutes of browsing the site
4. Click any event to expand it — verify it shows the correct URL, browser, and country
5. If **no events appear after 5 minutes**: check that `NEXT_PUBLIC_POSTHOG_KEY` was set during build (not just at runtime)

**Step 3 — Confirm session replay works:**

1. In PostHog, click **Session Replay** in the left sidebar
2. You should see recorded sessions from your browsing
3. Click a session to replay it — you should see your exact page navigation, scrolls, and clicks
4. If **no replays appear**: go to **Settings → Session Replay** and confirm it is enabled

**Step 4 — Confirm autocapture events:**

1. In PostHog → **Events**, filter by event type `$autocapture`
2. You should see events for every button click, link click, and form interaction on the site
3. Click an event — the **Elements** section shows which HTML element was clicked

**Step 5 — Confirm cookie consent is respected:**

1. Open the site in an incognito window (no cookies)
2. Do NOT accept the cookie banner — just browse
3. Open DevTools → Network → filter `posthog` — there should be **zero** requests
4. Now accept cookies → PostHog requests should start appearing immediately
5. This confirms GDPR compliance: no tracking fires before consent

**Step 6 — Check the PostHog dashboard overview:**

1. Go to **Web Analytics** (left sidebar) — you should see:
   - Active users count
   - Top pages by pageviews
   - Referrer sources
   - Device and browser breakdown
   - Country breakdown
2. If this dashboard is empty, click **Create Dashboard** → choose **Web Analytics** template

**All 6 steps passing = PostHog is fully set up and working correctly.**

---

## 13. Google Analytics, Google Tag & Google Ads — Setup Guide

All code for conversion tracking is already deployed. This section covers only what you need to do in the Google Analytics, Google Tag Manager, and Google Ads web interfaces. No code changes needed.

The site fires 3 events automatically when users take actions:

| Event | When it fires | Value |
|-------|---------------|-------|
| `purchase` | User completes a Stripe payment (Plus subscription or Day Pass) | Real amount + currency from Stripe (e.g. €9.99 EUR) |
| `sign_up` | User creates a new account | No monetary value |
| `begin_checkout` | User clicks a pricing CTA and is redirected to Stripe | Product price in user's currency |

Purchase values are dynamic — they come from the actual Stripe transaction, not hardcoded numbers.

---

### Area 1: Google Analytics (GA4)

#### 1.1 — Create a property (skip if already done)

1. Go to https://analytics.google.com
2. Click **Admin** (gear icon, bottom-left)
3. Click **Create** → **Property**
4. Property name: `Bonistock`
5. Timezone: `Central European Time` — Currency: `Euro (EUR)`
6. Business info: Financial Services, Small
7. Click **Create**

#### 1.2 — Create a web data stream (skip if already done)

1. Still in Admin → your property → **Data Streams**
2. Click **Add stream** → **Web**
3. Website URL: `https://bonistock.com`
4. Stream name: `Bonistock Web`
5. Click **Create stream**
6. Copy the **Measurement ID** (starts with `G-`, e.g. `G-4M5V64CQ8S`) — this is already set in the deploy config

#### 1.3 — Mark key events (conversions)

Events only appear after the first real event fires. If you haven't had any purchases or sign-ups yet, you may need to trigger test events first (register an account, complete a test Stripe checkout).

1. Go to **Admin** → **Events** (under your property)
2. Wait for events to appear in the list — this can take up to 24 hours after first fire
3. Find **`purchase`** in the list → click the toggle in the **Mark as key event** column (right side). The toggle turns blue.
4. Find **`sign_up`** → toggle **Mark as key event** on
5. Find **`begin_checkout`** → toggle **Mark as key event** on

> These were formerly called "conversions" — Google renamed them to "key events" in 2024.

#### 1.4 — Link GA4 to Google Ads

1. Go to **Admin** → **Product Links** → **Google Ads Links**
2. Click **Link**
3. Click **Choose Google Ads accounts** → check your Google Ads account (`AW-17983336228`) → **Confirm**
4. Leave all options enabled (Personalized Advertising, Auto-tagging)
5. Click **Submit**

This enables:
- GA4 events (including purchase values) flow to Google Ads automatically
- Google Ads cost data appears in GA4 reports
- GA4 audiences can be used for ad targeting

#### 1.5 — Verify GA4 is receiving data

1. Go to **Reports** → **Realtime** (left sidebar)
2. Open your site in another tab, accept cookies, browse a few pages
3. In the Realtime report you should see:
   - Users count incrementing
   - Pages being viewed
   - Events firing (`page_view`, and any actions you take)
4. To verify purchase events specifically: go to **Reports** → **Monetization** → **Ecommerce purchases** — this shows `purchase` events with revenue

---

### Area 2: Google Tag (Tag Assistant)

Google Tag Assistant lets you verify that the GA4 and Google Ads tags are firing correctly on your site.

#### 2.1 — Verify tags are firing

1. Go to https://tagassistant.google.com
2. Click **Add domain**
3. Enter `https://bonistock.com` → click **Connect**
4. A new browser tab opens with your site and a "Tag Assistant Connected" badge in the bottom-right corner
5. **Accept the analytics cookie banner** on the site
6. Navigate a few pages, click some buttons

#### 2.2 — Check results in Tag Assistant

1. Go back to the Tag Assistant tab
2. You should see **two tags** listed at the top:
   - `G-4M5V64CQ8S` (GA4) — with a green checkmark
   - `AW-17983336228` (Google Ads) — with a green checkmark
3. Click each tag to see the events it recorded:
   - `Consent` — confirms consent mode is working
   - `Page View` — confirms pageview tracking
   - Any other events you triggered (sign_up, begin_checkout)
4. If a tag shows a **red or yellow icon**: click it for error details

#### 2.3 — What each status means

- **Green checkmark** = tag is loading and firing correctly
- **Yellow warning** = tag loads but something may be misconfigured (click for details)
- **Red error** = tag is not firing (usually means cookies weren't accepted, or the build arg is missing)
- **Tag not found** = the tag ID is not present on the page at all

---

### Area 3: Google Ads

#### 3.1 — Import conversions from GA4

1. Go to https://ads.google.com
2. Click **Goals** (left sidebar) → **Conversions** → **Summary**
3. Click the **+** (plus) button → **Import**
4. Select **Google Analytics 4 properties** → click **Continue**
5. Select the **Bonistock** property
6. Check these 3 events:
   - **purchase** — this is your primary conversion (actual revenue)
   - **sign_up** — secondary conversion (lead generation)
   - **begin_checkout** — secondary conversion (intent signal)
7. Click **Import**

#### 3.2 — Configure conversion settings

After importing, configure each conversion:

**For `purchase` (primary):**
1. Click on **purchase** in the conversions list
2. Click **Edit settings**
3. Goal: **Purchase / Sale**
4. Value: select **Use the value from the Google Analytics event** (this picks up the dynamic Stripe amount — do NOT enter a manual value)
5. Count: **Every** (count each purchase separately)
6. Click-through window: **30 days**
7. View-through window: **1 day**
8. Attribution model: **Data-driven** (default — Google optimizes automatically)
9. Click **Save**

**For `sign_up` (secondary):**
1. Click **sign_up** → **Edit settings**
2. Goal: **Sign-up**
3. Value: select **Don't use a value** (or set a fixed value like €2.00 if you want to assign a lead value)
4. Count: **One** (only count one sign-up per user)
5. Attribution model: **Data-driven**
6. Click **Save**
7. Toggle this to **Secondary** conversion action (click the three dots → **Change to secondary**) — this means it's tracked but not used for bid optimization

**For `begin_checkout` (secondary):**
1. Click **begin_checkout** → **Edit settings**
2. Goal: **Begin checkout**
3. Value: **Use the value from the Google Analytics event**
4. Count: **Every**
5. Attribution model: **Data-driven**
6. Click **Save**
7. Toggle to **Secondary** conversion action

> **Why primary vs secondary?** Only the `purchase` event should be the primary conversion. Google Ads optimizes bidding to maximize primary conversions. If `sign_up` and `begin_checkout` are also primary, Google may optimize for sign-ups (free) instead of purchases (revenue).

#### 3.3 — Verify conversions are recording

1. Go to **Goals** → **Conversions** → **Summary**
2. The status column shows:
   - **No recent conversions** — the event was imported but hasn't fired yet. Make a test purchase to trigger it.
   - **Recording** — events are flowing. Google Ads is receiving conversion data.
   - **Inactive** — no events received in 7+ days. Check that the site is deployed with the correct `AW-` build arg.

#### 3.4 — Create campaign: Bonistock Stock & ETF Picks

This campaign combines stock picking and ETF picking into one campaign, targeting both the US (English) and Germany (German).

**Step 1 — Create a new campaign:**

1. Click **Campaigns** (left sidebar) → **+** (plus) → **New campaign**
2. Campaign objective: **Sales**
3. Conversion goals: confirm `purchase` is selected (it should be checked by default since it's the primary conversion)
4. Campaign type: **Search**
5. Click **Continue**

**Step 2 — Bidding:**

1. Bidding strategy: select **Maximize conversion value**
   - This tells Google to optimize for the highest total revenue, not just the most conversions. It naturally prioritizes Plus subscriptions (€9.99/month) over Day Passes (€2.99) because they generate more value.
   - If you want to set a minimum ROAS: check **Set a target return on ad spend** → enter `200%` (meaning you want €2 revenue for every €1 spent). Only set this after you have 15+ conversions in 30 days — otherwise Google won't have enough data to optimize.
2. Click **Next**

**Step 3 — Campaign settings:**

1. Campaign name: `Bonistock — Stock & ETF Picks`
2. Networks: **uncheck** Display Network and Search Partners (start with Google Search only for higher intent traffic)
3. Locations: click **Enter another location**
   - Search and add: **United States**
   - Search and add: **Germany**
4. Location options: select **Presence: People in or regularly in your targeted locations** (not "People interested in")
5. Languages: add both **English** and **German**
6. Start date: today — No end date
7. Click **Next**

**Step 4 — Ad Group 1: US (English)**

1. Ad group name: `US — Stock & ETF Picks (EN)`
2. **Keywords** — enter these keywords (one per line), using a mix of match types:

   ```
   "stock picks"
   "best stocks to buy"
   "stock screener"
   "ETF screener"
   "stock recommendations"
   "best ETFs to buy"
   "stock analyst ratings"
   stock picks today
   best stocks to invest in
   ETF recommendations
   top stock picks
   investment stock screener
   ```

   > Keywords in "quotes" are phrase match (your ad shows when someone searches for that phrase or close variations). Keywords without quotes are broad match (Google matches related searches too).

3. **Responsive Search Ad:**
   - Final URL: `https://bonistock.com`
   - Display path: `bonistock.com / stock-picks`
   - Headlines (write up to 15, minimum 3 — Google mixes and matches them):
     1. `Top Stock Picks for 2026`
     2. `Analyst-Rated Stock Screener`
     3. `Best Stocks to Buy Now`
     4. `ETF & Stock Recommendations`
     5. `Stock Picks by Wall Street Analysts`
     6. `Smart Stock Screener Tool`
     7. `Daily Stock & ETF Picks`
     8. `Data-Driven Stock Picks`
     9. `Discover High-Upside Stocks`
     10. `Expert-Curated ETF Picks`
   - Descriptions (write up to 4, minimum 2):
     1. `Get daily stock and ETF picks backed by analyst consensus data. Filter by risk, region, and sector. Start free.`
     2. `Analyst-rated stock screener with real price targets and upside potential. US, Europe & emerging markets.`
     3. `Find the best stocks and ETFs to buy today. Data from Wall Street analysts, updated daily.`
     4. `Smart stock picks with analyst ratings, price targets, and risk levels. Free to start, upgrade for full access.`
4. Click **Next** (you'll add the second ad group next)

**Step 5 — Ad Group 2: Germany (German)**

1. Click **+ New ad group**
2. Ad group name: `DE — Aktien- & ETF-Picks (DE)`
3. **Keywords:**

   ```
   "Aktien Tipps"
   "beste Aktien kaufen"
   "Aktien Screener"
   "ETF Empfehlungen"
   "Aktien Empfehlungen"
   "beste ETFs"
   "Aktienanalyse"
   Aktien Tipps heute
   welche Aktien kaufen
   ETF Screener
   Top Aktien
   Aktien mit Potenzial
   ```

4. **Responsive Search Ad:**
   - Final URL: `https://bonistock.com`
   - Display path: `bonistock.com / aktien-picks`
   - Headlines:
     1. `Top Aktien-Picks für 2026`
     2. `Aktien-Screener mit Analysten`
     3. `Die besten Aktien kaufen`
     4. `ETF- & Aktien-Empfehlungen`
     5. `Aktien-Picks von Analysten`
     6. `Smarter Aktien-Screener`
     7. `Tägliche Aktien- & ETF-Picks`
     8. `Datenbasierte Aktien-Picks`
     9. `Aktien mit hohem Kurspotenzial`
     10. `Kuratierte ETF-Empfehlungen`
   - Descriptions:
     1. `Tägliche Aktien- und ETF-Picks basierend auf Analystendaten. Nach Risiko, Region und Sektor filtern. Kostenlos starten.`
     2. `Aktien-Screener mit echten Kurszielen und Upside-Potenzial. USA, Europa und Schwellenländer.`
     3. `Finden Sie die besten Aktien und ETFs. Daten von Wall-Street-Analysten, täglich aktualisiert.`
     4. `Smarte Aktien-Picks mit Analysten-Ratings, Kurszielen und Risikolevels. Kostenlos starten, upgraden für Vollzugriff.`
5. Click **Next**

**Step 6 — Budget:**

1. Set your **daily budget** — recommended starting point:
   - **$10–20/day (US)** — competitive market, higher CPC but also higher conversion value
   - **€5–10/day (DE)** — less competition in German, lower CPC
   - Since this is one campaign covering both regions, set a combined daily budget of **$15–25/day** to start. Google allocates between the ad groups automatically.
2. Click **Next** → **Publish campaign**

#### 3.5 — Optimization strategy for maximizing purchases

**Week 1–2 (Learning phase):**
- Let the campaign run without changes. Google needs ~50 conversions to exit the "Learning" phase.
- Monitor the **Search terms** report: **Campaigns → your campaign → Search terms** — add irrelevant terms as negative keywords (e.g. "free stock images", "stock market crash").

**Week 3–4 (Optimize):**
- **Check which ad group performs better** (US vs DE) in **Campaigns → Ad groups** — reallocate budget toward the higher-ROAS ad group
- **Check which keywords convert**: **Keywords** tab → sort by **Conversions** → pause keywords with spend but zero conversions
- **Add negative keywords**: go to **Keywords → Negative keywords → +** → add terms that get clicks but no conversions

**Month 2+ (Scale):**
- Once you have 15+ purchases in 30 days: switch bidding from **Maximize conversion value** to **Target ROAS** with a target of 200–300%
- **Add remarketing**: go to **Audiences** → **+** → add **Website visitors** audience → create a separate ad group targeting people who visited `/pricing` but didn't convert
- **Ad extensions** — add these to improve click-through rate:
  1. **Sitelink extensions**: Campaigns → Ads & extensions → Extensions → Sitelinks
     - "Stock Picks" → `/dashboard`
     - "ETF Picks" → `/dashboard`
     - "Pricing" → `/pricing`
     - "How It Works" → `/about`
  2. **Callout extensions**: "Daily Updated", "Analyst-Backed", "Free Tier Available", "ETFs & Stocks"
  3. **Structured snippets**: Type = "Types" → "Stock Picks, ETF Picks, Day Passes, Monthly Plans"

**Ongoing monitoring — weekly checklist:**
1. Check **Conversions** column in Campaigns — is it trending up?
2. Check **Cost / conv.** — is your cost per purchase sustainable? (Target: under €5–8 per purchase for subscriptions, under €2 for day passes)
3. Check **Conv. value / cost** — this is your ROAS. Above 2.0 (200%) is healthy.
4. Check **Search terms** — add new negative keywords for irrelevant traffic
5. Check **Quality Score** for keywords: **Keywords** tab → add "Quality Score" column → aim for 6+ on all keywords. Low scores mean your ad/landing page isn't relevant to the keyword.

#### 3.6 — Verify everything end-to-end

Walk through this complete test flow:

1. **Open the site** in a browser → accept analytics cookies
2. **Open Tag Assistant** (https://tagassistant.google.com) connected to your site in another tab
3. **Register a new account** → check Tag Assistant: a `sign_up` event should appear
4. **Go to Pricing** → click a "Buy" or "Subscribe" button → check Tag Assistant: a `begin_checkout` event should appear with a value
5. **Complete the Stripe checkout** (use a test card if in test mode) → you're redirected to the dashboard
6. Check Tag Assistant: a `purchase` event should appear with the exact amount and currency you paid
7. **In GA4:** go to **Reports → Realtime** → confirm all 3 events show up
8. **In GA4:** go to **Admin → Events** → confirm `purchase`, `sign_up`, `begin_checkout` all appear with the key event toggle on
9. **In Google Ads:** go to **Goals → Conversions → Summary** → confirm status shows **Recording** for all 3 (may take up to 24h after first event)
10. **In PostHog:** go to **Events** → confirm `$pageview` and `$autocapture` events are flowing

---

## Production Secrets

Once dev is fully tested, repeat the same process for production secrets using the `bonistock_prod_` prefix. Key differences:

- **Stripe:** Switch from Test Mode to Live Mode, create new webhook endpoint for `https://bonistock.com/api/stripe/webhook`
- **Google OAuth:** Add `https://bonistock.com/api/auth/callback/google` to redirect URIs
- **Facebook OAuth:** Submit app for review to go live, add `https://bonistock.com/api/auth/callback/facebook`
- **Apple Sign In:** Same Services ID works for both environments (both return URLs were added). Regenerate the client secret JWT every 6 months.
- **Sentry:** Create a separate `bonistock-prod` project (or use the same DSN with environment tagging)
- **Encryption Key:** Generate a NEW key for production (`openssl rand -hex 32`) — never reuse the dev key
