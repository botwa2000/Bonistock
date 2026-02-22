#!/usr/bin/env python3
"""
Bonistock ETF Discovery

Runs daily via system crontab on the Hetzner host.
Uses yfinance to fetch ETF performance metrics for a curated universe of ~150 ETFs.
Fetches data ONCE, writes to prod DB, then copies the same data to dev DB.

Reads all credentials from Docker Swarm secrets (mounted in running containers).

Usage:
    python3 scripts/etf-discover.py              # full run: fetch -> prod -> dev
    python3 scripts/etf-discover.py --dry-run    # print results, no DB writes
    python3 scripts/etf-discover.py --prod-only  # write to prod only, skip dev copy
"""

import argparse
import math
import secrets
import string
import subprocess
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

import numpy as np
import psycopg2
import psycopg2.extras
import yfinance as yf


def to_float(val):
    """Convert numpy/pandas numeric types to Python float for psycopg2."""
    if val is None:
        return None
    return float(val)


# -- CUID generator (Prisma-compatible) --

def cuid():
    """Generate a CUID-compatible ID matching Prisma's @default(cuid())."""
    ts = hex(int(time.time() * 1000))[2:]
    rand = "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(16))
    return f"c{ts}{rand}"[:25]


# -- Docker Swarm secret reader --

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


# -- ETF Universe (~150 symbols) --

ETF_UNIVERSE = [
    # US Core
    "SPY", "VOO", "VTI", "IVV", "SPLG",
    # US Growth/Tech
    "QQQ", "QQQM", "VGT", "XLK", "SOXX", "SMH", "IGV",
    # US Dividend
    "SCHD", "VYM", "DGRO", "DVY", "HDV", "JEPI", "JEPQ",
    # US Small/Mid
    "IWM", "VB", "VO", "IJR", "MDY", "AVUV",
    # US Sectors
    "XLF", "XLE", "XLV", "XLI", "XLY", "XLP", "XLU", "XLRE", "VNQ", "XBI", "ITA",
    # US Bonds
    "BND", "AGG", "TLT", "IEF", "TIPS", "LQD", "HYG", "SHY",
    # International
    "VXUS", "VEA", "IEFA", "VWO", "EEM", "INDA", "EWJ", "EWG", "EWU",
    # Commodity/Real Assets
    "GLD", "IAU", "SLV", "DBA", "DBC",
    # European UCITS
    "VWCE.DE", "IWDA.AS", "XDWD.DE", "CSPX.L", "ISAC.DE", "EIMI.L",
    "DBXD.DE", "VUSA.L", "IUSQ.DE", "EUNL.DE", "IS3N.DE", "IUSN.DE",
    "ZPRV.DE", "ZPRX.DE", "SXR8.DE", "MEUD.PA",
]


# -- Category-to-theme mapping --

CATEGORY_TO_THEME = {
    "Large Blend": "Core US Market",
    "Large Growth": "Growth / Tech",
    "Large Value": "Value",
    "Mid-Cap Blend": "Mid Cap",
    "Mid-Cap Growth": "Growth / Tech",
    "Small Blend": "Small Cap",
    "Small Growth": "Small Cap",
    "Small Value": "Small Cap Value",
    "Technology": "Technology Sector",
    "Communications": "Communications",
    "Health": "Healthcare",
    "Financial": "Financials",
    "Real Estate": "Real Estate",
    "Consumer Cyclical": "Consumer",
    "Consumer Defensive": "Consumer Staples",
    "Industrials": "Industrials",
    "Energy": "Energy",
    "Utilities": "Utilities",
    "Natural Resources": "Commodities",
    "Precious Metals": "Commodities",
    "Foreign Large Blend": "International",
    "Foreign Large Growth": "International Growth",
    "Foreign Large Value": "International Value",
    "Diversified Emerging Mkts": "Emerging Markets",
    "China Region": "China",
    "India Equity": "India",
    "Japan Stock": "Japan",
    "Europe Stock": "Europe",
    "World Large Stock": "Core Global Market",
    "World Stock": "Core Global Market",
    "Intermediate Core Bond": "Bonds / Stability",
    "Intermediate Core-Plus Bond": "Bonds / Stability",
    "Long Government": "Bonds / Stability",
    "Short Government": "Bonds / Stability",
    "High Yield Bond": "High Yield Bonds",
    "Inflation-Protected Bond": "Inflation Protection",
    "Corporate Bond": "Corporate Bonds",
    "Equity Energy": "Energy",
    "Trading--Leveraged Equity": "Leveraged",
    "Trading--Inverse Equity": "Inverse",
}


