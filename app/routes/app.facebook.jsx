import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit, useActionData, useNavigation, Form } from "@remix-run/react";
import {
  Page, Layout, Text, Badge, FormLayout, TextField, Select, Modal, Frame,
  Banner, DataTable, Spinner, Card, Box, BlockStack, InlineStack,
  DatePicker, Divider, EmptyState, Popover, Button, Icon,
} from "@shopify/polaris";
import { useLanguage } from "../utils/i18n/LanguageContext.jsx";

// Lazy load components with preload hints
const StatCard = lazy(() => import("../components/StatCard.jsx"));
const FacebookMetrics = lazy(() => import("../components/FacebookMetrics.jsx"));

// Server imports
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { facebook } from "../services/facebook.server.js";
import { FACEBOOK_GRAPH_URL } from "../constants.js";

export function meta() {
  return [
    { title: "Facebook Ads Analytics - TrackProfit" },
    { name: "description", content: "Track and analyze your Facebook ad campaigns performance, ROI, and metrics in real-time." },
    { property: "og:title", content: "Facebook Ads Analytics - TrackProfit" },
    { property: "og:description", content: "Track and analyze your Facebook ad campaigns performance, ROI, and metrics in real-time." },
    { name: "robots", content: "noindex,nofollow" },
    { name: "viewport", content: "width=device-width,initial-scale=1" },
    { name: "theme-color", content: "#1877F2" },
    { name: "fb:app_id", content: import.meta.env.VITE_FACEBOOK_APP_ID || "" },
  ];
}

