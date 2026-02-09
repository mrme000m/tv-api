const http = require('../http');

const SUPPORT_BASE = 'https://support-middleware.tradingview.com';

/**
 * @typedef {Object} SupportSolution
 * @prop {number} solutionId Solution ID
 * @prop {string} lang Language code
 * @prop {number} categoryId Category ID
 * @prop {number} folderId Folder ID
 * @prop {string} title Solution title
 * @prop {string} updatedAt Last update timestamp (ISO)
 */

/**
 * @typedef {Object} SupportFolder
 * @prop {number} id Folder ID
 * @prop {string} name Folder name
 * @prop {number} position Sort position
 * @prop {Object.<string, SupportSolution>} solutions Solutions in this folder
 */

/**
 * @typedef {Object} SupportCategory
 * @prop {number} id Category ID
 * @prop {string} name Category name
 * @prop {Object.<string, SupportFolder>} folders Folders in this category
 */

/**
 * @typedef {Object} PopularSolutionsResponse
 * @prop {Object.<string, SupportSolution>} solutions Map of solution ID to solution
 */

/**
 * @typedef {Object} SolutionsTreeResponse
 * @prop {string} lang Language code
 * @prop {Object.<string, SupportCategory>} categories Map of category ID to category
 */

/**
 * @typedef {Object} SolutionDetail
 * @prop {string} objectId Internal object ID
 * @prop {string} description HTML description/content
 * @prop {number} solutionId Solution ID
 * @prop {string} title Solution title
 * @prop {string} [seoDescription] SEO description
 * @prop {Array<{id: number, name: string}>} [path] Category path
 * @prop {Array} [attachments] Attachments
 * @prop {Array} [tags] Tags
 * @prop {string} [updatedAt] Last update timestamp
 * @prop {string} [createdAt] Creation timestamp
 */

/**
 * Get popular help center solutions/articles
 * @param {Object} [options] - Options
 * @param {string} [options.lang='en'] - Language code
 * @returns {Promise<PopularSolutionsResponse>}
 */
async function getPopularSolutions(options = {}) {
  const { lang = 'en' } = options;

  const { data } = await http.get(
    `${SUPPORT_BASE}/api/v2/solutions/popular/${lang}`,
    {
      headers: {
        'accept': 'application/json',
        'origin': 'https://www.tradingview.com',
        'referer': 'https://www.tradingview.com/',
      },
    }
  );

  return data || {};
}

/**
 * Get the full solutions tree (categories, folders, solutions)
 * @param {Object} [options] - Options
 * @param {string} [options.lang='en'] - Language code
 * @returns {Promise<SolutionsTreeResponse>}
 */
async function getSolutionsTree(options = {}) {
  const { lang = 'en' } = options;

  const { data } = await http.get(
    `${SUPPORT_BASE}/api/v2/solutions/get_solutions_tree/${lang}`,
    {
      headers: {
        'accept': 'application/json',
        'origin': 'https://www.tradingview.com',
        'referer': 'https://www.tradingview.com/',
      },
    }
  );

  if (!data) {
    return { lang, categories: {} };
  }

  // Remove lang key from categories
  const { lang: responseLang, ...categories } = data;
  return { lang: responseLang || lang, categories };
}

/**
 * Get detailed content of a specific solution/article
 * @param {number} solutionId - Solution ID
 * @param {Object} [options] - Options
 * @param {string} [options.lang='en'] - Language code
 * @returns {Promise<SolutionDetail>}
 */
async function getSolutionDetail(solutionId, options = {}) {
  if (!solutionId) {
    throw new Error('Solution ID is required');
  }

  const { lang = 'en' } = options;

  const { data } = await http.get(
    `${SUPPORT_BASE}/api/v2/solutions/${solutionId}/${lang}`,
    {
      headers: {
        'accept': 'application/json',
        'origin': 'https://www.tradingview.com',
        'referer': 'https://www.tradingview.com/',
      },
    }
  );

  return data || null;
}

/**
 * Search for solutions by keyword (client-side search on popular solutions)
 * @param {string} query - Search query
 * @param {Object} [options] - Options
 * @param {string} [options.lang='en'] - Language code
 * @returns {Promise<SupportSolution[]>}
 */
async function searchSolutions(query, options = {}) {
  if (!query) {
    throw new Error('Search query is required');
  }

  const data = await getPopularSolutions(options);
  const searchTerm = query.toLowerCase();

  const results = [];
  for (const [id, solution] of Object.entries(data)) {
    if (solution.title?.toLowerCase().includes(searchTerm)) {
      results.push(solution);
    }
  }

  return results;
}

/**
 * Get all solutions flattened (for easy browsing)
 * @param {Object} [options] - Options
 * @param {string} [options.lang='en'] - Language code
 * @returns {Promise<SupportSolution[]>}
 */
async function getAllSolutions(options = {}) {
  const tree = await getSolutionsTree(options);
  const solutions = [];

  for (const category of Object.values(tree.categories || {})) {
    for (const folder of Object.values(category.folders || {})) {
      for (const solution of Object.values(folder.solutions || {})) {
        solutions.push({
          ...solution,
          categoryName: category.name,
          folderName: folder.name,
        });
      }
    }
  }

  return solutions;
}

/**
 * Get solutions by category name
 * @param {string} categoryName - Category name to filter by
 * @param {Object} [options] - Options
 * @param {string} [options.lang='en'] - Language code
 * @returns {Promise<SupportSolution[]>}
 */
async function getSolutionsByCategory(categoryName, options = {}) {
  if (!categoryName) {
    throw new Error('Category name is required');
  }

  const allSolutions = await getAllSolutions(options);
  const searchTerm = categoryName.toLowerCase();

  return allSolutions.filter(s =>
    s.categoryName?.toLowerCase().includes(searchTerm)
  );
}

/**
 * High-level wrapper for support/solutions operations
 * @param {Object} [defaults] - Default options
 * @returns {Object} Support client
 */
function createSupportClient(defaults = {}) {
  return {
    getPopular: (opts = {}) => getPopularSolutions({ ...defaults, ...opts }),
    getTree: (opts = {}) => getSolutionsTree({ ...defaults, ...opts }),
    getDetail: (id, opts = {}) => getSolutionDetail(id, { ...defaults, ...opts }),
    search: (query, opts = {}) => searchSolutions(query, { ...defaults, ...opts }),
    getAll: (opts = {}) => getAllSolutions({ ...defaults, ...opts }),
    getByCategory: (category, opts = {}) => getSolutionsByCategory(category, { ...defaults, ...opts }),
  };
}

module.exports = {
  getPopularSolutions,
  getSolutionsTree,
  getSolutionDetail,
  searchSolutions,
  getAllSolutions,
  getSolutionsByCategory,
  createSupportClient,
};
