import { useCallback, useState, useEffect, useMemo, useRef } from "react";
import { useLoaderData, useFetcher, useNavigation } from "@remix-run/react";
import { json } from "@remix-run/node";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  Grid,
  Button,
  InlineStack,
  Spinner,
  Select,
  TextField,
  Box,
  Badge,
  SkeletonBodyText,
  Frame,
  Toast,
  Divider,
  CalloutCard,
  EmptyState,
  Bleed,
  InlineGrid,
  Banner,
} from "@shopify/polaris";
import { Suspense, lazy } from "react";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { facebook } from "../services/facebook.server.js";
import { 
  LazyChartComponents, 
  LazyDashboardPanel, 
  LazyDashboardStats,
  LazyFacebookMetrics,
  LoadingFallback 
} from "../components/LazyComponents";
import ErrorBoundary from "../components/ErrorBoundary";
import { useLanguage } from "../utils/i18n/LanguageContext.jsx";

// Lazy load the chart components - using direct imports to avoid issues
const LazyLineChart = lazy(() => 
  import('react-chartjs-2').then(module => ({
    default: module.Line
  }))
);

// Preload Chart.js for better performance
const preloadChartJS = () => {
  import('chart.js').then(module => {
    const { 
      Chart, 
      CategoryScale, 
      LinearScale, 
      PointElement, 
      LineElement, 
      Tooltip, 
      Filler,
      ArcElement,
      BarElement,
      Legend,
      Title
    } = module;
    
    // Register all required Chart.js components
    Chart.register(
      CategoryScale,
      LinearScale,
      PointElement,
      LineElement,
      Filler,
      Tooltip,
      ArcElement,
      BarElement,
      Legend,
      Title
    );
  });
};

