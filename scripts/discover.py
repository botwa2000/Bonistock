#!/usr/bin/env python3
"""
Bonistock Multi-Provider Stock Discovery

Runs daily via system crontab on the Hetzner host.
Uses yfinance (primary) + Finnhub (supplement) to discover high-upside stocks.
Fetches data ONCE, writes to prod DB, then copies the same data to dev DB.

Reads all credentials from Docker Swarm secrets (mounted in running containers).

Usage:
    python3 scripts/discover.py              # full run: fetch → prod → dev
    python3 scripts/discover.py --dry-run    # print results, no DB writes
    python3 scripts/discover.py --prod-only  # write to prod only, skip dev copy
"""

import argparse
import math
import os
import re
import secrets
import string
import subprocess
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

import psycopg2
import psycopg2.extras
import yfinance as yf

# Optional: Finnhub
try:
    import finnhub
except ImportError:
    finnhub = None


# ── CUID generator (Prisma-compatible) ──

def cuid():
    """Generate a CUID-compatible ID matching Prisma's @default(cuid())."""
    ts = hex(int(time.time() * 1000))[2:]
    rand = "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(16))
    return f"c{ts}{rand}"[:25]


# ── Docker Swarm secret reader ──

def read_docker_secret(stack_name, secret_name):
    """Read a Docker Swarm secret from a running container in the given stack."""
    try:
        result = subprocess.run(
            ["docker", "ps", "-q", "-f", f"name={stack_name}_app"],
            capture_output=True, text=True, timeout=5,
        )
        container_id = result.stdout.strip().split("\n")[0]
        if not container_id:
            return None

        result = subprocess.run(
            ["docker", "exec", container_id, "cat", f"/run/secrets/{secret_name}"],
            capture_output=True, text=True, timeout=5,
        )
        return result.stdout.strip() if result.returncode == 0 else None
    except Exception as e:
        print(f"  [secrets] Could not read {secret_name}: {e}")
        return None


def parse_database_url(url):
    """Parse a PostgreSQL DATABASE_URL into connection kwargs.

    Replaces Docker bridge IP (172.x.x.x) with localhost since this script
    runs on the host, not inside Docker.
    """
    parsed = urlparse(url)
    host = parsed.hostname or "localhost"
    # Docker containers use bridge IP; host script uses localhost
    if host.startswith("172."):
        host = "localhost"
    return {
        "host": host,
        "port": parsed.port or 5432,
        "dbname": parsed.path.lstrip("/"),
        "user": parsed.username,
        "password": parsed.password,
    }


# ── Seed symbols (fallback when screener returns <50) ──
# Extracted from the existing STOCK_UNIVERSE in fmp.ts, plus EU/Asia with proper suffixes.

