// Facebook API constants
export const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v19.0';

// Date range options for reports
export const DATE_RANGES = {
  today: 'Today',
  yesterday: 'Yesterday',
  last_7_days: 'Last 7 days',
  last_14_days: 'Last 14 days',
  last_30_days: 'Last 30 days',
  last_90_days: 'Last 90 days',
  this_month: 'This month',
  last_month: 'Last month',
  this_quarter: 'This quarter',
  last_quarter: 'Last quarter',
  this_year: 'This year',
  last_year: 'Last year',
  custom: 'Custom range',
};

// Facebook metrics for reporting
export const FACEBOOK_METRICS = {
  spend: 'Spend',
  impressions: 'Impressions',
  clicks: 'Clicks',
  cpc: 'Cost per Click',
  ctr: 'Click-through Rate',
  cpm: 'Cost per 1000 Impressions',
  reach: 'Reach',
  frequency: 'Frequency',
  purchases: 'Purchases',
  purchase_value: 'Purchase Value',
  roas: 'Return on Ad Spend',
};

// Status indicators
export const STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  DELETED: 'DELETED',
  ARCHIVED: 'ARCHIVED',
  COMPLETED: 'COMPLETED',
  PENDING: 'PENDING',
};
