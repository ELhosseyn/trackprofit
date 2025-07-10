/**
 * Facebook Ads Service module for TrackProfit
 * Handles all Facebook Ads API interactions and data transformations
 */
import { db } from '../../../../core/db.server';

// Constants
const FACEBOOK_API_VERSION = 'v18.0';
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;
const RATE_LIMIT_ERROR_CODE = 4;

/**
 * Get Facebook Ad Accounts for a user
 * @param {string} accessToken - Facebook access token
 * @returns {Promise<Array>} - List of ad accounts
 */
async function getAdAccounts(accessToken) {
  try {
    const response = await fetch(
      `${FACEBOOK_GRAPH_URL}/me/adaccounts?fields=name,account_id,account_status,currency&access_token=${accessToken}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch ad accounts');
    }

    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid response format from Facebook API');
    }

    return data.data.map(account => ({
      id: account.id,
      name: account.name || `Account ${account.account_id || 'Unknown'}`,
      accountId: account.account_id,
      status: getAccountStatus(account.account_status),
      currency: account.currency || 'USD',
      value: account.id,
      label: account.name || `Account ${account.account_id || 'Unknown'}`
    }));
  } catch (error) {
    console.error('Failed to fetch ad accounts:', error);
    throw error;
  }
}

/**
 * Calculate date range based on preset or custom dates
 * @param {string} range - Date range preset
 * @param {string} startDate - Custom start date (optional)
 * @param {string} endDate - Custom end date (optional)
 * @returns {Object} - Start and end date in YYYY-MM-DD format
 */
function getDateRange(range, startDate, endDate) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Calculate the earliest allowed date (37 months ago)
  const maxHistoricalDate = new Date(today);
  maxHistoricalDate.setMonth(today.getMonth() - 37);
  maxHistoricalDate.setDate(1); // Set to first day of the month
  const earliestAllowedDate = maxHistoricalDate.toISOString().split('T')[0];

  // Helper function to ensure date is not before earliest allowed date
  const ensureValidDate = (date) => {
    const dateObj = new Date(date);
    const earliestObj = new Date(earliestAllowedDate);
    return dateObj < earliestObj ? earliestAllowedDate : date;
  };

  // Helper function to format date to YYYY-MM-DD
  const formatDate = (date) => date.toISOString().split('T')[0];

  switch (range) {
    case 'today':
      return { 
        since: formatDate(today), 
        until: formatDate(today) 
      };
    case 'yesterday':
      return { 
        since: formatDate(yesterday), 
        until: formatDate(yesterday) 
      };
    case 'last_7_days': {
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 6);
      return { 
        since: ensureValidDate(formatDate(lastWeek)), 
        until: formatDate(today) 
      };
    }
    case 'last_30_days': {
      const lastMonth = new Date(today);
      lastMonth.setDate(today.getDate() - 29);
      return { 
        since: ensureValidDate(formatDate(lastMonth)), 
        until: formatDate(today) 
      };
    }
    case 'this_month': {
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { 
        since: ensureValidDate(formatDate(firstDayOfMonth)), 
        until: formatDate(today) 
      };
    }
    case 'custom':
      if (!startDate || !endDate) {
        throw new Error('Start and end dates required for custom range');
      }
      return { 
        since: ensureValidDate(startDate), 
        until: endDate 
      };
    default:
      // Default to last 30 days
      const lastMonth = new Date(today);
      lastMonth.setDate(today.getDate() - 29);
      return { 
        since: ensureValidDate(formatDate(lastMonth)), 
        until: formatDate(today) 
      };
  }
}

/**
 * Get campaigns for an ad account
 * @param {string} accessToken - Facebook access token
 * @param {string} adAccountId - Ad account ID
 * @param {string} dateRange - Date range preset
 * @param {string} startDate - Custom start date (optional)
 * @param {string} endDate - Custom end date (optional)
 * @returns {Promise<Object>} - Campaigns with insights
 */
async function getCampaigns(accessToken, adAccountId, dateRange = 'last_30_days', startDate, endDate) {
  try {
    const timeRange = getDateRange(dateRange, startDate, endDate);
    
    // Get campaigns
    const campaignsResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}/${adAccountId}/campaigns?fields=name,objective,status,start_time,stop_time,created_time&access_token=${accessToken}`
    );
    
    if (!campaignsResponse.ok) {
      const error = await campaignsResponse.json();
      throw new Error(error.error?.message || 'Failed to fetch campaigns');
    }
    
    const campaignsData = await campaignsResponse.json();
    
    if (!campaignsData.data || !Array.isArray(campaignsData.data)) {
      return { campaigns: [], insights: null };
    }
    
    // Get insights for all campaigns
    const insightsResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}/${adAccountId}/insights?fields=campaign_id,campaign_name,impressions,clicks,spend,purchases,purchase_value&level=campaign&time_range=${JSON.stringify(timeRange)}&access_token=${accessToken}`
    );
    
    if (!insightsResponse.ok) {
      const error = await insightsResponse.json();
      console.error('Failed to fetch insights:', error);
      // Continue without insights
      return { 
        campaigns: campaignsData.data, 
        insights: null, 
        error: error.error?.message 
      };
    }
    
    const insightsData = await insightsResponse.json();
    
    return {
      campaigns: campaignsData.data,
      insights: insightsData.data || [],
      timeRange
    };
  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
    throw error;
  }
}

/**
 * Map account status code to readable status
 * @param {number} status - Account status code
 * @returns {string} - Readable status
 */
function getAccountStatus(status) {
  const statuses = {
    1: 'ACTIVE',
    2: 'DISABLED',
    3: 'UNSETTLED',
    7: 'PENDING_RISK_REVIEW',
    9: 'IN_GRACE_PERIOD',
    100: 'PENDING_CLOSURE',
    101: 'CLOSED',
    201: 'ANY_ACTIVE',
    202: 'ANY_CLOSED',
  };
  return statuses[status] || 'UNKNOWN';
}

/**
 * Create a new campaign
 * @param {string} accessToken - Facebook access token
 * @param {string} adAccountId - Ad account ID
 * @param {Object} campaignDetails - Campaign details
 * @returns {Promise<Object>} - Created campaign
 */
async function createCampaign(accessToken, adAccountId, campaignDetails) {
  try {
    const response = await fetch(
      `${FACEBOOK_GRAPH_URL}/${adAccountId}/campaigns`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...campaignDetails,
          access_token: accessToken
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create campaign');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to create campaign:', error);
    throw error;
  }
}

/**
 * Get insights for an ad account
 * @param {string} accessToken - Facebook access token
 * @param {string} adAccountId - Ad account ID
 * @param {string} dateRange - Date range preset
 * @param {string} startDate - Custom start date (optional)
 * @param {string} endDate - Custom end date (optional)
 * @returns {Promise<Object>} - Insights data
 */
async function getInsights(accessToken, adAccountId, dateRange = 'last_30_days', startDate, endDate) {
  try {
    const timeRange = getDateRange(dateRange, startDate, endDate);
    
    const insightsResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}/${adAccountId}/insights?fields=impressions,clicks,spend,purchases,purchase_value&level=account&time_range=${JSON.stringify(timeRange)}&access_token=${accessToken}`
    );
    
    if (!insightsResponse.ok) {
      const error = await insightsResponse.json();
      throw new Error(error.error?.message || 'Failed to fetch insights');
    }
    
    const insightsData = await insightsResponse.json();
    
    if (!insightsData.data || !Array.isArray(insightsData.data) || insightsData.data.length === 0) {
      return {
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalPurchases: 0,
        totalRevenue: 0,
        roas: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0
      };
    }
    
    // Calculate metrics
    const insights = insightsData.data[0]; // Account level insights
    const totalSpend = parseFloat(insights.spend || 0);
    const totalImpressions = parseInt(insights.impressions || 0, 10);
    const totalClicks = parseInt(insights.clicks || 0, 10);
    const totalPurchases = insights.purchases ? parseInt(insights.purchases, 10) : 0;
    const totalRevenue = insights.purchase_value ? parseFloat(insights.purchase_value) : 0;
    
    return {
      totalSpend,
      totalImpressions,
      totalClicks,
      totalPurchases,
      totalRevenue,
      roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
    };
  } catch (error) {
    console.error('Failed to fetch insights:', error);
    throw error;
  }
}

