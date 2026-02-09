/**
 * TradingView Alert Presets API Example
 * 
 * This example demonstrates how to use the TradingView alert presets API to:
 * - List all alert presets
 * - Get a specific preset by ID
 * - Create new alert presets
 * - Update existing presets
 * - Search presets by name
 * - Delete presets
 * - Use the alert presets client
 */

const TradingView = require('../main');
require('dotenv').config();

// Configuration - Get these from environment variables or .env file
const SESSION = process.env.SESSION || 'your_session_id';
const SIGNATURE = process.env.SIGNATURE || 'your_session_signature';

async function runAlertPresetsExamples() {
  console.log('=== TradingView Alert Presets API Examples ===\n');

  // Check if credentials are provided
  if (SESSION === 'your_session_id' || SIGNATURE === 'your_session_signature') {
    console.log('⚠️  Please set your SESSION and SIGNATURE environment variables');
    console.log('You can get these from your browser cookies after logging into TradingView');
    console.log('Cookies needed: sessionid and sessionid_sign\n');
    return;
  }

  let createdPresetId = null;

  try {
    // ==========================================
    // 1. LIST ALL ALERT PRESETS
    // ==========================================
    console.log('1. Listing all alert presets...');
    const presets = await TradingView.getAlertPresets({
      session: SESSION,
      signature: SIGNATURE,
    });
    console.log(`   Found ${presets.length} alert presets`);
    
    if (presets.length > 0) {
      const preset = presets[0];
      console.log('\n   First preset:');
      console.log('   ID:', preset.id);
      console.log('   Name:', preset.name);
      if (preset.description) {
        console.log('   Description:', preset.description);
      }
    } else {
      console.log('   No presets found. You can create some below.');
    }
    console.log('   ✓ List alert presets successful\n');

    // ==========================================
    // 2. CREATE A NEW ALERT PRESET
    // ==========================================
    console.log('2. Creating a new alert preset...');
    try {
      const newPreset = await TradingView.createAlertPreset({
        name: `API Test Preset ${Date.now()}`,
        description: 'Test preset created via API',
        condition: {
          type: 'price',
          series: [
            { type: 'price', source: 'close' },
            { type: 'const', value: 50000 },
          ],
        },
        message: 'Price alert triggered!',
        popup: true,
        email: false,
        mobile_push: true,
        sound_file: 'alert/fired',
        sound_duration: 0,
      }, {
        session: SESSION,
        signature: SIGNATURE,
      });
      
      createdPresetId = newPreset.id;
      console.log('   Created preset ID:', newPreset.id);
      console.log('   Name:', newPreset.name);
      console.log('   ✓ Create preset successful\n');
    } catch (createError) {
      console.log('   ⚠️  Create preset failed:', createError.message);
      console.log('   (May require specific permissions or plan)\n');
    }

    // ==========================================
    // 3. GET PRESET BY ID
    // ==========================================
    if (createdPresetId) {
      console.log(`3. Getting preset by ID (${createdPresetId})...`);
      const preset = await TradingView.getAlertPreset(createdPresetId, {
        session: SESSION,
        signature: SIGNATURE,
      });
      
      if (preset) {
        console.log('\n   Preset details:');
        console.log('   ID:', preset.id);
        console.log('   Name:', preset.name);
        console.log('   Description:', preset.description);
        console.log('   Created:', preset.created_at);
        console.log('   Updated:', preset.updated_at);
      }
      console.log('   ✓ Get preset by ID successful\n');
    } else {
      console.log('3. Skipping get by ID - no preset created\n');
    }

    // ==========================================
    // 4. UPDATE ALERT PRESET
    // ==========================================
    if (createdPresetId) {
      console.log('4. Updating the alert preset...');
      try {
        const updated = await TradingView.updateAlertPreset(
          createdPresetId,
          {
            name: `Updated Preset ${Date.now()}`,
            description: 'Updated description via API',
            message: 'Updated alert message!',
          },
          {
            session: SESSION,
            signature: SIGNATURE,
          }
        );
        
        console.log('   Updated preset ID:', updated.id);
        console.log('   New name:', updated.name);
        console.log('   ✓ Update preset successful\n');
      } catch (updateError) {
        console.log('   ⚠️  Update failed:', updateError.message);
        console.log('   (May require specific permissions)\n');
      }
    } else {
      console.log('4. Skipping update - no preset created\n');
    }

    // ==========================================
    // 5. SEARCH ALERT PRESETS
    // ==========================================
    console.log('5. Searching alert presets for "test"...');
    const searchResults = await TradingView.searchAlertPresets('test', {
      session: SESSION,
      signature: SIGNATURE,
    });
    console.log(`   Found ${searchResults.length} presets matching "test"`);
    
    if (searchResults.length > 0) {
      console.log('\n   Matching presets:');
      searchResults.slice(0, 5).forEach((preset) => {
        console.log(`   - ${preset.name} (ID: ${preset.id})`);
      });
    }
    console.log('   ✓ Search presets successful\n');

    // ==========================================
    // 6. USING THE ALERT PRESETS CLIENT
    // ==========================================
    console.log('6. Using the alert presets client...');
    const presetsClient = TradingView.storage.createAlertPresetsClient({
      session: SESSION,
      signature: SIGNATURE,
    });

    // List via client
    const clientPresets = await presetsClient.list();
    console.log(`   Found ${clientPresets.length} presets via client`);

    // Search via client
    const clientSearch = await presetsClient.search('API');
    console.log(`   Found ${clientSearch.length} presets matching "API" via client`);

    // Create via client
    try {
      const clientPreset = await presetsClient.create({
        name: `Client Test Preset ${Date.now()}`,
        description: 'Created via client',
        condition: {
          type: 'crossing',
          series: [
            { type: 'price', source: 'close' },
            { type: 'const', value: 60000 },
          ],
        },
      });
      console.log('   Created preset via client:', clientPreset.id);

      // Update via client
      const clientUpdated = await presetsClient.update(clientPreset.id, {
        description: 'Updated via client',
      });
      console.log('   Updated preset via client:', clientUpdated.id);

      // Delete via client (clean up)
      await presetsClient.delete(clientPreset.id);
      console.log('   Deleted preset via client');
    } catch (clientError) {
      console.log('   ⚠️  Client operations failed:', clientError.message);
    }
    console.log('   ✓ Presets client successful\n');

    // ==========================================
    // 7. CLEAN UP - DELETE CREATED PRESET
    // ==========================================
    if (createdPresetId) {
      console.log('7. Cleaning up - deleting test preset...');
      try {
        await TradingView.deleteAlertPreset(createdPresetId, {
          session: SESSION,
          signature: SIGNATURE,
        });
        console.log('   ✓ Delete preset successful\n');
      } catch (deleteError) {
        console.log('   ⚠️  Delete failed:', deleteError.message);
        console.log('   (May require specific permissions or preset not found)\n');
      }
    } else {
      console.log('7. Skipping cleanup - no preset created\n');
    }

    // ==========================================
    // 8. DISPLAY PRESET STATISTICS
    // ==========================================
    console.log('8. Alert preset statistics...');
    const allPresets = await TradingView.getAlertPresets({
      session: SESSION,
      signature: SIGNATURE,
    });

    // Analyze preset conditions
    const conditionTypes = {};
    allPresets.forEach((preset) => {
      if (preset.condition && preset.condition.type) {
        conditionTypes[preset.condition.type] = (conditionTypes[preset.condition.type] || 0) + 1;
      }
    });

    if (Object.keys(conditionTypes).length > 0) {
      console.log('\n   Condition types:');
      Object.entries(conditionTypes)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          console.log(`   - ${type}: ${count} presets`);
        });
    }

    // Notification preferences
    const popupCount = allPresets.filter(p => p.popup).length;
    const emailCount = allPresets.filter(p => p.email).length;
    const pushCount = allPresets.filter(p => p.mobile_push).length;
    const webhookCount = allPresets.filter(p => p.web_hook).length;

    console.log('\n   Notification preferences:');
    console.log(`   - Popup: ${popupCount} presets`);
    console.log(`   - Email: ${emailCount} presets`);
    console.log(`   - Mobile Push: ${pushCount} presets`);
    console.log(`   - Webhook: ${webhookCount} presets`);
    console.log('   ✓ Statistics generated\n');

    console.log('=== All examples completed successfully! ===');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the examples
runAlertPresetsExamples();
