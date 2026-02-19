# Bonifatus — Stock & ETF Advisor

## Objective

Bonifatus is an intelligent stock and ETF advisory platform that translates Wall Street
analyst research into simple, actionable investment mixes for everyday investors. The
platform closes the gap between institutional-grade conviction data and the retail
investor who has $500 to deploy but no idea where to start. In under 60 seconds a user
goes from stating a goal to holding a diversified, risk-weighted portfolio they can
execute with a single click — no jargon, no spreadsheets, no analysis paralysis.

The business compounds four revenue streams — SaaS subscriptions, pay-per-use day
passes, broker comparison affiliate commissions, and sponsored content — creating a
defensible, capital-efficient model that reaches profitability on free-tier
infrastructure before requiring any external funding.

---

## Problem

### For Retail Investors
- Analyst price targets, buy/sell ratings, and conviction data exist but are locked
  behind Bloomberg terminals ($24k/yr), broker research portals, or scattered across
  dozens of financial sites in inconsistent formats.
- Beginners face analysis paralysis: thousands of tickers, conflicting opinions, no
  clear "what should I actually buy with my $500?"
- Existing tools (Seeking Alpha, TipRanks, Morningstar) serve experienced investors
  who already know what a P/E ratio is. Beginners bounce.
- Executing a diversified portfolio requires manual math: share counts, rounding,
  leftover cash, sector balancing — most give up and buy one stock or do nothing.

### For the Market
- 58% of Americans own stocks (Gallup 2024), but the majority hold fewer than 3
  positions — under-diversified and over-exposed to single-stock risk.
- Gen Z and Millennial investors are entering the market via mobile-first apps
  (Robinhood, Trading 212) but lack guidance on what to buy after opening an account.
- Brokers spend $50–$150 CPA to acquire funded accounts but struggle to activate
  users who open accounts and never trade. A tool that delivers ready-to-execute
  portfolios directly solves broker activation.

## Solution

Bonifatus distills analyst consensus into a single ranked "Upside List," scores each
stock by upside potential and conviction strength, and wraps the results in an
Auto-Mix Engine that converts a dollar amount into a ready-to-execute allocation.

**Three-step experience:**
1. **Pick a goal** — Growth, Income, or Balanced. A 15-second onboarding quiz sets
   default filters and risk weighting.
2. **Explore and mix** — Browse the Upside List ranked by composite score. Tap "Build
   a Mix" to auto-allocate any dollar amount across top picks + an ETF safety anchor.
3. **Execute** — Compare brokers side-by-side (fees, features, fractional share support)
   and deep-link to the chosen broker's order ticket. One click from insight to action.

**Key differentiators:**
- Built for beginners, not power users — plain-English explanations, no jargon.
- Auto-Mix removes the math — share counts, leftover cash, risk weighting handled.
- Broker-neutral comparison builds trust (vs. tools owned by a single broker).
- Safety-first: ETF anchor in every mix, trend guardrails, thin-coverage warnings.

---

## Market Opportunity

### TAM (Total Addressable Market)
- 160M+ retail brokerage accounts in the US (FINRA 2024).
- Global retail investing market valued at $15.5T AUM.
- Online investment tools and research market: ~$4.5B globally (growing 12% CAGR).

### SAM (Serviceable Addressable Market)
- ~40M active US self-directed investors under 45 who use digital tools for research.
- 8M+ self-directed investors in Germany — a key secondary market from day one.
- At $6.99/mo average, SAM = ~$3.4B/yr in potential subscription revenue across US and
  Germany combined.

### SOM (Serviceable Obtainable Market — Year 1–3 target)
- 10,000 free users, 800 Plus subscribers by month 12.
- Year 1 target: ~$110k ARR from subscriptions + ~$36k from CPA = ~$146k total.
- Year 3 target (50k free users, 5% paid): ~$1M ARR.

### Why Now
- Commission-free trading (2019+) created millions of new accounts with no guidance.
- AI/LLM tooling makes "plain-English" explanations viable at zero marginal cost.
- Financial data APIs (FMP, Alpha Vantage, Polygon) now offer generous free tiers —
  you can build a commercially viable data product with $0 infrastructure spend.
- Post-2022 bear market eroded trust in meme-stock culture; users want data-driven,
  risk-aware guidance.

