#!/usr/bin/env python3
"""
Standalone CLI script for fetching stock/ETF data via yfinance.
Called by Node.js via child_process.execFile.
Output: JSON to stdout.

Usage:
  python3 yfinance-fetch.py prices NVDA MSFT AMZN
  python3 yfinance-fetch.py history 1y NVDA MSFT
"""

import sys
import json
import yfinance as yf


def fetch_prices(symbols: list[str]) -> dict:
    result = {}
    for symbol in symbols:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.fast_info
            result[symbol] = {
                "price": round(float(info.last_price), 2),
                "change": round(float(info.last_price - info.previous_close), 2),
                "changePercent": round(
                    float((info.last_price - info.previous_close) / info.previous_close * 100), 2
                ),
                "volume": int(info.last_volume),
            }
        except Exception as e:
            result[symbol] = {"error": str(e)}
    return result


def fetch_history(symbols: list[str], period: str) -> dict:
    result = {}
    for symbol in symbols:
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=period)
            records = []
            for date, row in hist.iterrows():
                records.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "open": round(float(row["Open"]), 2),
                    "high": round(float(row["High"]), 2),
                    "low": round(float(row["Low"]), 2),
                    "close": round(float(row["Close"]), 2),
                    "volume": int(row["Volume"]),
                })
            result[symbol] = records
        except Exception as e:
            result[symbol] = [{"error": str(e)}]
    return result


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: yfinance-fetch.py <prices|history> [period] <symbols...>"}))
        sys.exit(1)

    command = sys.argv[1]

    if command == "prices":
        symbols = sys.argv[2:]
        print(json.dumps(fetch_prices(symbols)))
    elif command == "history":
        period = sys.argv[2]
        symbols = sys.argv[3:]
        print(json.dumps(fetch_history(symbols, period)))
    else:
        print(json.dumps({"error": f"Unknown command: {command}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
