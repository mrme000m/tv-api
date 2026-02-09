/**
 * TradingView Alert Fires API Example
 * 
 * This example demonstrates how to use the TradingView alert fires API to:
 * - List triggered alert fires (history)
 * - Get offline fires
 * - Clear offline fires for specific alerts
 * - Delete all fires
 */

const TradingView = require('../main');
require('dotenv').config();

// Configuration - Get these from environment variables or .env file
const SESSION = process.env.SESSION || 'your_session_id';
const SIGNATURE = process.env.SIGNATURE || 'your_session_signature';

async function runAlertFiresExamples() {
  console.log('=== TradingView Alert Fires API Examples ===\n');

  // Check if credentials are provided
  if (SESSION === 'your_session_id' || SIGNATURE === 'your_session_signature') {
    console.log('⚠️  Please set your SESSION and SIGNATURE environment variables');
    console.log('You can get these from your browser cookies after logging into TradingView');
    console.log('Cookies needed: sessionid and sessionid_sign\n');
    return;
  }

  try {
    // ==========================================
    // 1. LIST ALERT FIRES
    // ==========================================
    console.log('1. Listing recent alert fires...');
    const fires = await TradingView.listFires({
      session: SESSION,
      signature: SIGNATURE,
      limit: 10,
    });
    
    console.log('   Status:', fires.s);
    console.log('   Response ID:', fires.id);
    
    if (fires.r && fires.r.length > 0) {
      console.log(`   Found ${fires.r.length} fires`);
      console.log('\n   Recent fires:');
      fires.r.slice(0, 5).forEach((fire, index) => {
        console.log(`   ${index + 1}. ${fire.name}`);
        console.log(`      - Fire ID: ${fire.fire_id}`);
        console.log(`      - Alert ID: ${fire.alert_id}`);
        console.log(`      - Time: ${new Date(fire.fire_time).toLocaleString()}`);
        console.log(`      - Symbol: ${fire.symbol}`);
        console.log(`      - Resolution: ${fire.resolution}`);
        if (fire.message) {
          try {
            const msg = JSON.parse(fire.message);
            console.log(`      - Message: ${msg.message || msg.comment || fire.message}`);
          } catch (e) {
            console.log(`      - Message: ${fire.message}`);
          }
        }
      });
    } else {
      console.log('   No recent fires found');
    }
    console.log('   ✓ List fires successful\n');

    // ==========================================
    // 2. GET OFFLINE FIRES
    // ==========================================
    console.log('2. Getting offline fires...');
    const offlineFires = await TradingView.getOfflineFires({
      session: SESSION,
      signature: SIGNATURE,
      limit: 10,
    });
    
    console.log('   Status:', offlineFires.s);
    console.log('   Response ID:', offlineFires.id);
    
    if (offlineFires.r && Array.isArray(offlineFires.r)) {
      console.log(`   Found ${offlineFires.r.length} offline fires`);
    }
    console.log('   ✓ Get offline fires successful\n');

    // ==========================================
    // 3. CLEAR OFFLINE FIRES FOR SPECIFIC ALERTS
    // ==========================================
    console.log('3. Clearing offline fires for specific alerts...');
    
    // First, list fires to find alert IDs
    const firesForClearing = await TradingView.listFires({
      session: SESSION,
      signature: SIGNATURE,
      limit: 5,
    });
    
    if (firesForClearing.r && firesForClearing.r.length > 0) {
      // Get unique alert IDs from fires
      const alertIds = [...new Set(firesForClearing.r.map((f) => f.alert_id))];
      
      if (alertIds.length > 0) {
        console.log(`   Clearing fires for ${alertIds.length} alert(s)...`);
        
        const clearResult = await TradingView.clearOfflineFires(alertIds.slice(0, 2), {
          session: SESSION,
          signature: SIGNATURE,
        });
        
        console.log('   Clear result status:', clearResult.s);
        console.log('   ✓ Clear offline fires successful\n');
      } else {
        console.log('   No alert IDs found to clear\n');
      }
    } else {
      console.log('   No fires found to clear\n');
    }

    // ==========================================
    // 4. USING THE ALERTS CLIENT
    // ==========================================
    console.log('4. Using the alerts client with defaults...');
    const alertsClient = TradingView.alerts.createAlertsClient({
      session: SESSION,
      signature: SIGNATURE,
    });

    const clientFires = await alertsClient.listFires({ limit: 5 });
    console.log(`   Found ${clientFires.r?.length || 0} fires via client`);
    console.log('   ✓ Alerts client successful\n');

    // ==========================================
    // 5. GET OFFLINE FIRE CONTROLS
    // ==========================================
    console.log('5. Getting offline fire controls...');
    const controls = await TradingView.getOfflineFireControls({
      session: SESSION,
      signature: SIGNATURE,
    });
    
    console.log('   Status:', controls.s);
    console.log('   ✓ Get offline fire controls successful\n');

    // ==========================================
    // 6. DELETE ALL FIRES (USE WITH CAUTION!)
    // ==========================================
    // Uncomment the following block to delete ALL fires
    // WARNING: This will clear your entire alert fire history!
    
    /*
    console.log('6. Deleting ALL fires (this action cannot be undone)...');
    const deleteResult = await TradingView.deleteAllFires({
      session: SESSION,
      signature: SIGNATURE,
    });
    console.log('   Delete result status:', deleteResult.s);
    console.log('   ✓ Delete all fires successful\n');
    */
    
    console.log('6. Skipping delete all fires (uncomment in code to run)');
    console.log('   Note: deleteAllFires() will clear your entire alert history\n');

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
runAlertFiresExamples();