### Germany Market Opportunity
- **8M+ self-directed investors in Germany**, with a strong Sparplan (savings plan)
  culture driving monthly automated investments into ETFs and stocks.
- **Neobroker adoption surging**: Trade Republic (4M+ users), Scalable Capital (1M+),
  and other neobrokers are rapidly onboarding retail investors — many of them beginners
  with no research tools beyond the broker app.
- **UCITS ETF market growing rapidly**: iShares MSCI World is the #1 ETF by inflows
  in Germany; German investors are heavily ETF-oriented, making Bonifatus's ETF
  Explorer and Auto-Mix Engine a natural fit.
- **Regulatory landscape**: BaFin-regulated market; Abgeltungssteuer (25% flat tax
  + Solidaritaetszuschlag on capital gains above the EUR 1,000 Freibetrag); PFOF
  (payment for order flow) ban coming June 2026 — shifting broker competition toward
  transparency and value-add tools like Bonifatus.
- **Multi-region strategy**: user selects US or Germany in settings; the platform
  surfaces region-appropriate brokers, stocks (NYSE/NASDAQ vs XETRA), ETFs
  (US-domiciled vs UCITS), and tax information accordingly.

---

## Competitive Landscape

| Feature | Bonifatus | TipRanks ($30/mo) | Seeking Alpha ($20/mo) | Simply Wall St ($10/mo) | Robinhood/Broker Apps |
|---------|-----------|-------------------|------------------------|-------------------------|-----------------------|
| Upside scoring from analyst consensus | Yes | Yes | Partial (quant + community) | Yes (visual) | No |
| Auto-mix with dollar allocation | **Yes** | No | No | No | No |
| Broker comparison (neutral) | **Yes** | No | No | No | No (captive) |
| Built for beginners (plain English) | **Yes** | Partial | No | Yes | Partial |
| ETF safety anchor in every mix | **Yes** | No | No | No | No |
| Free tier with value | Yes (teaser) | Yes (limited) | No (hard paywall) | Yes (limited) | Yes (trading only) |
| Pay-per-use option | **Yes (Day Pass)** | No | No | No | No |
| Multi-region (US + Germany) | **Yes** | No | No | Partial | No |
| Price | $2.99/day or $6.99/mo | $30/mo | $20/mo | $10/mo | Free (no research) |

**Competitive moat (grows over time):**
- Proprietary composite scoring (upside x conviction x trend guardrail) — tuned to
  beginner-relevant risk tolerance, not raw analyst data dumps.
- Auto-Mix engine with real allocation math — no competitor offers "type a dollar
  amount, get a portfolio."
- Broker-neutral positioning — not owned by a broker, so trusted comparisons.
- Network effects at scale: aggregated user mix data reveals crowd consensus, which
  becomes a signal in itself ("most-mixed stocks this week").
- Multi-region positioning — first beginner-friendly tool with region-specific broker
  comparison for both US and German markets.

---

## Business Model

### Revenue Streams (prioritized)

**1. Subscriptions (Primary — predictable MRR)**
Target: 10–15% free-to-Plus conversion on the mass tier.

**2. Day Pass / Pay-Per-Use (Primary complement — impulse revenue)**
Three pass options for flexible access:
- **1-Day Pass ($2.99)** — full Plus-level access for 24 hours from time of purchase.
- **3-Day Pass ($5.99)** — full Plus-level access for 72 hours. Best value for a
  weekend deep-dive.
- **12-Day Pass ($14.99)** — full Plus-level access for 12 days. Ideal for users who
  want to try before committing to a monthly subscription.

Captures revenue from casual/curious users who won't commit to a subscription.
Designed so frequent pass purchases make the $6.99/mo subscription the obvious upgrade.
High-margin impulse buy that also serves as a conversion funnel into Plus.

**3. Broker Comparison CPA (Secondary — per-transaction)**
Every "Execute" action across all tiers (including free and Day Pass) shows a broker
comparison table. For US users: Robinhood, Fidelity, Schwab, IBKR, Webull. For
German users: Trade Republic, Scalable Capital, ING, IBKR, Trading 212, comdirect.
Earn CPA $20–$100+ per funded account from whichever broker the user selects.
Diversifies affiliate risk across multiple partners and regions — no single-partner
dependency.

