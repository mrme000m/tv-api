# TradingView Search API Documentation

## Overview

The TradingView Search API is a RESTful service located at `https://symbol-search.tradingview.com/symbol_search/v3/` that allows users to search for financial instruments including stocks, cryptocurrencies, forex pairs, funds, and other securities.

## Endpoint

```
GET https://symbol-search.tradingview.com/symbol_search/v3/
```

## Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | String | Yes | "" | The search query text to find matching symbols |
| `hl` | Integer | Yes | 1 | Highlight matching text in results (1=enabled, 0=disabled) |
| `exchange` | String | No | "" | Filter results by specific exchange (e.g., "KUCOIN", "NASDAQ") |
| `lang` | String | Yes | "en" | Language code for localization |
| `search_type` | String | Yes | "undefined" | Type of instruments to search for (see types below) |
| `domain` | String | Yes | "production" | Environment identifier |
| `sort_by_country` | String | Yes | "US" | Country code to sort results by |
| `promo` | String | Yes | "true" | Promotion-related flag |

### Search Types

The `search_type` parameter accepts the following values:

- `undefined` - Search all instrument types
- `crypto` - Cryptocurrency instruments only
- `forex` - Foreign exchange instruments only
- `stock` - Stocks/equities only
- `fund` - Funds (mutual funds, ETFs, etc.) only

## Response Format

The API returns a JSON object with the following structure:

```json
{
  "symbols_remaining": Number,
  "symbols": [
    {
      "symbol": String,
      "description": String,
      "type": String,
      "exchange": String,
      "found_by_isin": Boolean,
      "found_by_cusip": Boolean,
      "currency_code": String,
      "currency-logoid": String,
      "base-currency-logoid": String,
      "logo": Object,
      "provider_id": String,
      "source_logoid": String,
      "source2": Object,
      "source_id": String,
      "country": String,
      "typespecs": Array<String>,
      "prefix": String,
      "cusip": String,
      "isin": String,
      "cik_code": String,
      "is_primary_listing": Boolean
    }
  ]
}
```

### Response Fields

#### Top-level Fields
- `symbols_remaining`: Number of additional matching symbols available beyond the current response
- `symbols`: Array of matching symbol objects (typically limited to 50 per request)

#### Symbol Object Fields
- `symbol`: The symbol name (may include `<em>` tags for highlighting matches)
- `description`: Human-readable description of the instrument
- `type`: The primary instrument type ("stock", "fund", "spot", "swap", etc.)
- `exchange`: The exchange where the instrument is traded
- `found_by_isin`: Whether the match was found by ISIN code
- `found_by_cusip`: Whether the match was found by CUSIP number
- `currency_code`: The currency code for pricing (e.g., "USD", "EUR", "USDT")
- `currency-logoid`: ID for the currency's logo
- `base-currency-logoid`: ID for the base currency's logo (for pairs)
- `logo`: Object containing logo styling information
- `provider_id`: ID of the data provider
- `source_logoid`: Logo ID for the data source
- `source2`: Object containing detailed source information
- `source_id`: ID of the source exchange/market
- `country`: Country code associated with the instrument
- `typespecs`: Array of specific type characteristics (e.g., ["crypto"], ["etf"], ["common"])
- `prefix`: Provider prefix for the symbol
- `cusip`: CUSIP number (for stocks and funds)
- `isin`: ISIN code (for stocks and funds)
- `cik_code`: CIK code (for US stocks)
- `is_primary_listing`: Whether this is the primary listing (for stocks)

## Example Requests

### Search for a Specific Symbol
```
GET https://symbol-search.tradingview.com/symbol_search/v3/?text=AAPL&hl=1&exchange=&lang=en&search_type=undefined&domain=production&sort_by_country=US&promo=true
```

### Search for Cryptocurrencies Only
```
GET https://symbol-search.tradingview.com/symbol_search/v3/?text=bitcoin&hl=1&exchange=&lang=en&search_type=crypto&domain=production&sort_by_country=US&promo=true
```

