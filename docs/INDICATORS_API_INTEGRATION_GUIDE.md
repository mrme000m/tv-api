# TradingView Indicators API Integration Guide

## Summary

This guide provides a comprehensive overview of the TradingView Pine Script indicators search API, demonstrating how to search for, retrieve, and integrate public Pine scripts into applications. The analysis is based on examination of the `indicator_search.sh` file which contains real API calls made by TradingView's interface.

## API Endpoints Overview

### 1. Search API
- **Endpoint**: `https://www.tradingview.com/pubscripts-suggest-json/`
- **Purpose**: Search for Pine scripts by name or keyword
- **Method**: GET
- **Parameters**: `search` (the search term)

### 2. Library API
- **Endpoint**: `https://www.tradingview.com/pubscripts-library/`
- **Purpose**: Browse collections of Pine scripts
- **Method**: GET
- **Parameters**: `offset`, `count`, `type`, `sort`, `is_paid`

### 3. Pine Facade API
- **Endpoint**: `https://pine-facade.tradingview.com/pine-facade/`
- **Purpose**: Direct access to Pine script operations
- **Methods**: Various endpoints for different operations

## Complete Integration Workflow

### Step 1: Search for Scripts
```javascript
// Search for scripts matching a query
const searchResults = await axios.get('https://www.tradingview.com/pubscripts-suggest-json/', {
  params: { search: 'Mean' },
  headers: { /* appropriate headers */ }
});

// Results contain scriptIdPart and scriptName
const script = searchResults.data.results[0];
console.log(`Found: ${script.scriptName} (${script.scriptIdPart})`);
```

### Step 2: Get Script Information
```javascript
// Get detailed information about the script
const scriptInfo = await axios.get(`https://pine-facade.tradingview.com/pine-facade/get_script_info/?pine_id=${scriptId}`);
```

### Step 3: Check Authorization
```javascript
// Verify if you're authorized to access the script
const isAuthorized = await axios.get(`https://pine-facade.tradingview.com/pine-facade/is_auth_to_get/${scriptId}/1`);
```

### Step 4: Retrieve Script Content
```javascript
// Get the actual Pine Script source code
const scriptContent = await axios.get(`https://pine-facade.tradingview.com/pine-facade/get/${scriptId}/1`);
```

### Step 5: Add to Chart
```javascript
// Add the script to a TradingView chart
chartWidget.onChartReady(() => {
  chartWidget.addStudy(scriptId, {
    // Configuration options
  });
});
```

## Script ID Format

Pine Script IDs follow the format: `{PREFIX};{UNIQUE_ID}`

- `PUB` - Public community scripts
- `STD` - Standard built-in indicators  
- `USER` - User's private scripts
- `{UNIQUE_ID}` - Unique identifier string

Example: `PUB;ZysdlJjd7c61UecSatQko9k8bBFEhbiH`

## Key Endpoints

| Endpoint | Purpose | Parameters |
|----------|---------|------------|
| `/pubscripts-suggest-json/` | Search for scripts | `search` |
| `/pubscripts-library/` | Browse library | `offset`, `count`, `sort` |
| `/pine-facade/list` | List by category | `filter` |
| `/pine-facade/get_script_info/` | Get script details | `pine_id` |
| `/pine-facade/get/{scriptId}/{version}` | Get script content | (in URL) |
| `/pine-facade/is_auth_to_get/{scriptId}/{version}` | Check authorization | (in URL) |

## Error Handling

- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Script doesn't exist
- `429 Too Many Requests`: Rate limiting applied

## Headers Requirements

```javascript
const headers = {
  'accept': 'application/json, text/javascript, */*; q=0.01',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  'pragma': 'no-cache',
  'referer': 'https://www.tradingview.com/chart/',
  'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'x-language': 'en',
  'x-requested-with': 'XMLHttpRequest'
};
```

## Practical Implementation

1. **Search for indicators**: Use the search endpoint to find relevant Pine scripts
2. **Validate access**: Check authorization before retrieving content
3. **Fetch content**: Get the Pine script source code
4. **Integrate**: Use TradingView's widget API to add the script to charts
5. **Handle errors**: Implement proper error handling for unauthorized access

## Security Considerations

- Private USER scripts require authentication
- Session cookies (sessionid, sessionid_sign) may be required for private content
- Respect rate limits and implement exponential backoff
- Validate script IDs before making requests

## Conclusion

The TradingView Pine Script API enables programmatic access to thousands of technical analysis indicators. By following the search → authorization → retrieval workflow, developers can integrate public Pine scripts into their applications and display them on TradingView charts.

The API is well-structured with dedicated endpoints for searching, browsing, and retrieving scripts, making it straightforward to implement comprehensive Pine script integration functionality.