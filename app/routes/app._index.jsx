

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
import { Suspense } from "react";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { facebook } from "../services/facebook.server.js";
import { zrexpress } from "../services/zrexpress.server.js";
import {
  LazyChartComponents,
  LazyDashboardPanel,
  LazyDashboardStats,
  LazyFacebookMetrics,
  LoadingFallback
} from "../components/LazyComponents";
import ErrorBoundary from "../components/ErrorBoundary";
import { useLanguage } from "../utils/i18n/LanguageContext.jsx";

// Simple SparkLine Chart Component using Canvas
const SparkLineChart = ({ data, trend, formatValue, language, t, isRTL }) => {
  const canvasRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(-1);

  // Debug logging
  useEffect(() => {
    // console.log('SparkLineChart received data:', data);
  }, [data]);

  // Skip rendering if no data or empty data
  if (!data || data.length === 0) {
    return (
      <div style={{ height: '70px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="bodySm" tone="subdued">{t?.('stats.insufficientData') || 'بيانات غير كافية'}</Text>
      </div>
    );
  }

  // Sanitize data
  const sanitizedData = data
    .filter(d => d && d.value !== undefined && d.value !== null && !isNaN(Number(d.value)))
    .map(d => ({
      ...d,
      value: Number(d.value) || 0
    }));

  if (sanitizedData.length === 0) {
    return (
      <div style={{ height: '70px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="bodySm" tone="subdued">بيانات غير كافية</Text>
      </div>
    );
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (sanitizedData.length < 2) {
      // Draw a simple dot for single data point
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      ctx.fillStyle = trend === 'positive' ? '#008060' : '#DC3545';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
      ctx.fill();
      return;
    }

    const values = sanitizedData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;

    // Handle case where all values are the same (range = 0)
    const effectiveRange = range === 0 ? Math.max(1, Math.abs(maxValue) * 0.1) : range;
    const centerValue = range === 0 ? maxValue : minValue;

    const padding = 8;
    const width = rect.width - padding * 2;
    const height = rect.height - padding * 2;

    // Create path
    ctx.beginPath();
    ctx.strokeStyle = trend === 'positive' ? '#008060' : '#DC3545';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    sanitizedData.forEach((point, index) => {
      const x = padding + (index / (sanitizedData.length - 1)) * width;
      let y;

      if (range === 0) {
        // All values are the same, draw a horizontal line in the middle
        y = padding + height / 2;
      } else {
        y = padding + height - ((point.value - minValue) / range) * height;
      }

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Fill area under curve
    if (sanitizedData.length > 1) {
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = trend === 'positive' ? '#008060' : '#DC3545';
      ctx.lineTo(padding + width, padding + height);
      ctx.lineTo(padding, padding + height);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Draw hover point
    if (isHovered && hoverIndex >= 0 && hoverIndex < sanitizedData.length) {
      const point = sanitizedData[hoverIndex];
      const x = padding + (hoverIndex / (sanitizedData.length - 1)) * width;
      let y;

      if (range === 0) {
        y = padding + height / 2;
      } else {
        y = padding + height - ((point.value - minValue) / range) * height;
      }

      ctx.fillStyle = trend === 'positive' ? '#008060' : '#DC3545';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

  }, [sanitizedData, trend, isHovered, hoverIndex]);

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

  const getTooltipValue = () => {
    if (hoverIndex >= 0 && hoverIndex < sanitizedData.length) {
      const value = sanitizedData[hoverIndex].value;
      return formatValue ? formatValue(value) : new Intl.NumberFormat(language === 'ar' ? 'ar-DZ' : 'en-US').format(value);
    }
    return '';
  };

  return (
    <div style={{ height: '70px', width: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
          display: 'block'
        }}
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
  end.setHours(23, 59, 59, 999); // Make sure end includes the full day
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
  const url = new URL(request.url);
  const preset = url.searchParams.get("preset") || "last_30_days";
  const exchangeRateParam = url.searchParams.get("exchangeRate") || "1";

  try {
    const { admin, session } = await authenticate.admin(request);

    // ✅ FIX: Fetch shop currency from Shopify Admin API
    const shopCurrencyResponse = await admin.graphql(
      `#graphql
      query getShopCurrency {
        shop {
          currencyCode
        }
      }`
    );
    const shopCurrencyData = await shopCurrencyResponse.json();
    const shopCurrency = shopCurrencyData.data.shop.currencyCode || 'DZD'; // Fallback to DZD

    const exchangeRate = parseFloat(exchangeRateParam);

    if (isNaN(exchangeRate)) return json({ error: "Invalid exchange rate" }, { status: 400 });

    const { start, end } = getPresetDates(preset);
    let stats = { ...DEFAULT_STATS, dailyStats: [] };
    let facebookData = { ...DEFAULT_FACEBOOK_DATA };
    let topSellingProduct = null;
    let mostProfitableProduct = null;

    if (!prisma) {
      console.error('❌ Prisma client is not available');
      throw new Error('Database connection not available');
    }

    // Fetch all necessary data in parallel for better performance
    const [fbCredentials, allShipments, orderCOGSData, zrExpressProfit, paidOrders] = await Promise.all([
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
      prisma.OrderCOGS.findMany({
        where: {
          shop: session.shop,
          createdAt: { gte: start, lte: end }
        },
        include: {
          items: true
        }
      }),
      zrexpress.getNetProfit(session.shop, { start, end }),
      admin.rest.resources.Order.all({
        session: session,
        status: 'any',
        financial_status: 'paid',
        created_at_min: start.toISOString(),
        created_at_max: end.toISOString(),
      }),
    ]);

    const paidOrderIds = new Set(paidOrders.data.map(o => o.id.toString()));

    const dailyData = {};
    const dateCursor = new Date(start);
    while (dateCursor <= end) {
      dailyData[dateCursor.toISOString().split('T')[0]] = {
        orderRevenue: 0, cogs: 0, shippingAndCancelFees: 0, adCosts: 0,
        shipmentCount: 0, orderCount: 0
      };
      dateCursor.setDate(dateCursor.getDate() + 1);
    }

    const today = new Date().toISOString().split('T')[0];
    if (!dailyData[today]) {
      dailyData[today] = {
        orderRevenue: 0, cogs: 0, shippingAndCancelFees: 0, adCosts: 0,
        shipmentCount: 0, orderCount: 0
      };
    }

    for (const shipment of allShipments) {
      const dateString = shipment.updatedAt.toISOString().split('T')[0];
      if (dailyData[dateString]) {
        dailyData[dateString].shipmentCount += 1;

        if (shipment.status === "Livrée" ) {
          dailyData[dateString].orderRevenue += parseFloat(shipment.total || 0);
          dailyData[dateString].shippingAndCancelFees += parseFloat(shipment.deliveryFee || 0);
          if (shipment.totalCost) dailyData[dateString].cogs += parseFloat(shipment.totalCost);
        } else if (shipment.status?.includes("Retour") || shipment.status === "Annulé") {
          dailyData[dateString].shippingAndCancelFees += parseFloat(shipment.cancelFee || 0);
        }
      }
    }

    for (const order of orderCOGSData) {
      const dateString = order.createdAt.toISOString().split('T')[0];
      if (dailyData[dateString]) {
        dailyData[dateString].orderCount += 1;

        const orderTotalCost = parseFloat(order.totalCost || 0);

        const matchingShipment = allShipments.find(shipment =>
          shipment.orderId === order.orderId &&
          (shipment.status === "Livrée" )
        );

        if (!matchingShipment) {
          dailyData[dateString].orderRevenue += parseFloat(order.totalRevenue || 0);
          dailyData[dateString].cogs += orderTotalCost;
        } else {
          if (matchingShipment.totalCost) {
            const shipmentDateString = matchingShipment.updatedAt.toISOString().split('T')[0];
            if (dailyData[shipmentDateString]) {
              dailyData[shipmentDateString].cogs -= parseFloat(matchingShipment.totalCost);
            }
          }
          dailyData[dateString].cogs += orderTotalCost;
        }
      }
    }

    if (orderCOGSData.length > 0) {
      const productSales = new Map();
      const productProfits = new Map();

      for (const order of orderCOGSData) {
        for (const item of order.items) {
          const currentSales = productSales.get(item.productId) || {
            id: item.productId, title: item.title, quantity: 0, revenue: 0
          };
          currentSales.quantity += item.quantity;
          currentSales.revenue += item.totalRevenue;
          productSales.set(item.productId, currentSales);

          const currentProfits = productProfits.get(item.productId) || {
            id: item.productId, title: item.title, profit: 0, revenue: 0,
            totalCost: 0, quantity: 0
          };
          const itemRevenue = parseFloat(item.totalRevenue || 0);
          const itemCost = parseFloat(item.totalCost || 0);
          const itemQuantity = parseInt(item.quantity || 1);
          const itemProfit = itemRevenue - itemCost;

          currentProfits.profit += itemProfit;
          currentProfits.revenue += itemRevenue;
          currentProfits.totalCost += itemCost;
          currentProfits.quantity += itemQuantity;
          productProfits.set(item.productId, currentProfits);
        }
      }

      const sortedBySales = Array.from(productSales.values()).sort((a, b) => b.quantity - a.quantity);

      const sortedByProfit = Array.from(productProfits.values())
        .filter(product => product.quantity > 0)
        .map(product => ({
          ...product,
          profitPerUnit: product.profit / product.quantity,
          margin: product.revenue > 0 ? ((product.profit / product.revenue) * 100).toFixed(2) : '0.00',
          hasRealData: product.revenue > 0 || product.totalCost > 0
        }))
        .sort((a, b) => {
          if (a.hasRealData !== b.hasRealData) return a.hasRealData ? -1 : 1;
          const profitDiff = b.profit - a.profit;
          if (Math.abs(profitDiff) > 0.01) return profitDiff;
          return b.profitPerUnit - a.profitPerUnit;
        });

      if (sortedBySales.length > 0) {
        topSellingProduct = {
          ...sortedBySales[0],
          profit: productProfits.get(sortedBySales[0].id)?.profit || 0
        };
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

                if (fbData) {
                  facebookData = {
                    ...facebookData, selectedAccount,
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
        date, ...day, totalProfit: dailyProfit,
        shipmentCount: day.shipmentCount, orderCount: day.orderCount
      });
      stats.orderRevenue += day.orderRevenue;
      stats.cogs += day.cogs;
      stats.shippingAndCancelFees += day.shippingAndCancelFees;
    });

    const totalDeliveryFees = allShipments.reduce((sum, s) =>
      sum + ((s.status === "Livrée" && paidOrderIds.has(s.orderId)) ? parseFloat(s.deliveryFee || 0) : 0), 0);

    const totalCancelFees = allShipments.reduce((sum, s) =>
      sum + (s.status?.includes("Retour") || s.status === "Annulé" ? parseFloat(s.cancelFee || 0) : 0), 0);

    stats.shippingAndCancelFees = totalDeliveryFees + totalCancelFees;
    stats.totalProfit = stats.orderRevenue - stats.cogs - stats.shippingAndCancelFees - stats.adCosts;
    stats.mer = (stats.adCosts > 0) ? Number((stats.orderRevenue / stats.adCosts).toFixed(2)) : 0;
    stats.effectiveROAS = (stats.adCosts > 0 && stats.orderRevenue > 0) ? Number(((stats.adRevenue - (stats.adRevenue / stats.orderRevenue * stats.cogs)) / stats.adCosts).toFixed(2)) : 0;

    const diagnostics = {
      ordersWithCost: orderCOGSData.length,
      totalOrderItems: orderCOGSData.reduce((sum, order) => sum + order.items.length, 0),
      totalCogsFromOrderItems: orderCOGSData.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + parseFloat(item.totalCost || 0), 0), 0),
      totalCogsFromOrders: orderCOGSData.reduce((sum, order) => sum + parseFloat(order.totalCost || 0), 0),
      totalCogsValue: stats.cogs,
      shipmentsFound: allShipments.length,
      shipmentsWithCostData: allShipments.filter(s => s.totalCost).length,
      totalShippingFees: totalDeliveryFees,
      totalCancelFees: totalCancelFees,
      dateRange: { start: start.toISOString(), end: end.toISOString() }
    };

    const zrExpressProfitData = zrExpressProfit.success ? zrExpressProfit.data : null;

    return json({
      stats,
      facebook: facebookData,
      datePreset: preset,
      exchangeRate: exchangeRateParam,
      topSellingProduct,
      mostProfitableProduct,
      diagnostics,
      zrExpressProfit: zrExpressProfitData,
      shopCurrency, // ✅ FIX: Pass shop currency to the component
    });
  } catch (error) {
    console.error('❌ Loader error:', error);
    return json({
      error: error.message,
      stats: { ...DEFAULT_STATS, dailyStats: [] },
      facebook: { ...DEFAULT_FACEBOOK_DATA },
      datePreset: preset || 'last_30_days',
      exchangeRate: exchangeRateParam || '1',
      topSellingProduct: null,
      mostProfitableProduct: null,
      diagnostics: null,
      zrExpressProfit: null,
      shopCurrency: 'DZD', // ✅ FIX: Provide a fallback on error
    }, { status: 500 });
  }
};

export default function Index() {
  const initialData = useLoaderData() || {};
  const {
    stats: iStats, facebook: iFb, datePreset: iPreset, exchangeRate: iExRate,
    topSellingProduct: iTop, mostProfitableProduct: iMost, diagnostics: iDiag,
    zrExpressProfit: iZrProfit, shopCurrency: iShopCurrency // ✅ FIX: Get shop currency from loader data
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
  const [shopCurrency, setShopCurrency] = useState(iShopCurrency || 'DZD'); // ✅ FIX: Manage shop currency in state

  const { t, language, isRTL } = useLanguage();

  const DATE_PRESETS = useMemo(() => {
    return DATE_PRESETS_CONFIG.map(preset => ({
      value: preset.value,
      label: t(preset.translationKey)
    }));
  }, [t]);

  // ✅ FIX: Updated formatCurrency to use dynamic shopCurrency and be more robust
  const formatCurrency = useCallback((amount, isNegative = false, currency = shopCurrency) => {
    if (amount === undefined || amount === null || isNaN(Number(amount))) return "-";
    const value = Math.abs(Number(amount));
    const sign = isNegative ? '-' : '';
    const locale = language === 'ar' ? 'ar-SA' : 'en-US'; // Use a standard locale for broad compatibility

    try {
      const formattedValue = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
      return `${sign}${formattedValue}`;
    } catch (e) {
      console.warn(`Could not format currency '${currency}'. Using fallback.`, e);
      return `${sign}${value.toFixed(2)} ${currency}`;
    }
  }, [shopCurrency, language]); // ✅ FIX: Added dependencies

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
      if (fetcher.data.shopCurrency) setShopCurrency(fetcher.data.shopCurrency); // ✅ FIX: Update shop currency on fetch

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
    if (currentFacebook.selectedAccount?.value) {
      params.adAccountId = currentFacebook.selectedAccount.value;
    }
    submitFilters(params);

    setToastMessage(t('toast.updatingPeriod', { period: presetLabel }));
    setShowToast(true);
  }, [currentDatePreset, exchangeRate, currentFacebook.selectedAccount, submitFilters, t, DATE_PRESETS]);

  const handleExchangeRateChange = useCallback((value) => {
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
    <Toast content={toastMessage} onDismiss={() => setShowToast(false)} duration={4000} error={toastMessage.includes("خطأ")} />
  ) : null;

  // ✅ FIX: Replaced the statCardsData generation with a more robust version that uses shopCurrency
  const statCardsData = useMemo(() => {
    const netProfitValue = currentStats.totalProfit;

    // ✅ FIX: Compare with dynamic shopCurrency instead of hardcoded 'DZD'
    const netProfitSubtitle = `${formatCurrency(currentStats.orderRevenue)} الإيرادات - ${formatCurrency(currentStats.cogs + currentStats.shippingAndCancelFees + currentStats.adCosts, true)} التكاليف`;

    const sanitizeChartData = (dailyStats, valueKey) => {
      if (!dailyStats || !Array.isArray(dailyStats)) return [];

      return dailyStats
        .filter(d => d && d.date && d[valueKey] !== undefined && d[valueKey] !== null && !isNaN(Number(d[valueKey])))
        .map(d => ({ date: d.date, value: Number(d[valueKey]) || 0 }))
        .slice(-30); // Keep only last 30 days for performance
    };

    return [
      {
        title: t('stats.netProfit'),
        value: formatCurrency(netProfitValue, netProfitValue < 0),
        trend: netProfitValue >= 0 ? "positive" : "negative",
        chartData: sanitizeChartData(currentStats.dailyStats, 'totalProfit'),
        subtitle: netProfitSubtitle
      },
      {
        title: t('stats.totalSales'),
        value: formatCurrency(currentStats.orderRevenue),
        trend: "positive",
        chartData: sanitizeChartData(currentStats.dailyStats, 'orderRevenue')
      },
      {
        title: t('stats.adCosts'),
        value: formatCurrency(currentStats.adCosts, true),
        trend: "negative",
        chartData: sanitizeChartData(currentStats.dailyStats, 'adCosts'),
        // ✅ FIX: Compare with dynamic shopCurrency instead of hardcoded 'DZD' and removed redundant currency code
        subtitle: currentFacebook.currency !== shopCurrency ? `${formatCurrency(currentStats.adCosts / parseFloat(exchangeRate), true, currentFacebook.currency)}` : null
      },
      {
        title: t('stats.shippingCancelFees'),
        value: formatCurrency(currentStats.shippingAndCancelFees, true),
        trend: "negative",
        chartData: sanitizeChartData(currentStats.dailyStats, 'shippingAndCancelFees')
      },
      {
        title: t('stats.cogsCosts'),
        value: formatCurrency(currentStats.cogs, true), // ✅ FIX: COGS is a cost, should be negative
        trend: "negative",
        chartData: sanitizeChartData(currentStats.dailyStats, 'cogs')
      },
      {
        title: t('stats.totalShipments'),
        value: formatNumber(diagnostics.shipmentsFound),
        trend: "positive",
        chartData: sanitizeChartData(currentStats.dailyStats, 'shipmentCount')
      },
    ];
  }, [currentStats, exchangeRate, currentFacebook.currency, zrExpressProfit, t, formatCurrency, formatNumber, diagnostics, shopCurrency]); // ✅ FIX: Add shopCurrency to dependency array

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
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const params = { preset: currentDatePreset, exchangeRate };
                                  if (currentFacebook.selectedAccount?.value) {
                                    params.adAccountId = currentFacebook.selectedAccount.value;
                                  }
                                  submitFilters(params);
                                  setToastMessage(t('toast.exchangeRateUpdated', { rate: exchangeRate }));
                                  setShowToast(true);
                                }
                              }}
                            />
                          </div>
                          <div style={{ alignSelf: 'flex-end', marginBottom: '2px' }}>
                            <Button
                              onClick={() => {
                                const params = { preset: currentDatePreset, exchangeRate };
                                if (currentFacebook.selectedAccount?.value) {
                                  params.adAccountId = currentFacebook.selectedAccount.value;
                                }
                                submitFilters(params);
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
                        <Button primary submit loading={isLoading} fullWidth>
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
                          data={stat.chartData || []}
                          trend={stat.trend}
                          formatValue={(value) => stat.title.includes(t('stats.totalShipments')) ? formatNumber(value) : formatCurrency(value, value < 0)}
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
                        <Suspense fallback={<LoadingFallback />}>
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
                        { icon: '💰', label: t('diagnostics.totalCogsValue'), value: formatCurrency(diagnostics.totalCogsValue, true) },
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
                        { icon: '🚚', label: t('diagnostics.shippingFees'), value: formatCurrency(diagnostics.totalShippingFees, true) },
                        { icon: '❌', label: t('diagnostics.cancelFees'), value: formatCurrency(diagnostics.totalCancelFees, true) }
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
                    <Suspense fallback={<LoadingFallback />}>
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
                    primaryAction={{ content: t('roasCalculation.learnMore'), url: 'https://www.shopify.com/blog/roas', external: true }}
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