**4. Sponsored Content (Tertiary)**
- Sponsored ETF slots labeled "Featured Anchor" in the mix engine.
- Weekly newsletter sponsorship slots ($500–$5k per send at scale).

**5. Ads**
None in paid tiers. Minimal and non-intrusive in Free to preserve trust.

### Unit Economics

| Metric | Target |
|--------|--------|
| CAC (organic/SEO) | $5–$15 |
| CAC (paid — later stage) | $25–$40 |
| Plus LTV (12-mo, 5% churn) | $67 |
| LTV:CAC (organic) | 4–13x |
| Pass revenue per user | $2.99–$14.99 per purchase (avg $6 per transaction) |
| Day Pass → Plus conversion | 25–35% (within 60 days) |
| Blended ARPU (across all tiers) | $1.50–$3.00/mo |
| Gross margin | >90% (software + cached data) |

---

## Tiering

### Free (Lead Gen)
Purpose: demonstrate value, capture emails, earn CPA on broker comparison.
- Top 5 upside stocks (rotated weekly, delayed data)
- 1 auto-mix per month
- Broker comparison on every "Execute" action (earns CPA)
- Basic ETF explorer (top 10 by category)
- Onboarding goal picker (Growth / Income / Balanced)
- Region selector (US or Germany) — tailors brokers, stocks, and tax info
- No watchlists, no alerts, no exports

### Day Pass — impulse conversion
Purpose: capture revenue from casual users; serve as a gateway to Plus.

| Pass | Price | Duration |
|------|-------|----------|
| 1-Day | $2.99 | 24 hours |
| 3-Day | $5.99 | 72 hours |
| 12-Day | $14.99 | 12 days |

- Full Plus-level access for the duration of the pass
- Full upside list, unlimited auto-mix, "Why this pick" detail pages
- All filters, ETF fact sheets, broker comparison
- No watchlists or alerts (those require ongoing access via Plus)
- Capped at 3 individual pass purchases per month (forces subscription for heavy users)
- Stripe transaction cost note: $0.30 fixed fee = 10% on $2.99; acceptable given
  zero marginal cost of data delivery and high conversion to Plus

### Day Pass → Plus conversion funnel
- After Day Pass expires: "Your pass expired. You used 3 features today.
  Unlock unlimited access for $6.99/mo."
- After 2nd Day Pass purchase: "You've spent $5.98 on passes this month.
  Plus is $6.99/mo for unlimited access — upgrade now?"
- 12-Day Pass purchasers see at day 10: "2 days remaining. Go unlimited with Plus."

### Plus ($6.99/mo or $59/yr) — mass tier, conversion target
- Full upside list (delayed data, refreshed daily)
- Unlimited auto-mix + saved mixes
- Unlimited watchlists
- Price-target alerts (email)
- ETF fact sheets with CAGR, drawdown, Sharpe
- "Why this pick" detail pages
- Filters: asset type, sector, risk level, investment horizon, region
- Broker comparison on every "Execute" action (earns CPA)
- Region-specific content: US stocks/ETFs or XETRA/UCITS depending on setting
- Priority alerts (push + email)
- Early access to new features

### Pricing Rationale
- Day Pass at $2.99 is a sub-coffee impulse buy; low enough to trigger "just try it"
  behavior. The 3-Day ($5.99) and 12-Day ($14.99) passes offer progressively better
  per-day value while increasing average order size and reducing Stripe fee impact.
- Plus at $6.99/mo sits well below the impulse-buy threshold for beginners; competitive
  with Simply Wall St ($10/mo) and far under TipRanks ($30/mo) or Seeking Alpha
  ($20/mo). The Day Pass pricing is deliberately set so frequent purchases make Plus
  the clear upgrade.
- Annual discount (~30% off at $59/yr) incentivizes commitment and reduces churn.
- Demo login (admin / admin) unlocks all tiers for evaluation.

---

## User Flows

### Acquisition
Landing page: "Wall Street's top picks, simplified." Email capture + instant access
to Free tier.

### Onboarding
Goal quiz (Growth / Income / Balanced) + risk tolerance + region selection (US or
Germany) → personalized default filters, broker list, and a sample auto-mix. User
sees immediate value before any paywall.

