/**
 * TradingView Pine Script Metadata Extraction Example
 * 
 * This example demonstrates how to use the enhanced Pine Script API to:
 * - Extract detailed metadata from Pine Scripts
 * - Get input schemas with defaults, constraints, and options
 * - Analyze script structure (inputs, styles, plots)
 * - Validate input configurations
 * - Work with both remote scripts and local source
 * 
 * Requires: SESSION and SIGNATURE environment variables
 */

const TradingView = require('../main');

// Sample Pine Script source for demonstration
const SAMPLE_STRATEGY_SOURCE = `
// @version=5
strategy("Sample Strategy", overlay=true, initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=10)

// === INPUTS ===
fastLength = input.int(12, "Fast MA Length", minval=1, maxval=50, step=1, group="Moving Averages")
slowLength = input.int(26, "Slow MA Length", minval=1, maxval=100, step=1, group="Moving Averages")
maType = input.string("EMA", "MA Type", options=["SMA", "EMA", "WMA", "HMA"], group="Moving Averages")

// Risk Management
useStopLoss = input.bool(true, "Use Stop Loss", group="Risk Management")
stopLossPerc = input.float(2.0, "Stop Loss %", minval=0.1, maxval=10.0, step=0.1, group="Risk Management")
takeProfitPerc = input.float(4.0, "Take Profit %", minval=0.1, maxval=20.0, step=0.1, group="Risk Management")

// Filters
useTrendFilter = input.bool(true, "Use Trend Filter", group="Filters")
trendFilterLen = input.int(50, "Trend Filter Length", minval=10, maxval=200, group="Filters")

// === CALCULATIONS ===
fastMA = maType == "SMA" ? ta.sma(close, fastLength) :
         maType == "EMA" ? ta.ema(close, fastLength) :
         maType == "WMA" ? ta.wma(close, fastLength) :
         ta.hma(close, fastLength)

slowMA = maType == "SMA" ? ta.sma(close, slowLength) :
         maType == "EMA" ? ta.ema(close, slowLength) :
         maType == "WMA" ? ta.wma(close, slowLength) :
         ta.hma(close, slowLength)

trendMA = ta.ema(close, trendFilterLen)
trendUp = close > trendMA

// === CONDITIONS ===
longCondition = ta.crossover(fastMA, slowMA) and (not useTrendFilter or trendUp)
shortCondition = ta.crossunder(fastMA, slowMA) and (not useTrendFilter or not trendUp)

// === EXECUTION ===
if (longCondition)
    strategy.entry("Long", strategy.long)
    
if (shortCondition)
    strategy.close("Long")

// Stop Loss and Take Profit
if (useStopLoss and strategy.position_size > 0)
    strategy.exit("SL/TP", "Long", stop=close * (1 - stopLossPerc/100), limit=close * (1 + takeProfitPerc/100))

// === PLOTS ===
plot(fastMA, "Fast MA", color.blue)
plot(slowMA, "Slow MA", color.orange)
plot(useTrendFilter ? trendMA : na, "Trend Filter", color.purple, display=display.pane)
`;

