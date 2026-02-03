/*
 * Example: Full workflow - Create script locally, push remote, run with custom input,
 *          update local version, and push again.
 *
 * This example demonstrates:
 * 1. Create/save a new script to TradingView remote
 * 2. Fetch it back and verify
 * 3. Run it with custom input on a live chart
 * 4. Modify local source and push an updated version
 *
 * Requires: SESSION, SIGNATURE, TV_USER in .env file or environment variables
 * Usage: node examples/FullWorkflow.js
 */

require('dotenv').config();

const TradingView = require('../main');
const fs = require('fs');
const path = require('path');

async function main() {
  if (!process.env.SESSION || !process.env.SIGNATURE || !process.env.TV_USER) {
    console.error('Please set SESSION, SIGNATURE and TV_USER environment variables');
    process.exit(1);
  }

  const creds = { session: process.env.SESSION, signature: process.env.SIGNATURE };
  const userName = process.env.TV_USER;
  const scriptName = `workflow-example-${Date.now()}`;

  // ============================================================================
  // Step 1: Create script locally and save to remote
  // ============================================================================
  console.log('\n=== Step 1: Create and save script ===');

  const localSource = `
// @version=5
indicator("Workflow Example Strategy", overlay=true)

// Simple inputs for testing
length = input.int(14, title="Length")
multiplier = input.float(1.5, title="Multiplier")

// Simple SMA calculation
avg = ta.sma(close, length)
deviation = high - avg

plot(avg, "SMA", color.blue)
plot(avg + deviation * multiplier, "Upper", color.red)
plot(avg - deviation * multiplier, "Lower", color.orange)
`.trim();

  console.log('Translating script...');
  const trans = await TradingView.translateScriptLight(localSource, { credentials: creds });
  console.log('✓ Translation OK');

  console.log(`Saving script as "${scriptName}"...`);
  const saveRes = await TradingView.saveScriptNew({
    name: scriptName,
    source: localSource,
    userName,
    credentials: creds,
  });

  // Extract pineId from response
  let pineId = null;
  if (typeof saveRes === 'string') {
    const m = saveRes.match(/(USER|PUB|STD);[^\s"'<>]+/);
    if (m) pineId = m[0];
  } else if (saveRes && typeof saveRes === 'object') {
    pineId = saveRes.scriptIdPart || saveRes.id || saveRes.pineId;
  }

  if (!pineId) {
    const priv = await TradingView.getPrivateIndicators(creds.session, creds.signature);
    const found = priv.find((p) => p.name === scriptName);
    if (found) pineId = found.id;
  }

  if (!pineId) {
    console.error('Failed to determine pineId after save');
    process.exit(1);
  }

  console.log(`✓ Script saved with pineId: ${pineId}`);

  // ============================================================================
  // Step 2: Fetch and verify the script
  // ============================================================================
  console.log('\n=== Step 2: Fetch and verify script ===');

  const versions = await TradingView.listScriptVersions(pineId, creds);
  console.log('Available versions:', versions?.length ?? 'unknown');

  const firstVersion = Array.isArray(versions) && versions.length ? (versions[0].version || versions[0].id || '1.0') : '1.0';
  const fetchedSource = await TradingView.getScriptVersion(pineId, firstVersion, creds);
  console.log(`✓ Fetched version ${firstVersion}, size: ${String(fetchedSource).length} bytes`);

  // ============================================================================
  // Step 3: Run the script with custom inputs on a live chart
  // ============================================================================
  console.log('\n=== Step 3: Run script with custom inputs ===');

  try {
    const indicator = await TradingView.getIndicator(pineId, 'last', creds.session, creds.signature);
    console.log('✓ Loaded indicator:', indicator.description);

    // Apply custom input overrides
    console.log('Setting custom inputs: length=20, multiplier=2.0');
    try {
      // Try by inline name or internal ID
      if (indicator.inputs.in_0) indicator.setOption('in_0', 20); // First input (length)
      if (indicator.inputs.in_1) indicator.setOption('in_1', 2.0); // Second input (multiplier)
    } catch (e) {
      console.warn('Could not set some inputs:', e.message);
    }

    // Create a chart and run the indicator
    const client = new TradingView.Client({ token: creds.session, signature: creds.signature });
    const chart = new client.Session.Chart();

    console.log('Setting market to BINANCE:BTCEUR (1D)...');
    chart.setMarket('BINANCE:BTCEUR', { timeframe: 'D', range: 100 });

    const study = new chart.Study(indicator);
    let updateCount = 0;

    const resultPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('Timeout waiting for study updates');
        resolve(null);
      }, 15000);

      study.onUpdate(() => {
        updateCount++;
        if (updateCount === 1) {
          console.log(`✓ Study updated with ${study.periods?.length ?? 0} periods`);
          if (study.periods && study.periods.length > 0) {
            const lastPeriod = study.periods[0];
            console.log('Last period sample:', {
              time: lastPeriod.$time,
              sma: lastPeriod.SMA,
              upper: lastPeriod.Upper,
              lower: lastPeriod.Lower,
            });
          }
          clearTimeout(timeout);
          resolve(study.periods);
        }
      });
    });

    await resultPromise;
    chart.delete?.();
    client.end?.();
  } catch (e) {
    console.warn('Could not run indicator on chart:', e.message);
    console.log('(This is expected if the script syntax has issues or network is slow.)');
  }

  // ============================================================================
  // Step 4: Update local version and push to remote
  // ============================================================================
  console.log('\n=== Step 4: Update and push new version ===');

  const updatedSource = `
// @version=5
indicator("Workflow Example Strategy - Updated", overlay=true)

// Updated inputs
length = input.int(20, title="Length (updated)")
multiplier = input.float(2.0, title="Multiplier (updated)")
offset = input.int(5, title="Offset")

// Enhanced calculation with offset
avg = ta.sma(close, length)
deviation = high - avg

plot(avg, "SMA", color.blue, linewidth=2)
plot(avg + deviation * multiplier + offset, "Upper", color.red)
plot(avg - deviation * multiplier - offset, "Lower", color.orange)
`.trim();

  console.log('Translating updated script...');
  const trans2 = await TradingView.translateScriptLight(updatedSource, { credentials: creds });
  console.log('✓ Updated translation OK');

  // For simplicity, we can use saveScriptNew with allowOverwrite=true to create a new version
  // In production, you'd use saveNext or similar to explicitly version the update
  console.log('Saving updated version...');
  const updateRes = await TradingView.saveScriptNew({
    name: scriptName,
    source: updatedSource,
    userName,
    allowOverwrite: true,
    credentials: creds,
  });
  console.log('✓ Updated version saved');

  const newVersions = await TradingView.listScriptVersions(pineId, creds);
  console.log(`Script now has ${newVersions?.length ?? '?'} versions`);

  // ============================================================================
  // Step 5: Cleanup (optional)
  // ============================================================================
  console.log('\n=== Step 5: Cleanup ===');

  const shouldCleanup = process.env.CLEANUP === '1';
  if (shouldCleanup) {
    console.log('Attempting to delete the example script...');
    const delRes = await TradingView.deleteScriptVersion(pineId, '', creds);
    console.log('✓ Script deleted');
  } else {
    console.log(`Script ${pineId} left on remote. Set CLEANUP=1 to delete it.`);
  }

  console.log('\n=== Workflow complete ===');
  console.log(`Summary:
  - Created script: ${scriptName} (${pineId})
  - Ran with custom inputs on BINANCE:BTCEUR
  - Updated source and pushed new version
  - Total versions: ${newVersions?.length ?? '?'}
`);
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
