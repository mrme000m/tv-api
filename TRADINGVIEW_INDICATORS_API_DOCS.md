# TradingView Indicators Search API Documentation

## Overview
This document provides comprehensive information about the TradingView Pine Script indicators search API, covering endpoints for searching, fetching, and managing Pine scripts and indicators.

## Base URLs

### Main Endpoints
- **Search Suggestion API**: `https://www.tradingview.com/pubscripts-suggest-json/`
- **Public Scripts Library**: `https://www.tradingview.com/pubscripts-library/`
- **Get Public Scripts**: `https://www.tradingview.com/pubscripts-get/`
- **Pine Facade API**: `https://pine-facade.tradingview.com/pine-facade/`

### Pine Script Library Endpoints
- `https://www.tradingview.com/pubscripts-library/` - General library access
- `https://www.tradingview.com/pubscripts-library/editors-picks/` - Editor's picks
- `https://www.tradingview.com/pubscripts-get/personal-access/` - Personal access scripts

## Search Endpoints

### 1. Search Suggestions
**Endpoint**: `https://www.tradingview.com/pubscripts-suggest-json/`

**Method**: GET

**Parameters**:
- `search` (string): The search term for indicators

**Headers**:
```
accept: application/json, text/javascript, */*; q=0.01
accept-language: en-US,en;q=0.9
cache-control: no-cache
pragma: no-cache
referer: https://www.tradingview.com/chart/
sec-ch-ua: "Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "macOS"
sec-fetch-dest: empty
sec-fetch-mode: cors
sec-fetch-site: same-origin
user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36
x-language: en
x-requested-with: XMLHttpRequest
```

**Example Request**:
```
GET https://www.tradingview.com/pubscripts-suggest-json/?search=Mean
```

**Response Format**:
```json
[
  {
    "scriptIdPart": "PUB;c6945f5e094d446a930d8a5e7b7254be",
    "scriptName": "Mean Reversion Probability Zones [BigBeluga]",
    "author": "BigBeluga",
    "likes": 150,
    "isFavorite": false
  }
]
```

### 2. Public Scripts Library
**Endpoint**: `https://www.tradingview.com/pubscripts-library/`

**Method**: GET

**Parameters**:
- `offset` (integer): Pagination offset (default: 0)
- `count` (integer): Number of items to return (default: 20)
- `type` (integer): Script type filter (0 for all)
- `sort` (string): Sort order (`top`, `trending`)
- `is_paid` (boolean): Filter for paid scripts

**Example Requests**:
```
# Top scripts
GET https://www.tradingview.com/pubscripts-library/?offset=0&count=20&type=0&sort=top

# Trending scripts
GET https://www.tradingview.com/pubscripts-library/?offset=0&count=20&type=0&sort=trending

# Paid scripts
GET https://www.tradingview.com/pubscripts-library/?offset=0&count=20&type=0&is_paid=true
```

## Pine Facade API

### 1. List Scripts by Category
**Endpoint**: `https://pine-facade.tradingview.com/pine-facade/list`

**Method**: GET

**Parameters**:
- `filter` (string): Category filter (`fundamental`, `saved`, `standard`, `candlestick`)

**Example Requests**:
```
GET https://pine-facade.tradingview.com/pine-facade/list?filter=standard
GET https://pine-facade.tradingview.com/pine-facade/list?filter=candlestick
GET https://pine-facade.tradingview.com/pine-facade/list?filter=fundamental
GET https://pine-facade.tradingview.com/pine-facade/list?filter=saved
```

### 2. Get Specific Script
**Endpoint**: `https://pine-facade.tradingview.com/pine-facade/get/{scriptId}/{version}`

**Method**: GET

**Parameters**:
- `scriptId` (string): The script ID (URL encoded, e.g., PUB%3Bc6945f5e094d446a930d8a5e7b7254be)
- `version` (integer): Version number (usually 1 for latest)

### 3. Get Script Info
**Endpoint**: `https://pine-facade.tradingview.com/pine-facade/get_script_info/`

**Method**: GET

**Parameters**:
- `pine_id` (string): The script ID

### 4. Check Authorization
**Endpoint**: `https://pine-facade.tradingview.com/pine-facade/is_auth_to_get/{scriptId}/{version}`

**Method**: GET

### 5. Get Script Versions
**Endpoint**: `https://pine-facade.tradingview.com/pine-facade/versions/{scriptId}/last`

