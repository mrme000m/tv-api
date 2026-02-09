/**
 * TradingView Scripts & Ideas API Example
 * 
 * This example demonstrates how to browse, search, and filter
 * scripts (indicators, strategies, libraries) and ideas from
 * the TradingView community.
 * 
 * ## Content Types
 * 
 * - **Scripts** (`is_script: true`): Technical tools created with Pine Script
 *   - `indicator`: Analysis tools (RSI, MACD, Moving Averages, etc.)
 *   - `strategy`: Backtestable trading strategies  
 *   - `library`: Reusable Pine Script code libraries
 * 
 * - **Ideas** (`is_script: false`): Community chart analysis posts
 *   - Regular ideas with chart screenshots
 *   - Video ideas (`is_video: true`)
 *   - Educational posts (`is_education: true`)
 * 
 * ## Access Levels
 * 
 * - `open_source`: Full Pine Script source code visible
 * - `closed_source`: Compiled/binary only
 * - `invite_only`: Requires author's permission to use
 * 
 * ## API Limitations
 * 
 * - The browse endpoint returns aggregated popular content (both scripts and ideas)
 * - Type filtering (indicator/strategy/library) may not work on all sort options
 * - The search endpoint may require authentication or different parameters
 * - Individual script details endpoint is not publicly available
 */

const TradingView = require('../main');