UCITS_THEME_MAP = {
    "VWCE.DE": "Core Global Market",
    "IWDA.AS": "Core Global Market",
    "XDWD.DE": "Core Global Market",
    "CSPX.L": "Core US Market",
    "ISAC.DE": "Core Global Market",
    "EIMI.L": "Emerging Markets",
    "DBXD.DE": "Germany (DAX)",
    "VUSA.L": "Core US Market",
    "IUSQ.DE": "Core Global Market",
    "EUNL.DE": "Core Global Market",
    "IS3N.DE": "Emerging Markets",
    "IUSN.DE": "Small Cap",
    "ZPRV.DE": "Small Cap Value",
    "ZPRX.DE": "Europe Small Cap Value",
    "SXR8.DE": "Core US Market",
    "MEUD.PA": "Europe",
}


def map_theme(category, symbol=None):
    """Map a yfinance ETF category to a human-readable theme.

    For European UCITS ETFs, yfinance often has no category field.
    We use a symbol-based lookup with known, factual categorizations.
    """
    if symbol and symbol in UCITS_THEME_MAP:
        return UCITS_THEME_MAP[symbol]
    if not category:
        return "Other"
    for key, theme in CATEGORY_TO_THEME.items():
        if key.lower() in category.lower():
            return theme
    return category  # Use raw category as fallback


# -- Derive helpers (match TypeScript logic) --

def derive_region(exchange):
    """Derive region from exchange string."""
    ex = (exchange or "").upper()
    if any(k in ex for k in ["NYSE", "NASDAQ", "AMEX", "NMS", "NYQ", "ASE", "NAS", "PCX", "BTS"]):
        return "us"
    if any(k in ex for k in [
        "XETRA", "EURONEXT", "LONDON", "COPENHAGEN", "AMSTERDAM", "PARIS",
        "MILAN", "ZURICH", "SIX", "GER", "PAR", "AMS", "LSE", "MIL", "EBS",
    ]):
        return "europe"
    return "global"


def derive_brokers(exchange):
    """Derive available brokers from exchange string."""
    ex = (exchange or "").upper()
    if any(k in ex for k in ["NYSE", "NASDAQ", "AMEX", "NMS", "NYQ", "ASE", "NAS", "PCX", "BTS"]):
        return ["ibkr", "t212", "robinhood", "etoro"]
    if any(k in ex for k in ["XETRA", "GER"]):
        return ["ibkr", "traderepublic", "scalable", "ing", "comdirect"]
    if any(k in ex for k in ["EURONEXT", "AMSTERDAM", "PARIS", "AMS", "PAR"]):
        return ["ibkr", "t212", "etoro"]
    if any(k in ex for k in ["LONDON", "LSE"]):
        return ["ibkr", "t212"]
    return ["ibkr", "t212", "etoro"]


# -- Phase 1: Fetch ETF data via yfinance --

def fetch_etf_data(symbol):
    """Fetch price history and info for a single ETF symbol."""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="5y")
        info = ticker.info or {}

        if hist.empty or len(hist) < 20:
            print(f"  [fetch] {symbol}: insufficient price history ({len(hist)} rows)")
            return None

        close = hist["Close"]

        # -- CAGR calculations --
        end_price = float(close.iloc[-1])
        total_days = len(close)

        def calc_cagr(series, years):
            """Calculate CAGR from a price series over the given number of years.

            Uses 90% of expected trading days as minimum threshold to handle
            holidays, short years, and ETFs with slightly less history.
            """
            min_days = int(years * 252 * 0.9)
            target_days = int(years * 252)
            if total_days < min_days:
                return None
            # Use the actual day count available, capped at target
            offset = min(target_days, total_days - 1)
            start_price = float(series.iloc[-1 - offset])
            if start_price <= 0:
                return None
            # Actual elapsed years based on calendar dates
            actual_years = (series.index[-1] - series.index[-1 - offset]).days / 365.25
            if actual_years <= 0:
                return None
            return ((end_price / start_price) ** (1.0 / actual_years) - 1) * 100

        cagr1y = calc_cagr(close, 1)
        cagr3y = calc_cagr(close, 3)
        cagr5y = calc_cagr(close, 5)

        # -- Max drawdown from 5Y series --
        running_max = close.cummax()
        drawdown_series = (close - running_max) / running_max
        drawdown = float(drawdown_series.min()) * 100

        # -- Sharpe ratio (annualized, risk-free rate 4%) --
        daily_returns = close.pct_change().dropna()
        if len(daily_returns) > 30:
            risk_free_daily = 0.04 / 252
            mean_daily_excess = daily_returns.mean() - risk_free_daily
            std_daily = daily_returns.std()
            if std_daily > 0:
                sharpe = (mean_daily_excess / std_daily) * math.sqrt(252)
            else:
                sharpe = 0.0
        else:
            sharpe = 0.0

        # -- Expense ratio (fee) --
        # yfinance may return decimal (0.0003) or percentage (0.03) or None
        # If we can't source the real fee, store None — shown as "N/A" on frontend
        fee_raw = info.get("expenseRatio") or info.get("annualReportExpenseRatio")
        if fee_raw is not None and fee_raw > 0:
            # If value < 1, it's a decimal (e.g. 0.0003 = 0.03%)
            fee = fee_raw * 100 if fee_raw < 1 else fee_raw
        else:
            fee = None

        # -- Other fields --
        name = info.get("shortName") or info.get("longName") or symbol
        exchange = info.get("exchange") or ""
        currency = info.get("currency") or "USD"
        category = info.get("category") or ""
        theme = map_theme(category, symbol)
        region = derive_region(exchange)
        description = (info.get("longBusinessSummary") or "")[:500]

        return {
            "symbol": symbol,
            "name": name,
            "cagr1y": round(to_float(cagr1y), 2) if cagr1y is not None else None,
            "cagr3y": round(to_float(cagr3y), 2) if cagr3y is not None else None,
            "cagr5y": round(to_float(cagr5y), 2) if cagr5y is not None else None,
            "drawdown": round(to_float(drawdown), 2),
            "fee": round(to_float(fee), 4) if fee is not None else None,
            "sharpe": round(to_float(sharpe), 2),
            "theme": theme,
            "region": region,
            "exchange": exchange,
            "currency": currency,
            "description": description,
        }
    except Exception as e:
        print(f"  [fetch] Error for {symbol}: {e}")
        return None