SEED_SYMBOLS = [
    # US Mega / Large caps
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B", "JPM", "V",
    "UNH", "XOM", "JNJ", "MA", "PG", "HD", "COST", "ABBV", "MRK", "CVX",
    "LLY", "AVGO", "KO", "PEP", "ADBE", "CRM", "WMT", "BAC", "NFLX", "AMD",
    "TMO", "MCD", "CSCO", "DIS", "ABT", "INTC", "QCOM", "CMCSA", "TXN", "PM",
    "HON", "NEE", "LOW", "UNP", "AMGN", "IBM", "GE", "CAT", "BA", "ISRG",
    "SYK", "AXP", "GS", "MDLZ", "PLD", "BLK", "GILD", "ADI", "PANW", "LRCX",
    "KLAC", "MMC", "SCHW", "CB", "ANET", "SNPS", "CDNS", "VRTX", "REGN", "MU",
    "NOW", "UBER", "ABNB", "SPOT", "DASH", "COIN", "SQ", "PLTR", "CRWD", "SNOW",
    "ZS", "NET", "DDOG", "MRVL", "ON", "ARM", "SMCI",
    # US Mid caps
    "HUBS", "TTD", "BILL", "PCOR", "ZI", "CFLT", "MDB", "ESTC", "OKTA",
    "TWLO", "GTLB", "DKNG", "RIVN", "LCID", "SOFI", "HOOD", "RBLX", "U", "PATH",
    "APP", "CELH", "CART", "BIRK", "DUOL", "CAVA", "TOST", "DOCS", "SMMT", "EXAS",
    # US Energy / Industrials
    "COP", "EOG", "SLB", "DVN", "MPC", "PSX", "VLO", "OXY", "HAL",
    "LMT", "RTX", "NOC", "GD", "HII", "TDG", "WM", "RSG",
    # US Healthcare
    "PFE", "BMY", "MRNA", "ZTS", "CI", "ELV", "HCA", "DXCM", "IDXX", "IQV",
    # US Financial / RE
    "MS", "C", "USB", "PNC", "TFC", "SPGI", "ICE", "CME", "AMT", "CCI", "EQIX",
    # Europe (with exchange suffixes)
    "SAP.DE", "SIE.DE", "ALV.DE", "BAS.DE", "DTE.DE",             # Germany / XETRA
    "ASML.AS", "PHIA.AS", "UNA.AS",                                # Netherlands / Euronext
    "MC.PA", "OR.PA", "AIR.PA", "BN.PA", "SAN.PA", "BNP.PA",     # France / Euronext Paris
    "AZN.L", "SHEL.L", "HSBA.L", "ULVR.L", "BP.L", "GSK.L",     # UK / London
    "NESN.SW", "ROG.SW", "NOVN.SW",                                # Switzerland / SIX
    "ENEL.MI", "ISP.MI",                                           # Italy / Milan
    "NVO", "NOVO-B.CO",                                            # Denmark (US ADR + local)
    # Asia
    "7203.T", "6758.T", "8306.T", "9984.T", "6861.T",             # Japan / Tokyo
    "0700.HK", "9988.HK", "1299.HK", "0005.HK", "2318.HK",       # Hong Kong
    "005930.KS", "000660.KS", "035420.KS",                         # South Korea
    # Emerging (US-listed ADRs)
    "BABA", "JD", "PDD", "BIDU", "NIO", "LI", "XPEV", "MELI", "NU", "GLOB",
    "INFY", "WIT", "HDB", "TSM", "ASML",
]


# ── Yahoo Finance exchange codes for screener ──

US_EXCHANGES = ["NMS", "NYQ", "ASE"]  # NASDAQ, NYSE, AMEX

US_CAP_BANDS = [
    {"label": "mega", "min_cap": 200_000_000_000, "max_cap": None, "size": 250},
    {"label": "large", "min_cap": 10_000_000_000, "max_cap": 200_000_000_000, "size": 250},
    {"label": "mid", "min_cap": 2_000_000_000, "max_cap": 10_000_000_000, "size": 250},
]

REGION_SCREENS = {
    "gb": {"exchanges": ["LSE"], "min_cap": 5_000_000_000, "size": 100},
    "de": {"exchanges": ["GER"], "min_cap": 5_000_000_000, "size": 100},
    "fr": {"exchanges": ["PAR"], "min_cap": 5_000_000_000, "size": 100},
    "nl": {"exchanges": ["AMS"], "min_cap": 5_000_000_000, "size": 100},
    "it": {"exchanges": ["MIL"], "min_cap": 5_000_000_000, "size": 100},
    "ch": {"exchanges": ["EBS"], "min_cap": 5_000_000_000, "size": 100},
    "jp": {"exchanges": ["JPX"], "min_cap": 5_000_000_000, "size": 100},
    "hk": {"exchanges": ["HKG"], "min_cap": 5_000_000_000, "size": 100},
    "kr": {"exchanges": ["KSC", "KOE"], "min_cap": 5_000_000_000, "size": 100},
}


# ── Derive helpers (match TypeScript logic in stock-discovery.ts) ──

def derive_region(exchange: str) -> str:
    ex = (exchange or "").upper()
    if any(k in ex for k in ["NYSE", "NASDAQ", "AMEX", "NMS", "NYQ", "ASE", "NAS"]):
        return "us"
    if any(k in ex for k in [
        "XETRA", "EURONEXT", "LONDON", "COPENHAGEN", "AMSTERDAM", "PARIS",
        "MILAN", "ZURICH", "SIX", "GER", "PAR", "AMS", "LSE", "MIL", "EBS",
    ]):
        return "europe"
    return "em"


def derive_market_cap_label(mkt_cap) -> str:
    if not mkt_cap:
        return "mid"
    if mkt_cap > 200_000_000_000:
        return "mega"
    if mkt_cap > 10_000_000_000:
        return "large"
    if mkt_cap > 2_000_000_000:
        return "mid"
    return "small"


