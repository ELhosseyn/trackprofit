import { useCallback, useState, useEffect, useMemo, useRef, Suspense } from "react";
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
  Frame,
  Toast,
  Divider,
  CalloutCard,
  Bleed,
  InlineGrid,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { facebook } from "../services/facebook.server.js";
import { zrexpress } from "../services/zrexpress.server.js";
import {
  LazyChartComponents,
  LazyFacebookMetrics,
  LoadingFallback
} from "../components/LazyComponents";
import ErrorBoundary from "../components/ErrorBoundary";
import { useLanguage } from "../utils/i18n/LanguageContext.jsx";

// SparkLineChart: Canvas-based sparkline with hover tooltip
const SparkLineChart = ({ data, trend, formatValue, language, t }) => {
  const canvasRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(-1);

  const sanitizedData = useMemo(() => (
    Array.isArray(data)
      ? data.filter(d => d && d.value !== undefined && d.value !== null && !isNaN(Number(d.value)))
        .map(d => ({ ...d, value: Number(d.value) || 0 }))
      : []
  ), [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    if (sanitizedData.length < 2) {
      if (sanitizedData.length === 1) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        ctx.fillStyle = trend === 'positive' ? '#008060' : '#DC3545';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
      return;
    }
    const values = sanitizedData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    const effectiveRange = range === 0 ? Math.max(1, Math.abs(maxValue) * 0.1) : range;
    const padding = 8;
    const width = rect.width - padding * 2;
    const height = rect.height - padding * 2;
    ctx.beginPath();
    ctx.strokeStyle = trend === 'positive' ? '#008060' : '#DC3545';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    sanitizedData.forEach((point, index) => {
      const x = padding + (index / (sanitizedData.length - 1)) * width;
      let y = range === 0
        ? padding + height / 2
        : padding + height - ((point.value - minValue) / effectiveRange) * height;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = trend === 'positive' ? '#008060' : '#DC3545';
    ctx.lineTo(padding + width, padding + height);
    ctx.lineTo(padding, padding + height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (isHovered && hoverIndex >= 0 && hoverIndex < sanitizedData.length) {
      const point = sanitizedData[hoverIndex];
      const x = padding + (hoverIndex / (sanitizedData.length - 1)) * width;
      let y = range === 0
        ? padding + height / 2
        : padding + height - ((point.value - minValue) / effectiveRange) * height;
      ctx.fillStyle = trend === 'positive' ? '#008060' : '#DC3545';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [sanitizedData, trend, isHovered, hoverIndex]);

  const getTooltipValue = useCallback(() => {
    if (hoverIndex >= 0 && hoverIndex < sanitizedData.length) {
      const value = sanitizedData[hoverIndex].value;
      return formatValue ? formatValue(value) : new Intl.NumberFormat(language === 'ar' ? 'ar-DZ' : 'en-US').format(value);
    }
    return '';
  }, [hoverIndex, sanitizedData, formatValue, language]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padding = 8;
    const width = rect.width - padding * 2;
    const index = Math.round(((x - padding) / width) * (sanitizedData.length - 1));
    if (index >= 0 && index < sanitizedData.length) {
      setHoverIndex(index);
      setIsHovered(true);
    }
  };
  const handleMouseLeave = () => {
    setIsHovered(false);
    setHoverIndex(-1);
  };

  if (!data || !Array.isArray(data) || data.length === 0 || sanitizedData.length === 0) {
    return (
      <div style={{ height: '70px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="bodySm" tone="subdued">{t?.('stats.insufficientData') || 'بيانات غير كافية'}</Text>
      </div>
    );
  }

  return (
    <div style={{ height: '70px', width: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {isHovered && hoverIndex >= 0 && (
        <div style={{
          position: 'absolute',
          top: '5px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10
        }}>
          {getTooltipValue()}
        </div>
      )}
    </div>
  );
};

// Loading indicator component
const LoadingBar = ({ isLoading }) => {
  if (!isLoading) return null;
  return (
    <div style={{ position: 'fixed', top: '0', left: '0', right: '0', height: '3px', background: 'linear-gradient(to right, #008060, #95bf47)', zIndex: 1000, animation: 'loading-bar 1.5s infinite linear' }}>
      <style>{`@keyframes loading-bar { 0% { width: 0%; } 50% { width: 65%; } 100% { width: 100%; } }`}</style>
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
  end.setHours(23, 59, 59, 999);
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


// --- Refactored Helper Functions for the Loader ---

async function getShopCurrency(admin) {
  const response = await admin.graphql(
    `#graphql
    query getShopCurrency {
      shop {
        currencyCode
      }
    }`
  );
  const data = await response.json();
  return data.data.shop.currencyCode || 'DZD';
}

/**
 * CORRECTED fetchPrimaryData function.
 * This version first fetches revenue-generating events (orders, shipments) and then uses
 * their IDs to fetch the associated COGS data, ensuring no costs are missed due to date mismatches.
 */
async function fetchPrimaryData({ admin, session }, dateRange) {
  const { start, end } = dateRange;
  const { shop } = session;

  // Step 1: Fetch all potential revenue events within the date range.
  const [
    shopCurrency,
    fbCredentials,
    allShipments,
    shopifyOrdersResponse,
    zrExpressProfit,
  ] = await Promise.all([
    getShopCurrency(admin),
    prisma.FacebookCredential.findUnique({ where: { shop } }),
    prisma.Shipment.findMany({
      where: { shop, updatedAt: { gte: start, lte: end } },
      select: { id: true, total: true, deliveryFee: true, cancelFee: true, status: true, totalCost: true, updatedAt: true, orderId: true },
    }),
    admin.graphql(`#graphql
      query getOrders($query: String!) {
        orders(first: 250, query: $query) {
          edges {
            node {
              id
              name
              displayFinancialStatus
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                }
              }
            }
          }
        }
      }
    `, {
      variables: {
        // Fetch PAID orders created in the range. Revenue recognition will happen later.
        query: `created_at:>=${start.toISOString()} AND created_at:<=${end.toISOString()} AND financial_status:paid`
      }
    }),
    zrexpress.getNetProfit(shop, dateRange),
  ]);

  const shopifyOrdersData = await shopifyOrdersResponse.json();
  const shopifyOrdersList = shopifyOrdersData?.data?.orders?.edges?.map(edge => ({
    id: edge.node.id,
    name: edge.node.name,
    financialStatus: edge.node.displayFinancialStatus,
    createdAt: edge.node.createdAt,
    totalPrice: edge.node.totalPriceSet?.shopMoney?.amount || 0,
  })) || [];

  // Step 2: Collect all unique order IDs from shipments and Shopify orders.
  const orderIdsFromShipments = allShipments.map(s => s.orderId).filter(Boolean);
  const orderIdsFromShopify = shopifyOrdersList.map(o => o.id.split('/').pop()).filter(Boolean);
  const allRelevantOrderIds = [...new Set([...orderIdsFromShipments, ...orderIdsFromShopify])];

  // Step 3: Fetch COGS data for ONLY the relevant order IDs, regardless of when COGS was entered.
  let orderCOGSData = [];
  if (allRelevantOrderIds.length > 0) {
    orderCOGSData = await prisma.OrderCOGS.findMany({
      where: {
        shop,
        orderId: { in: allRelevantOrderIds }
      },
      include: { items: true },
    });
  }

  return {
    shopCurrency,
    fbCredentials,
    allShipments,
    orderCOGSData,
    shopifyOrdersList,
    zrExpressProfitData: zrExpressProfit.success ? zrExpressProfit.data : null,
  };
}


/**
 * [FIXED] Fetches and processes comprehensive Facebook Ads data.
 * 1. Correctly persists the selected ad account across reloads.
 * 2. Fetches not just spend, but also revenue, purchases, and impressions.
 *    (Assumes your facebook.server.js service can provide this data).
 */
async function fetchFacebookData(fbCredentials, searchParams, preset, exchangeRate) {
  const facebookResult = {
    data: { ...DEFAULT_FACEBOOK_DATA },
    adCosts: 0, adRevenue: 0, adPurchases: 0, adImpressions: 0, fbROAS: 0, dailyMetrics: [],
  };

  if (!fbCredentials?.accessToken) return facebookResult;

  try {
    const adAccounts = await facebook.getAdAccounts(fbCredentials.accessToken);
    if (!Array.isArray(adAccounts)) return facebookResult;

    facebookResult.data.accounts = adAccounts.map(acc => ({
      value: acc.id || '',
      label: acc.name || `Account ${acc.accountId || 'Unknown'}`,
      currency: acc.currency || 'USD'
    }));

    const selectedAdAccountId = searchParams.get("adAccountId");
    if (!selectedAdAccountId) return facebookResult;

    const selectedAccount = facebookResult.data.accounts.find(acc => acc.value === selectedAdAccountId);
    if (!selectedAccount) return facebookResult;
    
    // FIX #1: Persist the selected account object in the response data.
    // This ensures the dropdown and toast notifications know which account is active.
    facebookResult.data.selectedAccount = selectedAccount;

    const { start, end } = getPresetDates(preset);
    const since = start.toISOString().slice(0, 10);
    const until = end.toISOString().slice(0, 10);

    // FIX #2: Fetch comprehensive daily metrics, not just spend.
    // We assume your service can provide daily data for spend, revenue, purchases, and impressions.
    // If your service function is named differently (e.g., getInsights), change it here.
    const { getDailySpend } = await import("../services/facebook.server.js");
    const dailyInsights = await getDailySpend(fbCredentials.accessToken, selectedAccount.value, since, until);

    // Process the full daily insight data
    facebookResult.dailyMetrics = dailyInsights.map(day => ({
      date: day.date,
      spend: (day.spend || 0) * exchangeRate,
      revenue: (day.revenue || 0) * exchangeRate, // Assuming 'revenue' is in the payload
      purchases: (day.purchases || 0),           // Assuming 'purchases' is in the payload
      impressions: (day.impressions || 0),       // Assuming 'impressions' is in the payload
    }));

    // Calculate totals from the processed daily metrics
    facebookResult.adCosts = facebookResult.dailyMetrics.reduce((sum, d) => sum + d.spend, 0);
    facebookResult.adRevenue = facebookResult.dailyMetrics.reduce((sum, d) => sum + d.revenue, 0);
    facebookResult.adPurchases = facebookResult.dailyMetrics.reduce((sum, d) => sum + d.purchases, 0);
    facebookResult.adImpressions = facebookResult.dailyMetrics.reduce((sum, d) => sum + d.impressions, 0);
    facebookResult.fbROAS = facebookResult.adCosts > 0 ? Number((facebookResult.adRevenue / facebookResult.adCosts).toFixed(2)) : 0;

  } catch (error) {
    console.error("Failed to fetch Facebook data:", error);
  }

  return facebookResult;
}


function calculateProductPerformance(orderCOGSData) {
  if (!orderCOGSData || orderCOGSData.length === 0) {
    return { topSellingProduct: null, mostProfitableProduct: null };
  }
  const productSales = new Map();
  const productProfits = new Map();
  // Get delivered shipments (same logic as dailyStats)
  const deliveredShipments = (typeof window === 'undefined' && global && global.deliveredShipments) ? global.deliveredShipments : [];
  // If not available globally, fallback to extracting from orderCOGSData
  if (!deliveredShipments.length && orderCOGSData) {
    // Try to reconstruct deliveredShipments from orderCOGSData if possible
    // This fallback assumes orderCOGSData contains shipment info
    for (const order of orderCOGSData) {
      if (order.shipment && (order.shipment.status === "Livrée"  || (order.shipment.status && order.shipment.status.toLowerCase().includes("livrée")))) {
        deliveredShipments.push(order.shipment);
      }
    }
  }
  // Aggregate products only from delivered shipments
  for (const shipment of deliveredShipments) {
    // Find matching orderCOGSData for this shipment
    const order = orderCOGSData.find(o => o.orderId === shipment.orderId);
    if (!order || !order.items) continue;
    for (const item of order.items) {
      const productId = item.productId || item.id || item.sku || item.title;
      const title = item.title || "Unknown Product";
      let quantity = 1;
      if (typeof item.quantity === 'number' && !isNaN(item.quantity)) {
        quantity = Math.max(1, Math.floor(item.quantity));
      } else if (typeof item.quantity === 'string' && !isNaN(Number(item.quantity))) {
        quantity = Math.max(1, Math.floor(Number(item.quantity)));
      }
      const revenue = Number(item.totalRevenue) || 0;
      const cost = Number(item.totalCost) || 0;

      if (!productSales.has(productId)) {
        productSales.set(productId, { id: productId, title, quantity: 0, revenue: 0 });
      }
      const sales = productSales.get(productId);
      sales.quantity += quantity;
      sales.revenue += revenue;

      if (!productProfits.has(productId)) {
        productProfits.set(productId, { id: productId, title, profit: 0, revenue: 0, totalCost: 0, quantity: 0 });
      }
      const profits = productProfits.get(productId);
      profits.profit += (revenue - cost);
      profits.revenue += revenue;
      profits.totalCost += cost;
      profits.quantity += quantity;
    }
  }
  // Best selling: highest quantity
  const sortedBySales = Array.from(productSales.values()).sort((a, b) => b.quantity - a.quantity);
  // Most profitable: highest profit
  const sortedByProfit = Array.from(productProfits.values()).filter(p => p.quantity > 0).map(p => ({ ...p, profitPerUnit: p.profit / p.quantity })).sort((a, b) => b.profit - a.profit);
  const topSellingProduct = sortedBySales.length > 0 ? { ...sortedBySales[0], profit: productProfits.get(sortedBySales[0].id)?.profit || 0 } : null;
  const mostProfitableProduct = sortedByProfit.length > 0 ? sortedByProfit[0] : null;
  // Debug output
  console.log('Top Selling Product:', topSellingProduct);
  console.log('Most Profitable Product:', mostProfitableProduct);
  return { topSellingProduct, mostProfitableProduct };
}

/**
 * [FIXED] This function was completely rewritten to address several critical bugs:
 * 1.  Revenue Recognition: Now correctly recognizes revenue only when a shipment status is "Livrée" (Delivered), not the incorrect "En Préparation".
 * 2.  Consistency: All calculations, including diagnostics, now use the same "Livrée" status, eliminating data discrepancies.
 * 3.  Accurate Totals: Overall stats (total profit, revenue, etc.) are now calculated by summing the daily data, ensuring the totals always match the chart data.
 * 4.  Robust COGS and Fee Application: Costs, delivery fees, and cancellation fees are now applied correctly on the day the corresponding event (delivery/cancellation) occurs.
 */
function calculateFinalStats({ allShipments, shopifyOrdersList, orderCOGSData, fbDailyMetrics, dateRange, exchangeRate, adCosts }) {
  const stats = { ...DEFAULT_STATS, dailyStats: [] };
  const dailyData = {};
  const processedOrderIdsForRevenue = new Set();

  // Always use UTC date string (YYYY-MM-DD) for keys
  const dateCursor = new Date(Date.UTC(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()));
  const endDate = new Date(Date.UTC(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate()));
  while (dateCursor <= endDate) {
    const dateString = dateCursor.toISOString().slice(0, 10); // UTC YYYY-MM-DD
    dailyData[dateString] = { orderRevenue: 0, cogs: 0, shippingAndCancelFees: 0, adCosts: 0, shipmentCount: 0, totalProfit: 0 };
    dateCursor.setUTCDate(dateCursor.getUTCDate() + 1);
  }

  const cogsMap = new Map();
  orderCOGSData.forEach(order => {
    cogsMap.set(order.orderId, parseFloat(order.totalCost || 0));
    if (order.orderId.includes('gid://')) {
      cogsMap.set(order.orderId.split('/').pop(), parseFloat(order.totalCost || 0));
    }
  });


  // --- Start: Populate Daily Data for Charts ---
  allShipments.forEach(shipment => {
    // Normalize shipment date to UTC YYYY-MM-DD
    const d = new Date(shipment.updatedAt);
    const dateString = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
    if (!dailyData[dateString]) return;

    // FIX #3: Revenue is recognized ONLY on delivered shipments ("Livrée").
    // Removed "En Préparation" to prevent premature revenue recognition.
    const isDelivered = shipment.status && (shipment.status === "Livrée"  || shipment.status?.toLowerCase().includes("livrée"));
    const isCancelled = shipment.status?.includes("Retour") || shipment.status === "Annuler";

    if (isDelivered && !processedOrderIdsForRevenue.has(shipment.orderId)) {
      dailyData[dateString].orderRevenue += parseFloat(shipment.total || 0);
      dailyData[dateString].cogs += cogsMap.get(shipment.orderId) || 0;
      processedOrderIdsForRevenue.add(shipment.orderId);
      dailyData[dateString].shipmentCount++;
      // Apply delivery fee as a cost on the day of delivery
      dailyData[dateString].shippingAndCancelFees += parseFloat(shipment.deliveryFee || 0);
    } else if (isCancelled) {
      // Apply cancellation fee as a cost
      dailyData[dateString].shippingAndCancelFees += parseFloat(shipment.cancelFee || 0);
    }
  });

  shopifyOrdersList.forEach(order => {
    const orderId = order.id.split('/').pop();
    // Normalize order date to UTC YYYY-MM-DD
    const d = new Date(order.createdAt);
    const dateString = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
    // Process paid orders that haven't been accounted for via shipment (e.g., digital goods)
    if (order.financialStatus === 'PAID' && !processedOrderIdsForRevenue.has(orderId) && dailyData[dateString]) {
      dailyData[dateString].orderRevenue += parseFloat(order.totalPrice || 0);
      dailyData[dateString].cogs += cogsMap.get(orderId) || 0;
      processedOrderIdsForRevenue.add(orderId);
    }
  });

  // Map daily adCosts from fbDailyMetrics
  if (fbDailyMetrics && Array.isArray(fbDailyMetrics) && fbDailyMetrics.length > 0) {
    fbDailyMetrics.forEach(day => {
      const fbDate = day.date && typeof day.date === 'string' ? day.date.slice(0, 10) : '';
      if (dailyData[fbDate]) {
        dailyData[fbDate].adCosts += (day.spend || 0); // Already includes exchange rate from fetchFacebookData
      }
    });
  } else {
    // If no daily metrics, fallback to total adCosts on the last day
    const lastDate = Object.keys(dailyData).pop();
    if (lastDate && typeof adCosts === 'number' && adCosts > 0) {
      dailyData[lastDate].adCosts = adCosts;
    }
  }

  Object.entries(dailyData).forEach(([date, day]) => {
    day.totalProfit = day.orderRevenue - day.cogs - day.shippingAndCancelFees - day.adCosts;
    stats.dailyStats.push({ date, ...day });
  });
  // --- End: Daily Data Population ---

  // --- Recalculate all totals directly from daily data to ensure accuracy and consistency ---
  stats.orderRevenue = stats.dailyStats.reduce((sum, day) => sum + day.orderRevenue, 0);
  stats.cogs = stats.dailyStats.reduce((sum, day) => sum + day.cogs, 0);
  stats.shippingAndCancelFees = stats.dailyStats.reduce((sum, day) => sum + day.shippingAndCancelFees, 0);
  stats.adCosts = stats.dailyStats.reduce((sum, day) => sum + day.adCosts, 0);
  stats.totalProfit = stats.dailyStats.reduce((sum, day) => sum + day.totalProfit, 0);

  // Fallback if daily ad costs were not available but total was
  if (stats.adCosts === 0 && typeof adCosts === 'number' && adCosts > 0) {
    stats.adCosts = adCosts;
    stats.totalProfit = stats.orderRevenue - stats.cogs - stats.shippingAndCancelFees - stats.adCosts;
  }

  // --- Ensure Diagnostics data is calculated consistently with the main logic ---
  // FIX #3 (Consistency): Use the same "Livrée" logic for diagnostics.
  const deliveredShipments = allShipments.filter(s => s.status && (s.status === "Livrée" || s.status?.toLowerCase().includes("livrée")));
  const cancelledShipments = allShipments.filter(s => s.status?.includes("Retour") || s.status === "Annuler");

  const totalDeliveryFees = deliveredShipments.reduce((sum, s) => sum + parseFloat(s.deliveryFee || 0), 0);
  const totalCancelFees = cancelledShipments.reduce((sum, s) => sum + parseFloat(s.cancelFee || 0), 0);
  const totalCogsValue = deliveredShipments.reduce((sum, s) => sum + (cogsMap.get(s.orderId) || 0), 0);

  const paidOrdersCogs = shopifyOrdersList
    .filter(o => o.financialStatus === 'PAID' && !processedOrderIdsForRevenue.has(o.id.split('/').pop()))
    .reduce((sum, o) => sum + (cogsMap.get(o.id.split('/').pop()) || 0), 0);

  const totalCogsValueForDiagnostics = totalCogsValue + paidOrdersCogs;
  const shipmentsWithCostData = deliveredShipments.filter(s => (cogsMap.get(s.orderId) || 0) > 0).length;

  const diagnostics = {
    ordersWithCost: orderCOGSData.filter(o => (o.totalCost || 0) > 0).length,
    totalCogsValue: totalCogsValueForDiagnostics,
    shipmentsFound: allShipments.length,
    shipmentsWithCostData: shipmentsWithCostData,
    totalShippingFees: totalDeliveryFees,
    totalCancelFees: totalCancelFees,
    dateRange: { start: dateRange.start.toISOString(), end: dateRange.end.toISOString() }
  };
  
  return { stats, diagnostics };
}


// --- Main Loader Function ---
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const preset = url.searchParams.get("preset") || "last_30_days";
  const exchangeRateParam = url.searchParams.get("exchangeRate") || "1";

  try {
    const { admin, session } = await authenticate.admin(request);
    const exchangeRate = parseFloat(exchangeRateParam);
    if (isNaN(exchangeRate)) return json({ error: "Invalid exchange rate" }, { status: 400 });
    const dateRange = getPresetDates(preset);

    const { shopCurrency, fbCredentials, allShipments, orderCOGSData, zrExpressProfitData, shopifyOrdersList } = await fetchPrimaryData({ admin, session }, dateRange);

    const { data: facebookData, adCosts, adRevenue, adPurchases, adImpressions, fbROAS, dailyMetrics: fbDailyMetrics } = await fetchFacebookData(fbCredentials, url.searchParams, preset, exchangeRate);

    const { topSellingProduct, mostProfitableProduct } = calculateProductPerformance(orderCOGSData);

    const { stats, diagnostics } = calculateFinalStats({
        allShipments,
        shopifyOrdersList,
        orderCOGSData,
        fbDailyMetrics,
        dateRange,
        exchangeRate,
        adCosts
    });

    stats.adRevenue = adRevenue;
    stats.adPurchases = adPurchases;
    stats.adImpressions = adImpressions;
    stats.fbROAS = fbROAS;

    stats.mer = (stats.adCosts > 0) ? Number((stats.orderRevenue / stats.adCosts).toFixed(2)) : 0;
    stats.effectiveROAS = (stats.adCosts > 0 && stats.orderRevenue > 0 && stats.adRevenue > 0) ? Number(((stats.adRevenue - (stats.adRevenue / stats.orderRevenue * stats.cogs)) / stats.adCosts).toFixed(2)) : 0;

    return json({
      stats,
      facebook: facebookData, // This now contains the selectedAccount object
      datePreset: preset,
      exchangeRate: exchangeRateParam,
      topSellingProduct,
      mostProfitableProduct,
      diagnostics,
      zrExpressProfit: zrExpressProfitData,
      shopCurrency,
    });

  } catch (error) {
    console.error('❌ Loader error:', error);
    return json({
      error: error.message,
      stats: { ...DEFAULT_STATS },
      facebook: { ...DEFAULT_FACEBOOK_DATA },
      datePreset: preset,
      exchangeRate: exchangeRateParam,
      topSellingProduct: null,
      mostProfitableProduct: null,
      diagnostics: null,
      zrExpressProfit: null,
      shopCurrency: 'DZD',
    }, { status: 500 });
  }
};


export default function Index() {
  const initialData = useLoaderData() || {};
  const {
    stats: iStats, facebook: iFb, datePreset: iPreset, exchangeRate: iExRate,
    topSellingProduct: iTop, mostProfitableProduct: iMost, diagnostics: iDiag,
    zrExpressProfit: iZrProfit, shopCurrency: iShopCurrency
  } = initialData;
  const [currentStats, setCurrentStats] = useState(iStats || DEFAULT_STATS);
  const [currentFacebook, setCurrentFacebook] = useState(iFb || DEFAULT_FACEBOOK_DATA);
  const [currentDatePreset, setCurrentDatePreset] = useState(iPreset || "last_30_days");
  const [exchangeRate, setExchangeRate] = useState(iExRate || "1");
  const [topSellingProduct, setTopSellingProduct] = useState(iTop || null);
  const [mostProfitableProduct, setMostProfitableProduct] = useState(iMost || null);
  const [zrExpressProfit, setZrExpressProfit] = useState(iZrProfit || null);
  const [diagnostics, setDiagnostics] = useState(iDiag || {});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [shopCurrency, setShopCurrency] = useState(iShopCurrency || 'DZD');

  const { t, language, isRTL } = useLanguage();

  const DATE_PRESETS = useMemo(() => {
    return DATE_PRESETS_CONFIG.map(preset => ({
      value: preset.value,
      label: t(preset.translationKey)
    }));
  }, [t]);

  // Always use shopCurrency for formatting unless explicitly overridden
  const formatCurrency = useCallback((amount, isNegative = false, currency) => {
    const useCurrency = currency || shopCurrency;
    if (amount === undefined || amount === null || isNaN(Number(amount))) return "-";
    const value = Math.abs(Number(amount));
    const sign = isNegative ? '-' : '';
    const locale = language === 'ar' ? 'ar-SA' : 'en-US'; 
    try {
      const formattedValue = new Intl.NumberFormat(locale, {
        style: 'currency', currency: useCurrency, minimumFractionDigits: 2, maximumFractionDigits: 2,
      }).format(value);
      return `${sign}${formattedValue}`;
    } catch (e) {
      console.warn(`Could not format currency '${useCurrency}'. Using fallback.`, e);
      return `${sign}${value.toFixed(2)} ${useCurrency}`;
    }
  }, [shopCurrency, language]);

  const formatNumber = useCallback((amount) => {
    return new Intl.NumberFormat(language === 'ar' ? "ar-DZ" : "en-US").format(amount || 0);
  }, [language]);

  const facebookDropdownRef = useRef(null);
  const fetcher = useFetcher();
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading" || fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      setCurrentStats(fetcher.data.stats || DEFAULT_STATS);
      setCurrentFacebook(fetcher.data.facebook || DEFAULT_FACEBOOK_DATA);
      setCurrentDatePreset(fetcher.data.datePreset || "last_30_days");
      setTopSellingProduct(fetcher.data.topSellingProduct || null);
      setMostProfitableProduct(fetcher.data.mostProfitableProduct || null);
      setZrExpressProfit(fetcher.data.zrExpressProfit || null);
      setDiagnostics(fetcher.data.diagnostics || {});
      if (fetcher.data.exchangeRate) setExchangeRate(fetcher.data.exchangeRate);
      if (fetcher.data.shopCurrency) setShopCurrency(fetcher.data.shopCurrency); 
      // This logic now works correctly because `fetcher.data.facebook.selectedAccount` is persisted
      if (fetcher.data.facebook?.selectedAccount?.label) {
        setToastMessage(t('toast.accountUpdated', { account: fetcher.data.facebook.selectedAccount.label }));
      } else {
        const presetLabel = DATE_PRESETS.find(preset => preset.value === fetcher.data.datePreset)?.label || fetcher.data.datePreset;
        setToastMessage(t('toast.dataUpdated', { period: presetLabel }));
      }
      setShowToast(true);
    }
  }, [fetcher.data, fetcher.state, t, DATE_PRESETS]);

  const submitFilters = useCallback((params) => {
    if (isLoading) return;
    fetcher.submit(params, { method: "get" });
  }, [fetcher, isLoading]);

  const handleAccountChange = useCallback((accountId) => {
    if (!accountId || accountId === currentFacebook.selectedAccount?.value) return;
    const selectedAccount = currentFacebook.accounts.find(a => a.value === accountId) || null;
    // Optimistically set the selected account for a smoother UI response
    setCurrentFacebook(prev => ({ ...prev, selectedAccount }));
    const params = { preset: currentDatePreset, exchangeRate, adAccountId: accountId };
    submitFilters(params);
    setToastMessage(t('toast.updatingAccount', { account: selectedAccount?.label || t('facebook.chooseAccount') }));
    setShowToast(true);
  }, [currentDatePreset, exchangeRate, currentFacebook.accounts, currentFacebook.selectedAccount, submitFilters, t]);

  const handleDatePresetChange = useCallback((value) => {
    if (value === currentDatePreset) return;
    setCurrentDatePreset(value);
    const presetLabel = DATE_PRESETS.find(preset => preset.value === value)?.label || value;
    const params = { preset: value, exchangeRate };
    if (currentFacebook.selectedAccount?.value) params.adAccountId = currentFacebook.selectedAccount.value;
    submitFilters(params);
    setToastMessage(t('toast.updatingPeriod', { period: presetLabel }));
    setShowToast(true);
  }, [currentDatePreset, exchangeRate, currentFacebook.selectedAccount, submitFilters, t, DATE_PRESETS]);

  const handleExchangeRateChange = useCallback((value) => setExchangeRate(value), []);

  const handleFormSubmit = useCallback((event) => {
    event.preventDefault();
    if (isLoading) return;
    const params = { preset: currentDatePreset, exchangeRate };
    if (currentFacebook.selectedAccount?.value) params.adAccountId = currentFacebook.selectedAccount.value;
    fetcher.submit(params, { method: "get" });
  }, [fetcher, isLoading, currentDatePreset, exchangeRate, currentFacebook.selectedAccount]);

  const scrollToFacebookDropdown = useCallback(() => {
    facebookDropdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const [profitDistributionData, performanceMetricsData] = useMemo(() => ([
    { labels: ['الإيرادات', 'التكاليف', 'الربح'], datasets: [{ label: 'المبلغ (دج)', data: [currentStats.orderRevenue, currentStats.adCosts + currentStats.shippingAndCancelFees + currentStats.cogs, currentStats.totalProfit], backgroundColor: ['rgba(54, 162, 235, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(75, 192, 192, 0.7)'], borderColor: ['#36A2EB', '#FF6384', '#4BC0C0'], borderWidth: 1, }] },
    { labels: ['كفاءة التسويق (MER)', 'عائد الإعلان (ROAS)', 'العائد الصافي (Net ROAS)'], datasets: [{ label: 'النسبة', data: [currentStats.mer, currentStats.fbROAS, currentStats.effectiveROAS], backgroundColor: ['rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)'], borderColor: ['#36A2EB', '#FFCE56', '#4BC0C0'], borderWidth: 1 }] }
  ]), [currentStats]);

  const toastMarkup = showToast ? <Toast content={toastMessage} onDismiss={() => setShowToast(false)} duration={4000} error={toastMessage.includes("خطأ")} /> : null;

  const statCardsData = useMemo(() => {
    // Calculate total costs exactly as displayed
    const totalCosts = Number(currentStats.cogs || 0) + Number(currentStats.shippingAndCancelFees || 0) + Number(currentStats.adCosts || 0);
    // Calculate net profit using the same formula
    const netProfitValue = Number(currentStats.orderRevenue || 0) - totalCosts;
    const netProfitSubtitle = `${formatCurrency(currentStats.orderRevenue, false, shopCurrency)} الإيرادات - ${formatCurrency(totalCosts, false, shopCurrency)} التكاليف`;

    // Always use shopCurrency for Ad Costs
    const fbCurrency = currentFacebook?.selectedAccount?.currency || currentFacebook?.currency || shopCurrency;
    // adCostsInFbCurrency: convert shop currency to fb currency if needed
    const adCostsInFbCurrency = fbCurrency !== shopCurrency ? Number(currentStats.adCosts) / parseFloat(exchangeRate) : Number(currentStats.adCosts);

    const sanitizeChartData = (dailyStats, valueKey) => (
      !dailyStats || !Array.isArray(dailyStats) ? [] : dailyStats.filter(d => d && d.date && d[valueKey] !== undefined && d[valueKey] !== null && !isNaN(Number(d[valueKey])))
        .map(d => ({ date: d.date, value: Number(d[valueKey]) || 0 })).slice(-30)
    );
    return [
      { title: t('stats.netProfit'), value: formatCurrency(netProfitValue, netProfitValue < 0, shopCurrency), trend: netProfitValue >= 0 ? "positive" : "negative", chartData: sanitizeChartData(currentStats.dailyStats, 'totalProfit'), subtitle: netProfitSubtitle },
      { title: t('stats.totalSales'), value: formatCurrency(currentStats.orderRevenue, false, shopCurrency), trend: "positive", chartData: sanitizeChartData(currentStats.dailyStats, 'orderRevenue') },
      // Ad Costs: always show in shopCurrency, and show subtitle if conversion
      { title: t('stats.adCosts'), value: formatCurrency(currentStats.adCosts, true, shopCurrency), trend: "negative", chartData: sanitizeChartData(currentStats.dailyStats, 'adCosts'), subtitle: fbCurrency !== shopCurrency ? `${formatCurrency(adCostsInFbCurrency, true, fbCurrency)} (${formatCurrency(currentStats.adCosts, true, shopCurrency)})` : null },
      { title: t('stats.shippingCancelFees'), value: formatCurrency(currentStats.shippingAndCancelFees, true, shopCurrency), trend: "negative", chartData: sanitizeChartData(currentStats.dailyStats, 'shippingAndCancelFees') },
      { title: t('stats.cogsCosts'), value: formatCurrency(currentStats.cogs, true, shopCurrency), trend: "negative", chartData: sanitizeChartData(currentStats.dailyStats, 'cogs') },
      { title: t('stats.totalShipments'), value: formatNumber(diagnostics.shipmentsFound), trend: "positive", chartData: sanitizeChartData(currentStats.dailyStats, 'shipmentCount') },
    ];
  }, [currentStats, exchangeRate, currentFacebook, t, formatCurrency, formatNumber, diagnostics, shopCurrency]);

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
                      <BlockStack gap="200">
                        <Text variant="headingXl" as="h1">{t('dashboard.mainTitle')}</Text>
                        <Text variant="bodyLg" tone="subdued">{t('dashboard.mainSubtitle')}</Text>
                      </BlockStack>
                      <Text variant="headingLg">📊</Text>
                    </InlineStack>
                  </Box>
                </Bleed>
                <Box paddingInline="400" paddingBlockEnd="400">
                  <form onSubmit={handleFormSubmit}>
                    <Grid columns={{ xs: 1, sm: 6, lg: 12 }} gap="400" alignItems="end">
                      <Grid.Cell columnSpan={{ xs: 1, sm: 3, lg: 4 }}>
                        <Select label={t('dashboard.dateRange')} options={DATE_PRESETS} value={currentDatePreset} onChange={handleDatePresetChange} disabled={isLoading} />
                      </Grid.Cell>
                      <Grid.Cell columnSpan={{ xs: 1, sm: 3, lg: 4 }}>
                        <div ref={facebookDropdownRef}>
                          <Select label={t('dashboard.facebookAccount')} options={[{ label: t('dashboard.selectAccount'), value: "" }, ...(currentFacebook?.accounts || [])]} value={currentFacebook.selectedAccount?.value || ""} onChange={handleAccountChange} disabled={isLoading} />
                        </div>
                      </Grid.Cell>
                      <Grid.Cell columnSpan={{ xs: 1, sm: 4, lg: 2 }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <div style={{ flex: 1 }}>
                            <TextField label={t('dashboard.exchangeRate')} type="number" value={exchangeRate} onChange={handleExchangeRateChange} autoComplete="off" disabled={isLoading} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const params = { preset: currentDatePreset, exchangeRate }; if (currentFacebook.selectedAccount?.value) params.adAccountId = currentFacebook.selectedAccount.value; submitFilters(params); setToastMessage(t('toast.exchangeRateUpdated', { rate: exchangeRate })); setShowToast(true); } }} />
                          </div>
                          <div style={{ alignSelf: 'flex-end', marginBottom: '2px' }}><Button onClick={() => { const params = { preset: currentDatePreset, exchangeRate }; if (currentFacebook.selectedAccount?.value) params.adAccountId = currentFacebook.selectedAccount.value; submitFilters(params); setToastMessage(t('toast.exchangeRateUpdated', { rate: exchangeRate })); setShowToast(true); }} disabled={isLoading}>تطبيق</Button></div>
                        </div>
                      </Grid.Cell>
                      <Grid.Cell columnSpan={{ xs: 1, sm: 2, lg: 2 }}>
                        <Button primary submit loading={isLoading} fullWidth>{isLoading ? t('dashboard.updating') : t('dashboard.updateData')}</Button>
                      </Grid.Cell>
                    </Grid>
                  </form>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>

          {isLoading ? (
            <Layout.Section>
              <Card><BlockStack gap="400" align="center" inlineAlign="center" padding="1200"><Spinner size="large" /><Text variant="headingMd" tone="subdued">{t('dashboard.dataLoadingTitle')}</Text></BlockStack></Card>
            </Layout.Section>
          ) : (
            <>
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
                        <SparkLineChart data={stat.chartData || []} trend={stat.trend} formatValue={(value) => stat.title.includes(t('stats.totalShipments')) ? formatNumber(value) : formatCurrency(value, value < 0)} language={language} t={t} />
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
                            <Badge tone="info">{currentFacebook.selectedAccount.currency || currentFacebook.currency || shopCurrency}</Badge>
                          </InlineStack>
                        </Box>
                      </Bleed>
                      <Box padding="400">
                        <Suspense fallback={<LoadingFallback />}>
                          <LazyFacebookMetrics facebook={currentFacebook} stats={currentStats} formatCurrency={formatCurrency} formatNumber={formatNumber} scrollToFacebookDropdown={scrollToFacebookDropdown} />
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
                      {[{ icon: '📦', label: t('diagnostics.ordersWithCost'), value: formatNumber(diagnostics.ordersWithCost) }, { icon: '💰', label: t('diagnostics.totalCogsValue'), value: formatCurrency(diagnostics.totalCogsValue, true) }, { icon: '🚚', label: t('diagnostics.totalShipments'), value: formatNumber(diagnostics.shipmentsFound) }, { icon: '✅', label: t('diagnostics.shipmentsWithCost'), value: formatNumber(diagnostics.shipmentsWithCostData) }].map(({ icon, label, value }, index) => (<BlockStack key={index} gap="200" align="center" inlineAlign="center"><Text variant="headingLg">{icon}</Text><Text variant="bodyMd" tone="subdued" alignment="center">{label}</Text><Text variant="headingMd" alignment="center">{value}</Text></BlockStack>))}
                    </InlineGrid>
                    <Divider />
                    <InlineGrid columns={{ xs: 2 }} gap="400">
                      {[{ icon: '🚚', label: t('diagnostics.shippingFees'), value: formatCurrency(diagnostics.totalShippingFees, true) }, { icon: '❌', label: t('diagnostics.cancelFees'), value: formatCurrency(diagnostics.totalCancelFees, true) }].map(({ icon, label, value }, index) => (<BlockStack key={index} gap="200" align="center" inlineAlign="center"><Text variant="headingLg">{icon}</Text><Text variant="bodyMd" tone="subdued" alignment="center">{label}</Text><Text variant="headingMd" alignment="center">{value}</Text></BlockStack>))}
                    </InlineGrid>
                  </BlockStack>
                </Card>
              </Layout.Section>

              <Layout.Section>
                <Card>
                  <BlockStack gap="500" padding="400">
                    <Text variant="headingLg" as="h2">{t('charts.performanceAnalysis')}</Text>
                    <Suspense fallback={<LoadingFallback />}><ErrorBoundary fallback={<Banner title="خطأ في تحميل الرسوم البيانية" tone="critical"><Text>حدث خطأ أثناء تحميل الرسوم البيانية. يرجى تحديث الصفحة والمحاولة مرة أخرى.</Text></Banner>}><LazyChartComponents profitDistributionData={profitDistributionData} performanceMetricsData={performanceMetricsData} /></ErrorBoundary></Suspense>
                  </BlockStack>
                </Card>
              </Layout.Section>

              {topSellingProduct && mostProfitableProduct && (
                <Layout.Section>
                  <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                    {[{ title: t('products.bestSelling'), product: topSellingProduct, icon: '📈', stat: `${t('products.salesCount')} ${formatNumber(topSellingProduct.quantity)}` }, { title: t('products.mostProfitable'), product: mostProfitableProduct, icon: '🏆', stat: `${t('products.netProfit')} ${formatCurrency(mostProfitableProduct.profit)}` }].map(({ title, product, icon, stat }, index) => (
                      <Card key={index}><BlockStack gap="400" padding="400"><InlineStack align="space-between" blockAlign="start"><Text variant="headingMd" as="h3">{title}</Text><Text variant="headingLg">{icon}</Text></InlineStack><Text variant="headingLg" style={{ wordBreak: 'break-word', textAlign: 'center' }}>{product.title || t('products.unavailable')}</Text><Box background="bg-surface-success-subdued" borderRadius="200" padding="300" style={{ width: '100%', textAlign: 'center', marginTop: 'auto' }}><Text variant="bodyLg" alignment="center" fontWeight="semibold" style={{ wordBreak: 'break-word' }}>{stat}</Text></Box></BlockStack></Card>
                    ))}
                  </InlineGrid>
                </Layout.Section>
              )}

              {currentFacebook?.selectedAccount && (
                <Layout.Section>
                  <CalloutCard title={t('roasCalculation.title')} illustration="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg" primaryAction={{ content: t('roasCalculation.learnMore'), url: 'https://www.shopify.com/blog/roas', external: "true" }}>
                    <BlockStack gap="400">
                      <Text variant="bodyMd">{t('roasCalculation.description')}</Text>
                      <Card><BlockStack gap="400" padding="400"><Text variant="bodyMd" fontWeight="bold">{t('roasCalculation.formula')}</Text><Box background="bg-surface-secondary" padding="300" borderRadius="200"><BlockStack gap="200"><Text as="p" variant="bodyMd"><code>{t('roasCalculation.netRevenue')}</code></Text><Text as="p" variant="bodyMd"><code>{t('roasCalculation.netRoas')}</code></Text></BlockStack></Box><Divider /><Text variant="bodyMd" fontWeight="bold">{t('roasCalculation.calculation')}</Text>{currentStats.orderRevenue > 0 && currentStats.adCosts > 0 ? (<BlockStack gap="300"><Text>{t('roasCalculation.step1')} {formatCurrency(currentStats.adRevenue, true)} - ({formatCurrency(currentStats.adRevenue, true)} ÷ {formatCurrency(currentStats.orderRevenue, true)} × {formatCurrency(currentStats.cogs, true)}) = <strong>{formatCurrency(currentStats.adRevenue - (currentStats.adRevenue / currentStats.orderRevenue * currentStats.cogs), true)}</strong></Text><Text>{t('roasCalculation.step2')} {formatCurrency(currentStats.adRevenue - (currentStats.adRevenue / currentStats.orderRevenue * currentStats.cogs), true)} ÷ {formatCurrency(currentStats.adCosts, true)} = <strong>{currentStats.effectiveROAS}x</strong></Text><Divider /><InlineStack align="space-between" blockAlign="center"><Text variant="headingMd">{t('roasCalculation.finalResult')}</Text><Badge tone="success" size="large">{currentStats.effectiveROAS}x</Badge></InlineStack></BlockStack>) : (<Text tone="subdued">{t('roasCalculation.insufficientData')}</Text>)}</BlockStack></Card>
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