# -- Phase 2: Rank and select top 100 --

def rank_etfs(etfs):
    """Rank ETFs by best available CAGR (5Y > 3Y > 1Y), keep top 100."""
    def sort_key(e):
        """Use 5Y CAGR if available, fall back to 3Y, then 1Y. None sorts last."""
        if e["cagr5y"] is not None:
            return (2, e["cagr5y"])  # highest priority
        if e["cagr3y"] is not None:
            return (1, e["cagr3y"])
        if e["cagr1y"] is not None:
            return (0, e["cagr1y"])
        return (-1, 0)

    # Must have at least 1Y CAGR — no fallback for missing data
    valid = [e for e in etfs if e["cagr1y"] is not None]
    invalid = len(etfs) - len(valid)
    if invalid:
        print(f"[phase2] {invalid} ETFs have no CAGR data at all (excluded)")

    valid.sort(key=sort_key, reverse=True)
    ranked = valid[:100]

    has_5y = sum(1 for e in ranked if e["cagr5y"] is not None)
    has_3y = sum(1 for e in ranked if e["cagr3y"] is not None and e["cagr5y"] is None)
    has_1y = sum(1 for e in ranked if e["cagr3y"] is None and e["cagr5y"] is None)
    print(f"[phase2] Keeping top {len(ranked)} ETFs ({has_5y} with 5Y, {has_3y} with 3Y only, {has_1y} with 1Y only)")

    return ranked


# -- Phase 3: Persist to PostgreSQL --

def persist_etfs(etfs, conn, label=""):
    """Upsert ETFs into PostgreSQL (etfs table + etf_brokers junction)."""
    cur = conn.cursor()
    now = datetime.now(timezone.utc)

    upserted = 0

    for e in etfs:
        try:
            etf_id = cuid()
            brokers = derive_brokers(e["exchange"])

            # UPSERT into etfs table
            cur.execute("""
                INSERT INTO etfs (
                    id, symbol, name, cagr1y, cagr3y, cagr5y,
                    drawdown, fee, sharpe, theme, region,
                    exchange, currency, description, "updatedAt"
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s
                )
                ON CONFLICT (symbol) DO UPDATE SET
                    name = CASE
                        WHEN EXCLUDED.name != '' AND EXCLUDED.name != etfs.symbol
                        THEN EXCLUDED.name ELSE etfs.name END,
                    cagr1y = EXCLUDED.cagr1y,
                    cagr3y = EXCLUDED.cagr3y,
                    cagr5y = EXCLUDED.cagr5y,
                    drawdown = EXCLUDED.drawdown,
                    fee = EXCLUDED.fee,
                    sharpe = EXCLUDED.sharpe,
                    theme = EXCLUDED.theme,
                    region = EXCLUDED.region,
                    exchange = CASE
                        WHEN EXCLUDED.exchange != ''
                        THEN EXCLUDED.exchange ELSE etfs.exchange END,
                    currency = EXCLUDED.currency,
                    description = CASE
                        WHEN EXCLUDED.description != ''
                        THEN EXCLUDED.description ELSE etfs.description END,
                    "updatedAt" = EXCLUDED."updatedAt"
                RETURNING id
            """, (
                etf_id, e["symbol"], e["name"], e["cagr1y"], e["cagr3y"], e["cagr5y"],
                e["drawdown"], e["fee"], e["sharpe"], e["theme"], e["region"],
                e["exchange"], e["currency"], e.get("description", ""), now,
            ))

            row = cur.fetchone()
            actual_id = row[0] if row else etf_id
            upserted += 1

            # Update broker availability
            cur.execute('DELETE FROM etf_brokers WHERE "etfId" = %s', (actual_id,))
            for broker_id in brokers:
                cur.execute("""
                    INSERT INTO etf_brokers ("etfId", "brokerId")
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                """, (actual_id, broker_id))

        except Exception as e_err:
            print(f"  [persist] Error for {e['symbol']}: {e_err}")
            conn.rollback()
            continue

    conn.commit()
    cur.close()

    print(f"  [{label}] Upserted {upserted} ETFs")