def derive_risk(mkt_cap) -> str:
    if not mkt_cap:
        return "BALANCED"
    if mkt_cap > 100_000_000_000:
        return "LOW"
    if mkt_cap < 20_000_000_000:
        return "HIGH"
    return "BALANCED"


def derive_brokers(exchange: str) -> list:
    ex = (exchange or "").upper()
    if any(k in ex for k in ["NYSE", "NASDAQ", "AMEX", "NMS", "NYQ", "ASE", "NAS"]):
        return ["ibkr", "t212", "robinhood", "etoro"]
    if any(k in ex for k in ["XETRA", "GER"]):
        return ["ibkr", "traderepublic", "scalable", "ing", "comdirect"]
    if any(k in ex for k in ["EURONEXT", "AMSTERDAM", "PARIS", "AMS", "PAR"]):
        return ["ibkr", "t212", "etoro"]
    if any(k in ex for k in ["LONDON", "LSE"]):
        return ["ibkr", "t212"]
    return ["ibkr", "t212", "etoro"]


# ── Phase 1: Discover candidates via yfinance screener ──

def build_screener_body(exchanges, min_cap, max_cap=None, size=250):
    """Build a Yahoo Finance screener request body."""
    operands = [
        {"operator": "GT", "operands": ["intradaymarketcap", min_cap]},
    ]
    if max_cap:
        operands.append({"operator": "LT", "operands": ["intradaymarketcap", max_cap]})

    if len(exchanges) == 1:
        operands.append({"operator": "EQ", "operands": ["exchange", exchanges[0]]})
    else:
        operands.append({
            "operator": "OR",
            "operands": [
                {"operator": "EQ", "operands": ["exchange", ex]}
                for ex in exchanges
            ],
        })

    return {
        "offset": 0,
        "size": size,
        "sortField": "intradaymarketcap",
        "sortType": "DESC",
        "quoteType": "EQUITY",
        "query": {
            "operator": "AND",
            "operands": operands,
        },
    }


def run_screener(body):
    """Run a single yfinance screener call and return list of symbols."""
    try:
        sc = yf.Screener()
        sc.set_body(body)
        response = sc.response

        quotes = []
        if isinstance(response, dict):
            quotes = response.get("quotes", [])
            # Alternate response format
            if not quotes and "finance" in response:
                results = response["finance"].get("result", [{}])
                if results:
                    quotes = results[0].get("quotes", [])

        return [q["symbol"] for q in quotes if q.get("symbol")]
    except Exception as e:
        print(f"  [screener] Error: {e}")
        return []


def discover_candidates():
    """Phase 1: Find candidate symbols using yfinance screener + seed list fallback."""
    symbols = set()

    # US screens (3 market cap bands)
    print("[phase1] Screening US stocks by market cap band...")
    for band in US_CAP_BANDS:
        body = build_screener_body(
            US_EXCHANGES, band["min_cap"], band["max_cap"], band["size"]
        )
        found = run_screener(body)
        print(f"  US {band['label']}: {len(found)} symbols")
        symbols.update(found)
        time.sleep(0.5)

    # EU/Asia screens (9 regions)
    print("[phase1] Screening EU/Asia stocks...")
    for region_code, cfg in REGION_SCREENS.items():
        body = build_screener_body(cfg["exchanges"], cfg["min_cap"], size=cfg["size"])
        found = run_screener(body)
        print(f"  {region_code.upper()}: {len(found)} symbols")
        symbols.update(found)
        time.sleep(0.5)

    print(f"[phase1] Screener found {len(symbols)} unique symbols")

    # Fallback: merge seed list if screener returned too few
    if len(symbols) < 50:
        print(f"[phase1] Screener returned <50, merging seed list ({len(SEED_SYMBOLS)} symbols)")
        symbols.update(SEED_SYMBOLS)

    return list(symbols)


# ── Phase 2: Fetch data per candidate via yfinance ──

