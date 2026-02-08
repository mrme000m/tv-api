/**
 * Pine Script Human-Readable Input Management Example
 * 
 * This example demonstrates the improved, intuitive API for working with
 * Pine Script inputs using human-readable names instead of cryptic runtime IDs.
 */

const TradingView = require('../main');

// Sample strategy source
const STRATEGY_SOURCE = `
// @version=5
strategy("MACD Strategy", overlay=true, initial_capital=10000)

// === TREND SETTINGS ===
fastLength = input.int(12, "Fast Length", minval=1, maxval=50, group="Trend Settings")
slowLength = input.int(26, "Slow Length", minval=1, maxval=100, group="Trend Settings")
signalLength = input.int(9, "Signal Smoothing", minval=1, maxval=50, group="Trend Settings")
maType = input.string("EMA", "MA Type", options=["SMA", "EMA", "WMA"], group="Trend Settings")

// === ENTRY RULES ===
useTrendFilter = input.bool(true, "Use Trend Filter", group="Entry Rules")
trendPeriod = input.int(50, "Trend Period", minval=10, maxval=200, group="Entry Rules")

// === RISK MANAGEMENT ===
positionSize = input.float(10.0, "Position Size %", minval=1, maxval=100, step=0.5, group="Risk Management")
useStopLoss = input.bool(true, "Use Stop Loss", group="Risk Management")
stopLossPerc = input.float(2.0, "Stop Loss %", minval=0.1, maxval=10, step=0.1, group="Risk Management")
takeProfitPerc = input.float(4.0, "Take Profit %", minval=0.1, maxval=20, step=0.1, group="Risk Management")

// === DISPLAY ===
showSignals = input.bool(true, "Show Entry/Exit Signals", group="Display")
showMA = input.bool(true, "Show Moving Averages", group="Display")
`;

