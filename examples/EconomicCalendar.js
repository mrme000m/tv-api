/**
 * TradingView Economic Calendar API Example
 * 
 * This example demonstrates how to use the TradingView economic calendar API to:
 * - Get upcoming economic events
 * - Get high-impact events
 * - Get events for specific countries
 * - Get today's and this week's events
 * - Get central bank events
 * - Filter events by category
 */

const TradingView = require('../main');

async function runCalendarExamples() {
  console.log('=== TradingView Economic Calendar API Examples ===\n');

  try {
    // ==========================================
    // 1. GET UPCOMING ECONOMIC EVENTS
    // ==========================================
    console.log('1. Getting upcoming economic events...');
    const events = await TradingView.getEconomicEvents(
      {},
      { limit: 5 }
    );
    console.log(`   Found ${events.events.length} events`);
    console.log('   Has more:', events.hasMore);
    
    if (events.events.length > 0) {
      const event = events.events[0];
      console.log('\n   Next event:');
      console.log('   Title:', event.title);
      console.log('   Country:', event.country);
      console.log('   Indicator:', event.indicator);
      console.log('   Importance:', '⭐'.repeat(event.importance));
      console.log('   Date:', new Date(event.date).toLocaleString());
      if (event.forecast !== undefined) {
        console.log('   Forecast:', event.forecast, event.unit);
      }
      if (event.previous !== undefined) {
        console.log('   Previous:', event.previous, event.unit);
      }
    }
    console.log('   ✓ Get economic events successful\n');

    // ==========================================
    // 2. GET HIGH-IMPACT EVENTS
    // ==========================================
    console.log('2. Getting high-impact events (3 stars)...');
    const highImpact = await TradingView.getHighImpactEvents({
      limit: 5,
    });
    console.log(`   Found ${highImpact.events.length} high-impact events`);
    
    if (highImpact.events.length > 0) {
      console.log('\n   Upcoming high-impact events:');
      highImpact.events.slice(0, 3).forEach((event) => {
        console.log(`   - ${event.title} (${event.country}) - ${new Date(event.date).toLocaleDateString()}`);
      });
    }
    console.log('   ✓ Get high-impact events successful\n');

    // ==========================================
    // 3. GET EVENTS FOR SPECIFIC COUNTRIES
    // ==========================================
    console.log('3. Getting events for United States...');
    const usEvents = await TradingView.getCountryEvents('US', {
      limit: 5,
    });
    console.log(`   Found ${usEvents.events.length} US events`);
    
    if (usEvents.events.length > 0) {
      console.log('\n   Upcoming US events:');
      usEvents.events.slice(0, 3).forEach((event) => {
        console.log(`   - ${event.indicator} - ${new Date(event.date).toLocaleDateString()}`);
      });
    }
    console.log('   ✓ Get country events successful\n');

    // ==========================================
    // 4. GET TODAY'S EVENTS
    // ==========================================
    console.log('4. Getting today\'s economic events...');
    const todayEvents = await TradingView.getTodaysEvents({
      limit: 10,
    });
    console.log(`   Found ${todayEvents.events.length} events today`);
    
    if (todayEvents.events.length > 0) {
      console.log('\n   Today\'s events:');
      todayEvents.events.slice(0, 5).forEach((event) => {
        const importance = '⭐'.repeat(event.importance);
        console.log(`   - ${importance} ${event.title} (${event.country})`);
      });
    }
    console.log('   ✓ Get today\'s events successful\n');

    // ==========================================
    // 5. GET THIS WEEK'S EVENTS
    // ==========================================
    console.log('5. Getting this week\'s economic events...');
    const weekEvents = await TradingView.getWeekEvents({
      limit: 10,
    });
    console.log(`   Found ${weekEvents.events.length} events this week`);
    console.log('   ✓ Get week events successful\n');

    // ==========================================
    // 6. GET CENTRAL BANK EVENTS
    // ==========================================
    console.log('6. Getting central bank events (FOMC, ECB, etc.)...');
    const centralBankEvents = await TradingView.getCentralBankEvents({
      limit: 5,
    });
    console.log(`   Found ${centralBankEvents.events.length} central bank events`);
    
    if (centralBankEvents.events.length > 0) {
      console.log('\n   Central bank events:');
      centralBankEvents.events.slice(0, 3).forEach((event) => {
        console.log(`   - ${event.title} (${event.country}) - ${new Date(event.date).toLocaleDateString()}`);
      });
    }
    console.log('   ✓ Get central bank events successful\n');

    // ==========================================
    // 7. FILTER EVENTS BY DATE RANGE AND COUNTRY
    // ==========================================
    console.log('7. Getting filtered events (US & EU, high importance)...');
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const filteredEvents = await TradingView.getEconomicEvents(
      {
        from: today,
        to: nextWeek,
        countries: ['US', 'EU'],
        importance: 2,
      },
      { limit: 10 }
    );
    console.log(`   Found ${filteredEvents.events.length} filtered events`);
    
    if (filteredEvents.events.length > 0) {
      console.log('\n   Filtered events:');
      filteredEvents.events.slice(0, 5).forEach((event) => {
        const importance = '⭐'.repeat(event.importance);
        console.log(`   - ${importance} ${event.title} (${event.country})`);
      });
    }
    console.log('   ✓ Filter events successful\n');

    // ==========================================
    // 8. GET EVENTS BY CATEGORY
    // ==========================================
    console.log('8. Getting inflation-related events...');
    const inflationEvents = await TradingView.getEventsByCategory(
      TradingView.calendar.CATEGORIES.INFLATION,
      { limit: 5 }
    );
    console.log(`   Found ${inflationEvents.events.length} inflation events`);
    
    if (inflationEvents.events.length > 0) {
      console.log('\n   Inflation events:');
      inflationEvents.events.slice(0, 3).forEach((event) => {
        console.log(`   - ${event.indicator} (${event.country})`);
      });
    }
    console.log('   ✓ Get category events successful\n');

    // ==========================================
    // 9. USING THE CALENDAR CLIENT
    // ==========================================
    console.log('9. Using the calendar client...');
    const calendarClient = TradingView.calendar.createCalendarClient();
    
    const clientEvents = await calendarClient.getTodaysEvents({ limit: 5 });
    console.log(`   Found ${clientEvents.events.length} events via client`);
    console.log('   ✓ Calendar client successful\n');

    // ==========================================
    // 10. DISPLAY AVAILABLE CATEGORIES
    // ==========================================
    console.log('10. Available event categories:');
    Object.entries(TradingView.calendar.CATEGORIES).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value}`);
    });
    console.log('   ✓ Categories listed\n');

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
runCalendarExamples();
