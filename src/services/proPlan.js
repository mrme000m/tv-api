const http = require('../http');
const { genAuthCookies } = require('../utils');

const BASE_URL = 'https://www.tradingview.com';

/**
 * @typedef {Object} ProPlanInfo
 * @prop {string} pro_plan - Plan type (e.g., 'free', 'pro', 'pro_premium', 'pro_premium_trial', 'pro_plus')
 */

/**
 * Available pro plan types
 * @constant {Object}
 */
const PLAN_TYPES = {
  FREE: 'free',
  PRO: 'pro',
  PRO_PLUS: 'pro_plus',
  PRO_PREMIUM: 'pro_premium',
  PRO_PREMIUM_TRIAL: 'pro_premium_trial',
};

/**
 * Get user's pro plan information
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<ProPlanInfo>}
 */
async function getProPlanInfo(options) {
  if (!options?.session) {
    throw new Error('Session is required to get pro plan info');
  }

  const { data } = await http.get(`${BASE_URL}/pro-plans/profile/`, {
    headers: {
      'Accept': 'application/json',
      'cookie': genAuthCookies(options.session, options.signature),
    },
  });

  return data;
}

/**
 * Check if user has a specific plan or better
 * @param {ProPlanInfo} planInfo - Plan info from getProPlanInfo
 * @param {string} requiredPlan - Required plan type
 * @returns {boolean}
 */
function hasPlanOrBetter(planInfo, requiredPlan) {
  if (!planInfo?.pro_plan) return false;
  
  const planHierarchy = [
    PLAN_TYPES.FREE,
    PLAN_TYPES.PRO,
    PLAN_TYPES.PRO_PLUS,
    PLAN_TYPES.PRO_PREMIUM,
  ];
  
  const userPlanIndex = planHierarchy.indexOf(planInfo.pro_plan);
  const requiredPlanIndex = planHierarchy.indexOf(requiredPlan);
  
  // Trial is treated as premium
  if (planInfo.pro_plan === PLAN_TYPES.PRO_PREMIUM_TRIAL) {
    return requiredPlanIndex <= planHierarchy.indexOf(PLAN_TYPES.PRO_PREMIUM);
  }
  
  return userPlanIndex >= requiredPlanIndex;
}

/**
 * Check if user has any paid plan
 * @param {ProPlanInfo} planInfo - Plan info from getProPlanInfo
 * @returns {boolean}
 */
function hasPaidPlan(planInfo) {
  if (!planInfo?.pro_plan) return false;
  return planInfo.pro_plan !== PLAN_TYPES.FREE;
}

/**
 * Check if user has premium features (premium, premium trial, or better)
 * @param {ProPlanInfo} planInfo - Plan info from getProPlanInfo
 * @returns {boolean}
 */
function hasPremiumFeatures(planInfo) {
  if (!planInfo?.pro_plan) return false;
  return [
    PLAN_TYPES.PRO_PREMIUM,
    PLAN_TYPES.PRO_PREMIUM_TRIAL,
    PLAN_TYPES.PRO_PLUS,
    PLAN_TYPES.PRO,
  ].includes(planInfo.pro_plan);
}

/**
 * High-level wrapper for pro plan operations
 * @param {Object} defaults - Default options (session, signature)
 * @returns {Object} Pro plan client
 */
function createProPlanClient(defaults = {}) {
  return {
    getInfo: (opts = {}) => getProPlanInfo({ ...defaults, ...opts }),
    hasPlanOrBetter: (planInfo, requiredPlan) => hasPlanOrBetter(planInfo, requiredPlan),
    hasPaidPlan: (planInfo) => hasPaidPlan(planInfo),
    hasPremiumFeatures: (planInfo) => hasPremiumFeatures(planInfo),
    PLAN_TYPES,
  };
}

module.exports = {
  getProPlanInfo,
  hasPlanOrBetter,
  hasPaidPlan,
  hasPremiumFeatures,
  createProPlanClient,
  PLAN_TYPES,
};