export function links() {
  return [
    // Performance optimizations
    { rel: "preconnect", href: FACEBOOK_GRAPH_URL, crossOrigin: "anonymous" },
    { rel: "dns-prefetch", href: FACEBOOK_GRAPH_URL },
    
    // Preload critical components
    { rel: "modulepreload", href: "/build/components/StatCard.js" },
    { rel: "modulepreload", href: "/build/components/FacebookMetrics.js" },
    
    // Preload critical assets
    { rel: "preload", href: "/images/facebook-brand.svg", as: "image" },
    { rel: "preload", href: "/images/empty-state.svg", as: "image" },
    
    // Font optimization for metrics
    { rel: "preload", href: "/fonts/ShopifySans-Bold.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  ];
}

const defaultStats = {
  totalSpend: 0, totalRevenue: 0, totalPurchases: 0, totalImpressions: 0,
};

// Helper function to validate date range
const validateDateRange = (dateRange, startDate, endDate) => {
  if (dateRange === 'custom') {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required for custom date range');
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format');
    }
    if (end < start) {
      throw new Error('End date cannot be before start date');
    }
    if (end > new Date()) {
      throw new Error('End date cannot be in the future');
    }

    const maxHistoricalDate = new Date();
    maxHistoricalDate.setMonth(maxHistoricalDate.getMonth() - 37);
    if (start < maxHistoricalDate) {
      throw new Error('Cannot retrieve data older than 37 months');
    }
  }
};

export const loader = async ({ request }) => {
  try {
    // Use Promise.all for parallel execution of async operations
    const [{ session }, queryParams] = await Promise.all([
      authenticate.admin(request),
      (async () => {
        const url = new URL(request.url);
        return {
          accountId: url.searchParams.get('accountId'),
          dateRange: url.searchParams.get('dateRange') || 'last_30_days',
          startDate: url.searchParams.get('startDate'),
          endDate: url.searchParams.get('endDate')
        };
      })()
    ]);

    const { accountId, dateRange, startDate, endDate } = queryParams;

    validateDateRange(dateRange, startDate, endDate);

    const defaultResponse = {
      isConnected: false,
      adAccounts: [],
      stats: defaultStats,
      campaigns: [],
      accountId: null,
      dateRange,
      startDate,
      endDate,
    };

    const fbCredentials = await prisma.FacebookCredential.findUnique({
      where: { shop: session.shop },
    });

    if (!fbCredentials?.accessToken) {
      return json({ ...defaultResponse });
    }

    if (fbCredentials.expiresAt && new Date(fbCredentials.expiresAt) < new Date()) {
      return json({
        ...defaultResponse,
        isConnected: true,
        error: 'Facebook access token has expired. Please reconnect your account.'
      });
    }

    let adAccounts = [];
    
    if (fbCredentials.adAccounts) {
      try {
        adAccounts = typeof fbCredentials.adAccounts === 'string' 
          ? JSON.parse(fbCredentials.adAccounts) 
          : (Array.isArray(fbCredentials.adAccounts) ? fbCredentials.adAccounts : []);
      } catch (e) {
        console.error('Error parsing adAccounts:', e);
      }
    }
    
    const shouldRefreshCache = !adAccounts.length || 
      !fbCredentials.lastUpdated || 
      (new Date() - new Date(fbCredentials.lastUpdated)) > 3600000;

    if (shouldRefreshCache) {
      try {
        const freshAccounts = await facebook.getAdAccounts(fbCredentials.accessToken);
        if (freshAccounts && freshAccounts.length > 0) {
          adAccounts = freshAccounts;
          await prisma.FacebookCredential.update({
            where: { shop: session.shop },
            data: { 
              adAccounts: JSON.stringify(freshAccounts),
              lastUpdated: new Date()
            }
          });
        }
      } catch (error) {
        console.error('Failed to refresh ad accounts:', error);
        if (!adAccounts.length) {
          return json({
            ...defaultResponse,
            isConnected: true,
            error: 'Failed to fetch ad accounts. Please try reconnecting your account.'
          });
        }
      }
    }

    if (!adAccounts.length) {
      return json({
        ...defaultResponse,
        isConnected: true,
        error: 'No ad accounts found. Please make sure you have access to at least one ad account.'
      });
    }

    const accountIdToLoad = accountId || adAccounts[0]?.id;

    if (!accountIdToLoad) {
      return json({ ...defaultResponse, isConnected: true, adAccounts });
    }

    const validAccount = adAccounts.find(account => account.id === accountIdToLoad);
    
    if (!validAccount) {
      console.warn(`Invalid account ID: ${accountIdToLoad}, falling back to first account`);
      const fallbackAccount = adAccounts[0];
      if (!fallbackAccount) {
        return json({ 
          ...defaultResponse, 
          isConnected: true, 
          adAccounts,
          error: 'No valid ad accounts found. Please reconnect your Facebook account.'
        });
      }
      
      const redirectUrl = new URL(request.url);
      redirectUrl.searchParams.set('accountId', fallbackAccount.id);
      return json({ redirect: redirectUrl.pathname + redirectUrl.search });
    }

    try {
      let timeRange = { since: '', until: '' };
      if (dateRange === 'custom' && startDate && endDate) {
        timeRange.since = startDate;
        timeRange.until = endDate;
      } else {
        timeRange = dateRange;
      }

      const campaignData = await facebook.getCampaigns(
        fbCredentials.accessToken,
        accountIdToLoad,
        timeRange
      );

      const { campaigns, metrics, currency, accountName } = campaignData;

      const formattedMetrics = metrics || defaultStats;

      return json({
        isConnected: true,
        adAccounts,
        stats: formattedMetrics,
        campaigns: campaigns || [],
        accountId: accountIdToLoad,
        dateRange,
        startDate,
        endDate,
        currency,
        accountName
      });

    } catch (error) {
      console.error("Facebook API Error in loader:", error);
      return json({
        ...defaultResponse,
        isConnected: true,
        adAccounts,
        error: `Failed to load campaign data: ${error.message}. Please try again.`,
        accountId: accountIdToLoad,
      });
    }
  } catch (error) {
    console.error("Loader error:", error);
    return json({
      ...defaultResponse,
      error: error.message || 'An unexpected error occurred',
    });
  }
};

export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const action = formData.get("action");
  
    if (!session?.shop) {
      return json({ success: false, error: 'Shop not found' }, { status: 401 });
    }
  
    const fbCredentials = await prisma.FacebookCredential.findUnique({
      where: { shop: session.shop },
    });
  
    if (action !== "saveCredentials" && !fbCredentials?.accessToken) {
        return json({ success: false, error: 'Facebook account not connected' });
    }
  
    if (fbCredentials?.expiresAt && new Date(fbCredentials.expiresAt) < new Date()) {
      return json({ success: false, error: 'Facebook access token has expired. Please reconnect your account.' });
    }
  
    if (action === "saveCredentials") {
      const accessToken = formData.get("accessToken")?.trim();
      if (!accessToken) {
        return json({ success: false, error: 'Access token is required' });
      }
  
      try {
        const testResponse = await fetch(
          `${FACEBOOK_GRAPH_URL}/me?access_token=${accessToken}`
        );
        
        if (!testResponse.ok) {
          const error = await testResponse.json();
          throw new Error(error.error?.message || 'Invalid access token');
        }
  
        let adAccounts = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries && (!adAccounts || adAccounts.length === 0)) {
          try {
            adAccounts = await facebook.getAdAccounts(accessToken);
            if (adAccounts && adAccounts.length > 0) {
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            retryCount++;
          } catch (error) {
            console.error(`Retry ${retryCount + 1} failed:`, error);
            if (retryCount === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000));
            retryCount++;
          }
        }
  
        if (!adAccounts || adAccounts.length === 0) {
          throw new Error('No ad accounts found. Please make sure you have access to at least one ad account.');
        }
  
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60);
  
        await prisma.FacebookCredential.upsert({
          where: { shop: session.shop },
          update: { 
            accessToken, 
            expiresAt, 
            adAccounts: JSON.stringify(adAccounts),
            lastUpdated: new Date()
          },
          create: { 
            shop: session.shop, 
            accessToken, 
            expiresAt, 
            adAccounts: JSON.stringify(adAccounts),
            lastUpdated: new Date()
          },
        });
  
        return json({ 
          success: true, 
          message: `Successfully connected to Facebook with ${adAccounts.length} ad accounts!`,
          adAccounts
        });
      } catch (error) {
        console.error('Facebook API Error in action:', error);
        return json({ 
          success: false, 
          error: error.message || 'Failed to connect to Facebook. Please try again.' 
        });
      }
    }
  
    if (action === "createCampaign") {
      try {
        const campaignName = formData.get("campaignName")?.trim();
        const objective = formData.get("objective");
        const adsetName = formData.get("adsetName")?.trim();
        const budget = parseFloat(formData.get("budget"));
        const isLifetimeBudget = formData.get("isLifetimeBudget") === 'true';
        const productId = formData.get("productId")?.trim();
        const accountId = formData.get("accountId");
  
        if (!campaignName || !objective || !adsetName || !budget || !accountId) {
          return json({ 
            success: false, 
            error: 'Missing required fields. Please fill in all required information.' 
          });
        }
  
        if (isNaN(budget) || budget <= 0) {
          return json({ 
            success: false, 
            error: 'Please enter a valid budget amount.' 
          });
        }
  
        const campaign = await facebook.createCampaign(
          fbCredentials.accessToken,
          accountId,
          {
            name: campaignName,
            objective,
            status: 'PAUSED',
            adsetName,
            budget: Math.round(budget * 100),
            isLifetimeBudget,
            productId: productId || undefined
          }
        );
  
        return json({ 
          success: true, 
          message: "Campaign created successfully! The campaign is currently paused and ready for your review.", 
          campaign 
        });
      } catch (error) {
        console.error('Error creating campaign:', error);
        return json({ 
          success: false, 
          error: `Failed to create campaign: ${error.message}` 
        });
      }
    }
  
    return json({ success: false, error: 'Invalid action' });
  };

