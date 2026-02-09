/**
 * TradingView Pro Plan API Example
 * 
 * This example demonstrates how to use the TradingView pro plan API to:
 * - Get user's pro plan information
 * - Check plan capabilities
 * - Conditionally run features based on plan
 */

const TradingView = require('../main');
require('dotenv').config();

// Configuration - Get these from environment variables or .env file
const SESSION = process.env.SESSION || 'your_session_id';
const SIGNATURE = process.env.SIGNATURE || 'your_session_signature';

async function runProPlanExamples() {
  console.log('=== TradingView Pro Plan API Examples ===\n');

  // Check if credentials are provided
  if (SESSION === 'your_session_id' || SIGNATURE === 'your_session_signature') {
    console.log('⚠️  Please set your SESSION and SIGNATURE environment variables');
    console.log('You can get these from your browser cookies after logging into TradingView');
    console.log('Cookies needed: sessionid and sessionid_sign\n');
    return;
  }

  try {
    // ==========================================
    // 1. GET PRO PLAN INFO
    // ==========================================
    console.log('1. Getting pro plan information...');
    const planInfo = await TradingView.getProPlanInfo({
      session: SESSION,
      signature: SIGNATURE,
    });
    
    console.log('   Pro plan:', planInfo.pro_plan);
    console.log('   ✓ Get pro plan info successful\n');

    // ==========================================
    // 2. CHECK PLAN CAPABILITIES
    // ==========================================
    console.log('2. Checking plan capabilities...');
    
    const hasPaid = TradingView.hasPaidPlan(planInfo);
    const hasPremium = TradingView.hasPremiumFeatures(planInfo);
    const hasPro = TradingView.hasPlanOrBetter(planInfo, TradingView.PLAN_TYPES.PRO);
    const hasProPlus = TradingView.hasPlanOrBetter(planInfo, TradingView.PLAN_TYPES.PRO_PLUS);
    const hasProPremium = TradingView.hasPlanOrBetter(planInfo, TradingView.PLAN_TYPES.PRO_PREMIUM);
    
    console.log('   Plan analysis:');
    console.log('   - Has any paid plan:', hasPaid);
    console.log('   - Has premium features:', hasPremium);
    console.log('   - Has Pro or better:', hasPro);
    console.log('   - Has Pro+ or better:', hasProPlus);
    console.log('   - Has Pro Premium:', hasProPremium);
    console.log('   ✓ Plan capabilities checked\n');

    // ==========================================
    // 3. CONDITIONALLY USE FEATURES
    // ==========================================
    console.log('3. Conditionally using features based on plan...');
    
    if (hasProPremium || hasProPlus) {
      console.log('   ✓ User has Pro+ or Pro Premium - all features available');
      
      // Try creating multiple watchlists
      try {
        const watchlist = await TradingView.createWatchlist({
          name: `Premium Watchlist ${Date.now()}`,
          symbols: ['COINBASE:BTCUSD', 'COINBASE:ETHUSD'],
        }, {
          session: SESSION,
          signature: SIGNATURE,
        });
        console.log('   ✓ Created premium watchlist:', watchlist.id);
        
        // Clean up
        await TradingView.deleteWatchlist(watchlist.id, {
          session: SESSION,
          signature: SIGNATURE,
        });
      } catch (e) {
        console.log('   ⚠️  Could not create watchlist:', e.message);
      }
    } else if (hasPro) {
      console.log('   ✓ User has Pro plan - most features available');
    } else if (hasPaid) {
      console.log('   ✓ User has a paid plan - basic premium features available');
    } else {
      console.log('   ℹ️  User has free plan - limited features available');
      console.log('   Only default watchlist can be used');
    }
    console.log();

    // ==========================================
    // 4. USING THE PRO PLAN CLIENT
    // ==========================================
    console.log('4. Using the pro plan client...');
    const proClient = TradingView.proPlan.createProPlanClient({
      session: SESSION,
      signature: SIGNATURE,
    });

    const clientPlanInfo = await proClient.getInfo();
    console.log('   Plan via client:', clientPlanInfo.pro_plan);
    console.log('   Has premium features:', proClient.hasPremiumFeatures(clientPlanInfo));
    console.log('   ✓ Pro plan client successful\n');

    // ==========================================
    // 5. PLAN CONSTANTS
    // ==========================================
    console.log('5. Available plan types:');
    Object.entries(TradingView.PLAN_TYPES).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value}`);
    });
    console.log('   ✓ Plan constants\n');

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
runProPlanExamples();
