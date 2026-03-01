# Bonistock — Google Ads Setup Guide

> **Objective:** Maximum conversions (registrations + purchases)
> **Daily budget:** ~$20–25 / ~20–25 EUR
> **Markets:** United States (English) & Germany (German)
> **Landing URLs:** `https://bonistock.com/pricing` and `https://bonistock.com/register`

---

## Table of Contents

1. [Campaign Architecture](#1-campaign-architecture)
2. [Account-Level Settings](#2-account-level-settings)
3. [US Campaign — English](#3-us-campaign--english)
4. [DE Campaign — German](#4-de-campaign--german)
5. [Conversion Tracking Setup](#5-conversion-tracking-setup)
6. [Audience & Targeting](#6-audience--targeting)
7. [Ad Extensions / Assets](#7-ad-extensions--assets)
8. [Negative Keywords](#8-negative-keywords)
9. [Bidding & Budget Strategy](#9-bidding--budget-strategy)
10. [Landing Page Recommendations](#10-landing-page-recommendations)
11. [Week-by-Week Optimisation Playbook](#11-week-by-week-optimisation-playbook)
12. [KPI Benchmarks](#12-kpi-benchmarks)

---

## 1. Campaign Architecture

```
Account
├── [Search] US — Bonistock Conversions
│   ├── Ad Group: Stocks & ETFs
│   ├── Ad Group: Portfolio Builder
│   ├── Ad Group: Brand
│   └── Ad Group: Competitor / Generic Investing
│
├── [Search] DE — Bonistock Conversions
│   ├── Ad Group: Aktien & ETFs
│   ├── Ad Group: Portfolio-Builder
│   ├── Ad Group: Brand
│   └── Ad Group: Wettbewerb / Allgemein (Competitor / Generic)
│
├── [Performance Max] US — pMax Conversions  (optional, week 3+)
└── [Performance Max] DE — pMax Conversions  (optional, week 3+)
```

**Why two campaigns?** Different languages, keyword sets, bidding landscapes, and budgets. Keeps reporting clean and lets you shift budget between markets independently.

**Why one combined Stocks & ETFs ad group?** The product is a single dashboard covering both. Combining them gives Google more signal per ad group, avoids splitting a small budget across too many groups, and better reflects user intent (many users search for both).

---

## 2. Account-Level Settings

| Setting | Value |
|---------|-------|
| Account currency | USD (or EUR if billing is European) |
| Time zone | Match your primary reporting timezone |
| Auto-tagging | **ON** (for GA4 gclid tracking) |
| Auto-apply recommendations | **OFF** — review manually |
| Enhanced conversions | **ON** (hash email on registration) |
| Google Analytics 4 | Link to your GA4 property |

---

## 3. US Campaign — English

### Campaign Settings

| Setting | Value |
|---------|-------|
| Campaign type | Search |
| Goal | Conversions (Registration + Purchase) |
| Networks | Google Search only — **uncheck** Display & Search Partners |
| Locations | United States |
| Location options | Presence: People **in** your targeted locations |
| Language | English |
| Budget | **$12/day** (~60% of total, US has higher purchase intent) |
| Bidding | Maximize Conversions (switch to Target CPA after 30 conversions) |
| Ad rotation | Optimize: prefer best performing ads |
| Ad schedule | All day (narrow later based on data) |
| Start date | Immediately |

---

### Ad Group 1: Stocks & ETFs

#### Keywords (Phrase + Broad Match Modified)

```
"best stocks to buy"
"stock picks"
"analyst stock picks"
"top stocks to buy now"
"stock recommendations"
"best stocks to invest in"
"stock screener analyst ratings"
"undervalued stocks"
"highest upside stocks"
"stock analysis tool"
"best stock picks today"
"stocks with highest analyst ratings"
"stock consensus ratings"
"weekly stock picks"
"best etfs to buy"
"top performing etfs"
"etf rankings"
"best etf 2026"
"etf comparison tool"
"highest return etfs"
"etf screener"
"best etfs for long term"
"low cost etfs"
"best etf portfolio"
"etf performance ranking"
"best growth etfs"
"top etfs by returns"
```

#### Responsive Search Ad 1

| Field | Content |
|-------|---------|
| **Final URL** | `https://bonistock.com/register` |
| **Headline 1** | 200+ Stocks & 100+ ETFs Ranked |
| **Headline 2** | Analyst Consensus Rankings |
| **Headline 3** | Free Stock & ETF Picks — Try Now |
| **Headline 4** | Top Stocks Ranked by Analysts |
| **Headline 5** | ETFs Ranked by Real Returns |
| **Headline 6** | No Opinions — Just Analyst Data |
| **Headline 7** | Start Free, Upgrade for $6.99/mo |
| **Headline 8** | See What Analysts Think |
| **Headline 9** | 14-Day Money-Back Guarantee |
| **Headline 10** | Stocks Updated Nightly, ETFs Weekly |
| **Headline 11** | Upside Potential + Conviction |
| **Headline 12** | Filter by Sector, Broker & More |
| **Headline 13** | Join Bonistock Free |
| **Headline 14** | Sharpe, Drawdown & Fee Data |
| **Headline 15** | Auto-Mix Builds Your Portfolio |
| **Description 1** | Bonistock scores 200+ stocks by analyst consensus and ranks 100+ ETFs by actual 1/3/5-year returns. See upside, conviction, price targets, Sharpe ratio — all in one dashboard. Free to start. |
| **Description 2** | Stop guessing which stocks and ETFs to buy. Bonistock ranks them by real data — analyst consensus for stocks, actual returns for ETFs. Auto-Mix builds your portfolio in seconds. |
| **Description 3** | 200+ stocks ranked by Wall Street analysts. 100+ ETFs ranked by CAGR. Filter by sector, broker, market cap, fees. Auto-Mix generates portfolios. Plus plan $6.99/mo. |
| **Description 4** | Analyst consensus meets modern design. Stock picks, ETF rankings, price alerts, watchlists, and portfolio auto-mix. 14-day satisfaction guarantee. No credit card for free tier. |

**Pin suggestions:** Pin "200+ Stocks & 100+ ETFs Ranked" to Headline Position 1. Pin a description containing "Free to start" to Description Position 1.

---

### Ad Group 2: Portfolio Builder

#### Keywords

```
"portfolio builder tool"
"automatic portfolio allocation"
"stock portfolio generator"
"how to build a stock portfolio"
"investment portfolio tool"
"diversified portfolio builder"
"portfolio mix generator"
"beginner stock portfolio"
"portfolio allocation calculator"
"auto invest portfolio"
```

#### Responsive Search Ad 2

| Field | Content |
|-------|---------|
| **Final URL** | `https://bonistock.com/register` |
| **Headline 1** | Auto-Mix Builds Your Portfolio |
| **Headline 2** | Enter an Amount, Get a Plan |
| **Headline 3** | Portfolio Builder — Free to Try |
| **Headline 4** | Instant Portfolio Allocation |
| **Headline 5** | Diversified in Seconds |
| **Headline 6** | Exactly How Many Shares to Buy |
| **Headline 7** | Growth, Income, or Balanced |
| **Headline 8** | Start Free on Bonistock |
| **Headline 9** | Stocks + ETFs, One Dashboard |
| **Headline 10** | Data-Driven Allocation |
| **Headline 11** | Powered by Analyst Consensus |
| **Headline 12** | Full Access from $6.99/mo |
| **Headline 13** | 14-Day Money-Back Guarantee |
| **Headline 14** | For Beginners & Active Investors |
| **Headline 15** | Smart Picks, Simple Moves |
| **Description 1** | Enter your budget and risk preference — Bonistock's Auto-Mix tells you exactly which stocks or ETFs to buy and how many shares. Diversified portfolios in seconds. Free to try. |
| **Description 2** | Building a diversified portfolio shouldn't take hours. Bonistock Auto-Mix generates your allocation from 200+ analyst-scored stocks. Choose Growth, Income, or Balanced. |
| **Description 3** | Max Upside, Balanced Risk, Dividend Income, or Sector Diversified — pick your strategy. Auto-Mix does the math. Upgrade to Plus for unlimited mixes at $6.99/mo. |
| **Description 4** | Stop overthinking your portfolio. Enter a dollar amount, choose your risk level, and Auto-Mix builds a diversified allocation in seconds. Works for stocks and ETFs. |

---

### Ad Group 3: Brand

#### Keywords

```
"bonistock"
"bonistock app"
"bonistock stock picks"
"boni stock"
"bonistock review"
"bonistock pricing"
```

#### Responsive Search Ad 3

| Field | Content |
|-------|---------|
| **Final URL** | `https://bonistock.com` |
| **Headline 1** | Bonistock — Smart Stock Picks |
| **Headline 2** | Analyst Consensus + ETF Rankings |
| **Headline 3** | Start Free Today |
| **Headline 4** | 200+ Stocks, 100+ ETFs |
| **Headline 5** | Data-Driven Investing |
| **Headline 6** | Auto-Mix Portfolio Builder |
| **Headline 7** | Plus Plan from $6.99/mo |
| **Headline 8** | bonistock.com |
| **Description 1** | Bonistock scores 200+ stocks by analyst consensus and ranks 100+ ETFs by real returns. Auto-Mix builds your portfolio. Free tier, Plus plan at $6.99/mo. Try today. |
| **Description 2** | The data-driven investing dashboard. Stock picks, ETF rankings, auto portfolio builder, watchlists, alerts. Start free — upgrade anytime. 14-day money-back guarantee. |

---

### Ad Group 4: Competitor / Generic Investing

#### Keywords

```
"best investing app"
"stock analysis app"
"alternative to motley fool"
"stock screener free"
"investment research tool"
"stock market app"
"best app for stock research"
"stock rating app"
"analyst ratings app"
"best stock app for beginners"
```

#### Responsive Search Ad 4

| Field | Content |
|-------|---------|
| **Final URL** | `https://bonistock.com/register` |
| **Headline 1** | A Smarter Way to Pick Stocks |
| **Headline 2** | Data, Not Opinions |
| **Headline 3** | Free Stock & ETF Research |
| **Headline 4** | 200+ Stocks Scored by Analysts |
| **Headline 5** | No Paywalled Articles |
| **Headline 6** | Real Data, Clean Dashboard |
| **Headline 7** | Try Free — No Credit Card |
| **Headline 8** | Plus Plan Just $6.99/mo |
| **Headline 9** | Auto Portfolio Builder Included |
| **Headline 10** | Analyst Consensus Rankings |
| **Description 1** | Tired of paywalled stock tips and opinion pieces? Bonistock uses real analyst consensus data to score 200+ stocks nightly. No guessing — just data. Free to start. |
| **Description 2** | Bonistock replaces opinion-driven newsletters with analyst-scored stock rankings and ETF performance data. Auto-Mix builds your portfolio. Start free today. |

---

## 4. DE Campaign — German

### Campaign Settings

| Setting | Value |
|---------|-------|
| Campaign type | Search |
| Goal | Conversions (Registration + Purchase) |
| Networks | Google Search only |
| Locations | Germany |
| Location options | Presence: People **in** your targeted locations |
| Language | German |
| Budget | **€10/day** (~40% of total) |
| Bidding | Maximize Conversions (switch to Target CPA after 30 conversions) |
| Ad rotation | Optimize |
| Ad schedule | All day |

---

### Ad Group 1: Aktien & ETFs

#### Keywords

```
"beste aktien kaufen"
"aktien empfehlungen"
"aktientipps"
"aktien analyse tool"
"welche aktien kaufen"
"aktien mit potenzial"
"aktien screener"
"top aktien"
"unterbewertete aktien"
"analyst aktien empfehlung"
"aktien ranking"
"beste aktien 2026"
"aktien bewertung tool"
"aktien mit kurspotenzial"
"beste etfs kaufen"
"etf vergleich"
"top etfs"
"etf ranking"
"beste etfs 2026"
"etf sparplan beste"
"etf rendite vergleich"
"etf screener"
"welche etfs kaufen"
"etf performance vergleich"
"beste etfs langfristig"
"günstige etfs"
"etf mit bester rendite"
```

#### Responsive Search Ad 1 (German)

| Field | Content |
|-------|---------|
| **Final URL** | `https://bonistock.com/register` |
| **Headline 1** | 200+ Aktien & 100+ ETFs gerankt |
| **Headline 2** | Analystenkonsens-Rankings |
| **Headline 3** | Kostenlos starten — Jetzt testen |
| **Headline 4** | Top-Aktien nach Kurspotenzial |
| **Headline 5** | ETFs nach Rendite gerankt |
| **Headline 6** | Keine Meinungen — Nur Daten |
| **Headline 7** | Kostenlos starten, Plus ab 6,99€ |
| **Headline 8** | Was Analysten wirklich denken |
| **Headline 9** | 14-Tage-Geld-zurück-Garantie |
| **Headline 10** | Aktien täglich, ETFs wöchentlich |
| **Headline 11** | Kurspotenzial + Überzeugung |
| **Headline 12** | Filter: Branche, Broker & mehr |
| **Headline 13** | Bonistock kostenlos testen |
| **Headline 14** | Sharpe, Drawdown & TER-Daten |
| **Headline 15** | Auto-Mix baut dein Portfolio |
| **Description 1** | Bonistock bewertet 200+ Aktien nach Analystenkonsens und rankt 100+ ETFs nach 1/3/5-Jahres-Rendite. Kurspotenzial, Überzeugung, Sharpe Ratio — alles in einem Dashboard. Kostenlos starten. |
| **Description 2** | Schluss mit Rätselraten. Bonistock rankt Aktien nach Analystenzielen und ETFs nach echten Renditen. Auto-Mix erstellt dein Portfolio in Sekunden. Gratis testen. |
| **Description 3** | 200+ Aktien gerankt nach Analystenmeinung. 100+ ETFs nach CAGR. Filter nach Branche, Broker, TER. Auto-Mix erstellt Portfolios. Plus ab 6,99 €/Monat. |
| **Description 4** | Analystenkonsens trifft modernes Design. Aktien-Picks, ETF-Rankings, Kursalarme, Watchlists und Auto-Mix. 14-Tage-Zufriedenheitsgarantie. Ohne Kreditkarte starten. |

---

### Ad Group 2: Portfolio-Builder

#### Keywords

```
"portfolio zusammenstellen tool"
"aktien portfolio aufbauen"
"portfolio generator"
"portfolio allokation tool"
"diversifiziertes portfolio erstellen"
"aktien portfolio für anfänger"
"etf portfolio zusammenstellen"
"automatische portfolio zusammenstellung"
"anlage portfolio tool"
```

#### Responsive Search Ad 2 (German)

| Field | Content |
|-------|---------|
| **Final URL** | `https://bonistock.com/register` |
| **Headline 1** | Auto-Mix baut dein Portfolio |
| **Headline 2** | Betrag eingeben, Plan erhalten |
| **Headline 3** | Portfolio-Builder — Gratis testen |
| **Headline 4** | Sofortige Portfolio-Allokation |
| **Headline 5** | In Sekunden diversifiziert |
| **Headline 6** | Genau wissen, was kaufen |
| **Headline 7** | Wachstum, Einkommen, Balance |
| **Headline 8** | Bonistock kostenlos starten |
| **Headline 9** | Aktien + ETFs, ein Dashboard |
| **Headline 10** | Datenbasierte Allokation |
| **Headline 11** | Basierend auf Analystenkonsens |
| **Headline 12** | Voller Zugriff ab 6,99 €/Monat |
| **Headline 13** | 14-Tage-Geld-zurück-Garantie |
| **Headline 14** | Für Anfänger & aktive Anleger |
| **Headline 15** | Kluge Auswahl, einfach handeln |
| **Description 1** | Budget und Risikopräferenz eingeben — Bonistock Auto-Mix sagt genau, welche Aktien oder ETFs und wie viele Anteile. Diversifizierte Portfolios in Sekunden. Gratis testen. |
| **Description 2** | Ein diversifiziertes Portfolio muss nicht Stunden dauern. Auto-Mix erstellt deine Allokation aus 200+ analysten-bewerteten Aktien. Wachstum, Einkommen oder Balance. |
| **Description 3** | Max. Kurspotenzial, Balanciertes Risiko, Dividendeneinkommen oder Branchen-Diversifizierung — wähle deine Strategie. Auto-Mix rechnet. Plus ab 6,99 €/Monat. |
| **Description 4** | Portfolio nicht überdenken. Betrag eingeben, Risikoniveau wählen, Auto-Mix baut eine diversifizierte Allokation in Sekunden. Funktioniert für Aktien und ETFs. |

---

### Ad Group 3: Brand (German)

#### Keywords

```
"bonistock"
"bonistock app"
"bonistock aktien"
"boni stock"
"bonistock erfahrungen"
"bonistock preise"
```

#### Responsive Search Ad 3 (German)

| Field | Content |
|-------|---------|
| **Final URL** | `https://bonistock.com` |
| **Headline 1** | Bonistock — Kluge Aktienauswahl |
| **Headline 2** | Analystenkonsens + ETF-Rankings |
| **Headline 3** | Kostenlos starten |
| **Headline 4** | 200+ Aktien, 100+ ETFs |
| **Headline 5** | Datenbasiertes Investieren |
| **Headline 6** | Auto-Mix Portfolio-Builder |
| **Headline 7** | Plus-Plan ab 6,99 €/Monat |
| **Headline 8** | bonistock.com |
| **Description 1** | Bonistock bewertet 200+ Aktien nach Analystenkonsens und rankt 100+ ETFs nach echten Renditen. Auto-Mix baut dein Portfolio. Gratis testen, Plus ab 6,99 €/Monat. |
| **Description 2** | Das datenbasierte Investment-Dashboard. Aktien-Picks, ETF-Rankings, Portfolio-Builder, Watchlists, Alarme. Kostenlos starten — jederzeit upgraden. 14-Tage-Garantie. |

---

### Ad Group 4: Wettbewerb / Allgemein

#### Keywords

```
"beste app zum investieren"
"aktien analyse app"
"aktien app für anfänger"
"investment app vergleich"
"aktien bewertungs app"
"alternative zu trade republic"
"aktien research tool"
"börsen app kostenlos"
"aktienmarkt app"
"geld anlegen app"
```

#### Responsive Search Ad 4 (German)

| Field | Content |
|-------|---------|
| **Final URL** | `https://bonistock.com/register` |
| **Headline 1** | Aktien cleverer auswählen |
| **Headline 2** | Daten statt Meinungen |
| **Headline 3** | Gratis Aktien- & ETF-Research |
| **Headline 4** | 200+ Aktien von Analysten bewertet |
| **Headline 5** | Keine Paywall-Artikel |
| **Headline 6** | Echte Daten, klares Dashboard |
| **Headline 7** | Gratis testen — Ohne Kreditkarte |
| **Headline 8** | Plus-Plan nur 6,99 €/Monat |
| **Headline 9** | Auto Portfolio-Builder inklusive |
| **Headline 10** | Analystenkonsens-Rankings |
| **Description 1** | Genug von Paywall-Aktientipps und Meinungsartikeln? Bonistock nutzt echte Analystendaten, um 200+ Aktien jede Nacht zu bewerten. Kein Raten — nur Daten. Gratis starten. |
| **Description 2** | Bonistock ersetzt meinungsbasierte Newsletter durch analysten-bewertete Aktien-Rankings und ETF-Performance-Daten. Auto-Mix baut dein Portfolio. Heute gratis testen. |

---

## 5. Conversion Tracking Setup

### Primary Conversions (bid on these)

| Conversion | Type | Value | Counting |
|------------|------|-------|----------|
| **Registration** | Website event | $1.00 / €1.00 | One per user |
| **Purchase (Plus subscription)** | Website event | Dynamic (use Stripe amount) | One per user |
| **Purchase (Day Pass)** | Website event | Dynamic (use Stripe amount) | Every |

### Secondary Conversions (observe only, don't bid)

| Conversion | Type | Purpose |
|------------|------|---------|
| Page view: `/pricing` | Page visit | Measure pricing page interest |
| Page view: `/dashboard` | Page visit | Measure post-registration engagement |
| Button click: "Start Plus" | Click event | Measure checkout intent |

### Implementation

**Google Tag Manager (GTM) setup:**

1. **Registration event** — fire on `/register` success callback:
   ```js
   gtag('event', 'conversion', {
     'send_to': 'AW-XXXXXXXXX/registration',
     'value': 1.00,
     'currency': 'USD'
   });
   ```

2. **Purchase event** — fire on Stripe checkout success redirect or webhook:
   ```js
   gtag('event', 'conversion', {
     'send_to': 'AW-XXXXXXXXX/purchase',
     'value': purchaseAmount,  // dynamic from Stripe
     'currency': currencyCode,  // 'USD' or 'EUR'
     'transaction_id': stripeSessionId
   });
   ```

3. **Enhanced conversions** — pass hashed email on registration:
   ```js
   gtag('set', 'user_data', {
     'email': userEmail  // Google hashes it automatically
   });
   ```

### GA4 Integration

- Import GA4 conversions into Google Ads as secondary signals
- Key GA4 events: `sign_up`, `purchase`, `begin_checkout`
- This gives Google's algorithm more signal data even at low volumes

---

## 6. Audience & Targeting

### Observation Audiences (bid adjustments, not exclusions)

Add these as **observation** (not targeting) so you collect data without restricting reach:

| Audience Type | Segments |
|---------------|----------|
| **In-Market** | Financial Services > Investment Services |
| **In-Market** | Financial Services > Stock Trading |
| **In-Market** | Financial Services > Financial Planning |
| **Affinity** | Banking & Finance > Avid Investors |
| **Affinity** | Technophiles |
| **Demographics** | Age 25–54 (primary), 18–24 (secondary) |
| **Demographics** | Household income: Top 50% |

### DE-Specific Audiences

| Audience Type | Segments |
|---------------|----------|
| **In-Market** | Finanzdienstleistungen > Investmentdienste |
| **In-Market** | Finanzdienstleistungen > Aktienhandel |
| **Custom Segment** | People searching: "aktien kaufen", "etf sparplan", "geld anlegen" |

### Customer Match (once you have 1,000+ emails)

- Upload registered user email list monthly
- Create **Similar Audiences** from purchasers
- Exclude existing Plus subscribers from acquisition campaigns

### Remarketing Lists (create from day 1)

| List | Definition | Use |
|------|------------|-----|
| All visitors (30 days) | Anyone who visited bonistock.com | Awareness baseline |
| Pricing page visitors | Visited `/pricing` but didn't purchase | High-intent retargeting |
| Registered but not subscribed | Completed registration, no purchase | Upsell retargeting |
| Cart abandoners | Clicked "Start Plus" but didn't complete | Checkout recovery |

---

## 7. Ad Extensions / Assets

### Sitelink Extensions

| US (English) | DE (German) | Final URL |
|-------------|-------------|-----------|
| Free Stock & ETF Picks | Kostenlose Aktien- & ETF-Picks | /register |
| Pricing & Plans | Preise & Pläne | /pricing |
| Auto-Mix Portfolio Builder | Auto-Mix Portfolio-Builder | /register |
| How It Works | So funktioniert's | /about |
| FAQ | Häufige Fragen | /faq |

### Callout Extensions

| US (English) | DE (German) |
|-------------|-------------|
| Free to Start | Kostenlos starten |
| 200+ Stocks Scored Nightly | 200+ Aktien jede Nacht bewertet |
| 100+ ETFs Ranked | 100+ ETFs gerankt |
| 14-Day Money-Back Guarantee | 14-Tage-Geld-zurück-Garantie |
| No Credit Card Required | Keine Kreditkarte nötig |
| Auto Portfolio Builder | Auto Portfolio-Builder |
| Updated Weekly | Wöchentlich aktualisiert |
| Dark Mode Available | Dark Mode verfügbar |

### Structured Snippets

| Header | Values (US) | Values (DE) |
|--------|-------------|-------------|
| Types | Stock Picks, ETF Rankings, Auto-Mix, Watchlists, Alerts | Aktien-Picks, ETF-Rankings, Auto-Mix, Watchlists, Alarme |
| Brands | Robinhood, Fidelity, Schwab, IBKR, Webull | Trade Republic, Scalable Capital, ING, IBKR, comdirect |

### Price Extensions

| Item (US) | Price | Item (DE) | Price |
|-----------|-------|-----------|-------|
| Free Plan | $0 | Gratis-Plan | 0 € |
| Plus Monthly | $6.99/mo | Plus Monatlich | 6,99 €/Monat |
| Plus Annual | $49.99/yr | Plus Jährlich | 49,99 €/Jahr |
| Day Pass | From $2.99 | Tagespass | Ab 2,99 € |

---

## 8. Negative Keywords

### Account-Level Negatives (apply to all campaigns)

```
-job
-jobs
-career
-careers
-salary
-hiring
-interview
-"stock photo"
-"stock photos"
-"stock images"
-"stock footage"
-"stock video"
-"stock music"
-free download
-torrent
-crack
-hack
-penny stocks
-crypto
-cryptocurrency
-bitcoin
-forex
-trading bot
-day trading
-options trading
-futures trading
-CFD
-binary options
-gambling
-casino
-loan
-credit card
-mortgage
-insurance
-tutorial youtube
-reddit
-pdf
-book
-course
```

### DE-Specific Negatives

```
-stellenangebot
-karriere
-bewerbung
-gehalt
-stockfotos
-stockbilder
-kryptowährung
-krypto
-tagesgeld
-festgeld
-kredit
-versicherung
-bausparen
-riester
-rürup
-CFD trading
-daytrading
-binäre optionen
-forex handel
```

> **Important:** Review search terms report weekly for the first month and add negatives aggressively. With a small budget, every wasted click hurts.

---

## 9. Bidding & Budget Strategy

### Phase 1: Learning (Weeks 1–3)

| Setting | US | DE |
|---------|----|----|
| Strategy | Maximize Conversions | Maximize Conversions |
| Daily budget | $12 | €10 |
| Expected CPC | $0.80–$2.50 | €0.50–€1.50 |
| Expected clicks/day | 5–15 | 7–20 |

**Why Maximize Conversions first?** With zero conversion history, Google needs data. This strategy spends the full budget to gather conversion signals as quickly as possible.

### Phase 2: Optimization (Weeks 4–8)

Once you have **30+ conversions** in a campaign:

| Setting | US | DE |
|---------|----|----|
| Strategy | Target CPA | Target CPA |
| Target CPA | Start at $5.00 (registrations) | Start at €4.00 |
| Adjust | Lower by 10% every 2 weeks if hitting target | Same |

### Phase 3: Scale (Week 8+)

- If CPA is stable, increase budget by 20% every 2 weeks
- Consider adding Performance Max campaigns with creative assets
- Test Maximize Conversion Value if purchase data is sufficient

### Budget Allocation Tips

- **Shift budget to the campaign with lower CPA** after 2 weeks of data
- **Pause underperforming ad groups** (CTR < 1% after 1,000 impressions)
- **Increase budget on weekdays** if data shows higher conversion rates Mon–Fri (common for finance)

---

## 10. Landing Page Recommendations

### Registration Page (`/register`)

Ensure the page has:
- [ ] Clear value proposition above the fold
- [ ] Social proof (e.g., "200+ stocks scored nightly")
- [ ] Registration form visible without scrolling
- [ ] Google/Facebook/Apple sign-in buttons prominent
- [ ] "Free to start — no credit card required" text
- [ ] Mobile-optimised (50%+ traffic will be mobile)
- [ ] Page load speed < 3 seconds (Core Web Vitals)
- [ ] Trust signals (money-back guarantee badge)

### Pricing Page (`/pricing`)

Ensure the page has:
- [ ] All three tiers visible (Free, Plus, Day Pass)
- [ ] Annual toggle defaulted to ON (higher LTV)
- [ ] "Popular" badge on Plus plan
- [ ] Feature comparison visible
- [ ] FAQ section below pricing
- [ ] Clear CTA buttons ("Get Started", "Start Plus")
- [ ] Currency matches user's region

### URL Parameters

Use `?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={adgroupid}` on all final URLs for GA4 attribution beyond gclid auto-tagging.

---

## 11. Week-by-Week Optimisation Playbook

### Week 1
- [ ] Launch both campaigns with all ad groups
- [ ] Verify conversion tracking fires correctly (use Tag Assistant)
- [ ] Check search terms daily — add negatives aggressively
- [ ] Ensure ads are approved (finance ads may need verification)

### Week 2
- [ ] Review search terms report — add 20–30 negatives
- [ ] Check Quality Scores — pause keywords below QS 4
- [ ] Review device performance — set bid adjustments if needed
- [ ] Check ad strength — aim for "Good" or "Excellent"

### Week 3
- [ ] Pause keywords with 100+ impressions and 0 clicks
- [ ] Pause keywords with 50+ clicks and 0 conversions
- [ ] Add new keywords from search terms report (high CTR queries)
- [ ] Review geographic performance within each country
- [ ] A/B test: swap pinned headlines

### Week 4
- [ ] If 30+ conversions → switch to Target CPA bidding
- [ ] Review audience performance — set bid adjustments
- [ ] Consolidate: pause lowest performing ad group per campaign
- [ ] Review hour-of-day performance — set ad schedule

### Month 2
- [ ] Add remarketing campaigns for pricing page visitors
- [ ] Test responsive display ads for remarketing
- [ ] Create similar audiences from converters
- [ ] Consider Performance Max if creative assets ready
- [ ] Review and refresh ad copy with new learnings

### Month 3+
- [ ] Scale winning campaigns by 20% budget increments
- [ ] Test new ad groups (e.g., "dividend stocks", "ETF sparplan")
- [ ] Upload customer match lists
- [ ] Consider YouTube/Discovery ads for awareness
- [ ] Implement value-based bidding (purchase value > registration value)

---

## 12. KPI Benchmarks

### Expected Performance (Finance/SaaS vertical)

| Metric | US Search | DE Search | Target |
|--------|-----------|-----------|--------|
| CTR | 3–6% | 3–7% | > 4% |
| CPC | $0.80–$2.50 | €0.50–€1.50 | < $2.00 / €1.20 |
| Conversion Rate (registration) | 5–15% | 5–15% | > 8% |
| CPA (registration) | $3–$10 | €2–€8 | < $6 / €5 |
| CPA (purchase) | $15–$50 | €12–€40 | < $30 / €25 |
| ROAS (30-day) | 1.5–4x | 1.5–4x | > 2x |

### Red Flags (take action)

| Metric | Threshold | Action |
|--------|-----------|--------|
| CTR < 1% | After 1,000 impressions | Rewrite ads, check keyword relevance |
| CPC > $4 / €3 | Sustained 7 days | Pause expensive keywords, check QS |
| Conv. rate < 3% | After 200 clicks | Check landing page, audience, intent |
| CPA > $15 / €12 (registration) | After 20 conversions | Tighten targeting, add negatives |
| Quality Score < 4 | Per keyword | Improve ad relevance, landing page |

---

## Quick-Start Checklist

1. [ ] Create Google Ads account, set billing
2. [ ] Set up conversion tracking (GTM or gtag.js)
3. [ ] Test conversions with Tag Assistant / Preview mode
4. [ ] Link GA4 property
5. [ ] Create US Search campaign with all 4 ad groups
6. [ ] Create DE Search campaign with all 4 ad groups
7. [ ] Add all extensions (sitelinks, callouts, structured snippets, prices)
8. [ ] Add account-level negative keywords
9. [ ] Set budgets: $12/day US, €10/day DE
10. [ ] Submit for review
11. [ ] Monitor daily for first 2 weeks
12. [ ] Review search terms and add negatives every 2–3 days

---

> **Disclaimer:** Bonistock is for informational purposes only and is not financial advice. All ad copy must comply with Google's [Financial Services advertising policies](https://support.google.com/adspolicy/answer/2464998). You may need to complete Google's financial services advertiser verification.
