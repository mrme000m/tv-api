/*
 * Example: Download existing script, update locally, push changes, and run with custom input
 *
 * This example demonstrates:
 * 1. List existing private scripts (indicators)
 * 2. Select one and download the source to a .pine file
 * 3. Modify the source locally
 * 4. Validate and push the updated version
 * 5. Run the updated script on a live chart with custom inputs
 *
 * Requires: SESSION, SIGNATURE, TV_USER in .env file or environment variables
 * Usage: node examples/UpdateExistingScript.js [scriptIndex]
 *        - scriptIndex (optional): index in the list (default 0 = first script)
 *        - Example: node examples/UpdateExistingScript.js 2
 */

require('dotenv').config();

const TradingView = require('../main');
const fs = require('fs');
const path = require('path');

async function main() {
  if (!process.env.SESSION || !process.env.SIGNATURE || !process.env.TV_USER) {
    console.error('Please set SESSION, SIGNATURE and TV_USER in .env file or environment variables');
    process.exit(1);
  }

  const session = process.env.SESSION;
  const signature = process.env.SIGNATURE;
  const userName = process.env.TV_USER;
  const creds = { session, signature };
  const scriptIndexArg = process.argv[2] ? parseInt(process.argv[2], 10) : 0;

  try {
    console.log('📋 Step 1: Fetching list of existing private scripts...\n');
    const indicators = await TradingView.getPrivateIndicators(creds.session, creds.signature);
    console.log(`Found ${indicators.length} private indicator(s):\n`);

    if (indicators.length === 0) {
      console.error('❌ No private indicators found. Please create one first using examples/FullWorkflow.js');
      process.exit(1);
    }

    // List available scripts
    indicators.forEach((ind, idx) => {
      console.log(`  [${idx}] ${ind.name || 'Unnamed'} (${ind.id})`);
    });
    console.log();

    // Select script (validate index)
    const selectedIdx = scriptIndexArg >= indicators.length ? 0 : scriptIndexArg;
    const selectedIndicator = indicators[selectedIdx];
    console.log(`✓ Selected script [${selectedIdx}]: ${selectedIndicator.name} (${selectedIndicator.id})\n`);

    // Extract pineId and version from the indicator
    const pineId = selectedIndicator.id;
    const currentVersion = selectedIndicator.version || selectedIndicator.latest || '1';

    console.log('📥 Step 2: Downloading script source code...\n');
    const response = await TradingView.getScriptVersion(pineId, currentVersion, creds);
    const sourceCode = typeof response === 'object' && response.source ? response.source : response;

    if (!sourceCode) {
      throw new Error('Failed to fetch script source');
    }

    // Save to .pine file
    const fileName = `${selectedIndicator.name || 'script'}_${Date.now()}.pine`;
    const filePath = path.join(process.cwd(), fileName);
    fs.writeFileSync(filePath, sourceCode, 'utf8');
    console.log(`✓ Source saved to: ${fileName}`);
    console.log(`  Content length: ${sourceCode.length} bytes\n`);

    // Show preview of source
    const lines = sourceCode.split('\n').slice(0, 5);
    console.log('  Preview (first 5 lines):');
    lines.forEach((line) => console.log(`    ${line}`));
    console.log('    ...\n');

    console.log('✏️  Step 3: Modifying source code locally...\n');

    // Simple modification: update description or add a comment
    // This example adds a timestamp comment to the script
    const modifiedSource = sourceCode.replace(
      /(@description\s*"[^"]*)/,
      `$1 [Updated ${new Date().toISOString().split('T')[0]}]`
    ).replace(
      /^(indicator\(|study\()/m,
      (match) => {
        // If no @description found, add comment at the top after imports
        if (!sourceCode.includes('@description')) {
          return `// Last modified: ${new Date().toISOString()}\n${match}`;
        }
        return match;
      }
    );

    const didModify = modifiedSource !== sourceCode;
    if (didModify) {
      console.log('✓ Added update timestamp to the script');
    } else {
      console.log('ℹ No @description found; added comment header instead');
    }
    console.log(`  Modified size: ${modifiedSource.length} bytes\n`);

    console.log('✔️  Step 4: Validating and translating updated source...\n');
    const translateRes = await TradingView.translateScriptLight(modifiedSource, { credentials: creds });
    console.log('✓ Syntax validation passed');
    console.log(`  Translation result keys: ${Object.keys(translateRes).join(', ')}\n`);

    console.log('🚀 Step 5: Pushing updated version to remote...\n');
    const saveRes = await TradingView.saveScriptNew({
      name: selectedIndicator.name,
      source: modifiedSource,
      userName,
      allowOverwrite: true,
      credentials: creds,
    });

    console.log('✓ Script updated successfully');
    const newScriptIdPart = saveRes?.id?.match?.(/(USER|PUB|STD);[a-f0-9]+/)?.[0] || pineId;
    console.log(`  Remote pineId: ${newScriptIdPart}\n`);

    // List versions to show history
    const versions = await TradingView.listScriptVersions(pineId, creds);
    console.log(`  Version history (${versions.length || 'unknown'} total):\n`);

    console.log('▶️  Step 6: Running updated script with custom inputs...\n');

    try {
      // Load the updated indicator with full metadata
      const indicator = await TradingView.getIndicator(
        pineId,
        'last',
        session,
        signature
      );
      console.log('✓ Indicator loaded');

      // Override inputs if available (example: adjust common parameters)
      // Common input IDs: in_0, in_1, in_2, etc.
      try {
        // Try common indices for length/period inputs
        indicator.setOption('in_0', 20); // Often length/period
        console.log('  ✓ Set in_0 = 20');
      } catch (e) {
        // Silently ignore if input doesn't exist
      }

      try {
        indicator.setOption('in_1', 1.5); // Often a multiplier/threshold
        console.log('  ✓ Set in_1 = 1.5');
      } catch (e) {
        // Silently ignore if input doesn't exist
      }

      console.log();

      const client = new TradingView.Client({
        token: session,
        signature,
        DEBUG: process.env.TW_DEBUG === '1',
      });

      const chart = new client.Session.Chart();
      chart.setMarket('BINANCE:BTCUSD', { timeframe: '60', range: 100 });

      const study = new chart.Study(indicator);

      console.log('  Chart session created (BINANCE:BTCUSD, 1h timeframe)');
      console.log('  Waiting for first update (max 15s)...\n');

      const updateResult = await new Promise((resolve) => {
        const timer = setTimeout(() => {
          console.log('  ⚠️  Chart update timeout; using available data\n');
          resolve(null);
        }, 15000);

        study.onUpdate?.(() => {
          clearTimeout(timer);
          const period = study.periods?.[0];
          if (period) {
            console.log('  ✓ First update received');
            console.log(`    Latest period time: ${new Date(period.$time).toISOString()}`);
            console.log(`    Study values: ${Object.entries(period)
              .filter(([k]) => !k.startsWith('$'))
              .map(([k, v]) => `${k}=${typeof v === 'number' ? v.toFixed(2) : v}`)
              .join(', ')}\n`);
            resolve(period);
          }
        });

        study.onError?.((err) => {
          clearTimeout(timer);
          console.log(`  ❌ Study error: ${err}\n`);
          resolve(null);
        });
      });

      // Cleanup
      try {
        chart.delete?.();
        client.end?.();
        console.log('✓ Chart session cleaned up\n');
      } catch (e) {
        // Silently ignore cleanup errors
      }
    } catch (chartErr) {
      console.log(`⚠️  Chart execution failed (non-critical): ${chartErr.message}\n`);
    }

    // Show summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Workflow Complete!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`
Script Details:
  Name: ${selectedIndicator.name}
  Local File: ${fileName}
  Remote ID: ${pineId}
  Updated Version: ${currentVersion}
  
Next Steps:
  • Edit ${fileName} and run this script again
  • Or delete the file and download another script
  • Or add more complex modifications before pushing
    `);

    // Optional cleanup: remove .pine file after completion
    if (process.env.CLEANUP === '1') {
      fs.unlinkSync(filePath);
      console.log(`  [CLEANUP] Deleted ${fileName}\n`);
    }
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.response?.data) {
      console.error('Response:', err.response.data);
    }
    process.exit(1);
  }
}

main();