const ITEMS_PER_PAGE = 10; // Number of campaigns per page

export default function FacebookAds() {
  const { t, isRTL } = useLanguage();
  const loaderData = useLoaderData() || {};
  
  const {
    isConnected = false,
    adAccounts = [],
    stats = defaultStats,
    campaigns = [],
    accountId: loadedAccountId,
    dateRange: initialDateRange = 'last_30_days',
    startDate: initialStartDate,
    endDate: initialEndDate,
    error: loaderError,
    redirect,
  } = loaderData;

  const actionData = useActionData();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading" || navigation.state === "submitting";

  // State management
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(!isConnected);
  const [isCreateAdModalOpen, setIsCreateAdModalOpen] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(loadedAccountId || '');
  const [dateRange, setDateRange] = useState(initialDateRange);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    start: initialStartDate ? new Date(initialStartDate) : new Date(),
    end: initialEndDate ? new Date(initialEndDate) : new Date()
  });

  // Memoized form state to prevent unnecessary re-renders
  const [adForm, setAdForm] = useState({
    campaignName: "",
    objective: "LINK_CLICKS",
    adsetName: "",
    budget: "",
    isLifetimeBudget: false,
    productId: ""
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  
  // Calculate pagination values
  const totalItems = campaigns?.length || 0;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages || 1);
  
  // Get current page's data
  const getCurrentPageData = useCallback(() => {
    if (!campaigns || campaigns.length === 0) return [];
    const startIndex = (safeCurrentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, campaigns.length);
    return campaigns.slice(startIndex, endIndex);
  }, [campaigns, safeCurrentPage]);

  // Pagination handlers
  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  // Redirect effect
  useEffect(() => {
    if (redirect) {
      navigate(redirect, { replace: true });
    }
  }, [redirect, navigate]);

  // Sync state with loader data
  useEffect(() => {
    if (loadedAccountId && loadedAccountId !== selectedAccount) {
      setSelectedAccount(loadedAccountId);
    }
    if(initialDateRange && initialDateRange !== dateRange) {
      setDateRange(initialDateRange);
    }
    if(initialStartDate && initialEndDate) {
      setCustomDateRange({start: new Date(initialStartDate), end: new Date(initialEndDate)});
    }
  }, [loadedAccountId, initialDateRange, initialStartDate, initialEndDate]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAccount, dateRange, customDateRange.start, customDateRange.end]);

  // Memoized handlers and options
  const handleAccountChange = useCallback((value) => {
    setSelectedAccount(value);
    const filters = { accountId: value, dateRange };
    if (dateRange === 'custom') {
      filters.startDate = customDateRange.start.toISOString().split('T')[0];
      filters.endDate = customDateRange.end.toISOString().split('T')[0];
    }
    submit(filters, { method: 'get', replace: true });
  }, [dateRange, customDateRange, submit]);

  const handleDateRangeChange = useCallback((range) => {
    setDateRange(range);
    if (range !== 'custom') {
      submit({ accountId: selectedAccount, dateRange: range }, { method: 'get', replace: true });
    } else {
      setIsDatePickerOpen(true);
    }
  }, [selectedAccount, submit]);

  const handleCustomDateChange = useCallback(({ start, end }) => {
    setCustomDateRange({ start, end });
    setIsDatePickerOpen(false);
    submit({
      accountId: selectedAccount,
      dateRange: 'custom',
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }, { method: 'get', replace: true });
  }, [selectedAccount, submit]);

  const handleSaveCredentials = useCallback(() => {
    if (!accessToken.trim()) return;
    const formData = new FormData();
    formData.append("action", "saveCredentials");
    formData.append("accessToken", accessToken);
    submit(formData, { method: "post" });
  }, [accessToken, submit]);

  const handleCreateCampaign = useCallback(() => {
    if (!selectedAccount || !adForm.campaignName || !adForm.budget) return;
    const formData = new FormData();
    formData.append("action", "createCampaign");
    formData.append("accountId", selectedAccount);
    Object.entries(adForm).forEach(([key, value]) => formData.append(key, value.toString()));
    submit(formData, { method: "post" });
    setIsCreateAdModalOpen(false);
    setAdForm({
      campaignName: "",
      objective: "LINK_CLICKS",
      adsetName: "",
      budget: "",
      isLifetimeBudget: false,
      productId: ""
    });
  }, [selectedAccount, adForm, submit]);

  // Memoized options
  const accountOptions = useMemo(() => [
    { label: t('facebookAds.filters.selectAccount'), value: '' },
    ...(adAccounts || []).map(a => ({
      label: `${a.name} (${a.account_id || a.id})`,
      value: a.id
    }))
  ], [adAccounts, t]);

  const objectives = useMemo(() => [
    { label: t('facebookAds.campaign.objectives.linkClicks'), value: "LINK_CLICKS" },
    { label: t('facebookAds.campaign.objectives.conversions'), value: "CONVERSIONS" },
    { label: t('facebookAds.campaign.objectives.brandAwareness'), value: "BRAND_AWARENESS" }
  ], [t]);

  const dateRangeOptions = useMemo(() => [
    { label: t('facebookAds.dateRanges.today'), value: "today" },
    { label: t('facebookAds.dateRanges.yesterday'), value: "yesterday" },
    { label: t('facebookAds.dateRanges.last7days'), value: "last_7_days" },
    { label: t('facebookAds.dateRanges.last30days'), value: "last_30_days" },
    { label: t('facebookAds.dateRanges.thisMonth'), value: "this_month" },
    { label: t('facebookAds.dateRanges.lastMonth'), value: "last_month" },
    { label: t('facebookAds.dateRanges.lifetime'), value: "lifetime" },
    { label: t('facebookAds.dateRanges.custom'), value: "custom" }
  ], [t]);

  // Success and error effects
  useEffect(() => {
    if (actionData?.success) {
      setIsConnectModalOpen(false);
      setAccessToken("");
      navigate(".", { replace: true });
    }
  }, [actionData, navigate]);

  useEffect(() => {
    if (loaderError) {
      setIsConnectModalOpen(true);
    }
  }, [loaderError]);

  // Table data preparation with translations
  const campaignTableRows = useMemo(() => (campaigns || []).map(campaign => [
    campaign.name,
    <Badge key={`status-${campaign.id}`} tone={campaign.status === 'ACTIVE' ? 'success' : campaign.status === 'PAUSED' ? 'warning' : 'critical'}>
      {t(`facebookAds.campaign.status.${campaign.status.toLowerCase()}`)}
    </Badge>,
    t(`facebookAds.campaign.objectives.${campaign.objective.toLowerCase()}`),
    `$${(campaign.spend || 0).toFixed(2)}`,
    `$${(campaign.revenue || 0).toFixed(2)}`,
    <Text key={`roas-${campaign.id}`} tone={campaign.roas >= 2 ? 'success' : campaign.roas >= 1 ? 'warning' : 'critical'}>
      {(campaign.roas || 0).toFixed(2)}
    </Text>,
    (campaign.impressions || 0).toLocaleString(),
    campaign.purchases,
    (campaign.costPerPurchase || 0) > 0 ? `$${campaign.costPerPurchase.toFixed(2)}` : t('general.noData'),
    `${campaign.budgetType === 'LIFETIME' ? t('facebookAds.campaign.budget.lifetime') : t('facebookAds.campaign.budget.daily')}: $${((campaign.budget || 0) / 100).toFixed(2)}`,
    new Date(campaign.startTime).toLocaleDateString(),
    campaign.endTime ? new Date(campaign.endTime).toLocaleDateString() : t('general.ongoing')
  ]), [campaigns, t]);

  const formattedDateRange = `${customDateRange.start.toLocaleDateString()} - ${customDateRange.end.toLocaleDateString()}`;

  const containerStyle = useMemo(() => ({
    direction: isRTL ? 'rtl' : 'ltr',
    fontFamily: isRTL ? 'var(--p-font-family-arabic)' : 'var(--p-font-family)',
  }), [isRTL]);

  return (
    <Frame>
      <div style={containerStyle}>
        <Page
          fullWidth
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              <div style={{ background: 'linear-gradient(135deg, #1877F2 0%, #3b5998 100%)', borderRadius: '12px', padding: '8px', color: 'white', fontSize: '20px', fontWeight: 'bold' }}>f</div>
              <Text variant="headingXl" as="h1">{t('facebookAds.title')}</Text>
            </div>
          }
          primaryAction={isConnected ? {
            content: t('facebookAds.actions.createCampaign'),
            onAction: () => setIsCreateAdModalOpen(true),
            variant: "primary",
            size: "large"
          } : null}
          secondaryActions={isConnected ? [{
            content: t('facebookAds.actions.connectionSettings'),
            onAction: () => setIsConnectModalOpen(true)
          }] : []}
        >
          <Layout>
            <Layout.Section>
              <Suspense fallback={<Card><Box padding="400"><InlineStack align="center" gap="200"><Spinner size="small" /><Text>Loading...</Text></InlineStack></Box></Card>}>
                {loaderError && (
                  <Banner status="critical" title={t('facebookAds.errors.dataLoading')} onDismiss={() => navigate(".", { replace: true })}>
                    <p>{loaderError}</p>
                    {(loaderError.includes('token') || loaderError.includes('reconnect')) && (
                      <Button onClick={() => setIsConnectModalOpen(true)} variant="primary">
                        {t('facebookAds.actions.reconnectAccount')}
                      </Button>
                    )}
                  </Banner>
                )}
                {actionData?.error && (
                  <Banner status="critical" title={t('facebookAds.errors.actionError')} onDismiss={() => navigate(".", { replace: true })}>
                    <p>{actionData.error}</p>
                  </Banner>
                )}
                {actionData?.success && (
                  <Banner status="success" title={t('general.success')} onDismiss={() => navigate(".", { replace: true })}>
                    <p>{actionData.message}</p>
                  </Banner>
                )}
              </Suspense>
            </Layout.Section>
            
            <Layout.Section>
              <Card>
                <Box padding="500">
                  <BlockStack gap="400">
                    <InlineStack align="space-between" wrap={false} blockAlign="center">
                      <BlockStack gap="200">
                        <Text as="h2" variant="headingLg">{t('facebookAds.dashboard.controls')}</Text>
                        <Badge
                          tone={isConnected ? "success" : "critical"}
                          size="large"
                          progress={isConnected ? "complete" : "incomplete"}
                        >
                          {t(`facebookAds.connectionStatus.${isConnected ? 'connected' : 'notConnected'}`)}
                        </Badge>
                      </BlockStack>
                      <div style={{
                        background: isConnected
                          ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                          : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                        borderRadius: '50%',
                        width: '60px',
                        height: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px'
                      }}>
                        {isConnected ? '📡' : '❌'}
                      </div>
                    </InlineStack>
                    {isConnected && (
                      <>
                        <Divider />
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                          gap: '16px',
                          alignItems: 'end'
                        }}>
                          <Select
                            label={t('facebookAds.filters.adAccount')}
                            options={accountOptions}
                            value={selectedAccount}
                            onChange={handleAccountChange}
                            disabled={isLoading}
                          />
                          <Select
                            label={t('facebookAds.filters.dateRange')}
                            options={dateRangeOptions}
                            value={dateRange}
                            onChange={handleDateRangeChange}
                            disabled={isLoading}
                          />
                          {dateRange === 'custom' && (
                            <BlockStack gap="200">
                              <Text as="p" variant="bodyMd" fontWeight="semibold">
                                {t('facebookAds.filters.customDateRange')}
                              </Text>
                              <Popover
                                active={isDatePickerOpen}
                                activator={
                                  <Button
                                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                                    disclosure
                                    icon={<Icon source="calendar" />}
                                    loading={isLoading}
                                  >
                                    {formattedDateRange}
                                  </Button>
                                }
                                onClose={() => setIsDatePickerOpen(false)}
                              >
                                <Popover.Pane>
                                  <DatePicker
                                    month={customDateRange.start.getMonth()}
                                    year={customDateRange.start.getFullYear()}
                                    selected={{
                                      start: customDateRange.start,
                                      end: customDateRange.end,
                                    }}
                                    onChange={handleCustomDateChange}
                                    allowRange
                                    disableDatesAfter={new Date()}
                                  />
                                </Popover.Pane>
                              </Popover>
                            </BlockStack>
                          )}
                        </div>
                      </>
                    )}
                  </BlockStack>
                </Box>
              </Card>
            </Layout.Section>

            {selectedAccount && !redirect && (
              <>
                <Layout.Section>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">{t('facebookAds.dashboard.performance')}</Text>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '1rem'
                    }}>
                      <Suspense fallback={<Spinner />}>
                        <StatCard title={t('facebookAds.metrics.adSpend')} value={`$${stats.totalSpend.toFixed(2)}`} icon="💸" color="critical" />
                        <StatCard title={t('facebookAds.metrics.revenue')} value={`$${stats.totalRevenue.toFixed(2)}`} icon="💰" color="success" />
                        <StatCard title={t('facebookAds.metrics.roas')} value={stats.totalSpend > 0 ? (stats.totalRevenue / stats.totalSpend).toFixed(2) : '0.00'} icon="📈" color={stats.totalRevenue > stats.totalSpend ? "success" : "critical"} />
                        <StatCard title={t('facebookAds.metrics.purchases')} value={stats.totalPurchases.toLocaleString()} icon="🛒" color="success" />
                        <StatCard title={t('facebookAds.metrics.impressions')} value={stats.totalImpressions.toLocaleString()} icon="👁️" />
                        <StatCard title={t('facebookAds.metrics.costPerPurchase')} value={stats.totalPurchases > 0 ? `$${(stats.totalSpend / stats.totalPurchases).toFixed(2)}` : 'N/A'} icon="💳" />
                      </Suspense>
                    </div>
                  </BlockStack>
                </Layout.Section>

                <Layout.Section>
                  <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '12px', padding: '2px' }}>
                    <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden' }}>
                      {isLoading ? (
                        <Box padding="800">
                          <InlineStack align="center" gap="200">
                            <Spinner size="large" />
                            <Text>{t('general.loading')}</Text>
                          </InlineStack>
                        </Box>
                      ) : campaigns.length === 0 ? (
                        <EmptyState
                          heading={t('general.noData')}
                          image="/images/empty-state.svg"
                        >
                          <p>{t('facebookAds.campaign.noData')}</p>
                        </EmptyState>
                      ) : (
                        <BlockStack gap="400">
                          <DataTable
                            columnContentTypes={['text', 'text', 'text', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'text', 'text', 'text']}
                            headings={[
                              t('facebookAds.campaign.table.campaign'),
                              t('facebookAds.campaign.table.status'),
                              t('facebookAds.campaign.table.objective'),
                              t('facebookAds.campaign.table.spend'),
                              t('facebookAds.campaign.table.revenue'),
                              t('facebookAds.campaign.table.roas'),
                              t('facebookAds.campaign.table.impressions'),
                              t('facebookAds.campaign.table.purchases'),
                              t('facebookAds.campaign.table.costPerPurchase'),
                              t('facebookAds.campaign.table.budget'),
                              t('facebookAds.campaign.table.start'),
                              t('facebookAds.campaign.table.end')
                            ]}
                            rows={getCurrentPageData().map(campaign => [
                              campaign.name,
                              <Badge key={`status-${campaign.id}`} tone={campaign.status === 'ACTIVE' ? 'success' : campaign.status === 'PAUSED' ? 'warning' : 'critical'}>
                                {t(`facebookAds.campaign.status.${campaign.status.toLowerCase()}`)}
                              </Badge>,
                              t(`facebookAds.campaign.objectives.${campaign.objective.toLowerCase()}`),
                              `$${(campaign.spend || 0).toFixed(2)}`,
                              `$${(campaign.revenue || 0).toFixed(2)}`,
                              <Text key={`roas-${campaign.id}`} tone={campaign.roas >= 2 ? 'success' : campaign.roas >= 1 ? 'warning' : 'critical'}>
                                {(campaign.roas || 0).toFixed(2)}
                              </Text>,
                              (campaign.impressions || 0).toLocaleString(),
                              campaign.purchases,
                              (campaign.costPerPurchase || 0) > 0 ? `$${campaign.costPerPurchase.toFixed(2)}` : t('general.noData'),
                              `${campaign.budgetType === 'LIFETIME' ? t('facebookAds.campaign.budget.lifetime') : t('facebookAds.campaign.budget.daily')}: $${((campaign.budget || 0) / 100).toFixed(2)}`,
                              new Date(campaign.startTime).toLocaleDateString(),
                              campaign.endTime ? new Date(campaign.endTime).toLocaleDateString() : t('general.ongoing')
                            ])}
                            truncate
                          />
                          
                          <Box padding="400">
                            <BlockStack gap="400">
                              <div style={{ 
                                padding: '16px', 
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                                color: 'white', 
                                fontWeight: 'bold', 
                                textAlign: 'center',
                                borderRadius: '8px',
                                direction: isRTL ? 'rtl' : 'ltr'
                              }}>
                                {t('facebookAds.campaign.table.total', { count: campaigns.length })} | {t('general.page')} {safeCurrentPage} {t('general.of')} {totalPages}
                              </div>

                              <InlineStack align="center" gap="400">
                                <Button
                                  onClick={handlePreviousPage}
                                  disabled={safeCurrentPage === 1 || isLoading}
                                  icon={isRTL ? "chevronRight" : "chevronLeft"}
                                >
                                  {t('general.previous')}
                                </Button>
                                
                                <Text variant="bodyMd" as="span" alignment={isRTL ? "end" : "start"}>
                                  {t('general.page')} {safeCurrentPage} {t('general.of')} {totalPages}
                                </Text>
                                
                                <Button
                                  onClick={handleNextPage}
                                  disabled={safeCurrentPage >= totalPages || isLoading}
                                  icon={isRTL ? "chevronLeft" : "chevronRight"}
                                >
                                  {t('general.next')}
                                </Button>
                              </InlineStack>
                            </BlockStack>
                          </Box>
                        </BlockStack>
                      )}
                    </div>
                  </div>
                </Layout.Section>

                <Layout.Section>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      {t('general.pageXofY', { currentPage: safeCurrentPage, totalPages })}
                    </Text>
                    <InlineStack gap="100">
                      <Button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        icon={<Icon source="chevronLeft" />}
                      >
                        {t('general.previous')}
                      </Button>
                      <Button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        icon={<Icon source="chevronRight" />}
                      >
                        {t('general.next')}
                      </Button>
                    </InlineStack>
                  </div>
                </Layout.Section>
              </>
            )}
          </Layout>
          
          <Modal
            open={isConnectModalOpen}
            onClose={() => isConnected && setIsConnectModalOpen(false)}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <div style={{ background: 'linear-gradient(135deg, #1877F2 0%, #3b5998 100%)', borderRadius: '8px', padding: '6px', color: 'white' }}>
                  🔐
                </div>
                {t('facebookAds.connect.title')}
              </div>
            }
            primaryAction={{
              content: t('facebookAds.connect.saveAndConnect'),
              onAction: handleSaveCredentials,
              disabled: !accessToken.trim(),
              loading: navigation.state === 'submitting'
            }}
            secondaryActions={isConnected ? [{
              content: t('general.cancel'),
              onAction: () => setIsConnectModalOpen(false)
            }] : []}
          >
            <Modal.Section>
              <BlockStack gap="400">
                <Banner status="info">{t('facebookAds.connect.instructions')}</Banner>
                <TextField
                  label={t('facebookAds.connect.tokenLabel')}
                  value={accessToken}
                  onChange={setAccessToken}
                  type="password"
                  autoComplete="off"
                  placeholder={t('facebookAds.connect.tokenPlaceholder')}
                  required
                />
              </BlockStack>
            </Modal.Section>
          </Modal>
          
          <Modal
            open={isCreateAdModalOpen}
            onClose={() => setIsCreateAdModalOpen(false)}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <div style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', borderRadius: '8px', padding: '6px', color: 'white' }}>
                  ➕
                </div>
                {t('facebookAds.campaign.create.title')}
              </div>
            }
            primaryAction={{
              content: t('facebookAds.actions.createCampaign'),
              onAction: handleCreateCampaign,
              disabled: !adForm.campaignName || !adForm.budget || navigation.state === 'submitting',
              loading: navigation.state === 'submitting'
            }}
            secondaryActions={[{
              content: t('general.cancel'),
              onAction: () => setIsCreateAdModalOpen(false)
            }]}
            large
          >
            <Modal.Section>
              <Form onSubmit={(e) => {
                e.preventDefault();
                handleCreateCampaign();
              }}>
                <FormLayout>
                  <Card>
                    <Box padding="400">
                      <BlockStack gap="300">
                        <Text variant="headingMd" as="h3">{t('facebookAds.campaign.create.details')}</Text>
                        <TextField
                          label={t('facebookAds.campaign.create.name')}
                          value={adForm.campaignName}
                          onChange={(v) => setAdForm(p => ({ ...p, campaignName: v }))}
                          required
                          error={!adForm.campaignName && t('facebookAds.campaign.create.nameRequired')}
                        />
                        <Select
                          label={t('facebookAds.campaign.create.objective')}
                          options={objectives}
                          value={adForm.objective}
                          onChange={(v) => setAdForm(p => ({ ...p, objective: v }))}
                          required
                        />
                      </BlockStack>
                    </Box>
                  </Card>
                  <Card>
                    <Box padding="400">
                      <BlockStack gap="300">
                        <Text variant="headingMd" as="h3">{t('facebookAds.campaign.budget.title')}</Text>
                        <Select
                          label={t('facebookAds.campaign.budget.type')}
                          options={[
                            { label: t('facebookAds.campaign.budget.daily'), value: 'false' },
                            { label: t('facebookAds.campaign.budget.lifetime'), value: 'true' }
                          ]}
                          value={String(adForm.isLifetimeBudget)}
                          onChange={(v) => setAdForm(p => ({ ...p, isLifetimeBudget: v === 'true' }))}
                        />
                        <TextField
                          label={t(`facebookAds.campaign.budget.${adForm.isLifetimeBudget ? 'lifetime' : 'daily'}`)}
                          type="number"
                          value={adForm.budget}
                          onChange={(v) => setAdForm(p => ({ ...p, budget: v }))}
                          prefix="$"
                          min="1"
                          required
                        />
                      </BlockStack>
                    </Box>
                  </Card>
                  <Card>
                    <Box padding="400">
                      <BlockStack gap="300">
                        <Text variant="headingMd" as="h3">{t('facebookAds.campaign.content.title')}</Text>
                        <TextField
                          label={t('facebookAds.campaign.content.adSetName')}
                          value={adForm.adsetName}
                          onChange={(v) => setAdForm(p => ({ ...p, adsetName: v }))}
                          placeholder={t('facebookAds.campaign.content.adSetPlaceholder')}
                          required
                        />
                        <TextField
                          label={t('facebookAds.campaign.content.productId')}
                          value={adForm.productId}
                          onChange={(v) => setAdForm(p => ({ ...p, productId: v }))}
                          helpText={t('facebookAds.campaign.content.productIdHelp')}
                        />
                      </BlockStack>
                    </Box>
                  </Card>
                </FormLayout>
              </Form>
            </Modal.Section>
          </Modal>
        </Page>
      </div>
    </Frame>
  );
}