# -- Main --

def main():
    parser = argparse.ArgumentParser(description="Bonistock ETF Discovery")
    parser.add_argument("--dry-run", action="store_true", help="Print results without writing to DB")
    parser.add_argument("--prod-only", action="store_true", help="Write to prod only, skip dev copy")
    args = parser.parse_args()

    start = time.time()
    dry_label = " [DRY RUN]" if args.dry_run else ""
    print(f"=== Bonistock ETF Discovery{dry_label} ===")
    print(f"Started at {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"Universe: {len(ETF_UNIVERSE)} ETFs")

    # Phase 1: Fetch data for each ETF
    print(f"\n[phase1] Fetching data for {len(ETF_UNIVERSE)} ETFs...")
    etfs = []
    for i, sym in enumerate(ETF_UNIVERSE):
        if i > 0 and i % 25 == 0:
            print(f"  [phase1] Progress: {i}/{len(ETF_UNIVERSE)} ({len(etfs)} valid so far)")
        data = fetch_etf_data(sym)
        if data:
            etfs.append(data)
        time.sleep(0.5)
    print(f"[phase1] Got data for {len(etfs)}/{len(ETF_UNIVERSE)} ETFs")

    # Phase 2: Rank by cagr5y descending, keep top 100
    ranked = rank_etfs(etfs)

    # Print summary table
    header = (
        f"{'Rank':<5} {'Symbol':<12} {'Name':<30} "
        f"{'1Y':>7} {'3Y':>7} {'5Y':>7} "
        f"{'DD':>7} {'Fee':>6} {'Sharpe':>7} "
        f"{'Region':<8} Theme"
    )
    print(f"\n{header}")
    print("-" * 120)
    for i, e in enumerate(ranked[:30], 1):
        cagr1y_str = f"{e['cagr1y']:.1f}%" if e["cagr1y"] is not None else "   N/A"
        cagr3y_str = f"{e['cagr3y']:.1f}%" if e["cagr3y"] is not None else "   N/A"
        cagr5y_str = f"{e['cagr5y']:.1f}%" if e["cagr5y"] is not None else "   N/A"
        print(
            f"{i:<5} {e['symbol']:<12} {e['name'][:28]:<30} "
            f"{cagr1y_str:>7} {cagr3y_str:>7} {cagr5y_str:>7} "
            f"{e['drawdown']:>6.1f}% {e['fee']:>5.2f}% {e['sharpe']:>7.2f} "
            f"{e['region']:<8} {e['theme']}"
        )
    if len(ranked) > 30:
        print(f"  ... and {len(ranked) - 30} more")

    # Region distribution
    regions = {}
    for e in ranked:
        r = e["region"]
        regions[r] = regions.get(r, 0) + 1
    print(f"\nRegion distribution: {regions}")

    # Theme distribution
    themes = {}
    for e in ranked:
        t = e["theme"]
        themes[t] = themes.get(t, 0) + 1
    print(f"Theme distribution: {dict(sorted(themes.items(), key=lambda x: -x[1]))}")

    if args.dry_run:
        print(f"\n[dry-run] Would persist {len(ranked)} ETFs. No DB writes.")
        elapsed = time.time() - start
        print(f"\n=== Done in {elapsed:.0f}s ===")
        return

    # Phase 3a: Persist to prod
    print(f"\n[phase3] Writing {len(ranked)} ETFs to PROD...")
    prod_conn = get_db_connection("bonistock-prod", "bonistock_prod_DATABASE_URL")
    try:
        persist_etfs(ranked, prod_conn, label="prod")
    finally:
        prod_conn.close()

    # Phase 3b: Copy same data to dev (no additional API calls)
    if not args.prod_only:
        print(f"[phase3] Copying {len(ranked)} ETFs to DEV...")
        try:
            dev_conn = get_db_connection("bonistock-dev", "bonistock_dev_DATABASE_URL")
            try:
                persist_etfs(ranked, dev_conn, label="dev")
            finally:
                dev_conn.close()
        except Exception as e:
            print(f"  [dev] Could not copy to dev (non-fatal): {e}")

    elapsed = time.time() - start
    print(f"\n=== Done in {elapsed:.0f}s ===")


if __name__ == "__main__":
    main()