// --- Enhanced SparkLineChart Component with tooltips and hover effects ---
const SparkLineChart = ({ data, trend, formatValue, language, t, isRTL }) => {
  // Ensure Chart.js is loaded
  useEffect(() => {
    preloadChartJS();
  }, []);
  
  // Skip rendering if no data or empty data
  if (!data || data.length === 0 || !data.some(d => d.value !== undefined && d.value !== null)) {
    return <div style={{ height: '50px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Text variant="bodySm" tone="subdued">{t('stats.insufficientData')}</Text>
    </div>;
  }

  // Format dates for display
  const formattedData = data.map(d => {
    // Try to format the date nicely if it's a valid date string
    let displayDate = d.date;
    try {
      if (d.date && d.date.includes('-')) {
        const dateObj = new Date(d.date);
        if (!isNaN(dateObj.getTime())) {
          // Format date based on user's language
          displayDate = dateObj.toLocaleDateString(language === 'ar' ? 'ar-DZ' : 'en-US');
        }
      }
    } catch (e) {
      // If date parsing fails, use the original date string
      console.error("Date parsing error:", e);
    }

    return {
      ...d,
      displayDate
    };
  });

  const chartData = {
    labels: formattedData.map(d => d.displayDate),
    datasets: [
      {
        data: formattedData.map(d => d.value),
        borderColor: trend === 'positive' ? 'rgb(0, 128, 96)' : 'rgb(220, 53, 69)',
        backgroundColor: trend === 'positive' ? 'rgba(0, 128, 96, 0.1)' : 'rgba(220, 53, 69, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: trend === 'positive' ? 'rgb(0, 128, 96)' : 'rgb(220, 53, 69)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { 
      x: { display: false }, 
      y: { display: false, beginAtZero: true } 
    },
    plugins: { 
      legend: { display: false },
      tooltip: { 
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(50, 50, 50, 0.9)',
        titleFont: { size: 12 },
        bodyFont: { size: 12 },
        titleAlign: 'center',
        bodyAlign: 'center',
        rtl: isRTL,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: function(context) {
            const value = context.raw;
            return formatValue ? formatValue(value) : new Intl.NumberFormat(language === 'ar' ? 'ar-DZ' : 'en-US').format(value);
          }
        }
      }
    },
    elements: { 
      line: { borderCapStyle: 'round' },
      point: {
        radius: 0,
        hoverRadius: 5
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    hover: {
      mode: 'index',
      intersect: false
    }
  };

  return (
    <div style={{ height: '70px', width: '100%' }}>
      <Suspense fallback={
        <div style={{ height: '70px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="spark-line-loading">
            <div className="spark-line-pulse"></div>
          </div>
          <style>{`
            .spark-line-loading {
              width: 100%;
              height: 30px;
              position: relative;
              background: #f6f6f6;
              border-radius: 4px;
              overflow: hidden;
            }
            .spark-line-pulse {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
              animation: pulse 1.5s infinite;
            }
            @keyframes pulse {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          `}</style>
        </div>
      }>
        <ErrorBoundary fallback={
          <div style={{ height: '70px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Text variant="bodySm" tone="critical">خطأ في تحميل الرسم البياني</Text>
          </div>
        }>
          <LazyLineChart data={chartData} options={options} />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
};

// Add a loading indicator component
const LoadingBar = ({ isLoading }) => {
  if (!isLoading) return null;
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: '0', 
      left: '0', 
      right: '0',
      height: '3px',
      background: 'linear-gradient(to right, #008060, #95bf47)',
      zIndex: 1000,
      animation: 'loading-bar 1.5s infinite linear'
    }}>
      <style>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 65%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export function meta() {
  return [
    { title: "لوحة تحكم الأرباح | Track Profit", "og:title": "لوحة تحكم الأرباح | Track Profit" },
    { name: "description", content: "تحليل الأرباح والمبيعات وأداء الإعلانات للمتجر الإلكتروني", "og:description": "تحليل الأرباح والمبيعات وأداء الإعلانات للمتجر الإلكتروني" },
    { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
    { name: "theme-color", content: "#008060" },
    { "og:type": "website", "og:url": "https://yourapp.com", "og:image": "https://yourapp.com/og-image.jpg", "og:locale": "ar_AR" },
    { "twitter:card": "summary_large_image", "twitter:title": "لوحة تحكم الأرباح | Track Profit", "twitter:description": "تحليل الأرباح والمبيعات وأداء الإعلانات للمتجر الإلكتروني", "twitter:image": "https://yourapp.com/twitter-image.jpg" }
  ];
}

  
// Date presets keys - will be localized in the component
const DATE_PRESETS_CONFIG = [
  { value: "today", translationKey: "datePresets.today" },
  { value: "last_7_days", translationKey: "datePresets.last7Days" },
  { value: "last_30_days", translationKey: "datePresets.last30Days" },
  { value: "this_month", translationKey: "datePresets.thisMonth" },
];

const DEFAULT_STATS = {
  totalProfit: 0, adCosts: 0, adImpressions: 0, adPurchases: 0,
  adRevenue: 0, fbROAS: 0, orderRevenue: 0, shippingAndCancelFees: 0,
  cogs: 0, mer: 0, effectiveROAS: 0,
  dailyStats: [],
};

const DEFAULT_FACEBOOK_DATA = {
  accounts: [], selectedAccount: null, currency: 'USD',
  metrics: { totalSpend: 0, totalRevenue: 0, totalPurchases: 0, totalImpressions: 0, roas: 0 }
};

const getPresetDates = (preset = "last_30_days") => {
  const end = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  switch (preset) {
    case "today": break;
    case "last_7_days": start.setDate(start.getDate() - 6); break;
    case "this_month": start.setDate(1); break;
    case "last_30_days": default: start.setDate(start.getDate() - 29); break;
  }
  return { start, end };
};

// Format functions are defined inside the component since they need access to the language hook
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const preset = url.searchParams.get("preset") || "last_30_days";
  const exchangeRateParam = url.searchParams.get("exchangeRate") || "1";
  const exchangeRate = parseFloat(exchangeRateParam);

  if (isNaN(exchangeRate)) return json({ error: "Invalid exchange rate" }, { status: 400 });

  const { start, end } = getPresetDates(preset);
  let stats = { ...DEFAULT_STATS, dailyStats: [] };
  let facebookData = { ...DEFAULT_FACEBOOK_DATA };
  let topSellingProduct = null;
  let mostProfitableProduct = null;

  // Fetch all necessary data in parallel for better performance
  const [fbCredentials, allShipments, orderCOGSData, productCosts] = await Promise.all([
    prisma.FacebookCredential.findUnique({ where: { shop: session.shop } }),
    prisma.Shipment.findMany({ 
      where: { 
        shop: session.shop, 
        updatedAt: { gte: start, lte: end } 
      },
      select: { 
        id: true,
        total: true, 
        deliveryFee: true, 
        cancelFee: true, 
        status: true, 
        totalCost: true, 
        updatedAt: true,
        orderId: true 
      }
    }),
    // Fetch order COGS data for the same period
    prisma.OrderCOGS.findMany({
      where: { 
        shop: session.shop,
        createdAt: { gte: start, lte: end }
      },
      include: {
        items: true
      }
    }),
    // Fetch product costs data
    prisma.ProductCost.findMany({
      where: { shop: session.shop }
    })
  ]);

  console.log(`Fetched ${allShipments.length} shipments, ${orderCOGSData.length} COGS orders, and ${productCosts.length} product costs`);

  const dailyData = {};
  const dateCursor = new Date(start);
  while (dateCursor <= end) {
    dailyData[dateCursor.toISOString().split('T')[0]] = { 
      orderRevenue: 0, 
      cogs: 0, 
      shippingAndCancelFees: 0, 
      adCosts: 0,
      shipmentCount: 0,
      orderCount: 0
    };
    dateCursor.setDate(dateCursor.getDate() + 1);
  }

  // Process shipment data
  for (const shipment of allShipments) {
    const dateString = shipment.updatedAt.toISOString().split('T')[0];
    if (dailyData[dateString]) {
      // Increment shipment count for this day
      dailyData[dateString].shipmentCount += 1;
      
      if (shipment.status === "Livrée" || shipment.status === "En Préparation") {
        dailyData[dateString].orderRevenue += parseFloat(shipment.total || 0);
        dailyData[dateString].shippingAndCancelFees += parseFloat(shipment.deliveryFee || 0);
        if (shipment.totalCost) dailyData[dateString].cogs += parseFloat(shipment.totalCost);
      } else if (shipment.status?.includes("Retour") || shipment.status === "Annulé") {
        dailyData[dateString].shippingAndCancelFees += parseFloat(shipment.cancelFee || 0);
      }
    }
  }

  // Process OrderCOGS data
  for (const order of orderCOGSData) {
    const dateString = order.createdAt.toISOString().split('T')[0];
    if (dailyData[dateString]) {
      dailyData[dateString].orderCount += 1;
      
      // If the order data already exists in the shipment data, don't double count
      const hasMatchingShipment = allShipments.some(shipment => 
        shipment.orderId === order.orderId && 
        (shipment.status === "Livrée" || shipment.status === "En Préparation")
      );
      
      if (!hasMatchingShipment) {
        // If no matching shipment found, add this order's revenue and costs
        dailyData[dateString].orderRevenue += parseFloat(order.totalRevenue || 0);
        dailyData[dateString].cogs += parseFloat(order.totalCost || 0);
      }
    }
  }

  // Find top selling and most profitable products
  if (orderCOGSData.length > 0) {
    // Create a map to aggregate product sales and profits
    const productSales = new Map();
    const productProfits = new Map();
    
    for (const order of orderCOGSData) {
      for (const item of order.items) {
        // Track quantity sold per product
        const currentSales = productSales.get(item.productId) || { 
          id: item.productId, 
          title: item.title,
          quantity: 0,
          revenue: 0
        };
        currentSales.quantity += item.quantity;
        currentSales.revenue += item.totalRevenue;
        productSales.set(item.productId, currentSales);
        
        // Track profit per product
        const currentProfits = productProfits.get(item.productId) || {
          id: item.productId,
          title: item.title,
          profit: 0,
          revenue: 0
        };
        currentProfits.profit += item.profit;
        currentProfits.revenue += item.totalRevenue;
        productProfits.set(item.productId, currentProfits);
      }
    }
    
    // Convert maps to arrays and sort to find top products
    const sortedBySales = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity);
    
    const sortedByProfit = Array.from(productProfits.values())
      .sort((a, b) => b.profit - a.profit);
    
    if (sortedBySales.length > 0) {
      topSellingProduct = sortedBySales[0];
    }
    
    if (sortedByProfit.length > 0) {
      mostProfitableProduct = sortedByProfit[0];
    }
  }
  
  if (fbCredentials?.accessToken) {
    try {
      const adAccounts = await facebook.getAdAccounts(fbCredentials.accessToken);
      if (Array.isArray(adAccounts)) {
        facebookData.accounts = adAccounts.map(acc => ({ 
          value: acc.id || '', 
          label: acc.name || `Account ${acc.accountId || 'Unknown'}`, 
          currency: acc.currency || 'USD' 
        }));
        
        const selectedAdAccountId = url.searchParams.get("adAccountId");
        if (selectedAdAccountId) {
          const selectedAccount = facebookData.accounts.find(acc => acc.value === selectedAdAccountId);
          if (selectedAccount) {
            try {
              const fbData = await facebook.getCampaigns(
                fbCredentials.accessToken, 
                selectedAccount.value, 
                preset, 
                true
              );
              
              // Handle null or undefined response
              if (fbData) {
                facebookData = { 
                  ...facebookData, 
                  selectedAccount, 
                  currency: fbData.currency || selectedAccount.currency || 'USD', 
                  metrics: fbData.metrics || DEFAULT_FACEBOOK_DATA.metrics, 
                  campaigns: fbData.campaigns || [] 
                };
                
                if (fbData.metrics) {
                  stats = { 
                    ...stats, 
                    adCosts: (fbData.metrics.totalSpend || 0) * exchangeRate, 
                    adRevenue: (fbData.metrics.totalRevenue || 0) * exchangeRate, 
                    adPurchases: fbData.metrics.totalPurchases || 0, 
                    adImpressions: fbData.metrics.totalImpressions || 0, 
                    fbROAS: fbData.metrics.roas || 0 
                  };
                }
                
                if (fbData.dailyMetrics && Array.isArray(fbData.dailyMetrics)) {
                  fbData.dailyMetrics.forEach(day => { 
                    if (dailyData[day.date]) {
                      dailyData[day.date].adCosts += (day.spend || 0) * exchangeRate; 
                    }
                  });
                }
              } else {
                console.error("Facebook API returned null or undefined data");
              }
            } catch (fbError) {
              console.error("Error fetching campaign data:", fbError);
            }
          }
        }
      }
    } catch (error) { 
      console.error("Failed to fetch Facebook data:", error); 
    }
  }

  Object.keys(dailyData).forEach(date => {
    const day = dailyData[date];
    const dailyProfit = day.orderRevenue - day.cogs - day.shippingAndCancelFees - day.adCosts;
    stats.dailyStats.push({ 
      date, 
      ...day, 
      totalProfit: dailyProfit,
      shipmentCount: day.shipmentCount,
      orderCount: day.orderCount
    });
    stats.orderRevenue += day.orderRevenue;
    stats.cogs += day.cogs;
    stats.shippingAndCancelFees += day.shippingAndCancelFees;
  });
  
  const totalDeliveryFees = allShipments.reduce((sum, s) => 
    sum + ((s.status === "Livrée" || s.status === "En Préparation") ? parseFloat(s.deliveryFee || 0) : 0), 0);
  
  const totalCancelFees = allShipments.reduce((sum, s) => 
    sum + (s.status?.includes("Retour") || s.status === "Annulé" ? parseFloat(s.cancelFee || 0) : 0), 0);
  
  stats.shippingAndCancelFees = totalDeliveryFees + totalCancelFees;
  
  stats.totalProfit = stats.orderRevenue - stats.cogs - stats.shippingAndCancelFees - stats.adCosts;
  stats.mer = 0;
  if (stats.adCosts > 0) {
    stats.mer = Number((stats.orderRevenue / stats.adCosts).toFixed(2));
  }
  stats.effectiveROAS = (stats.adCosts > 0 && stats.orderRevenue > 0) ? Number(((stats.adRevenue - (stats.adRevenue / stats.orderRevenue * stats.cogs)) / stats.adCosts).toFixed(2)) : 0;
  
  const diagnostics = {
    ordersWithCost: orderCOGSData.length,
    totalCogsValue: stats.cogs,
    shipmentsFound: allShipments.length,
    shipmentsWithCostData: allShipments.filter(s => s.totalCost).length,
    totalShippingFees: totalDeliveryFees,
    totalCancelFees: totalCancelFees
  };

  return json({ stats, facebook: facebookData, datePreset: preset, exchangeRate: exchangeRateParam, topSellingProduct, mostProfitableProduct, diagnostics });
};

export default function Index() {
  const initialData = useLoaderData() || {};
  const { stats: iStats, facebook: iFb, datePreset: iPreset, exchangeRate: iExRate, topSellingProduct: iTop, mostProfitableProduct: iMost, diagnostics: iDiag } = initialData;
  const [currentStats, setCurrentStats] = useState(iStats || DEFAULT_STATS);
  const [currentFacebook, setCurrentFacebook] = useState(iFb || DEFAULT_FACEBOOK_DATA);
  const [currentDatePreset, setCurrentDatePreset] = useState(iPreset || "last_30_days");
  const [exchangeRate, setExchangeRate] = useState(iExRate || "1");
  const [topSellingProduct, setTopSellingProduct] = useState(iTop || null);
  const [mostProfitableProduct, setMostProfitableProduct] = useState(iMost || null);
  const [diagnostics, setDiagnostics] = useState(iDiag || {});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  
  const { t, language, isRTL } = useLanguage();
  
  // Create date presets with translated labels
  const DATE_PRESETS = useMemo(() => {
    return DATE_PRESETS_CONFIG.map(preset => ({
      value: preset.value,
      label: t(preset.translationKey)
    }));
  }, [t]);
  
  // Format helpers using the current language
  const formatCurrency = useCallback((amount, isNegative = false, currency = "DZD") => {
    if (amount === undefined || amount === null) return "-";
    
    const value = Math.abs(Number(amount));
    const sign = isNegative ? '-' : '';
    
    // Use consistent formatting with formatters.js
    const formattedValue = new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
    
    // Ensure currency symbol is correctly applied
    if (currency === 'DZD') {
      // Replace any potential incorrect currency symbol with "DZD"
      return `${sign}${formattedValue.replace(/[€$]/g, '')}`;
    }
    
    return `${sign}${formattedValue}`;
  }, []);

  const formatNumber = useCallback((amount) => {
    return new Intl.NumberFormat(language === 'ar' ? "ar-DZ" : "en-US").format(amount || 0);
  }, [language]);
  
  const facebookDropdownRef = useRef(null);
  const fetcher = useFetcher();
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading" || fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      // Update all state with the new data
      setCurrentStats(fetcher.data.stats || DEFAULT_STATS);
      setCurrentFacebook(fetcher.data.facebook || DEFAULT_FACEBOOK_DATA);
      setCurrentDatePreset(fetcher.data.datePreset || "last_30_days");
      setTopSellingProduct(fetcher.data.topSellingProduct || null);
      setMostProfitableProduct(fetcher.data.mostProfitableProduct || null);
      setDiagnostics(fetcher.data.diagnostics || {});
      if (fetcher.data.exchangeRate) setExchangeRate(fetcher.data.exchangeRate);
      
      // Set appropriate success message
      if (fetcher.data.facebook?.selectedAccount?.label) {
        setToastMessage(t('toast.accountUpdated', { account: fetcher.data.facebook.selectedAccount.label }));
      } else {
        const presetLabel = DATE_PRESETS.find(preset => preset.value === fetcher.data.datePreset)?.label || fetcher.data.datePreset;
        setToastMessage(t('toast.dataUpdated', { period: presetLabel }));
      }
      
      setShowToast(true);
    }
  }, [fetcher.data, fetcher.state]);

  // Function to submit filters automatically
  const submitFilters = useCallback((params) => {
    if (isLoading) return;
    fetcher.submit(params, { method: "get" });
  }, [fetcher, isLoading]);

  // Function to handle account selection change
  const handleAccountChange = useCallback((accountId) => {
    // Don't do anything if it's the empty option or already selected
    if (!accountId || accountId === currentFacebook.selectedAccount?.value) return;
    
    // Update the selected account in state
    const selectedAccount = currentFacebook.accounts.find(a => a.value === accountId) || null;
    setCurrentFacebook(prev => ({ ...prev, selectedAccount }));
    
    // Submit the form with the new account ID
    const params = { 
      preset: currentDatePreset, 
      exchangeRate,
      adAccountId: accountId 
    };
    submitFilters(params);
    
    // Show toast message with the account name
    setToastMessage(t('toast.updatingAccount', { account: selectedAccount?.label || t('facebook.chooseAccount') }));
    setShowToast(true);
  }, [currentDatePreset, exchangeRate, currentFacebook.accounts, currentFacebook.selectedAccount, submitFilters]);

  // Function to handle date preset change
  const handleDatePresetChange = useCallback((value) => {
    // Don't do anything if it's already selected
    if (value === currentDatePreset) return;
    
    setCurrentDatePreset(value);
    
    // Get the user-friendly name of the preset
    const presetLabel = DATE_PRESETS.find(preset => preset.value === value)?.label || value;
    
    // Submit the form with the new date preset
    const params = { 
      preset: value, 
      exchangeRate
    };
    if (currentFacebook.selectedAccount?.value) {
      params.adAccountId = currentFacebook.selectedAccount.value;
    }
    submitFilters(params);
    
    // Show toast message with the preset name
    setToastMessage(t('toast.updatingPeriod', { period: presetLabel }));
    setShowToast(true);
  }, [currentDatePreset, exchangeRate, currentFacebook.selectedAccount, submitFilters]);

  // Function to handle exchange rate change - just update the state without submitting
  const handleExchangeRateChange = useCallback((value) => {
    // Just update the state without submitting the form
    setExchangeRate(value);
  }, []);

  const handleFormSubmit = useCallback((event) => {
    event.preventDefault();
    if (isLoading) return;
    const params = { preset: currentDatePreset, exchangeRate };
    if (currentFacebook.selectedAccount?.value) {
      params.adAccountId = currentFacebook.selectedAccount.value;
    }
    fetcher.submit(params, { method: "get" });
  }, [fetcher, isLoading, currentDatePreset, exchangeRate, currentFacebook.selectedAccount]);

  const scrollToFacebookDropdown = useCallback(() => {
    facebookDropdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const [profitDistributionData, performanceMetricsData] = useMemo(() => ([
    { labels: ['الإيرادات', 'التكاليف', 'الربح'], datasets: [{ label: 'المبلغ (دج)', data: [currentStats.orderRevenue, currentStats.adCosts + currentStats.shippingAndCancelFees + currentStats.cogs, currentStats.totalProfit], backgroundColor: ['rgba(54, 162, 235, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(75, 192, 192, 0.7)'], borderColor: ['#36A2EB', '#FF6384', '#4BC0C0'], borderWidth: 1, }] },
    { labels: ['كفاءة التسويق (MER)', 'عائد الإعلان (ROAS)', 'العائد الصافي (Net ROAS)'], datasets: [{ label: 'النسبة', data: [currentStats.mer, currentStats.fbROAS, currentStats.effectiveROAS], backgroundColor: ['rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)'], borderColor: ['#36A2EB', '#FFCE56', '#4BC0C0'], borderWidth: 1 }] }
  ]), [currentStats]);

  const toastMarkup = showToast ? (
    <Toast 
      content={toastMessage} 
      onDismiss={() => setShowToast(false)} 
      duration={4000} 
      error={toastMessage.includes("خطأ")}
    />
  ) : null;
  const hasData = true; // Always show dashboard

  const statCardsData = useMemo(() => [
    { title: t('stats.netProfit'), value: formatCurrency(currentStats.totalProfit), trend: currentStats.totalProfit >= 0 ? "positive" : "negative", chartData: currentStats.dailyStats.map(d => ({ date: d.date, value: d.totalProfit })), subtitle: currentFacebook.currency !== 'DZD' ? `${formatCurrency(currentStats.totalProfit / parseFloat(exchangeRate), currentStats.totalProfit < 0, currentFacebook.currency)} ${currentFacebook.currency}` : null },
    { title: t('stats.totalSales'), value: formatCurrency(currentStats.orderRevenue), trend: "positive", chartData: currentStats.dailyStats.map(d => ({ date: d.date, value: d.orderRevenue })) },
    { title: t('stats.adCosts'), value: formatCurrency(currentStats.adCosts, true), trend: "negative", chartData: currentStats.dailyStats.map(d => ({ date: d.date, value: d.adCosts })), subtitle: currentFacebook.currency !== 'DZD' ? `${formatCurrency(currentStats.adCosts / parseFloat(exchangeRate), true, currentFacebook.currency)} ${currentFacebook.currency}` : null },
    { title: t('stats.shippingCancelFees'), value: formatCurrency(currentStats.shippingAndCancelFees, true), trend: "negative", chartData: currentStats.dailyStats.map(d => ({ date: d.date, value: d.shippingAndCancelFees })) },
    { title: t('stats.cogsCosts'), value: formatCurrency(currentStats.cogs), trend: "negative", chartData: currentStats.dailyStats.map(d => ({ date: d.date, value: d.cogs })) },
    { title: t('stats.totalShipments'), value: formatNumber(diagnostics.shipmentsFound), trend: "positive", 
      chartData: currentStats.dailyStats.map(d => ({ 
        date: d.date, 
        value: d.shipmentCount || 0
      })) 
    },
  ], [currentStats, exchangeRate, currentFacebook.currency]);

  return (
    <Frame>
      <Page fullWidth>
        <TitleBar title={t('dashboard.title')} />
        {toastMarkup}
        <LoadingBar isLoading={isLoading} />
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Bleed marginInline="400" marginBlockStart="400">
                  <Box background="bg-surface-secondary" padding="400" shadow="sm">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="200"><Text variant="headingXl" as="h1">لوحة تحكم الأرباح</Text><Text variant="bodyLg" tone="subdued">تتبع أرباحك ومبيعاتك وأداء إعلاناتك في مكان واحد</Text></BlockStack>
                      <Text variant="headingLg">📊</Text>
                    </InlineStack>
                  </Box>
                </Bleed>
                <Box paddingInline="400" paddingBlockEnd="400">
                  <form onSubmit={handleFormSubmit}>
                    <Grid columns={{ xs: 1, sm: 6, lg: 12 }} gap="400" alignItems="end">
                      <Grid.Cell columnSpan={{ xs: 1, sm: 3, lg: 4 }}>
                        <Select 
                          label={t('dashboard.dateRange')} 
                          options={DATE_PRESETS} 
                          value={currentDatePreset} 
                          onChange={handleDatePresetChange} 
                          disabled={isLoading} 
                        />
                      </Grid.Cell>
                      <Grid.Cell columnSpan={{ xs: 1, sm: 3, lg: 4 }}>
                        <div ref={facebookDropdownRef}>
                          <Select 
                            label={t('dashboard.facebookAccount')} 
                            options={[{ label: t('dashboard.selectAccount'), value: "" }, ...(currentFacebook?.accounts || [])]} 
                            value={currentFacebook.selectedAccount?.value || ""} 
                            onChange={handleAccountChange} 
                            disabled={isLoading}
                          />
                        </div>
                      </Grid.Cell>
                      <Grid.Cell columnSpan={{ xs: 1, sm: 4, lg: 2 }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <div style={{ flex: 1 }}>
                            <TextField 
                              label={t('dashboard.exchangeRate')} 
                              type="number" 
                              value={exchangeRate} 
                              onChange={handleExchangeRateChange} 
                              autoComplete="off" 
                              disabled={isLoading}
                              onKeyDown={(e) => {
                                // Submit when pressing Enter
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const params = { 
                                    preset: currentDatePreset, 
                                    exchangeRate
                                  };
                                  if (currentFacebook.selectedAccount?.value) {
                                    params.adAccountId = currentFacebook.selectedAccount.value;
                                  }
                                  submitFilters(params);
                                  
                                  // Show toast message
                                  setToastMessage(t('toast.exchangeRateUpdated', { rate: exchangeRate }));
                                  setShowToast(true);
                                }
                              }}
                            />
                          </div>
                          <div style={{ alignSelf: 'flex-end', marginBottom: '2px' }}>
                            <Button 
                              onClick={() => {
                                const params = { 
                                  preset: currentDatePreset, 
                                  exchangeRate
                                };
                                if (currentFacebook.selectedAccount?.value) {
                                  params.adAccountId = currentFacebook.selectedAccount.value;
                                }
                                submitFilters(params);
                                
                                // Show toast message
                                setToastMessage(t('toast.exchangeRateUpdated', { rate: exchangeRate }));
                                setShowToast(true);
                              }}
                              disabled={isLoading}
                            >
                              تطبيق
                            </Button>
                          </div>
                        </div>
                      </Grid.Cell>
                      <Grid.Cell columnSpan={{ xs: 1, sm: 2, lg: 2 }}>
                        <Button 
                          primary 
                          submit 
                          loading={isLoading} 
                          fullWidth
                        > 
                          {isLoading ? t('dashboard.updating') : t('dashboard.updateData')} 
                        </Button>
                      </Grid.Cell>
                    </Grid>
                  </form>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
          
          {isLoading ? (
            <Layout.Section>
              <Card>
                <BlockStack gap="400" align="center" inlineAlign="center" padding="1200">
                  <Spinner size="large" />
                  <Text variant="headingMd" tone="subdued">{t('dashboard.dataLoadingTitle')}</Text>
                </BlockStack>
              </Card>
            </Layout.Section>
          ) : (
            <>
              {/* Removed "no data" banner since you have data from Facebook and shipments */}
              <Layout.Section>
                <InlineGrid columns={{ xs: 1, sm: 2, lg: 3 }} gap="400">
                  {statCardsData.map((stat, index) => (
                    <Card key={index}>
                      <BlockStack gap="400" padding="400">
                        <BlockStack gap="200">
                           <InlineStack align="space-between"><Text variant="bodyMd" tone="subdued">{stat.title}</Text><Badge tone={stat.trend === "positive" ? "success" : "critical"}>{stat.trend === "positive" ? "↗" : "↘"}</Badge></InlineStack>
                          <Text variant="headingLg" as="h3">{stat.value}</Text>
                          {stat.subtitle && <Text variant="bodySm" tone="subdued">{stat.subtitle}</Text>}
                        </BlockStack>
                        <SparkLineChart 
                          data={stat.chartData} 
                          trend={stat.trend} 
                          formatValue={(value) => stat.title.includes("إجمالي الشحنات") ? formatNumber(value) : formatCurrency(value, true)}
                          language={language}
                          t={t}
                          isRTL={isRTL}
                        />
                      </BlockStack>
                    </Card>
                  ))}
                </InlineGrid>
              </Layout.Section>

              {currentFacebook?.selectedAccount && (
                <Layout.Section>
                  <Card>
                    <BlockStack gap="500">
                      <Bleed marginInline="400" marginBlockStart="400">
                        <Box background="bg-surface-secondary" padding="400">
                          <InlineStack align="space-between" blockAlign="center">
                            <BlockStack gap="100">
                              <Text variant="headingLg" as="h2">{t('facebook.title')}</Text>
                              <Text variant="bodyMd" tone="subdued"> {t('facebook.chooseAccount')}: {currentFacebook.selectedAccount.label} </Text>
                            </BlockStack>
                            <Badge tone="info">{currentFacebook.currency}</Badge>
                          </InlineStack>
                        </Box>
                      </Bleed>
                      <Box padding="400">
                        <Suspense fallback={
                          <BlockStack gap="400">
                            <SkeletonBodyText lines={4} />
                            <div style={{ height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <Spinner size="large" />
                            </div>
                          </BlockStack>
                        }>
                          <LazyFacebookMetrics 
                            facebook={currentFacebook} 
                            stats={currentStats} 
                            formatCurrency={formatCurrency} 
                            formatNumber={formatNumber} 
                            scrollToFacebookDropdown={scrollToFacebookDropdown} 
                          />
                        </Suspense>
                      </Box>
                    </BlockStack>
                  </Card>
                </Layout.Section>
              )}

              <Layout.Section>
                <Card>
                  <BlockStack gap="400" padding="400">
                    <Text variant="headingLg" as="h2">{t('diagnostics.title')}</Text>
                    <InlineGrid columns={{ xs: 2, sm: 4 }} gap="400">
                      {[
                        { icon: '📦', label: t('diagnostics.ordersWithCost'), value: formatNumber(diagnostics.ordersWithCost) }, 
                        { icon: '💰', label: t('diagnostics.totalCogsValue'), value: formatCurrency(diagnostics.totalCogsValue) }, 
                        { icon: '🚚', label: t('diagnostics.totalShipments'), value: formatNumber(diagnostics.shipmentsFound) }, 
                        { icon: '✅', label: t('diagnostics.shipmentsWithCost'), value: formatNumber(diagnostics.shipmentsWithCostData) }
                      ].map(({ icon, label, value }, index) => (
                        <BlockStack key={index} gap="200" align="center" inlineAlign="center">
                          <Text variant="headingLg">{icon}</Text>
                          <Text variant="bodyMd" tone="subdued" alignment="center">{label}</Text>
                          <Text variant="headingMd" alignment="center">{value}</Text>
                        </BlockStack>
                      ))}
                    </InlineGrid>
                    <Divider />
                    <InlineGrid columns={{ xs: 2 }} gap="400">
                      {[
                        { icon: '🚚', label: t('diagnostics.shippingFees'), value: formatCurrency(diagnostics.totalShippingFees) }, 
                        { icon: '❌', label: t('diagnostics.cancelFees'), value: formatCurrency(diagnostics.totalCancelFees) }
                      ].map(({ icon, label, value }, index) => (
                        <BlockStack key={index} gap="200" align="center" inlineAlign="center">
                          <Text variant="headingLg">{icon}</Text>
                          <Text variant="bodyMd" tone="subdued" alignment="center">{label}</Text>
                          <Text variant="headingMd" alignment="center">{value}</Text>
                        </BlockStack>
                      ))}
                    </InlineGrid>
                  </BlockStack>
                </Card>
              </Layout.Section>

              <Layout.Section>
                <Card>
                  <BlockStack gap="500" padding="400">
                    <Text variant="headingLg" as="h2">{t('charts.performanceAnalysis')}</Text>
                    <Suspense fallback={
                      <BlockStack gap="400">
                        <SkeletonBodyText lines={4} />
                        <div style={{ height: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <Spinner size="large" />
                        </div>
                        <SkeletonBodyText lines={3} />
                        <div style={{ height: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <Spinner size="large" />
                        </div>
                      </BlockStack>
                    }>
                      <ErrorBoundary fallback={
                        <Banner title="خطأ في تحميل الرسوم البيانية" tone="critical">
                          <Text>حدث خطأ أثناء تحميل الرسوم البيانية. يرجى تحديث الصفحة والمحاولة مرة أخرى.</Text>
                        </Banner>
                      }>
                        <LazyChartComponents 
                          profitDistributionData={profitDistributionData} 
                          performanceMetricsData={performanceMetricsData} 
                        />
                      </ErrorBoundary>
                    </Suspense>
                  </BlockStack>
                </Card>
              </Layout.Section>

              {topSellingProduct && mostProfitableProduct && (
                <Layout.Section>
                  <Grid columns={{ xs: 1, sm: 2 }} gap="400">
                    {[
                      { 
                        title: t('products.bestSelling'), 
                        product: topSellingProduct, 
                        icon: '📈', 
                        stat: `${t('products.salesCount')} ${formatNumber(topSellingProduct.quantity)}` 
                      }, 
                      { 
                        title: t('products.mostProfitable'), 
                        product: mostProfitableProduct, 
                        icon: '🏆', 
                        stat: `${t('products.netProfit')} ${formatCurrency(mostProfitableProduct.profit)}` 
                      }
                    ].map(({ title, product, icon, stat }, index) => (
                      <Card key={index}>
                        <BlockStack gap="400" padding="400">
                          <InlineStack align="space-between" blockAlign="start">
                            <Text variant="headingMd" as="h3">{title}</Text>
                            <Text variant="headingLg">{icon}</Text>
                          </InlineStack>
                          <Text variant="headingLg">{product.title || t('products.unavailable')}</Text>
                          {product.image && (
                            <img 
                              alt={product.title} 
                              src={product.image} 
                              style={{ 
                                width: "100%", 
                                maxHeight: "200px", 
                                objectFit: "contain", 
                                borderRadius: "var(--p-border-radius-200)" 
                              }} 
                              loading="lazy" 
                            />
                          )}
                          <Box background="bg-surface-success-subdued" borderRadius="200" padding="300">
                            <Text variant="bodyLg" alignment="center" fontWeight="semibold">{stat}</Text>
                          </Box>
                        </BlockStack>
                      </Card>
                    ))}
                  </Grid>
                </Layout.Section>
              )}

              {currentFacebook?.selectedAccount && (
                <Layout.Section>
                  <CalloutCard 
                    title={t('roasCalculation.title')} 
                    illustration="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg" 
                    primaryAction={{ 
                      content: t('roasCalculation.learnMore'), 
                      url: 'https://www.shopify.com/blog/roas', 
                      external: true 
                    }}
                  >
                    <BlockStack gap="400">
                      <Text variant="bodyMd">{t('roasCalculation.description')}</Text>
                      <Card>
                        <BlockStack gap="400" padding="400">
                          <Text variant="bodyMd" fontWeight="bold">{t('roasCalculation.formula')}</Text>
                          <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                            <BlockStack gap="200">
                              <Text as="p" variant="bodyMd"><code>{t('roasCalculation.netRevenue')}</code></Text>
                              <Text as="p" variant="bodyMd"><code>{t('roasCalculation.netRoas')}</code></Text>
                            </BlockStack>
                          </Box>
                          <Divider />
                          <Text variant="bodyMd" fontWeight="bold">{t('roasCalculation.calculation')}</Text>
                          {currentStats.orderRevenue > 0 && currentStats.adCosts > 0 ? (
                            <BlockStack gap="300">
                              <Text>{t('roasCalculation.step1')} {formatCurrency(currentStats.adRevenue, true)} - ({formatCurrency(currentStats.adRevenue, true)} ÷ {formatCurrency(currentStats.orderRevenue, true)} × {formatCurrency(currentStats.cogs, true)}) = <strong>{formatCurrency(currentStats.adRevenue - (currentStats.adRevenue / currentStats.orderRevenue * currentStats.cogs), true)}</strong></Text>
                              <Text>{t('roasCalculation.step2')} {formatCurrency(currentStats.adRevenue - (currentStats.adRevenue / currentStats.orderRevenue * currentStats.cogs), true)} ÷ {formatCurrency(currentStats.adCosts, true)} = <strong>{currentStats.effectiveROAS}x</strong></Text>
                              <Divider />
                              <InlineStack align="space-between" blockAlign="center">
                                <Text variant="headingMd">{t('roasCalculation.finalResult')}</Text>
                                <Badge tone="success" size="large">{currentStats.effectiveROAS}x</Badge>
                              </InlineStack>
                            </BlockStack>
                          ) : (
                            <Text tone="subdued">{t('roasCalculation.insufficientData')}</Text>
                          )}
                        </BlockStack>
                      </Card>
                    </BlockStack>
                  </CalloutCard>
                </Layout.Section>
              )}
            </>
          )}
        </Layout>
      </Page>
    </Frame>
  );
}