async function run() {
  console.log('=== TradingView Scripts API Demo ===\n');

  try {
    // ==========================================
    // 1. BROWSE POPULAR CONTENT
    // ==========================================
    console.log('1. Browsing most popular scripts and ideas...');
    const popularContent = await TradingView.browseScripts({
      sort: 'week_popular',
      page_size: 10,
    });

    console.log(`   Found ${popularContent.results.length} items\n`);

    // Separate scripts and ideas
    const scripts = popularContent.results.filter(r => r.is_script);
    const ideas = popularContent.results.filter(r => r.is_idea);

    console.log(`   Scripts: ${scripts.length}, Ideas: ${ideas.length}\n`);

    // Show scripts
    if (scripts.length > 0) {
      console.log('   📊 Top Scripts:');
      scripts.slice(0, 3).forEach((script, i) => {
        const accessIcon = 
          script.access_level === 'open_source' ? '🔓' :
          script.access_level === 'invite_only' ? '🔒' : '⚪';
        console.log(`      ${i + 1}. ${script.name}`);
        console.log(`         Type: ${script.type} | Author: ${script.author?.username || 'Unknown'}`);
        console.log(`         Access: ${accessIcon} ${script.access_level}`);
        console.log(`         👍 ${script.likes} | 💬 ${script.comments}`);
        console.log();
      });
    }

    // Show ideas
    if (ideas.length > 0) {
      console.log('   📝 Top Ideas:');
      ideas.slice(0, 3).forEach((idea, i) => {
        console.log(`      ${i + 1}. ${idea.name}`);
        console.log(`         Author: ${idea.author?.username}`);
        console.log(`         Symbol: ${idea.symbol?.full_name || 'N/A'}`);
        console.log(`         👍 ${idea.likes} | 💬 ${idea.comments}`);
        console.log();
      });
    }

    // ==========================================
    // 2. BROWSE BY SORT OPTIONS
    // ==========================================
    console.log('2. Comparing different sort options...\n');
    
    const sortOptions = ['today_popular', 'week_popular', 'month_popular'];
    for (const sort of sortOptions) {
      const result = await TradingView.browseScripts({
        sort: sort,
        page_size: 3,
      });
      console.log(`   ${sort}: ${result.results.length} results`);
    }
    console.log();

    // ==========================================
    // 3. FILTER BY ACCESS LEVEL
    // ==========================================
    console.log('3. Filtering by access level...\n');
    
    const accessLevels = ['open_source', 'invite_only'];
    for (const access of accessLevels) {
      const result = await TradingView.browseScripts({
        sort: 'popular',
        access: access,
        page_size: 3,
      });
      console.log(`   ${access}: ${result.results.length} results`);
      if (result.results.length > 0) {
        console.log(`      Example: ${result.results[0].name} (${result.results[0].type})`);
      }
      console.log();
    }

    // ==========================================
    // 4. SEARCH FOR SCRIPTS (May require auth)
    // ==========================================
    console.log('4. Searching for specific terms...\n');
    
    const searchTerms = ['RSI', 'MACD', 'EMA'];
    for (const term of searchTerms) {
      try {
        const results = await TradingView.searchScripts(term, { limit: 3 });
        console.log(`   Search '${term}': ${results.length} results`);
        if (results.length > 0) {
          console.log(`      First: ${results[0].name} by ${results[0].author?.username}`);
        }
      } catch (err) {
        console.log(`   Search '${term}': Error - ${err.message}`);
      }
    }
    console.log();

    // ==========================================
    // 5. GET COMMUNITY IDEAS
    // ==========================================
    console.log('5. Fetching popular community ideas...\n');
    const popularIdeas = await TradingView.getPopularIdeas({ limit: 5 });

    console.log(`   Found ${popularIdeas.length} popular ideas:\n`);
    popularIdeas.forEach((idea, i) => {
      const icon = idea.is_video ? '🎥' : idea.is_education ? '📚' : '📝';
      console.log(`   ${i + 1}. ${icon} ${idea.name}`);
      console.log(`      Author: ${idea.author?.username} ${idea.author?.badges?.map(b => `[${b.name}]`).join(' ') || ''}`);
      console.log(`      Symbol: ${idea.symbol?.full_name || 'N/A'}`);
      console.log(`      Engagement: 👍 ${idea.likes} | 💬 ${idea.comments}`);
      if (idea.images?.medium) {
        console.log(`      Image: Available`);
      }
      console.log();
    });

    // ==========================================
    // 6. GET SCRIPTS BY SPECIFIC AUTHOR
    // ==========================================
    console.log('6. Getting content by author "LuxAlgo"...\n');
    const authorContent = await TradingView.getAuthorScripts('LuxAlgo', { limit: 5 });

    console.log(`   Found ${authorContent.results.length} items:\n`);
    authorContent.results.forEach((item) => {
      const icon = item.is_idea ? '📝' : '📊';
      console.log(`   ${icon} ${item.name}`);
      console.log(`      Type: ${item.type}`);
      console.log(`      Likes: ${item.likes} | Comments: ${item.comments}`);
      console.log();
    });

    // ==========================================
    // 7. ANALYSIS SUMMARY
    // ==========================================
    console.log('7. Analyzing content distribution...\n');
    
    const allContent = await TradingView.browseScripts({
      sort: 'week_popular',
      page_size: 50,
    });

    const typeCount = {};
    const accessCount = {};
    const authorCount = {};

    allContent.results.forEach((item) => {
      typeCount[item.type] = (typeCount[item.type] || 0) + 1;
      accessCount[item.access_level] = (accessCount[item.access_level] || 0) + 1;
      
      const author = item.author?.username || 'Unknown';
      authorCount[author] = (authorCount[author] || 0) + 1;
    });

    console.log('   Content types:');
    Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`      - ${type}: ${count}`);
      });

    console.log('\n   Access levels:');
    Object.entries(accessCount)
      .sort(([,a], [,b]) => b - a)
      .forEach(([access, count]) => {
        console.log(`      - ${access}: ${count}`);
      });

    console.log('\n   Top authors:');
    Object.entries(authorCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([author, count]) => {
        console.log(`      - ${author}: ${count} items`);
      });

    // ==========================================
    // 8. EXAMPLE ITEM DETAILS
    // ==========================================
    if (allContent.results.length > 0) {
      const example = allContent.results[0];
      console.log('\n8. Example item details:\n');
      console.log(`   Name: ${example.name}`);
      console.log(`   Type: ${example.type} (is_script: ${example.is_script})`);
      console.log(`   Script Type: ${example.script_type || 'N/A'}`);
      console.log(`   Access Level: ${example.access_level} (code: ${example.access_code})`);
      console.log(`   Author: ${example.author?.username || 'Unknown'}`);
      console.log(`      - Pro: ${example.author?.is_pro || false}`);
      console.log(`      - Badges: ${example.author?.badges?.map(b => b.name).join(', ') || 'None'}`);
      console.log(`   Symbol: ${example.symbol?.full_name || 'N/A'}`);
      console.log(`   Engagement: ${example.likes} likes, ${example.comments} comments`);
      console.log(`   Created: ${example.created_at}`);
      console.log(`   Updated: ${example.updated_at}`);
      if (example.description) {
        console.log(`   Description: ${example.description.substring(0, 100)}...`);
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data?.substring?.(0, 200) || error.response.data);
    }
    process.exit(1);
  }

  console.log('\n✅ Demo completed successfully!');
}

// Run the demo
run();