/**
 * Get or create Facebook credentials for a shop
 * @param {string} shop - Shop domain
 * @returns {Promise<Object>} - Facebook credentials
 */
async function getCredentials(shop) {
  try {
    const credentials = await db.facebookCredential.findUnique({
      where: { shop }
    });
    
    return credentials;
  } catch (error) {
    console.error('Error fetching Facebook credentials:', error);
    throw error;
  }
}

/**
 * Save Facebook credentials for a shop
 * @param {string} shop - Shop domain
 * @param {string} accessToken - Facebook access token
 * @param {Date} expiresAt - Token expiration date
 * @param {Array} adAccounts - List of ad accounts
 * @returns {Promise<Object>} - Updated credentials
 */
async function saveCredentials(shop, accessToken, expiresAt, adAccounts = null) {
  try {
    const credentials = await db.facebookCredential.upsert({
      where: { shop },
      update: {
        accessToken,
        expiresAt,
        adAccounts: adAccounts ? JSON.stringify(adAccounts) : undefined,
        lastUpdated: new Date()
      },
      create: {
        shop,
        accessToken,
        expiresAt,
        adAccounts: adAccounts ? JSON.stringify(adAccounts) : null,
        lastUpdated: new Date()
      }
    });
    
    return credentials;
  } catch (error) {
    console.error('Error saving Facebook credentials:', error);
    throw error;
  }
}