### Discovery (Free)
Top 5 upside stocks → tap for summary → "Build a Mix" (1 free per month).
After first mix: "Execute on [Broker]" → broker comparison table (CPA event).

### Upgrade Trigger
- Attempts to view full list, build second mix, or save a watchlist → upgrade paywall.
- Two-option paywall: "Get a Day Pass for $2.99" (24h access) or "Go Plus for $6.99/mo"
  (unlimited). Day Pass is the low-friction option; Plus is the rational option for
  repeat users.
- After Day Pass expiry: contextual prompt showing features they used + upgrade nudge.

---

## Go-to-Market Strategy

### Phase 1: Organic / Community (Months 1–6)
- **SEO**: every ticker detail page is a public route optimized for "[TICKER] analyst
  target price", "[TICKER] upside potential" long-tail keywords. Target 500+
  indexable pages at launch.
- **Reddit / Discord / Twitter (FinTwit)**: share weekly "Top 5 Upside" posts in
  r/stocks, r/investing, r/ETFs, and FinTwit. Provide genuine value, link to tool.
- **German communities**: r/Finanzen, r/mauerstrassenwetten, finanzfluss.de community,
  and German-language FinTwit for Germany market outreach.
- **Product Hunt launch**: target a top-5 daily finish for initial traffic spike.
- **Referral program**: "Give a friend 1 month free Plus, get 1 month free." Viral
  coefficient target: 0.3 (each user brings 0.3 new users).

### Phase 2: Content & Partnerships (Months 6–12)
- **Weekly newsletter**: "The Upside Report" — top movers, new entries, market
  context. Build an owned email list (target 10k subscribers by month 12).
- **YouTube / podcast integrations**: sponsor or collaborate with beginner investing
  channels (financial education niche) in both English and German markets.
- **Broker partnerships**: co-marketing with broker affiliate programs. US and German
  brokers promote Bonifatus as a "portfolio builder" tool in their onboarding flows.