**Method**: GET

### 6. Translate Script
**Endpoint**: `https://pine-facade.tradingview.com/pine-facade/translate/{scriptId}/{version}`

**Method**: GET

**Parameters**:
- `user_name` (string): Username for translation context

### 7. Get Library Export Data
**Endpoint**: `https://pine-facade.tradingview.com/pine-facade/get_lib_export_data/{libraryPath}/{version}`

**Examples**:
- `https://pine-facade.tradingview.com/pine-facade/get_lib_export_data/TradingView/Strategy/last`
- `https://pine-facade.tradingview.com/pine-facade/get_lib_export_data/PineCoders/VisibleChart/last`
- `https://pine-facade.tradingview.com/pine-facade/get_lib_export_data/PineCoders/Time/last`
- `https://pine-facade.tradingview.com/pine-facade/get_lib_export_data/TradingView/ta/last`

## Script ID Format

Pine Script IDs follow the format: `{PREFIX};{UNIQUE_ID}`

Where:
- `PUB` - Public community scripts
- `STD` - Standard built-in indicators
- `USER` - User's private scripts
- `{UNIQUE_ID}` - Unique identifier string

## Response Data Structures

### Search Result Item
```json
{
  "scriptIdPart": "PUB;c6945f5e094d446a930d8a5e7b7254be",
  "scriptName": "Script Name Here",
  "author": "Author Name",
  "likes": 123,
  "isFavorite": false,
  "isFollowing": false,
  "isPro": false,
  "description": "Description of the script",
  "thumbnail": "URL to thumbnail image",
  "category": "Category name"
}
```

### Library Script Item
```json
{
  "id": "c6945f5e094d446a930d8a5e7b7254be",
  "name": "Script Name",
  "author": "Author Name",
  "description": "Script description",
  "likes": 123,
  "views": 12345,
  "rating": 4.5,
  "ratingCount": 67,
  "version": "1.0",
  "dateCreated": "2023-01-01T00:00:00Z",
  "dateModified": "2023-01-01T00:00:00Z",
  "isPublic": true,
  "isPremium": false,
  "tags": ["tag1", "tag2"],
  "categories": ["category1", "category2"]
}
```

## Authentication & Access Control

Some endpoints require authentication using cookies:
- `sessionid` - Session identifier
- `sessionid_sign` - Session signature

These cookies are typically obtained after logging into TradingView.

For private USER scripts, authentication is required to access the script content.

## Error Responses

Common error responses:
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Script doesn't exist
- `429 Too Many Requests` - Rate limiting applied

## Usage Patterns

### 1. Search and Display Results
1. Use `/pubscripts-suggest-json/` endpoint with search term
2. Display results in dropdown or search results page
3. Handle incremental search as user types

### 2. Browse Library
1. Use `/pubscripts-library/` endpoint with pagination
2. Allow sorting by popularity, recency, or rating
3. Filter by category or premium status

### 3. Access Specific Script
1. Get script info using `/get_script_info/`
2. Check authorization with `/is_auth_to_get/`
3. Retrieve script content with `/get/`

### 4. Add Script to Chart
1. When user selects a script, TradingView adds it to the chart
2. The script ID is passed to the charting library
3. The script is rendered with the current market data

## Rate Limiting & Best Practices

- Implement exponential backoff for failed requests
- Cache search results for better performance
- Respect rate limits (typically 60 requests per minute)
- Use appropriate User-Agent headers
- Handle errors gracefully

## Script Categories

Based on the filter parameter, scripts are categorized as:
- `standard` - Basic technical indicators
- `candlestick` - Candlestick pattern recognition
- `fundamental` - Fundamental analysis indicators
- `saved` - User's saved scripts
- `top` - Most popular scripts
- `trending` - Currently trending scripts

## Adding Scripts to Charts

Once a script is found through the search API, it can be added to a TradingView chart using the script ID. The process involves:

1. Getting the script details from the API
2. Passing the script ID to the TradingView chart widget
3. The chart widget will load and render the Pine Script code

The actual addition to chart happens client-side through TradingView's JavaScript API, where the script ID is used to initialize the indicator on the chart.

## Security Considerations

- Never expose session cookies in client-side code
- Validate script IDs before making requests
- Sanitize user input for search terms
- Implement proper error handling for unauthorized access attempts