### Search for Instruments on a Specific Exchange
```
GET https://symbol-search.tradingview.com/symbol_search/v3/?text=&hl=1&exchange=KUCOIN&lang=en&search_type=crypto&domain=production&sort_by_country=US&promo=true
```

### Search for Stocks Only
```
GET https://symbol-search.tradingview.com/symbol_search/v3/?text=GOOGL&hl=1&exchange=&lang=en&search_type=stock&domain=production&sort_by_country=US&promo=true
```

## Example Responses

### Sample Cryptocurrency Response
```json
{
  "symbols_remaining": 369,
  "symbols": [
    {
      "symbol": "<em>HYPE</em>USDT.P",
      "description": "<em>HYPE</em>USDT Perpetual Contract",
      "type": "swap",
      "exchange": "Bybit",
      "found_by_isin": false,
      "found_by_cusip": false,
      "currency_code": "USDT",
      "currency-logoid": "crypto/XTVCUSDT",
      "base-currency-logoid": "crypto/XTVCHYPEH",
      "logo": {
        "style": "pair",
        "logoid": "crypto/XTVCHYPEH",
        "logoid2": "crypto/XTVCUSDT"
      },
      "provider_id": "bybit",
      "source_logoid": "provider/bybit",
      "source2": {
        "id": "BYBIT",
        "name": "Bybit",
        "description": "Bybit"
      },
      "source_id": "BYBIT",
      "typespecs": ["crypto", "perpetual"],
      "prefix": "BYBIT"
    }
  ]
}
```

### Sample Stock Response
```json
{
  "symbols_remaining": 15,
  "symbols": [
    {
      "symbol": "<em>AAPL</em>",
      "description": "Apple Inc.",
      "type": "stock",
      "exchange": "NASDAQ",
      "found_by_isin": false,
      "found_by_cusip": false,
      "cusip": "037833100",
      "isin": "US0378331005",
      "cik_code": "0000320193",
      "currency_code": "USD",
      "currency-logoid": "country/US",
      "logoid": "apple",
      "logo": {
        "style": "single",
        "logoid": "apple"
      },
      "provider_id": "ice",
      "source_logoid": "source/NASDAQ",
      "source2": {
        "id": "NASDAQ",
        "name": "Nasdaq Stock Market",
        "description": "Nasdaq Stock Market"
      },
      "source_id": "NASDAQ",
      "country": "US",
      "is_primary_listing": true,
      "typespecs": ["common"]
    }
  ]
}
```

## Response Codes

- `200 OK`: Successful search with results
- `400 Bad Request`: Invalid parameters (e.g., unsupported search_type)
- `403 Forbidden`: Rate limiting or access restriction
- `429 Too Many Requests`: Too many requests in a short period

## Headers

The API expects the following headers for proper functionality:

```
Accept: */*
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: en-US,en;q=0.9
Cache-Control: no-cache
Origin: https://www.tradingview.com
Pragma: no-cache
Priority: u=1, i
Referer: https://www.tradingview.com/
Sec-Ch-Ua: "Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "macOS"
Sec-Fetch-Dest: empty
Sec-Fetch-Mode: cors
Sec-Fetch-Site: same-site
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36
```

## Rate Limiting

The API appears to implement rate limiting. Responses are cached with a `max-age=120` header indicating results are cached for 2 minutes.

## Special Notes

1. The API returns a maximum of 50 results per request
2. The `symbols_remaining` field indicates how many additional matching symbols exist
3. The `hl` parameter enables highlighting of matched text with `<em>` tags
4. Different instrument types return different sets of fields (e.g., stocks include CUSIP/ISIN, crypto includes base-currency-logoid)
5. Empty text search with `search_type=crypto` returns popular cryptocurrencies
6. Some search types like `fund` may return 400 errors depending on the query
7. The API supports searching by partial text (e.g., "H" returns symbols starting with H)
8. Exchange-specific filtering works when combined with other parameters