async function demonstrateFriendlyInputs() {
  console.log('=== Human-Readable Pine Script Input Management ===\n');

  // ============================================================================
  // 1. EXTRACT INPUTS WITH RICH METADATA
  // ============================================================================
  console.log('1. Extracting inputs with rich metadata...\n');
  
  const inputs = TradingView.extractInputsFromSource(STRATEGY_SOURCE);
  console.log(`   Found ${inputs.length} inputs:\n`);
  
  inputs.forEach((input, i) => {
    const constraints = [];
    if (input.min !== undefined) constraints.push(`min:${input.min}`);
    if (input.max !== undefined) constraints.push(`max:${input.max}`);
    if (input.options) constraints.push(`options:[${input.options.join(',')}]`);
    
    console.log(`   [${i}] Variable: "${input.id}"`);
    console.log(`       Display:  "${input.name}"`);
    console.log(`       Type:     ${input.type}, Default: ${JSON.stringify(input.default)}`);
    if (constraints.length) console.log(`       ${constraints.join(', ')}`);
    console.log();
  });

  // ============================================================================
  // 2. CREATE MOCK METADATA (In real use, this comes from getScriptMetadata())
  // ============================================================================
  console.log('2. Creating mock metadata for demonstration...\n');
  
  // Build mock metadata that simulates what getScriptMetadata() returns
  const mockMetadata = {
    meta: {
      name: 'MACD Strategy',
      type: 'strategy',
      defaults: {},
    },
    inputsList: inputs.map((inp, i) => ({
      id: `in_${i}`,
      name: inp.name,
      inline: inp.id,  // Variable name from source
      internalID: inp.id.replace(/[^a-zA-Z0-9]/g, '_'),
      type: inp.type === 'int' ? 'integer' : inp.type === 'float' ? 'float' : inp.type,
      defval: inp.default,
      min: inp.min,
      max: inp.max,
      step: inp.step,
      options: inp.options,
      group: inp.group || 'General',
      isFake: false,
    })),
  };
  
  // Fill in the defaults
  mockMetadata.inputsList.forEach((inp, i) => {
    mockMetadata.meta.defaults[`in_${i}`] = inp.defval;
  });

  // ============================================================================
  // 3. DESCRIBE INPUTS WITH ALL NAME FORMATS
  // ============================================================================
  console.log('3. Rich input descriptions with all identifier formats:\n');
  
  const descriptions = TradingView.describeInputs(mockMetadata);
  descriptions.forEach(desc => {
    console.log(`   📊 ${desc.displayName}`);
    console.log(`      Variable name: "${desc.variableName}"`);
    console.log(`      Runtime ID:    "${desc.runtimeId}"`);
    console.log(`      Internal ID:   "${desc.internalId}"`);
    console.log(`      Type: ${desc.type}, Default: ${JSON.stringify(desc.defaultValue)}`);
    console.log(`      Group: ${desc.group}`);
    console.log();
  });

  // ============================================================================
  // 4. GROUP INPUTS BY CATEGORY
  // ============================================================================
  console.log('4. Inputs grouped by category:\n');
  
  const groups = TradingView.groupInputsByCategory(mockMetadata);
  for (const [groupName, groupInputs] of Object.entries(groups)) {
    console.log(`   📁 ${groupName}`);
    groupInputs.forEach(inp => {
      console.log(`      • ${inp.displayName} (${inp.variableName}) = ${JSON.stringify(inp.defaultValue)}`);
    });
    console.log();
  }

  // ============================================================================
  // 5. CONVERT FRIENDLY CONFIG TO RUNTIME FORMAT
  // ============================================================================
  console.log('5. Converting friendly config to runtime format:\n');
  
  // User can use variable names, display names, or even partial matches
  const userConfig = {
    fastLength: 8,           // Variable name
    'Slow Length': 21,       // Display name
    signalLength: 5,         // Variable name
    maType: 'SMA',           // Variable name
    trendPeriod: 100,        // Variable name
    positionSize: 15.5,      // Variable name
    stopLossPerc: 3.0,       // Variable name
  };
  
  console.log('   User-friendly config:');
  console.log(`   ${JSON.stringify(userConfig, null, 4).replace(/\n/g, '\n   ')}`);
  console.log();
  
  const runtimeConfig = TradingView.toRuntimeFormat(userConfig, mockMetadata);
  console.log('   TradingView runtime format:');
  console.log(`   ${JSON.stringify(runtimeConfig, null, 4).replace(/\n/g, '\n   ')}`);
  console.log();

  // ============================================================================
  // 6. CONVERT RUNTIME BACK TO FRIENDLY FORMAT
  // ============================================================================
  console.log('6. Converting runtime format back to friendly names:\n');
  
  const backToFriendly = TradingView.fromRuntimeFormat(runtimeConfig, mockMetadata, 'variable');
  console.log('   As variable names:');
  Object.entries(backToFriendly).forEach(([k, v]) => {
    const val = typeof v === 'object' && v.value !== undefined ? v.value : v;
    console.log(`      ${k}: ${JSON.stringify(val)}`);
  });
  console.log();

  const asDisplayNames = TradingView.fromRuntimeFormat(runtimeConfig, mockMetadata, 'display');
  console.log('   As display names:');
  Object.entries(asDisplayNames).forEach(([k, v]) => {
    const val = typeof v === 'object' && v.value !== undefined ? v.value : v;
    console.log(`      "${k}": ${JSON.stringify(val)}`);
  });
  console.log();

  // ============================================================================
  // 7. GET DEFAULTS WITH FRIENDLY NAMES
  // ============================================================================
  console.log('7. Getting defaults with friendly variable names:\n');
  
  const friendlyDefaults = TradingView.getFriendlyDefaults(mockMetadata, 'variable');
  console.log('   Default configuration:');
  Object.entries(friendlyDefaults).forEach(([k, v]) => {
    console.log(`      ${k}: ${JSON.stringify(v)}`);
  });
  console.log();

  // ============================================================================
  // 8. CONFIGURATION BUILDER (FLUENT API)
  // ============================================================================
  console.log('8. Using fluent configuration builder:\n');
  
  const builder = TradingView.createConfigBuilder(mockMetadata);
  
  // Method 1: Chain calls
  const config1 = builder
    .set('fastLength', 10)
    .set('Slow Length', 30)  // Can mix variable and display names
    .set('signalLength', 7)
    .set('positionSize', 20)
    .build();
  
  console.log('   Config from chained calls:');
  console.log(`   ${JSON.stringify(config1, null, 4).replace(/\n/g, '\n   ')}`);
  console.log();
  
  // Reset and try method 2
  builder.reset();
  
  // Method 2: Set multiple at once
  const config2 = builder.setMany({
    fastLength: 15,
    slowLength: 35,
    maType: 'WMA',
    useTrendFilter: false,
    stopLossPerc: 1.5,
  }).build();
  
  console.log('   Config from setMany:');
  console.log(`   ${JSON.stringify(config2, null, 4).replace(/\n/g, '\n   ')}`);
  console.log();
  
  // Show as string
  console.log('   Pretty printed:');
  console.log(builder.toString());
  console.log();

  // ============================================================================
  // 9. VALIDATION WITH HELPFUL ERROR MESSAGES
  // ============================================================================
  console.log('9. Configuration validation:\n');
  
  // Valid config
  const validConfig = {
    fastLength: 10,
    slowLength: 30,
    maType: 'EMA',
  };
  
  const validResult = TradingView.validateAndNormalizeConfig(validConfig, mockMetadata);
  console.log('   ✅ Valid config test:');
  console.log(`      Valid: ${validResult.valid}`);
  console.log(`      Normalized: ${JSON.stringify(validResult.normalized)}`);
  console.log();
  
  // Invalid config with typos and out-of-range values
  const invalidConfig = {
    fastLenght: 10,      // Typo!
    slowLength: 500,     // Out of range
    maType: 'INVALID',   // Not in options
    positionSize: 'big', // Wrong type
  };
  
  const invalidResult = TradingView.validateAndNormalizeConfig(invalidConfig, mockMetadata);
  console.log('   ❌ Invalid config test:');
  console.log(`      Valid: ${invalidResult.valid}`);
  console.log('      Errors:');
  invalidResult.errors.forEach(err => {
    console.log(`         - ${err.key}: ${err.message}`);
    if (err.suggestion?.length) {
      console.log(`           Did you mean: ${err.suggestion.join(', ')}?`);
    }
  });
  console.log();

  // ============================================================================
  // 10. SEARCH INPUTS
  // ============================================================================
  console.log('10. Searching inputs:\n');
  
  const searchResults = TradingView.searchInputs(mockMetadata, 'length');
  console.log('   Search for "length":');
  searchResults.forEach(inp => {
    console.log(`      • ${inp.displayName} (variable: ${inp.variableName})`);
  });
  console.log();
  
  const riskResults = TradingView.searchInputs(mockMetadata, 'risk');
  console.log('   Search for "risk":');
  riskResults.forEach(inp => {
    console.log(`      • ${inp.displayName} (group: ${inp.group})`);
  });
  console.log();

  // ============================================================================
  // 11. BUILD COMPLETE TRADINGVIEW CONFIG
  // ============================================================================
  console.log('11. Building complete TradingView-ready configuration:\n');
  
  const partialUserConfig = {
    fastLength: 8,
    slowLength: 21,
    maType: 'EMA',
    // Not specifying other inputs - they will use defaults
  };
  
  const completeConfig = TradingView.buildTradingViewConfig(partialUserConfig, mockMetadata);
  console.log('   Complete config (user values + defaults):');
  Object.entries(completeConfig).forEach(([k, v]) => {
    // Find the display name for this runtime ID
    const input = mockMetadata.inputsList.find(i => i.id === k);
    const name = input ? input.inline || input.name : k;
    console.log(`      ${k} (${name}): ${JSON.stringify(v)}`);
  });
  console.log();

  // ============================================================================
  // 12. PRACTICAL EXAMPLE: CREATING AN ALERT CONFIG
  // ============================================================================
  console.log('12. Practical example: Creating alert configuration:\n');
  
  const alertConfig = TradingView.createConfigBuilder(mockMetadata)
    .set('Fast Length', 12)
    .set('slowLength', 26)  // Variable name works too
    .set('MA Type', 'EMA')
    .set('Position Size %', 10)
    .set('Use Stop Loss', true)
    .set('stopLossPerc', 2.5)
    .build();
  
  console.log('   Alert configuration (runtime format):');
  console.log(`   ${JSON.stringify(alertConfig, null, 4).replace(/\n/g, '\n   ')}`);
  console.log();
  
  console.log('   This can be used directly in TradingView.createAlert():');
  console.log(`   `);
  console.log('   await TradingView.createAlert({');
  console.log('     symbol: "BINANCE:BTCUSD",');
  console.log('     resolution: "60",');
  console.log('     conditions: [{');
  console.log('       type: "strategy",');
  console.log('       series: [{');
  console.log('         type: "study",');
  console.log('         study: "StrategyScript@tv-scripting-101",');
  console.log('         inputs:');
  console.log(`           ${JSON.stringify(alertConfig, null, 10).replace(/\n/g, '\n           ')}`);
  console.log('       }]');
  console.log('     }]');
  console.log('   }, { session, signature });');
  console.log();

  console.log('=== Summary ===');
  console.log('');
  console.log('Key improvements:');
  console.log('• Use variable names (fastLength) instead of runtime IDs (in_0)');
  console.log('• Use display names ("Fast Length") - works the same!');
  console.log('• Automatic typo detection with helpful suggestions');
  console.log('• Fluent builder API for chaining configuration');
  console.log('• Bidirectional conversion between friendly and runtime formats');
  console.log('• Grouped inputs for organized UI generation');
  console.log('• Built-in validation with clear error messages');
  console.log('• Search inputs by partial name matching');
}

demonstrateFriendlyInputs().catch(console.error);
