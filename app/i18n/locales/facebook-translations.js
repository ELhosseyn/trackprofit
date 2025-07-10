/**
 * Facebook Ads translations for English
 */
export const facebookAdsTranslations = {
  title: "Facebook Ad Center",
  connectionStatus: {
    connected: "✓ Connected",
    notConnected: "⚠ Not Connected",
  },
  actions: {
    createCampaign: "🚀 Create New Campaign",
    connectionSettings: "⚙️ Connection Settings",
    reconnectAccount: "Reconnect Account",
  },
  errors: {
    dataLoading: "Data Loading Error",
    actionError: "Action Error",
    tokenError: "Facebook access token has expired. Please reconnect your account.",
    connectionFailed: "Failed to connect to Facebook. Please try again.",
    campaignCreateFailed: "Failed to create campaign: {{message}}",
    missingFields: "Missing required fields. Please fill in all required information.",
    invalidBudget: "Please enter a valid budget amount.",
    noAccounts: "No ad accounts found. Please make sure you have access to at least one ad account.",
  },
  success: {
    connected: "Successfully connected to Facebook with {{count}} ad accounts!",
    campaignCreated: "Campaign created successfully! The campaign is currently paused and ready for your review.",
  },
  dashboard: {
    controls: "📊 Dashboard Controls",
    performance: "📈 Performance Overview",
  },
  filters: {
    adAccount: "Ad Account",
    selectAccount: "Select an ad account",
    dateRange: "Date Range",
    customDateRange: "Custom Date Range",
  },
  metrics: {
    currency: "Currency: {{currency}}",
    adSpend: "Ad Spend",
    revenue: "Revenue",
    roas: "ROAS",
    purchases: "Purchases",
    impressions: "Impressions",
    costPerPurchase: "Cost per Purchase",
    costPerPurchaseSubtitle: "Average cost per single purchase",
    cpm: "Cost per 1000 Impressions",
    cpmSubtitle: "Cost to reach 1000 people",
    conversionRate: "Conversion Rate",
    conversionRateSubtitle: "From impressions to purchases",
    noData: {
      title: "Select a Facebook Ad Account",
      description: "Choose a Facebook ad account from the dropdown above to view performance data"
    }
  },
  dateRanges: {
    today: "Today",
    yesterday: "Yesterday",
    last7days: "Last 7 days",
    last30days: "Last 30 days",
    thisMonth: "This month",
    lastMonth: "Last month",
    lifetime: "Lifetime",
    custom: "Custom range"
  },
  connect: {
    title: "Facebook Connection Settings",
    instructions: "Enter your Facebook access token to connect your ad accounts. You can obtain a token from the Facebook Graph API Explorer or your developer account.",
    tokenLabel: "Facebook Access Token",
    tokenPlaceholder: "Enter your access token",
    saveAndConnect: "Save & Connect"
  },
  campaign: {
    noData: "You don't have any campaigns yet. Create your first campaign by clicking the 'Create New Campaign' button above.",
    create: {
      title: "Create New Campaign",
      details: "Campaign Details",
      name: "Campaign Name",
      nameRequired: "Campaign name is required",
      objective: "Campaign Objective"
    },
    status: {
      active: "Active",
      paused: "Paused",
      deleted: "Deleted",
      archived: "Archived",
      with_issues: "Issues",
    },
    objectives: {
      link_clicks: "Link Clicks",
      conversions: "Conversions",
      brand_awareness: "Brand Awareness",
    },
    budget: {
      title: "Budget Settings",
      type: "Budget Type",
      daily: "Daily Budget",
      lifetime: "Lifetime Budget"
    },
    content: {
      title: "Ad Content",
      adSetName: "Ad Set Name",
      adSetPlaceholder: "My Ad Set",
      productId: "Product ID (Optional)",
      productIdHelp: "Enter a Shopify product ID to link this campaign to a specific product"
    },
    table: {
      campaign: "Campaign",
      status: "Status",
      objective: "Objective",
      spend: "Spend",
      revenue: "Revenue",
      roas: "ROAS",
      impressions: "Impressions",
      purchases: "Purchases",
      costPerPurchase: "Cost/Purchase",
      budget: "Budget",
      start: "Start Date",
      end: "End Date",
      total: "{{count}} campaigns total"
    }
  }
};