async function demonstrateMetadataExtraction() {
  console.log('=== TradingView Pine Script Metadata Extraction ===\n');

  const SESSION = process.env.SESSION;
  const SIGNATURE = process.env.SIGNATURE;

  // ============================================================================
  // 1. EXTRACT METADATA FROM SOURCE CODE
  // ============================================================================
  console.log('1. Extracting metadata from source code...');
  console.log('   Analyzing sample strategy source...\n');

  try {
    const metadata = await TradingView.getScriptMetadataFromSource(SAMPLE_STRATEGY_SOURCE);
    
    console.log('   Script Info:');
    console.log(`     - Name: ${metadata.meta.name}`);
    console.log(`     - Type: ${metadata.meta.type}`);
    console.log(`     - Is Strategy: ${metadata.meta.isStrategy}`);
    console.log(`     - Version: ${metadata.meta.version}`);
    console.log();

    console.log('   Inputs Found:');
    for (const input of metadata.inputsList) {
      const constraints = [];
      if (input.min !== undefined) constraints.push(`min:${input.min}`);
      if (input.max !== undefined) constraints.push(`max:${input.max}`);
      if (input.step !== undefined) constraints.push(`step:${input.step}`);
      if (input.options) constraints.push(`options:[${input.options.join(', ')}]`);
      
      console.log(`     - ${input.id}: ${input.name}`);
      console.log(`       Type: ${input.type}, Default: ${JSON.stringify(input.defval)}${constraints.length ? ', Constraints: ' + constraints.join(', ') : ''}`);
      if (input.group) console.log(`       Group: ${input.group}`);
    }
    console.log();

    console.log('   Default Values:');
    console.log(`     ${JSON.stringify(metadata.meta.defaults, null, 2).replace(/\n/g, '\n     ')}`);
    console.log();

    if (metadata.strategy) {
      console.log('   Strategy Configuration:');
      console.log(`     Initial Capital: ${metadata.strategy.initialCapital}`);
      console.log(`     Default Qty Type: ${metadata.strategy.defaultQtyType}`);
      console.log(`     Default Qty Value: ${metadata.strategy.defaultQtyValue}`);
      console.log();
    }

    console.log('   ✓ Source metadata extraction successful\n');

    // ============================================================================
    // 2. GENERATE DEFAULT INPUTS
    // ============================================================================
    console.log('2. Generating default inputs configuration...');
    const defaultInputs = TradingView.generateDefaultInputs(metadata);
    console.log(`   Default inputs: ${JSON.stringify(defaultInputs, null, 2).replace(/\n/g, '\n   ')}`);
    console.log('   ✓ Default inputs generated\n');

    // ============================================================================
    // 3. VALIDATE INPUT VALUES
    // ============================================================================
    console.log('3. Validating input values...');
    
    // Valid values
    const validValues = {
      in_0: 12,      // fastLength - valid
      in_1: 26,      // slowLength - valid
      in_2: 'EMA',   // maType - valid option
      in_3: true,    // useStopLoss - valid
      in_4: 2.5,     // stopLossPerc - valid within range
    };
    
    const validResult = TradingView.validateInputValues(validValues, metadata);
    console.log(`   Valid inputs test: ${validResult.valid ? '✓ PASSED' : '✗ FAILED'}`);
    if (!validResult.valid) {
      validResult.errors.forEach(e => console.log(`     - ${e.input}: ${e.message}`));
    }

    // Invalid values
    const invalidValues = {
      in_0: 100,     // fastLength - exceeds max
      in_1: -5,      // slowLength - below min
      in_2: 'Invalid', // maType - not in options
      in_3: 'yes',   // useStopLoss - wrong type
    };
    
    const invalidResult = TradingView.validateInputValues(invalidValues, metadata);
    console.log(`   Invalid inputs test: ${!invalidResult.valid ? '✓ Correctly detected errors' : '✗ Should have failed'}`);
    invalidResult.errors.forEach(e => console.log(`     - ${e.input}: ${e.message}`));
    console.log();

    // ============================================================================
    // 4. GET INPUT SCHEMA (for form generation)
    // ============================================================================
    console.log('4. Getting input schema for form generation...');
    const schema = await TradingView.getScriptInputSchema('STD;EMA', 'last', {});
    console.log(`   Schema for ${schema.scriptName}:`);
    console.log(`   Groups: ${schema.groups.map(g => g.name).join(', ')}`);
    schema.groups.forEach(group => {
      console.log(`\n   [${group.name}]`);
      group.inputs.forEach(input => {
        const constraints = input.constraints ? 
          JSON.stringify(input.constraints).slice(0, 60) : 'none';
        console.log(`     - ${input.name} (${input.type}): default=${JSON.stringify(input.defaultValue)}, constraints=${constraints}`);
      });
    });
    console.log('\n   ✓ Input schema retrieved\n');

  } catch (err) {
    console.error('   Source analysis error:', err.message);
  }

  // ============================================================================
  // 5. WORK WITH REMOTE SCRIPTS (requires authentication)
  // ============================================================================
  if (SESSION && SIGNATURE) {
    console.log('5. Working with remote scripts (authenticated)...');
    
    try {
      // Get metadata for a built-in indicator
      console.log('   Fetching metadata for EMA indicator...');
      const emaMetadata = await TradingView.getScriptMetadata('STD;EMA', 'last', { session: SESSION, signature: SIGNATURE });
      console.log(`     - Name: ${emaMetadata.meta.name}`);
      console.log(`     - Inputs: ${emaMetadata.inputsList.length}`);
      emaMetadata.inputsList.forEach(input => {
        console.log(`       * ${input.name}: ${input.type} = ${JSON.stringify(input.defval)}`);
      });
      console.log('   ✓ EMA metadata retrieved\n');

      // List user's private scripts with full metadata
      console.log('   Fetching all private scripts metadata...');
      const allMetadata = await TradingView.getAllScriptsMetadata({ session: SESSION, signature: SIGNATURE });
      console.log(`     Found ${allMetadata.length} scripts with full metadata`);
      
      allMetadata.slice(0, 3).forEach((script, i) => {
        console.log(`\n     [${i + 1}] ${script.meta.name}`);
        console.log(`         ID: ${script.meta.pineId}`);
        console.log(`         Type: ${script.meta.type}`);
        console.log(`         Inputs: ${script.inputsList.length}`);
        script.inputsList.slice(0, 3).forEach(inp => {
          console.log(`           - ${inp.name}: ${JSON.stringify(inp.defval)}`);
        });
        if (script.inputsList.length > 3) {
          console.log(`           ... and ${script.inputsList.length - 3} more`);
        }
      });
      console.log('   ✓ Private scripts metadata retrieved\n');

      // Create indicator instance from metadata
      if (allMetadata.length > 0) {
        console.log('   Creating PineIndicator instance from metadata...');
        const indicator = TradingView.createIndicatorFromMetadata(allMetadata[0]);
        console.log(`     - Pine ID: ${indicator.pineId}`);
        console.log(`     - Description: ${indicator.shortDescription}`);
        console.log(`     - Available Inputs: ${Object.keys(indicator.inputs).length}`);
        console.log('   ✓ Indicator instance created\n');
      }

    } catch (err) {
      console.error('   Remote script error:', err.message);
    }
  } else {
    console.log('5. Skipping remote script operations (SESSION/SIGNATURE not set)');
    console.log('   Set these environment variables to test remote script features\n');
  }

  // ============================================================================
  // 6. USING THE ENHANCED PINE CLIENT
  // ============================================================================
  console.log('6. Using the enhanced Pine client...');
  
  const pineClient = TradingView.pine.createEnhancedPineClient({
    credentials: SESSION && SIGNATURE ? { session: SESSION, signature: SIGNATURE } : undefined,
    userName: process.env.TV_USER,
  });

  // Extract inputs from source using the client
  console.log('   Extracting inputs from source...');
  const extractedInputs = pineClient.extractInputsFromSource(SAMPLE_STRATEGY_SOURCE);
  console.log(`     Found ${extractedInputs.length} inputs:`);
  extractedInputs.forEach(inp => {
    const options = inp.options ? ` [options: ${inp.options.join(', ')}]` : '';
    console.log(`       - ${inp.id}: ${inp.name} = ${JSON.stringify(inp.default)}${options}`);
  });
  console.log('   ✓ Inputs extracted\n');

  // Test pine ID normalization
  console.log('   Testing pine ID normalization...');
  const testIds = [
    'USER;abc123',
    'USER%3Babc123',
    'PUB;xyz789',
    'USER;USER;doubleprefix',
  ];
  testIds.forEach(id => {
    console.log(`     "${id}" -> "${pineClient.normalizePineId(id)}"`);
  });
  console.log('   ✓ Normalization tests passed\n');

  console.log('=== All demonstrations completed! ===');
}

// Run the demonstration
demonstrateMetadataExtraction().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
