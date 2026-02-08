/**
 * TradingView Alerts API Example
 * 
 * This example demonstrates how to use the TradingView alerts API to:
 * - List existing alerts
 * - Create new alerts
 * - Update existing alerts
 * - Delete alerts
 * - Toggle alert activation state
 */

const TradingView = require('../main');
require('dotenv').config();

// Configuration - Get these from environment variables or .env file
const SESSION = process.env.SESSION || 'your_session_id';
const SIGNATURE = process.env.SIGNATURE || 'your_session_signature';

async function runAlertExamples() {
  console.log('=== TradingView Alerts API Examples ===\n');

  // Check if credentials are provided
  if (SESSION === 'your_session_id' || SIGNATURE === 'your_session_signature') {
    console.log('⚠️  Please set your SESSION and SIGNATURE environment variables');
    console.log('You can get these from your browser cookies after logging into TradingView');
    console.log('Cookies needed: sessionid and sessionid_sign\n');
    return;
  }

  try {
    // ==========================================
    // 1. LIST ALL ALERTS
    // ==========================================
    console.log('1. Listing all alerts...');
    const alerts = await TradingView.listAlerts({
      session: SESSION,
      signature: SIGNATURE,
    });
    console.log(`   Found ${Array.isArray(alerts) ? alerts.length : 0} alerts`);
    if (Array.isArray(alerts) && alerts.length > 0) {
      console.log('   First alert:', JSON.stringify(alerts[0], null, 2).substring(0, 200) + '...\n');
    }
    console.log('   ✓ List alerts successful\n');

    // ==========================================
    // 2. CREATE A SIMPLE PRICE ALERT
    // ==========================================
    console.log('2. Creating a simple price alert...');
    const newAlert = await TradingView.createPriceAlert({
      symbol: 'COINBASE:BTCUSD',
      resolution: '60', // 1 hour timeframe
      price: 50000,
      condition: 'crossing', // Alert when price crosses $50,000
      name: 'BTC $50k Alert',
      message: 'Bitcoin has crossed $50,000!',
    }, {
      session: SESSION,
      signature: SIGNATURE,
    });
    console.log('   Created alert ID:', newAlert.id);
    console.log('   ✓ Create alert successful\n');

    // ==========================================
    // 3. CREATE A CUSTOM ALERT WITH CONDITIONS
    // ==========================================
    console.log('3. Creating a custom alert with conditions...');
    const customAlert = await TradingView.createAlert({
      symbol: 'COINBASE:BTCUSD',
      resolution: '240', // 4 hour timeframe
      name: 'BTC Custom Alert',
      message: 'Custom alert triggered for Bitcoin!',
      popup: true,
      email: false,
      mobile_push: true,
      web_hook: 'https://your-webhook-url.com/tradingview', // Optional webhook
      conditions: [{
        type: 'crossing',
        series: [
          { type: 'price', source: 'close' },
          { type: 'const', value: 45000 },
        ],
      }],
    }, {
      session: SESSION,
      signature: SIGNATURE,
    });
    console.log('   Created custom alert ID:', customAlert.id);
    console.log('   ✓ Create custom alert successful\n');

    // ==========================================
    // 4. UPDATE AN ALERT
    // ==========================================
    console.log('4. Updating the alert...');
    const updatedAlert = await TradingView.updateAlert({
      alert_id: newAlert.id,
      name: 'BTC $50k Alert (Updated)',
      message: 'Updated: Bitcoin has crossed $50,000!',
    }, {
      session: SESSION,
      signature: SIGNATURE,
    });
    console.log('   Updated alert ID:', updatedAlert.id);
    console.log('   ✓ Update alert successful\n');

    // ==========================================
    // 5. DEACTIVATE AN ALERT
    // ==========================================
    console.log('5. Deactivating the alert...');
    const deactivatedAlert = await TradingView.deactivateAlert(newAlert.id, {
      session: SESSION,
      signature: SIGNATURE,
    });
    console.log('   Deactivated alert ID:', deactivatedAlert.id);
    console.log('   ✓ Deactivate alert successful\n');

    // ==========================================
    // 6. REACTIVATE AN ALERT
    // ==========================================
    console.log('6. Reactivating the alert...');
    const activatedAlert = await TradingView.activateAlert(newAlert.id, {
      session: SESSION,
      signature: SIGNATURE,
    });
    console.log('   Reactivated alert ID:', activatedAlert.id);
    console.log('   ✓ Activate alert successful\n');

    // ==========================================
    // 7. GET OFFLINE FIRES (ALERT HISTORY)
    // ==========================================
    console.log('7. Getting offline fires (alert history)...');
    const offlineFires = await TradingView.getOfflineFires({
      session: SESSION,
      signature: SIGNATURE,
      limit: 100,
    });
    console.log('   Offline fires:', JSON.stringify(offlineFires, null, 2).substring(0, 200) + '...');
    console.log('   ✓ Get offline fires successful\n');

    // ==========================================
    // 8. DELETE ALERTS
    // ==========================================
    console.log('8. Deleting created alerts...');
    await TradingView.deleteAlerts([newAlert.id, customAlert.id], {
      session: SESSION,
      signature: SIGNATURE,
    });
    console.log('   ✓ Delete alerts successful\n');

    // ==========================================
    // 9. USING THE ALERTS CLIENT
    // ==========================================
    console.log('9. Using the alerts client with defaults...');
    const alertsClient = TradingView.alerts.createAlertsClient({
      session: SESSION,
      signature: SIGNATURE,
    });

    // Now you can call methods without passing session/signature each time
    const clientAlerts = await alertsClient.list();
    console.log(`   Found ${Array.isArray(clientAlerts) ? clientAlerts.length : 0} alerts via client`);
    console.log('   ✓ Alerts client successful\n');

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
runAlertExamples();