### Phase 3: Paid Acquisition (Month 12+, funded by revenue)
- Google Ads on high-intent keywords ("best stocks to buy now", "stock portfolio
  builder", "beste ETFs kaufen").
- Retargeting campaigns for users who signed up but didn't convert.
- Target CAC < $40, LTV:CAC > 3x before scaling spend.

---

## Feature Set

### MVP (Milestone 1–3)
- Smart Upside List: top stocks ranked by upside potential and conviction score.
- Auto-Mix Engine: dollar input → allocation with share counts, leftover cash, risk
  weighting.
- Broker Comparison: side-by-side table on every "Execute" action with affiliate
  attribution. Region-aware: US brokers for US users, German brokers for German users.
- ETF Explorer: top ETFs by category with basic metrics (1Y return, expense ratio).
- Onboarding: goal picker (Growth / Income / Balanced) + region selector → personalized
  default view.
- Auth: email/password + social login via Supabase Auth (free tier).
- Tier gating: Free vs Plus feature walls with upgrade prompts.

### V1 (Milestone 4–6)
- Watchlists and price-target alerts (Plus).
- Detail page: "Why this pick" plain-English explanation + analyst confidence badge.
- Filters: asset type, sector, risk level, investment horizon, region.
- Weekly email digest with top movers and new upside entries.
- Saved mixes with portfolio tracking (Plus).
- Germany regional expansion: XETRA stock coverage, German broker affiliates,
  German-language UI (i18n), Sparplan badges, Abgeltungssteuer tax notes.

### V2 (Post-launch)
- Mobile app (React Native/Expo) sharing TypeScript domain logic.
- Newsletter with sponsored slots.
- Push notifications for alerts (Plus).
- B2B/white-label API for the scoring engine.

---

## Tech Stack (MVP — free services only)

### Frontend
- Next.js 14+ (App Router) + Tailwind CSS
- Deployed on Vercel free tier (100GB bandwidth, serverless functions)

### Backend & Database
- Supabase free tier: auth (50k MAU), PostgreSQL (500MB), Row Level Security
- Upstash Redis free tier: rate limiting + response caching (10k commands/day)

### Data Feeds (free tiers, delayed/EOD)
- **Financial Modeling Prep** free tier: 250 requests/day — analyst ratings, price
  targets, company profiles, financial statements. Primary source for upside scoring.
  Also covers XETRA-listed stocks for Germany market.
- **Alpha Vantage** free tier: 25 requests/day — daily price history, technical
  indicators (SMA 200), ETF data. Used for trend guardrails and historical metrics.
- **Yahoo Finance (via yahoo-finance2 npm)**: unofficial but widely used — real-time-ish
  quotes, basic fundamentals. Supplementary/fallback; not relied on contractually.
- Strategy: cache aggressively in Supabase + Upstash. Nightly batch jobs refresh scores
  so user-facing requests hit cache, not APIs. Stays well within free-tier rate limits.

### Scheduled Jobs
- GitHub Actions (free for public repos, 2000 min/mo for private): nightly score
  computation, data refresh, alert evaluation.
- Vercel Cron (free tier: 2 cron jobs): daily cache warm-up, weekly top-5 rotation.

### Payments
- Stripe (no monthly fee, 2.9% + $0.30 per transaction): subscriptions, customer
  portal, webhook-driven tier upgrades. Free until you have paying customers.

### Affiliate Tracking
- UTM parameters + Supabase event log for broker click attribution.
- Server-side postback URLs where broker partners support them.

### Observability
- Sentry free tier (5k events/mo): error tracking.
- Vercel Analytics free tier: web vitals + page views.

### Cost at Launch: $0/mo
All services above operate within free tiers. First dollar of spend comes only when
usage exceeds free limits — likely well after revenue begins.

---

## Scoring (v1 formulas)

### Upside Potential
```
upside = (avgAnalystTarget - lastPrice) / lastPrice
```

### Conviction Multiplier
```
conviction = log(analystCount) * ((buys - sells) / totalRatings)
// Heavy penalty when analystCount < 5: multiply by (analystCount / 5)
```

### Composite Score
```
score = upside * conviction
// Filtered: only show if analystCount >= 3 and upside > 0
```

### ETF Stability Score
```
stability = (0.4 * normalizedCAGR) + (0.3 * (1 - normalizedExpenseRatio)) + (0.3 * (1 - normalizedMaxDrawdown))
```

### Trend Guardrail
```
if (lastPrice < sma200) flag "Below 200-day moving average — analyst targets may be optimistic"
```

---

## KPIs

### Activation
- % of new users completing onboarding quiz within first session.
- % of new users building a mix within 2 minutes.

### Revenue
- MRR and MRR growth (subscription).
- CPA revenue per month (broker comparison clicks → funded accounts).
- Blended ARPU across Free and Plus.
- LTV:CAC ratio by acquisition channel.

### Conversion Funnel
- Free → Day Pass purchase rate (target: 5–8%).
- Day Pass → Plus conversion rate (target: 25–35% within 60 days).
- Free → Plus direct conversion rate (target: 10–15%).
- Plus monthly retention rate (target: >95%).
- Pass type distribution (1-Day vs 3-Day vs 12-Day) and average pass revenue.
- Broker comparison click-through rate per "Execute" action.
- Broker click → funded account rate (depends on partner, track per broker).

### Engagement
- Weekly active users / Monthly active users ratio.
- Mixes built per user per month.
- Watchlist additions (Plus).
- Alert trigger → app open rate.

### Trust & Quality
- Average analyst count per displayed ticker.
- % of tickers shown with trend guardrail warning.
- Support tickets per 1k users.

### Churn
- Monthly churn for Plus (target: <5%).
- Churn reason survey on cancellation.

---

## Revenue Projections (conservative)

| Month | Free Users | Day Passes/mo | Plus Subs | Pass Rev/mo | Sub MRR | CPA/mo | Total MRR |
|-------|-----------|---------------|-----------|-------------|---------|--------|-----------|
| 3     | 500       | 30            | 25        | $180        | $175    | $100   | $455      |
| 6     | 2,000     | 150           | 150       | $900        | $1,049  | $500   | $2,449    |
| 9     | 5,000     | 350           | 400       | $2,100      | $2,796  | $1,500 | $6,396    |
| 12    | 10,000    | 600           | 800       | $3,600      | $5,592  | $3,000 | $12,192   |

Assumes 8% free-to-Plus conversion rate.
Day Pass assumes 6% of free users buy at least 1 pass/month, avg $6 per transaction
(blended across $2.99 single-day, $5.99 three-day, and $14.99 twelve-day passes).
30% of Day Pass users convert to Plus within 60 days (captured in Plus Subs growth).
Sub MRR calculated at $6.99/mo per Plus subscriber.
CPA assumes 2% of free+Plus+Pass broker clicks convert to funded accounts at $50 avg.

### Year 2–3 Growth Scenarios

| Scenario | Year 2 ARR | Year 3 ARR | Key Driver |
|----------|-----------|-----------|------------|
| Conservative (organic only) | $250k | $600k | SEO + referral; no paid acquisition |
| Base (organic + newsletter + partnerships) | $500k | $1.2M | Broker co-marketing, 15k email list, Germany market |
| Aggressive (add paid acquisition at LTV:CAC > 3x) | $1M | $2.5M+ | Google Ads, retargeting, mobile app |

---

## Break-Even Analysis

- $0 fixed costs at launch (all free tiers).
- First paid data upgrade (~$30–50/mo) needed around 2,000–5,000 free users when API
  rate limits are regularly hit.
- At 150 Plus subscribers ($1,049/mo MRR), revenue comfortably covers any paid API
  tier + domain + minor tooling costs.
- Gross margin stays above 90% at all scales — primary cost is data feeds, which scale
  in steps (not linearly with users) due to caching.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Free API rate limits hit during growth | Data staleness, broken UX | Aggressive caching (Supabase + Upstash); nightly batch refresh; upgrade to paid tiers using subscription revenue |
| Yahoo Finance unofficial API breaks | Loss of supplementary data | FMP + Alpha Vantage cover core needs; Yahoo is fallback only |
| Broker kills/pauses affiliate program | Revenue drop (secondary stream) | Multi-broker, multi-region comparison diversifies; subscription is primary revenue |
| Attribution loss (ad blockers, iOS privacy) | CPA tracking gaps | Server-side postbacks; UTM + first-party event logging in Supabase |
| Market downturn / target lag | Users lose trust in upside scores | Trend guardrail flags + volatility badges; rotate ETF-heavy defaults |
| Thin analyst coverage | Misleading scores on small caps | Minimum 3 analysts to display; warning banner on < 5; penalty in conviction score |
| Data compliance (redistribution) | Legal risk | Use APIs with commercial-friendly terms; display delayed data; add required attribution |
| Low free-to-paid conversion | Revenue shortfall | A/B test paywall placement; tighten free tier further if needed; optimize upgrade prompts |
| Larger competitor copies the auto-mix feature | Market share pressure | Speed to market + community trust; scoring IP + UX polish as differentiation; B2B licensing as hedged revenue |
| Germany regulatory complexity | BaFin compliance burden, tax calculation errors | Partner with German fintech legal counsel; Abgeltungssteuer info is educational only (not tax advice); clear disclaimers |

---

## Regulatory & Compliance Considerations

- **Not investment advice**: all screens display "For informational purposes only.
  Not financial advice." Disclaimers on every page and in Terms of Service.
- **Data redistribution**: use only APIs with commercial "display" licenses that permit
  delayed data on a consumer-facing product. No raw data resale.
- **Affiliate disclosure**: clearly labeled "We may earn a commission" on broker
  comparison tables. Compliant with FTC endorsement guidelines.
- **GDPR / privacy**: Supabase handles EU data storage; cookie consent banner; minimal
  PII collection (email, goal preference, tier). No selling of user data.
- **SEC / FINRA (US)**: Bonifatus does not execute trades, hold funds, or provide
  personalized investment advice. It is an information and education tool. Legal review
  recommended before launch to confirm no broker-dealer registration is required.
- **BaFin (Germany)**: same informational/educational positioning. Tax information
  (Abgeltungssteuer, Freibetrag) presented as general education, not personal tax
  advice. Comply with German Telemediengesetz (TMG) and Impressum requirements.

---

## Implementation Milestones

### Milestone 1 — Foundation (Weeks 1–3)
**Goal: project scaffold, data pipeline, scoring engine.**
- [ ] Next.js project setup with Tailwind, TypeScript, ESLint, app router structure.
- [ ] Supabase project: auth config (email + Google OAuth), DB schema (users, tickers,
      scores, mixes, events), Row Level Security policies.
- [ ] Data ingestion scripts: FMP for analyst data + company profiles, Alpha Vantage for
      price history + SMA 200. Store raw + computed data in Supabase.
- [ ] Scoring engine: implement upside, conviction, composite, and trend guardrail
      formulas. Run as GitHub Actions nightly cron writing results to Supabase.
- [ ] Upstash Redis integration for API response caching.
- [ ] Seed database with initial universe (~200 S&P 500 stocks + 30 popular ETFs).

### Milestone 2 — Core Product (Weeks 4–6)
**Goal: usable web app with upside list, auto-mix, and onboarding.**
- [ ] Auth pages: sign up, log in, password reset (Supabase Auth UI).
- [ ] Onboarding goal picker: Growth / Income / Balanced → save preference →
      personalized default sort/filter.
- [ ] Region selector: US or Germany → save preference → region-appropriate broker
      list, stock universe, and tax context.
- [ ] Upside List page: ranked table with ticker, name, upside %, conviction score,
      trend badge. Free users see top 5; Plus see full list.
- [ ] Auto-Mix Engine: dollar input + risk profile → weighted allocation across stocks
      + ETF anchor. Output: share counts, dollar amounts, leftover cash, risk breakdown.
- [ ] ETF Explorer: top ETFs by category (broad market, sector, bond, dividend) with
      1Y return, expense ratio, basic stats.
- [ ] Tier gating middleware: detect user tier, enforce feature limits, render upgrade
      prompts.
- [ ] Responsive layout: mobile-first, works on all screen sizes.

### Milestone 3 — Monetization (Weeks 7–9)
**Goal: Stripe subscriptions live, broker comparison functional, CPA tracking.**
- [ ] Stripe integration: Plus subscription plan, Day Pass (1-day, 3-day, 12-day)
      one-time payments, checkout flow, customer portal, webhook handlers for tier sync.
- [ ] Day Pass system: duration-based access timer, pass count tracking, expiry
      notifications, contextual upgrade prompts post-expiry.
- [ ] Broker Comparison component: on every "Execute" action, show side-by-side table
      of 3–4 brokers (region-appropriate) with fees, features, and affiliate deep links.
- [ ] Affiliate attribution: UTM parameter generation per broker link, click events
      logged to Supabase, server-side postback endpoints.
- [ ] Upgrade prompts: contextual paywalls when free users hit limits (full list,
      second mix, watchlist attempt).
- [ ] Landing / marketing page: value proposition, tier comparison, social proof
      placeholders, CTA to sign up.
- [ ] Sentry error tracking + Vercel Analytics setup.

### Milestone 4 — Engagement & Retention (Weeks 10–13)
**Goal: features that drive daily use and reduce churn.**
- [ ] Watchlists: save tickers, view watchlist dashboard with price changes and score
      updates (Plus).
- [ ] Price-target alerts: set target price per ticker, evaluate nightly via GitHub
      Actions, send email via Resend free tier (Plus).
- [ ] Detail page per ticker: "Why this pick" plain-English summary, analyst breakdown
      (buy/hold/sell counts), price vs target chart, trend guardrail, conviction badge.
- [ ] Saved mixes: name and save auto-mix results, view historical mixes (Plus).
- [ ] Filters on Upside List: sector, risk level, min/max upside, analyst coverage
      threshold.

### Milestone 5 — Growth & Optimization (Weeks 14–18)
**Goal: maximize conversion rates and ARPU.**
- [ ] Weekly email digest: top 5 movers, new entries, score changes. Sent via Resend
      free tier (100 emails/day).
- [ ] A/B test framework: test paywall copy, upgrade prompt placement, broker
      comparison layout variations.
- [ ] Referral program: "Give a friend 1 month free Plus, get 1 month free" — tracked
      via Supabase invite codes.
- [ ] SEO: ticker detail pages as public routes, OpenGraph tags, structured data for
      search.
- [ ] Social sharing: "My mix" shareable card/image for Twitter/Reddit/Discord.

### Milestone 6 — Regional Expansion (Weeks 19–24)
**Goal: full Germany market launch with localized experience.**
- [ ] German broker affiliates: integrate Trade Republic, Scalable Capital, ING, IBKR,
      Trading 212, and comdirect affiliate programs with CPA tracking.
- [ ] XETRA stock coverage: expand data universe via FMP to include DAX, MDAX, and
      popular XETRA-listed stocks and UCITS ETFs.
- [ ] German-language UI: implement i18n (next-intl or similar) with full German
      translation of all interface text, onboarding flows, and educational content.
- [ ] Sparplan badges: flag ETFs and stocks that support automated savings plans on
      popular German brokers (Trade Republic, Scalable Capital).
- [ ] Abgeltungssteuer tax notes: educational tax context on gains, showing estimated
      tax impact based on the EUR 1,000 Freibetrag and 25% + Soli rate. Clear "not tax
      advice" disclaimers.
- [ ] Region-specific SEO: German-language ticker pages targeting "beste Aktien kaufen",
      "ETF Sparplan Vergleich", and similar long-tail keywords.

---

## Team

*[To be completed — include founder backgrounds, relevant domain expertise in
fintech/data/product, and any advisors.]*

---

## Funding & Use of Funds

### Current Stage
Pre-seed / bootstrapped. MVP built on $0 infrastructure using free-tier services.

### If Raising (optional — include when pitching)

**Ask: $250k–$500k pre-seed**

| Use of Funds | Allocation | Purpose |
|-------------|-----------|---------|
| Engineering (contract/hire) | 45% | Accelerate Milestones 3–6; mobile app; Germany localization |
| Data feeds (paid tiers) | 15% | Upgrade to commercial data feeds for expanded stock coverage |
| Marketing & growth | 25% | Paid acquisition (once LTV:CAC proven), content, partnerships in US and Germany |
| Legal & compliance | 10% | SEC/FINRA review, BaFin guidance, terms of service, data licensing agreements |
| Buffer | 5% | Unexpected costs |

**Milestones the funding unlocks:**
- Full feature set (through Milestone 6) in 6 months instead of 6+ months solo.
- Paid data feeds for expanded XETRA and real-time coverage.
- Germany market launch with localized UI and broker partnerships.
- Paid acquisition to accelerate from 10k to 50k users.
- Legal sign-off to operate confidently at scale in both US and Germany.

**Runway:** 12–18 months at the above allocation, reaching $10k+ MRR before needing
additional capital.

---

## Long-Term Vision & Exit Potential

### Year 1: Tool
A best-in-class stock/ETF advisory tool for beginners in the US and Germany with
strong organic growth and proven unit economics.

### Year 2–3: Platform
Expand into a multi-asset, multi-region research platform — additional European
markets, crypto, fixed income. Add B2B/white-label licensing to fintechs. Newsletter
becomes an independent revenue channel.

### Year 4+: Data & Distribution Company
The scoring engine, user behavior data (anonymized), and broker comparison marketplace
become the core assets. Potential paths:
- **Acquisition target** for a broker (Robinhood, Trade Republic, Trading 212, eToro)
  seeking an embedded research/guidance layer.
- **Acquisition by a financial data company** (TipRanks, Morningstar, S&P Global)
  seeking beginner-market distribution.
- **Acquisition by a media/fintech company** (NerdWallet, Bankrate, LendingTree)
  seeking investment product vertical expansion.
- **Continue scaling independently** toward $10M+ ARR as a profitable SaaS business.

**Comparable exits:**
- NerdWallet IPO (2021): ~$5B valuation, built on financial product comparison + affiliate.
- TipRanks acquired by Priceline/Booking Holdings (2024): ~$200M, analyst-data SaaS.
- Simply Wall St: private, estimated $10M+ ARR from a visual stock analysis tool at $10/mo.

---

## Post-MVP Roadmap

- Mobile app (React Native/Expo) sharing TypeScript scoring/mix logic.
- Newsletter with sponsored ETF slots as additional revenue channel.
- B2B/white-label API: license scoring engine to fintechs and neobanks.
- Additional markets (UK, France, Netherlands): LSE, Euronext tickers + localized
  broker comparison and tax context.
- Tax-loss harvesting hints and portfolio rebalancing suggestions (Plus).
- AI-powered "explain this stock" using LLMs for plain-English ticker summaries.
- Community features: public mixes, most-mixed leaderboard, user sentiment signal.
