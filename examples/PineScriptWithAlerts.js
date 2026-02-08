/**
 * Pine Script Integration with Alerts Example (Improved)
 * 
 * This example demonstrates how to:
 * 1. Extract script metadata with human-readable input names
 * 2. Create input configurations using intuitive variable names
 * 3. Build alert conditions without dealing with cryptic "in_0" format
 * 
 * Useful for creating dynamic alerts based on Pine Script indicators/strategies
 */

const TradingView = require('../main');

// Sample indicator source
const INDICATOR_SOURCE = `
// @version=5
indicator("RSI with Alerts", overlay=false)

// RSI Settings
rsiLength = input.int(14, "RSI Length", minval=1, maxval=50, group="RSI Settings")
overbought = input.int(70, "Overbought Level", minval=50, maxval=95, group="RSI Settings")
oversold = input.int(30, "Oversold Level", minval=5, maxval=50, group="RSI Settings")

// Smoothing Options
smooth = input.bool(true, "Smooth RSI", group="Smoothing Options")
smoothLength = input.int(3, "Smooth Length", minval=2, maxval=10, group="Smoothing Options")

// Calculation
rsiValue = ta.rsi(close, rsiLength)
rsiPlot = smooth ? ta.sma(rsiValue, smoothLength) : rsiValue

// Alerts
overboughtCondition = ta.crossover(rsiPlot, overbought)
oversoldCondition = ta.crossunder(rsiPlot, oversold)

// Plot
plot(rsiPlot, "RSI", color=rsiPlot > overbought ? color.red : rsiPlot < oversold ? color.green : color.blue)
hline(overbought, "Overbought", color.red)
hline(oversold, "Oversold", color.green)

// Alert conditions
alertcondition(overboughtCondition, "RSI Overbought", "RSI crossed above {{overbought}}")
alertcondition(oversoldCondition, "RSI Oversold", "RSI crossed below {{oversold}}")
`;

