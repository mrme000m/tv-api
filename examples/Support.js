/**
 * TradingView Support API Example
 * 
 * This example demonstrates how to use the TradingView support/help center API to:
 * - Get popular help center solutions/articles
 * - Browse the full solutions tree (categories → folders → articles)
 * - Get detailed content of specific articles
 * - Search for help articles
 * - Get articles by category
 */

const TradingView = require('../main');

async function runSupportExamples() {
  console.log('=== TradingView Support API Examples ===\n');

  try {
    // ==========================================
    // 1. GET POPULAR SOLUTIONS
    // ==========================================
    console.log('1. Getting popular help center solutions...');
    const popular = await TradingView.getPopularSolutions({
      lang: 'en',
    });
    
    const popularSolutions = Object.values(popular);
    console.log(`   Found ${popularSolutions.length} popular solutions`);
    
    if (popularSolutions.length > 0) {
      console.log('\n   Top popular solutions:');
      popularSolutions.slice(0, 5).forEach((solution) => {
        console.log(`   - ${solution.title}`);
        console.log(`     ID: ${solution.solutionId}`);
      });
    }
    console.log('   ✓ Get popular solutions successful\n');

    // ==========================================
    // 2. GET FULL SOLUTIONS TREE
    // ==========================================
    console.log('2. Getting full solutions tree...');
    const tree = await TradingView.getSolutionsTree({
      lang: 'en',
    });
    
    const categories = Object.values(tree.categories);
    console.log(`   Found ${categories.length} categories`);
    
    console.log('\n   Categories:');
    categories.forEach((category) => {
      const folderCount = Object.keys(category.folders || {}).length;
      console.log(`   - ${category.name} (${folderCount} folders)`);
    });
    console.log('   ✓ Get solutions tree successful\n');

    // ==========================================
    // 3. GET ALL SOLUTIONS FLATTENED
    // ==========================================
    console.log('3. Getting all solutions flattened...');
    const allSolutions = await TradingView.getAllSolutions({
      lang: 'en',
    });
    console.log(`   Found ${allSolutions.length} total solutions`);
    
    if (allSolutions.length > 0) {
      console.log('\n   Sample solutions:');
      allSolutions.slice(0, 5).forEach((solution) => {
        console.log(`   - [${solution.categoryName}] ${solution.title}`);
      });
    }
    console.log('   ✓ Get all solutions successful\n');

    // ==========================================
    // 4. GET SOLUTIONS BY CATEGORY
    // ==========================================
    console.log('4. Getting solutions by category (iOS & Android Apps)...');
    const iosSolutions = await TradingView.getSolutionsByCategory('iOS', {
      lang: 'en',
    });
    console.log(`   Found ${iosSolutions.length} iOS/Android solutions`);
    
    if (iosSolutions.length > 0) {
      console.log('\n   iOS/Android solutions:');
      iosSolutions.slice(0, 5).forEach((solution) => {
        console.log(`   - ${solution.title}`);
      });
    }
    console.log('   ✓ Get category solutions successful\n');

    // ==========================================
    // 5. SEARCH SOLUTIONS
    // ==========================================
    console.log('5. Searching solutions for "password"...');
    const searchResults = await TradingView.searchSolutions('password', {
      lang: 'en',
    });
    console.log(`   Found ${searchResults.length} solutions matching "password"`);
    
    if (searchResults.length > 0) {
      console.log('\n   Matching solutions:');
      searchResults.slice(0, 5).forEach((solution) => {
        console.log(`   - ${solution.title} (ID: ${solution.solutionId})`);
      });
    }
    console.log('   ✓ Search solutions successful\n');

    // ==========================================
    // 6. GET SOLUTION DETAIL
    // ==========================================
    if (popularSolutions.length > 0) {
      const firstSolutionId = popularSolutions[0].solutionId;
      console.log(`6. Getting solution detail (ID: ${firstSolutionId})...`);
      const detail = await TradingView.getSolutionDetail(firstSolutionId, {
        lang: 'en',
      });
      
      if (detail) {
        console.log('\n   Solution details:');
        console.log('   Title:', detail.title);
        console.log('   Object ID:', detail.objectId);
        
        if (detail.path && detail.path.length > 0) {
          console.log('   Path:', detail.path.map(p => p.name).join(' > '));
        }
        
        if (detail.description) {
          // Truncate description for display
          const desc = detail.description.substring(0, 200).replace(/<[^>]*>/g, '');
          console.log('   Description preview:', desc + '...');
        }
      }
      console.log('   ✓ Get solution detail successful\n');
    }

    // ==========================================
    // 7. USING THE SUPPORT CLIENT
    // ==========================================
    console.log('7. Using the support client...');
    const supportClient = TradingView.support.createSupportClient({
      lang: 'en',
    });

    // Get popular via client
    const clientPopular = await supportClient.getPopular();
    const clientPopularCount = Object.values(clientPopular).length;
    console.log(`   Found ${clientPopularCount} popular solutions via client`);

    // Get tree via client
    const clientTree = await supportClient.getTree();
    const clientCategoryCount = Object.values(clientTree.categories).length;
    console.log(`   Found ${clientCategoryCount} categories via client`);

    // Search via client
    const clientSearch = await supportClient.search('alert');
    console.log(`   Found ${clientSearch.length} solutions matching "alert" via client`);

    // Get by category via client
    const clientCategory = await supportClient.getByCategory('Billing');
    console.log(`   Found ${clientCategory.length} billing solutions via client`);
    console.log('   ✓ Support client successful\n');

    // ==========================================
    // 8. DISPLAY CATEGORY STATISTICS
    // ==========================================
    console.log('8. Category statistics...');
    const stats = {};
    
    allSolutions.forEach((solution) => {
      const catName = solution.categoryName || 'Uncategorized';
      if (!stats[catName]) {
        stats[catName] = { count: 0, folders: new Set() };
      }
      stats[catName].count++;
      if (solution.folderName) {
        stats[catName].folders.add(solution.folderName);
      }
    });

    console.log('\n   Solutions by category:');
    Object.entries(stats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .forEach(([category, data]) => {
        console.log(`   - ${category}: ${data.count} articles (${data.folders.size} folders)`);
      });
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
runSupportExamples();