def fetch_stock_data(symbol):
    """Fetch price targets, analyst recs, and info for a single symbol."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info or {}

        price = (
            info.get("currentPrice")
            or info.get("regularMarketPrice")
            or info.get("previousClose")
        )
        if not price or price <= 0:
            return None

        # Price targets
        targets = {}
        try:
            pt = ticker.analyst_price_targets
            if pt is not None:
                if isinstance(pt, dict):
                    targets = pt
                else:
                    # pandas Series or named tuple
                    targets = {
                        "mean": getattr(pt, "mean", None) or getattr(pt, "current", None),
                        "median": getattr(pt, "median", None),
                        "high": getattr(pt, "high", None),
                        "low": getattr(pt, "low", None),
                    }
        except Exception:
            pass

        target_price = targets.get("mean") or targets.get("median") or targets.get("current")
        if not target_price or target_price <= 0:
            return None

        # Analyst recommendations (most recent period)
        buys, holds, sells = 0, 0, 0
        try:
            recs = ticker.recommendations
            if recs is not None and hasattr(recs, "empty") and not recs.empty:
                latest = recs.iloc[-1]
                buys = int(latest.get("strongBuy", 0) or 0) + int(latest.get("buy", 0) or 0)
                holds = int(latest.get("hold", 0) or 0)
                sells = int(latest.get("sell", 0) or 0) + int(latest.get("strongSell", 0) or 0)
        except Exception:
            pass

        analysts = buys + holds + sells

        return {
            "symbol": symbol,
            "name": info.get("shortName") or info.get("longName") or symbol,
            "price": round(price, 2),
            "target": round(target_price, 2),
            "upside": round(((target_price - price) / price) * 100, 1),
            "buys": buys,
            "holds": holds,
            "sells": sells,
            "analysts": analysts,
            "sector": info.get("sector") or "Unknown",
            "exchange": info.get("exchange") or "",
            "currency": info.get("currency") or "USD",
            "market_cap_raw": info.get("marketCap") or 0,
            "dividend_yield": info.get("dividendYield"),
            "two_hundred_day_avg": info.get("twoHundredDayAverage"),
            "description": (info.get("longBusinessSummary") or "")[:500],
        }
    except Exception as e:
        print(f"  [fetch] Error for {symbol}: {e}")
        return None


# ── Phase 3: Finnhub supplement ──

def supplement_with_finnhub(stocks, api_key):
    """Add analyst data from Finnhub for stocks with 0 analysts."""
    if not api_key or finnhub is None:
        print("[phase3] Finnhub skipped (no API key or package not installed)")
        return

    client = finnhub.Client(api_key=api_key)
    sparse = [s for s in stocks if s["analysts"] == 0]
    print(f"[phase3] Supplementing {len(sparse)} stocks via Finnhub...")

    supplemented = 0
    for stock in sparse:
        try:
            sym = stock["symbol"]
            trends = client.recommendation_trends(sym)
            if trends:
                latest = trends[0]
                b = (latest.get("strongBuy", 0) or 0) + (latest.get("buy", 0) or 0)
                h = latest.get("hold", 0) or 0
                s = (latest.get("sell", 0) or 0) + (latest.get("strongSell", 0) or 0)
                total = b + h + s
                if total > 0:
                    stock["buys"] = b
                    stock["holds"] = h
                    stock["sells"] = s
                    stock["analysts"] = total
                    supplemented += 1
        except Exception as e:
            print(f"  [finnhub] Error for {stock['symbol']}: {e}")
        time.sleep(1.1)  # 60 calls/min limit

    print(f"[phase3] Supplemented {supplemented} stocks with Finnhub data")


# ── Phase 4: Rank and filter ──

def rank_and_filter(stocks):
    """Filter and rank stocks by upside * log(1 + analysts)."""
    filtered = [
        s for s in stocks
        if s["upside"] > 0 and s["upside"] < 200 and s["analysts"] >= 1
    ]

    for s in filtered:
        s["score"] = s["upside"] * math.log(1 + s["analysts"])

    filtered.sort(key=lambda s: s["score"], reverse=True)
    return filtered


# ── Phase 5: Persist to PostgreSQL ──

def get_db_connection(stack_name, secret_name):
    """Connect to PostgreSQL by reading DATABASE_URL from a Docker Swarm secret."""
    db_url = read_docker_secret(stack_name, secret_name)
    if not db_url:
        raise RuntimeError(
            f"Could not read {secret_name} from {stack_name} container. "
            f"Is the stack running?"
        )

    params = parse_database_url(db_url)
    print(f"  [db] Connecting to {params['dbname']} on {params['host']}:{params['port']}")
    return psycopg2.connect(**params)


def persist_stocks(stocks, conn, label=""):
    """Upsert stocks into PostgreSQL (stocks, stock_brokers, stock_snapshots)."""
    cur = conn.cursor()
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    upserted = 0
    snapshot_count = 0

    for s in stocks:
        try:
            stock_id = cuid()
            region = derive_region(s["exchange"])
            risk = derive_risk(s["market_cap_raw"])
            mkt_cap_label = derive_market_cap_label(s["market_cap_raw"])
            brokers = derive_brokers(s["exchange"])
            upside_int = round(s["upside"])
            below_sma200 = bool(
                s.get("two_hundred_day_avg")
                and s["price"] < s["two_hundred_day_avg"]
            )
            why = f"Price target of ${round(s['target'])} implies {upside_int}% upside from current levels."
            div_yield = round(s["dividend_yield"], 4) if s.get("dividend_yield") else None

            # UPSERT into stocks table
            # Preserve existing sector/description if new value is "Unknown"/empty
            cur.execute("""
                INSERT INTO stocks (
                    id, symbol, name, price, target, upside,
                    buys, holds, sells, analysts,
                    sector, risk, horizon, region, exchange, currency,
                    "dividendYield", "marketCap", description, "whyThisPick",
                    "belowSma200", "updatedAt"
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s::"RiskLevel", %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s
                )
                ON CONFLICT (symbol) DO UPDATE SET
                    name = CASE
                        WHEN EXCLUDED.name != '' AND EXCLUDED.name != stocks.symbol
                        THEN EXCLUDED.name ELSE stocks.name END,
                    price = EXCLUDED.price,
                    target = EXCLUDED.target,
                    upside = EXCLUDED.upside,
                    buys = EXCLUDED.buys,
                    holds = EXCLUDED.holds,
                    sells = EXCLUDED.sells,
                    analysts = EXCLUDED.analysts,
                    sector = CASE
                        WHEN EXCLUDED.sector != 'Unknown' AND EXCLUDED.sector != ''
                        THEN EXCLUDED.sector ELSE stocks.sector END,
                    risk = EXCLUDED.risk,
                    region = EXCLUDED.region,
                    exchange = CASE
                        WHEN EXCLUDED.exchange != ''
                        THEN EXCLUDED.exchange ELSE stocks.exchange END,
                    currency = EXCLUDED.currency,
                    "dividendYield" = EXCLUDED."dividendYield",
                    "marketCap" = EXCLUDED."marketCap",
                    description = CASE
                        WHEN EXCLUDED.description != ''
                        THEN EXCLUDED.description ELSE stocks.description END,
                    "whyThisPick" = EXCLUDED."whyThisPick",
                    "belowSma200" = EXCLUDED."belowSma200",
                    "updatedAt" = EXCLUDED."updatedAt"
                RETURNING id
            """, (
                stock_id, s["symbol"], s["name"], s["price"], s["target"], upside_int,
                s["buys"], s["holds"], s["sells"], s["analysts"],
                s["sector"], risk, "12M", region, s["exchange"], s["currency"],
                div_yield, mkt_cap_label, s.get("description", ""), why,
                below_sma200, today,
            ))

            row = cur.fetchone()
            actual_id = row[0] if row else stock_id
            upserted += 1

            # Update broker availability
            cur.execute('DELETE FROM stock_brokers WHERE "stockId" = %s', (actual_id,))
            for broker_id in brokers:
                cur.execute("""
                    INSERT INTO stock_brokers ("stockId", "brokerId")
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                """, (actual_id, broker_id))

            # UPSERT snapshot
            snapshot_id = cuid()
            cur.execute("""
                INSERT INTO stock_snapshots (
                    id, symbol, name, price, target, upside,
                    buys, holds, sells, analysts,
                    sector, risk, region, "marketCap", date
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s::"RiskLevel", %s, %s, %s
                )
                ON CONFLICT (symbol, date) DO UPDATE SET
                    name = EXCLUDED.name,
                    price = EXCLUDED.price,
                    target = EXCLUDED.target,
                    upside = EXCLUDED.upside,
                    buys = EXCLUDED.buys,
                    holds = EXCLUDED.holds,
                    sells = EXCLUDED.sells,
                    analysts = EXCLUDED.analysts,
                    sector = EXCLUDED.sector,
                    risk = EXCLUDED.risk,
                    region = EXCLUDED.region,
                    "marketCap" = EXCLUDED."marketCap"
            """, (
                snapshot_id, s["symbol"], s["name"], s["price"], s["target"], upside_int,
                s["buys"], s["holds"], s["sells"], s["analysts"],
                s["sector"], risk, region, mkt_cap_label, today,
            ))
            snapshot_count += 1

        except Exception as e:
            print(f"  [persist] Error for {s['symbol']}: {e}")
            conn.rollback()
            continue

    # Clean up: delete stocks with upside <= 0 or >= 200
    try:
        cur.execute("DELETE FROM stocks WHERE upside <= 0 OR upside >= 200")
        deleted = cur.rowcount
    except Exception:
        deleted = 0

    conn.commit()
    cur.close()

    print(f"  [{label}] Upserted {upserted} stocks, {snapshot_count} snapshots, deleted {deleted} stale")


# ── Main ──

def main():
    parser = argparse.ArgumentParser(description="Bonistock Multi-Provider Stock Discovery")
    parser.add_argument("--dry-run", action="store_true", help="Print results without writing to DB")
    parser.add_argument("--prod-only", action="store_true", help="Write to prod only, skip dev copy")
    args = parser.parse_args()

    start = time.time()
    dry_label = " [DRY RUN]" if args.dry_run else ""
    print(f"=== Bonistock Discovery{dry_label} ===")
    print(f"Started at {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")

    # Read Finnhub API key from Docker Swarm secret (optional)
    finnhub_key = read_docker_secret("bonistock-prod", "bonistock_prod_FINNHUB_API_KEY")

    # Phase 1: Discover candidates
    candidates = discover_candidates()
    print(f"[phase1] Total candidates: {len(candidates)}")

    # Phase 2: Fetch data per candidate
    print(f"[phase2] Fetching data for {len(candidates)} candidates...")
    stocks = []
    for i, sym in enumerate(candidates):
        if i > 0 and i % 50 == 0:
            print(f"  [phase2] Progress: {i}/{len(candidates)} ({len(stocks)} valid so far)")
        data = fetch_stock_data(sym)
        if data:
            stocks.append(data)
        time.sleep(0.5)
    print(f"[phase2] Got data for {len(stocks)} stocks")

    # Phase 3: Finnhub supplement
    supplement_with_finnhub(stocks, finnhub_key)

    # Phase 4: Rank and filter
    ranked = rank_and_filter(stocks)
    print(f"[phase4] {len(ranked)} stocks pass filters (upside >0%, <200%, >=1 analyst)")

    # Print top results
    header = f"{'Rank':<5} {'Symbol':<12} {'Price':>8} {'Target':>8} {'Upside':>7} {'Analysts':>9} {'Score':>7} {'Region':<8} Sector"
    print(f"\n{header}")
    print("-" * 95)
    for i, s in enumerate(ranked[:30], 1):
        region = derive_region(s["exchange"])
        print(
            f"{i:<5} {s['symbol']:<12} {s['price']:>8.2f} {s['target']:>8.2f}"
            f" {s['upside']:>6.1f}% {s['analysts']:>9} {s['score']:>7.1f}"
            f" {region:<8} {s['sector']}"
        )
    if len(ranked) > 30:
        print(f"  ... and {len(ranked) - 30} more")

    # Region distribution
    regions = {}
    for s in ranked:
        r = derive_region(s["exchange"])
        regions[r] = regions.get(r, 0) + 1
    print(f"\nRegion distribution: {regions}")

    if args.dry_run:
        print(f"\n[dry-run] Would persist {len(ranked)} stocks. No DB writes.")
        elapsed = time.time() - start
        print(f"\n=== Done in {elapsed:.0f}s ===")
        return

    # Phase 5a: Persist to prod
    print(f"\n[phase5] Writing {len(ranked)} stocks to PROD...")
    prod_conn = get_db_connection("bonistock-prod", "bonistock_prod_DATABASE_URL")
    try:
        persist_stocks(ranked, prod_conn, label="prod")
    finally:
        prod_conn.close()

    # Phase 5b: Copy same data to dev (no additional API calls)
    if not args.prod_only:
        print(f"[phase5] Copying {len(ranked)} stocks to DEV...")
        try:
            dev_conn = get_db_connection("bonistock-dev", "bonistock_dev_DATABASE_URL")
            try:
                persist_stocks(ranked, dev_conn, label="dev")
            finally:
                dev_conn.close()
        except Exception as e:
            print(f"  [dev] Could not copy to dev (non-fatal): {e}")

    elapsed = time.time() - start
    print(f"\n=== Done in {elapsed:.0f}s ===")


if __name__ == "__main__":
    main()
