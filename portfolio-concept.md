# Bonistock — Portfolio Feature Concept

## What the app does today

Bonistock aggregates analyst consensus data across a curated universe of ~200 liquid stocks and ETFs. For each stock it tracks:

- The **current analyst price target** (consensus across all covering analysts)
- The **upside gap** — how far the current market price is below that target (e.g. "analysts see +38% upside")
- The **conviction score** — the split of analyst recommendations: strong buy / buy / hold / sell
- Daily end-of-day price history, sector, region, risk profile, dividend yield, and market cap band

Paying subscribers get access to the full ranked list, watchlist tracking, and pick history. Free users see a limited preview.

---

## The portfolio feature — concept

Today users can browse and watchlist individual stocks and ETFs. The portfolio feature extends this: instead of tracking individual titles, a user builds a **basket** — a weighted mix of stocks and/or ETFs — and tracks how that basket performs over time.

Critically, the portfolio is not generic. It is built on top of the analyst upside data that already powers the rest of the app. That is the differentiator.

---

## What makes it different from every other portfolio builder

Most portfolio tools track what you already own. Bonistock's portfolio builder is built around **what analysts collectively expect to happen** — before you own anything.

Every portfolio shows:

- **Weighted analyst upside** — if your basket has 10 holdings with different weights, the portfolio headline number is the weighted average of analyst upside across all of them. No other consumer tool surfaces this as a first-class metric.
- **Conviction score** — the weighted average buy/hold/sell ratio across holdings. A portfolio where 80% of analysts say buy tells a very different story than one where most say hold.
- **Return vs. analyst target** — how much of the analyst-predicted move has already materialised since the portfolio was formed.

This means a user isn't just asking "how did this perform?" — they're asking "how much of what analysts predicted has already happened, and how much runway is left?"

---

## Portfolio types

Six preset strategies, each with a clear one-line rationale. Users can use presets as-is or customise them.

### 1. Analyst Conviction
Holdings ranked by highest analyst upside with strong buy majorities. The most aggressive expression of the platform's core data.
> *"The stocks analysts are most bullish on right now."*

### 2. Balanced
Mix of lower-risk stocks and diversified ETFs, spread across sectors and regions.
> *"Steady exposure across the market, grounded in analyst consensus."*

### 3. Growth
Higher-risk stocks and growth-oriented ETFs with strong historical returns.
> *"For investors comfortable with volatility in exchange for higher potential upside."*

### 4. Value & Income
Lower-risk stocks trading below their 200-day average (potential value signal) plus dividend payers.
> *"Stocks that analysts think are underpriced and pay you while you wait."*

### 5. ETF Core
Diversified ETF-only basket, optimised for low fees and good risk-adjusted returns (Sharpe ratio).
> *"Set-and-forget market exposure at minimal cost."*

### 6. Sector Focus
Concentrate on one sector — Technology, Healthcare, Energy, Financials, etc.
> *"Targeted exposure if you have a view on a specific part of the economy."*

---

## Configuration options (available to paid users)

Users can filter the holding universe before building:

- **Risk level** — conservative / balanced / aggressive (or any mix)
- **Sector** — focus on or exclude specific sectors
- **Region** — global, European, US, Asian tilt
- **Minimum analyst upside** — only include stocks where analysts see at least X% remaining upside
- **Minimum analyst coverage** — exclude thinly-covered stocks (e.g. require at least 5 analysts)
- **Dividend-paying only** — for income-focused portfolios
- **Below 200-day average** — contrarian / value filter

**Weight modes:**
- **Equal weight** — simplest, each holding gets the same allocation
- **Upside-weighted** — holdings with higher analyst upside get a larger share automatically
- **Custom** — user sets percentages manually

---

## Performance tracking

Once a portfolio is saved, the user can track its return over standard time windows:

**1 week / 1 month / 3 months / 6 months / 1 year / Custom range**

The chart shows a normalised line starting at 100 — the same format as index charts. An optional benchmark line (e.g. S&P 500 equivalent) can be overlaid for context.

Summary stats always visible:
- **Portfolio return %** for the selected period
- **Weighted analyst upside remaining** — how much runway is left according to current targets
- **Win rate** — percentage of holdings that are positive over the period
- **Conviction score** — aggregate buy/hold/sell sentiment

Performance is based on daily end-of-day prices, updated once per day. This is clearly labelled as historical/statistical illustration, not a real-time trading signal.

---

## Access model

| Capability | Free | Paid |
|-----------|------|------|
| View demo portfolios (preset, anonymised) | ✓ | ✓ |
| See performance charts on demo portfolios | ✓ | ✓ |
| Build and save custom portfolios | — | ✓ |
| Access full holding detail in portfolios | — | ✓ |
| Track portfolio performance over time | — | ✓ |
| Configure filters and weights | — | ✓ |

The demo portfolios on the landing page serve as the conversion hook: free users see what the feature looks like and what they'd be tracking, but can't act on it without upgrading.

---

## Positioning

The framing throughout is statistical and analytical — never financial advice.

> *"These portfolios are built on analyst consensus price targets. They are statistical illustrations of how a rules-based selection of assets has performed historically. This is not investment advice. Past performance does not predict future results. Data is updated once daily using end-of-day prices."*

The USP isn't "we tell you what to buy." It's "we show you what the collective analyst community expects, translated into a portfolio format you can track — and we keep updating it as the data changes."

That's a meaningful, defensible product position. It is genuinely difficult to replicate without the underlying analyst data pipeline.
