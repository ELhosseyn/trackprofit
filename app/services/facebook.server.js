const FACEBOOK_API_VERSION = 'v18.0';
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

// Define rate limit error code for reference
export const RATE_LIMIT_ERROR_CODE = 4;
export { FACEBOOK_GRAPH_URL };

export const facebook = {
  async getAdAccounts(accessToken) {
    try {
      const response = await fetch(
        `${FACEBOOK_GRAPH_URL}/me/adaccounts?fields=name,account_id,account_status,currency&access_token=${accessToken}`
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message);
      }

      const data = await response.json();
      if (!data.data || !Array.isArray(data.data)) {
        console.error('Invalid response format from Facebook API:', data);
        return [];
      }

      return data.data.map(account => ({
        id: account.id,
        name: account.name || `Account ${account.account_id || 'Unknown'}`,
        accountId: account.account_id,
        status: this.getAccountStatus(account.account_status),
        currency: account.currency || 'USD',
        value: account.id,  // Add value for Select component
        label: account.name || `Account ${account.account_id || 'Unknown'}`  // Add label for Select component
      }));
    } catch (error) {
      console.error('Failed to fetch ad accounts:', error);
      throw error;
    }
  },

  getDateRange(range, startDate, endDate) {
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
      const dateStr = date.toISOString().split('T')[0];
      return dateStr < earliestAllowedDate ? earliestAllowedDate : dateStr;
    };

    // Helper function to format date to YYYY-MM-DD
    const formatDate = (date) => date.toISOString().split('T')[0];

    switch (range) {
      case 'today':
        return {
          since: today.toISOString().split('T')[0],
          until: today.toISOString().split('T')[0]
        };
      case 'yesterday':
        return {
          since: yesterday.toISOString().split('T')[0],
          until: yesterday.toISOString().split('T')[0]
        };
      case 'last_7_days': {
        const start = new Date(today);
        start.setDate(today.getDate() - 7);
        return {
          since: ensureValidDate(start),
          until: today.toISOString().split('T')[0]
        };
      }
      case 'last_30_days': {
        const start = new Date(today);
        start.setDate(today.getDate() - 30);
        return {
          since: ensureValidDate(start),
          until: today.toISOString().split('T')[0]
        };
      }
      case 'this_month': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          since: ensureValidDate(start),
          until: today.toISOString().split('T')[0]
        };
      }
      case 'last_month': {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          since: ensureValidDate(start),
          until: end.toISOString().split('T')[0]
        };
      }
      case 'last_3_months': {
        const start = new Date(today);
        start.setMonth(today.getMonth() - 3);
        return {
          since: ensureValidDate(start),
          until: today.toISOString().split('T')[0]
        };
      }
      case 'last_6_months': {
        const start = new Date(today);
        start.setMonth(today.getMonth() - 6);
        return {
          since: ensureValidDate(start),
          until: today.toISOString().split('T')[0]
        };
      }
      case 'this_year': {
        const start = new Date(today.getFullYear(), 0, 1);
        return {
          since: ensureValidDate(start),
          until: today.toISOString().split('T')[0]
        };
      }
      case 'last_year': {
        const start = new Date(today.getFullYear() - 1, 0, 1);
        const end = new Date(today.getFullYear() - 1, 11, 31);
        return {
          since: ensureValidDate(start),
          until: end.toISOString().split('T')[0]
        };
      }
      case 'max_range': {
        return {
          since: earliestAllowedDate,
          until: formatDate(today)
        };
      }
      case 'custom':
        if (startDate && endDate) {
          const customStart = new Date(startDate);
          const customEnd = new Date(endDate);
          return {
            since: ensureValidDate(customStart),
            until: formatDate(customEnd)
          };
        }
        // Fall through to default if dates not provided
      default: {
        const start = new Date(today);
        start.setDate(today.getDate() - 30);
        return {
          since: ensureValidDate(start),
          until: formatDate(today)
        };
      }
    }
  },

  async getCampaigns(accessToken, adAccountId, dateRange = 'last_30_days', startDate, endDate) {
    try {
      // First, fetch ad account details to get currency
      const adAccountResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/${adAccountId}?fields=currency,name&access_token=${accessToken}`
      );
      
      if (!adAccountResponse.ok) {
        const error = await adAccountResponse.json();
        throw new Error(error?.error?.message || 'Failed to fetch ad account data');
      }
      
      const adAccountData = await adAccountResponse.json();
      const currency = adAccountData.currency || 'USD';
      
      // Next, fetch basic campaign data
      const campaignsResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/${adAccountId}/campaigns?fields=name,objective,status,lifetime_budget,daily_budget,start_time,end_time&access_token=${accessToken}`
      );
      
      if (!campaignsResponse.ok) {
        const error = await campaignsResponse.json();
        throw new Error(error?.error?.message || 'Failed to fetch campaigns');
      }

      const campaignsData = await campaignsResponse.json();
      
      // Get the date range for insights
      const { since, until } = this.getDateRange(dateRange, startDate, endDate);
      
      // Then, fetch insights for all campaigns with proper date formatting
      const insightsResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/${adAccountId}/insights?` + new URLSearchParams({
          access_token: accessToken,
          level: 'campaign',
          fields: 'campaign_id,spend,impressions,actions,action_values,cost_per_action_type',
          time_range: JSON.stringify({
            since,
            until
          }),
          limit: 500 // Add a higher limit to ensure we get all data
        })
      );

      if (!insightsResponse.ok) {
        const error = await insightsResponse.json();
        throw new Error(error?.error?.message || 'Failed to fetch insights');
      }

      const insightsData = await insightsResponse.json();
      
      // If no insights data, return empty array to prevent showing stale data
      if (!insightsData || !insightsData.data) {
        return { 
          campaigns: [], 
          currency, 
          accountName: adAccountData.name || 'Unknown Account',
          metrics: {
            totalSpend: 0,
            totalRevenue: 0,
            totalPurchases: 0,
            totalImpressions: 0,
            roas: 0
          }
        };
      }

      const insightsMap = new Map();
      let totalSpend = 0;
      let totalRevenue = 0;
      let totalPurchases = 0;
      let totalImpressions = 0;

      // Process insights data with validation
      insightsData.data.forEach(insight => {
        if (!insight) return; // Skip invalid entries
        
        const purchases = insight.actions?.find(action => action.action_type === 'purchase') || { value: '0' };
        const revenue = insight.action_values?.find(value => value.action_type === 'purchase') || { value: '0' };
        const costPerPurchase = insight.cost_per_action_type?.find(cost => cost.action_type === 'purchase') || { value: '0' };
        
        const spendValue = parseFloat(insight.spend || '0');
        const revenueValue = parseFloat(revenue.value || '0');
        const purchasesValue = parseInt(purchases.value || '0', 10);
        const impressionsValue = parseInt(insight.impressions || '0', 10);
        
        totalSpend += spendValue;
        totalRevenue += revenueValue;
        totalPurchases += purchasesValue;
        totalImpressions += impressionsValue;

        insightsMap.set(insight.campaign_id, {
          spend: spendValue,
          impressions: impressionsValue,
          purchases: purchasesValue,
          revenue: revenueValue,
          costPerPurchase: parseFloat(costPerPurchase.value || '0')
        });
      });
      
      // Calculate overall ROAS
      const overallROAS = totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : 0;

      // Combine campaign data with insights
      const campaigns = campaignsData.data.map(campaign => {
        const insights = insightsMap.get(campaign.id) || {
          spend: 0,
          impressions: 0,
          purchases: 0,
          revenue: 0,
          costPerPurchase: 0
        };

        return {
          id: campaign.id,
          name: campaign.name,
          objective: campaign.objective,
          status: campaign.status,
          budget: campaign.lifetime_budget || campaign.daily_budget,
          budgetType: campaign.lifetime_budget ? 'LIFETIME' : 'DAILY',
          startTime: campaign.start_time,
          endTime: campaign.end_time,
          spend: insights.spend,
          impressions: insights.impressions,
          purchases: insights.purchases,
          revenue: insights.revenue,
          costPerPurchase: insights.costPerPurchase,
          roas: insights.spend > 0 ? Number((insights.revenue / insights.spend).toFixed(2)) : 0
        };
      });
      
      return {
        campaigns,
        currency,
        accountName: adAccountData.name || 'Unknown Account',
        metrics: {
          totalSpend,
          totalRevenue,
          totalPurchases,
          totalImpressions,
          roas: overallROAS
        }
      };
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      throw error;
    }
  },

  getAccountStatus(status) {
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
  },
  
  async createCampaign(accessToken, adAccountId, campaignDetails) {
    try {
      const { 
        name, 
        objective, 
        status = 'PAUSED',
        adsetName,
        budget,
        isLifetimeBudget,
        productId
      } = campaignDetails;
      
      // 1. Create the campaign
      const campaignResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/${adAccountId}/campaigns`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            objective,
            status,
            special_ad_categories: [],
            access_token: accessToken,
          }),
        }
      );

      if (!campaignResponse.ok) {
        const error = await campaignResponse.json();
        throw new Error(`Campaign creation failed: ${error.error?.message || 'Unknown error'}`);
      }

      const campaignData = await campaignResponse.json();
      const campaignId = campaignData.id;
      
      // 2. Create an ad set for the campaign
      const today = new Date();
      const startTime = today.toISOString();
      let endTime = null;
      
      if (isLifetimeBudget) {
        // Set end time to 30 days from now for lifetime budget
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 30);
        endTime = endDate.toISOString();
      }
      
      const adsetResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/${adAccountId}/adsets`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: adsetName || `${name} Ad Set`,
            campaign_id: campaignId,
            optimization_goal: objective === 'CONVERSIONS' ? 'OFFSITE_CONVERSIONS' : 'LINK_CLICKS',
            billing_event: objective === 'CONVERSIONS' ? 'IMPRESSIONS' : 'LINK_CLICKS',
            bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
            ...(isLifetimeBudget 
              ? { lifetime_budget: budget } 
              : { daily_budget: budget }),
            status,
            start_time: startTime,
            ...(endTime ? { end_time: endTime } : {}),
            targeting: {
              geo_locations: {
                countries: ['US']
              }
            },
            access_token: accessToken,
          }),
        }
      );

      if (!adsetResponse.ok) {
        const error = await adsetResponse.json();
        throw new Error(`Ad set creation failed: ${error.error?.message || 'Unknown error'}`);
      }
      
      const adsetData = await adsetResponse.json();
      
      return {
        campaignId: campaignId,
        adsetId: adsetData.id,
        status: status,
        name: name
      };
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }
};

export class FacebookAdsService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.apiVersion = 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  async getAdAccounts() {
    const response = await fetch(
      `${this.baseUrl}/me/adaccounts?access_token=${this.accessToken}&fields=name,account_status,currency,timezone_name`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch ad accounts');
    }

    return response.json();
  }

  async createCampaign(adAccountId, { name, objective, status = 'PAUSED' }) {
    const response = await fetch(
      `${this.baseUrl}/${adAccountId}/campaigns`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          objective,
          status,
          access_token: this.accessToken,
          special_ad_categories: [],
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create campaign');
    }

    return response.json();
  }

  async createAdSet(adAccountId, campaignId, {
    name,
    optimization_goal,
    billing_event,
    bid_amount,
    daily_budget,
    targeting,
    start_time,
    end_time
  }) {
    const response = await fetch(
      `${this.baseUrl}/${adAccountId}/adsets`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          campaign_id: campaignId,
          optimization_goal,
          billing_event,
          bid_amount,
          daily_budget: daily_budget * 100, // Convert to cents
          targeting,
          start_time,
          end_time,
          access_token: this.accessToken,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create ad set');
    }

    return response.json();
  }

  async createAd(adAccountId, adSetId, {
    name,
    creative,
    status = 'PAUSED'
  }) {
    const response = await fetch(
      `${this.baseUrl}/${adAccountId}/ads`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          adset_id: adSetId,
          creative,
          status,
          access_token: this.accessToken,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create ad');
    }

    return response.json();
  }

  async getInsights(adAccountId, {
    level = 'campaign',
    fields = ['impressions', 'clicks', 'spend'],
    timeRange = { since: '2024-01-01', until: 'today' }
  }) {
    const response = await fetch(
      `${this.baseUrl}/${adAccountId}/insights?access_token=${this.accessToken}&level=${level}&fields=${fields.join(',')}&time_range=${JSON.stringify(timeRange)}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch insights');
    }

    return response.json();
  }
}