/**
 * Parse ad accounts from credentials
 * @param {Object} credentials - Facebook credentials
 * @returns {Array} - Parsed ad accounts
 */
function parseAdAccounts(credentials) {
  if (!credentials?.adAccounts) return [];
  
  try {
    const adAccounts = typeof credentials.adAccounts === 'string'
      ? JSON.parse(credentials.adAccounts)
      : credentials.adAccounts;
    
    return Array.isArray(adAccounts) ? adAccounts : [];
  } catch (error) {
    console.error('Error parsing ad accounts:', error);
    return [];
  }
}

/**
 * Validate OAuth callback code and exchange for access token
 * @param {string} code - OAuth callback code
 * @param {string} redirectUri - Redirect URI used for OAuth
 * @returns {Promise<Object>} - Token data
 */
async function exchangeCodeForToken(code, redirectUri) {
  try {
    const fbAppId = process.env.FACEBOOK_APP_ID;
    const fbAppSecret = process.env.FACEBOOK_APP_SECRET;
    
    const response = await fetch(
      `${FACEBOOK_GRAPH_URL}/oauth/access_token?client_id=${fbAppId}&client_secret=${fbAppSecret}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to exchange code for token');
    }
    
    const data = await response.json();
    
    // Get long-lived token
    const longLivedResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${fbAppId}&client_secret=${fbAppSecret}&fb_exchange_token=${data.access_token}`
    );
    
    if (!longLivedResponse.ok) {
      const error = await longLivedResponse.json();
      throw new Error(error.error?.message || 'Failed to get long-lived token');
    }
    
    const longLivedData = await longLivedResponse.json();
    
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + longLivedData.expires_in);
    
    return {
      accessToken: longLivedData.access_token,
      expiresAt
    };
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
}

/**
 * Calculate effective ROAS (Return on Ad Spend) considering COGS
 * @param {number} adRevenue - Revenue from ads
 * @param {number} adSpend - Ad spend
 * @param {number} cogs - Cost of goods sold
 * @returns {number} - Effective ROAS
 */
function calculateEffectiveROAS(adRevenue, adSpend, cogs) {
  if (adSpend <= 0) return 0;
  return (adRevenue - cogs) / adSpend;
}

/**
 * Calculate MER (Marketing Efficiency Ratio)
 * @param {number} totalRevenue - Total revenue
 * @param {number} adSpend - Ad spend
 * @returns {number} - MER
 */
function calculateMER(totalRevenue, adSpend) {
  if (adSpend <= 0) return 0;
  return totalRevenue / adSpend;
}

// Export constants and functions
export {
  FACEBOOK_API_VERSION,
  FACEBOOK_GRAPH_URL,
  RATE_LIMIT_ERROR_CODE,
  getAdAccounts,
  getDateRange,
  getCampaigns,
  getAccountStatus,
  createCampaign,
  getInsights,
  getCredentials,
  saveCredentials,
  parseAdAccounts,
  exchangeCodeForToken,
  calculateEffectiveROAS,
  calculateMER
};