async function main() {
  console.log('=== Pine Script + Alerts Integration (Human-Readable) ===\n');

  // ============================================================================
  // 1. EXTRACT INPUTS FROM SOURCE
  // ============================================================================
  console.log('1. Extracting inputs from source...\n');
  
  const extractedInputs = TradingView.extractInputsFromSource(INDICATOR_SOURCE);
  console.log(`   Found ${extractedInputs.length} inputs:`);
  
  extractedInputs.forEach((input, i) => {
    const constraints = [];
    if (input.min !== undefined) constraints.push(`min:${input.min}`);
    if (input.max !== undefined) constraints.push(`max:${input.max}`);
    if (input.options) constraints.push(`options:[${input.options.join(',')}]`);
    
    console.log(`   [${i}] Variable: "${input.id}" = "${input.name}"`);
    console.log(`       Default: ${JSON.stringify(input.default)}, ${constraints.join(', ')}`);
  });
  console.log();

  // ============================================================================
  // 2. CREATE MOCK METADATA (In real use: getScriptMetadata())
  // ============================================================================
  console.log('2. Building metadata for demonstration...\n');
  
  const mockMetadata = {
    meta: {
      name: 'RSI with Alerts',
      type: 'study',
      defaults: {},
    },
    inputsList: extractedInputs.map((inp, i) => ({
      id: `in_${i}`,
      name: inp.name,
      inline: inp.id,  // Variable name from source
      internalID: inp.id.replace(/[^a-zA-Z0-9]/g, '_'),
      type: inp.type === 'int' ? 'integer' : inp.type,
      defval: inp.default,
      min: inp.min,
      max: inp.max,
      options: inp.options,
      group: inp.group || 'General',
      isFake: false,
    })),
  };
  
  // Fill defaults
  mockMetadata.inputsList.forEach((inp, i) => {
    mockMetadata.meta.defaults[`in_${i}`] = inp.defval;
  });

  // ============================================================================
  // 3. DESCRIBE INPUTS (HUMAN-READABLE)
  // ============================================================================
  console.log('3. Input descriptions with all name formats:\n');
  
  const descriptions = TradingView.describeInputs(mockMetadata);
  descriptions.forEach(desc => {
    console.log(`   📊 ${desc.displayName}`);
    console.log(`      Variable: "${desc.variableName}" | Runtime: "${desc.runtimeId}"`);
    console.log(`      Default: ${JSON.stringify(desc.defaultValue)} (${desc.type})`);
  });
  console.log();

  // ============================================================================
  // 4. CREATE ALERT CONFIG WITH FRIENDLY NAMES (NEW WAY!)
  // ============================================================================
  console.log('4. Creating alert configuration using FRIENDLY names:\n');
  
  // OLD WAY (cryptic):
  // const oldWayConfig = { in_0: 21, in_1: 80, in_2: 20, in_3: false };
  
  // NEW WAY (human-readable):
  const friendlyConfig = {
    rsiLength: 21,        // Variable name - intuitive!
    overbought: 80,       // Variable name
    oversold: 20,         // Variable name
    smooth: false,        // Variable name
    // smoothLength uses default
  };
  
  console.log('   Friendly config (what you write):');
  console.log(`   ${JSON.stringify(friendlyConfig, null, 4).replace(/\n/g, '\n   ')}`);
  console.log();
  
  // Convert to TradingView runtime format
  const runtimeConfig = TradingView.toRuntimeFormat(friendlyConfig, mockMetadata);
  console.log('   TradingView runtime format (automatically converted):');
  console.log(`   ${JSON.stringify(runtimeConfig, null, 4).replace(/\n/g, '\n   ')}`);
  console.log();

  // ============================================================================
  // 5. USING THE CONFIG BUILDER (EVEN CLEANER!)
  // ============================================================================
  console.log('5. Using the fluent config builder:\n');
  
  const builder = TradingView.createConfigBuilder(mockMetadata);
  
  const alertConfig = builder
    .set('rsiLength', 21)           // By variable name
    .set('Overbought Level', 80)    // By display name - works too!
    .set('oversold', 20)            // By variable name
    .set('Smooth RSI', false)       // By display name
    .build();
  
  console.log('   Builder pattern result:');
  console.log(`   ${JSON.stringify(alertConfig, null, 4).replace(/\n/g, '\n   ')}`);
  console.log();

  // ============================================================================
  // 6. BUILD COMPLETE ALERT PAYLOAD
  // ============================================================================
  console.log('6. Building complete alert payload:\n');
  
  // Get full config with defaults
  const fullConfig = TradingView.buildTradingViewConfig(friendlyConfig, mockMetadata);
  
  const alertPayload = {
    symbol: JSON.stringify({
      adjustment: 'splits',
      'currency-id': 'USD',
      session: 'regular',
      symbol: 'BINANCE:BTCUSD'
    }),
    resolution: '60',
    name: 'RSI Overbought Alert',
    message: 'RSI crossed above overbought level!',
    conditions: [{
      type: 'study',
      series: [{
        type: 'study',
        study: 'RSI@tv-scripting-101',
        inputs: fullConfig,  // <- Human-friendly config automatically converted!
        pine_id: 'USER;my_rsi_indicator',
        pine_version: '1.0',
      }]
    }],
    popup: true,
    email: false,
    mobile_push: true,
  };
  
  console.log('   Alert payload (inputs in runtime format):');
  console.log(`   ${JSON.stringify(alertPayload, null, 4).replace(/\n/g, '\n   ')}`);
  console.log();

  // ============================================================================
  // 7. CONVERT BACK TO FRIENDLY FORMAT (FOR DISPLAY)
  // ============================================================================
  console.log('7. Converting runtime config back to friendly format:\n');
  
  const backToFriendly = TradingView.fromRuntimeFormat(fullConfig, mockMetadata, 'variable');
  console.log('   Display as variable names:');
  Object.entries(backToFriendly).forEach(([k, v]) => {
    const val = typeof v === 'object' && v.value !== undefined ? v.value : v;
    console.log(`      ${k}: ${JSON.stringify(val)}`);
  });
  console.log();
  
  // As display names
  const asDisplayNames = TradingView.fromRuntimeFormat(fullConfig, mockMetadata, 'display');
  console.log('   Display as display names:');
  Object.entries(asDisplayNames).forEach(([k, v]) => {
    const val = typeof v === 'object' && v.value !== undefined ? v.value : v;
    console.log(`      "${k}": ${JSON.stringify(val)}`);
  });
  console.log();

  // ============================================================================
  // 8. VALIDATION WITH HELPFUL ERRORS
  // ============================================================================
  console.log('8. Validation with typo detection:\n');
  
  const badConfig = {
    rsiLenght: 21,     // Typo!
    overbought: 500,   // Out of range
    smooth: 'yes',     // Wrong type
  };
  
  const validation = TradingView.validateAndNormalizeConfig(badConfig, mockMetadata);
  console.log('   Validation result:');
  console.log(`      Valid: ${validation.valid}`);
  console.log('      Errors:');
  validation.errors.forEach(err => {
    console.log(`         ❌ ${err.key}: ${err.message}`);
    if (err.suggestion?.length) {
      console.log(`            💡 Did you mean: ${err.suggestion.join(', ')}?`);
    }
  });
  console.log();

  // ============================================================================
  // 9. SEARCH INPUTS
  // ============================================================================
  console.log('9. Searching inputs:\n');
  
  const rsiInputs = TradingView.searchInputs(mockMetadata, 'rsi');
  console.log('   Search "rsi":');
  rsiInputs.forEach(inp => console.log(`      • ${inp.displayName}`));
  console.log();
  
  const levelInputs = TradingView.searchInputs(mockMetadata, 'level');
  console.log('   Search "level":');
  levelInputs.forEach(inp => console.log(`      • ${inp.displayName}`));
  console.log();

  // ============================================================================
  // 10. GROUPED INPUTS FOR UI
  // ============================================================================
  console.log('10. Grouped inputs (for organized UI):\n');
  
  const groups = TradingView.groupInputsByCategory(mockMetadata);
  for (const [groupName, groupInputs] of Object.entries(groups)) {
    console.log(`   📁 ${groupName}`);
    groupInputs.forEach(inp => {
      console.log(`      • ${inp.displayName} = ${JSON.stringify(inp.defaultValue)}`);
    });
  }
  console.log();

  // ============================================================================
  // 11. PRACTICAL USAGE WITH REAL API
  // ============================================================================
  console.log('11. Real-world usage pattern:\n');
  
  console.log('   // Get metadata from TradingView');
  console.log('   const metadata = await TradingView.getScriptMetadata(');
  console.log('     "USER;my_strategy",');
  console.log('     "last",');
  console.log('     { session, signature }');
  console.log('   );');
  console.log();
  console.log('   // Create config with friendly names');
  console.log('   const config = TradingView.createConfigBuilder(metadata)');
  console.log('     .set("fastLength", 12)');
  console.log('     .set("slowLength", 26)');
  console.log('     .set("Position Size %", 10)');
  console.log('     .build();');
  console.log();
  console.log('   // Use in alert - automatically converted to runtime format');
  console.log('   await TradingView.createAlert({');
  console.log('     symbol: "COINBASE:BTCUSD",');
  console.log('     conditions: [{');
  console.log('       type: "strategy",');
  console.log('       series: [{');
  console.log('         type: "study",');
  console.log('         inputs: config,  // <- Friendly names work here!');
  console.log('         pine_id: metadata.meta.pineId');
  console.log('       }]');
  console.log('     }]');
  console.log('   }, { session, signature });');
  console.log();

  console.log('=== Summary ===');
  console.log('');
  console.log('✨ Key improvements for usability:');
  console.log('   • Use variable names: fastLength, rsiLength (not in_0, in_1)');
  console.log('   • Use display names: "Fast Length", "RSI Length" (works the same!)');
  console.log('   • Fluent builder API for clean configuration');
  console.log('   • Automatic typo detection with suggestions');
  console.log('   • Bidirectional conversion between formats');
  console.log('   • Group inputs by category for organized UIs');
  console.log('   • Search inputs by partial matching');
  console.log('   • Full validation with clear error messages');
}

main().catch(console.error);
