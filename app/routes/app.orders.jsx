import { useState, useEffect, useCallback, useMemo, Suspense, lazy, useRef } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useSubmit, useNavigation, useSearchParams, useFetcher, useRevalidator } from "@remix-run/react";
import { 
  Page, Text, Card, Button, Modal, TextField, Select, 
  Toast, Frame, FormLayout, Pagination, Banner, 
  Badge, ChoiceList, DatePicker, Loading, Checkbox,
  Form, Icon, Popover, Tooltip, Layout, Spinner, Box
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { ZRExpressService } from "../services/zrexpress.server";
import { prisma } from "../db.server";
import { useLanguage } from "../utils/i18n/LanguageContext.jsx";
import communesData from "../../public/data/communes.json";
import { generateMeta, generateSchemaData, preloadResources } from "../utils/seo.js";
import { formatCurrency, formatNumber, formatPercentage, formatDate } from "../utils/formatters.js";
import { LoadingFallback } from "../components/LazyComponents.jsx";
import { initPerformanceMonitoring, markPerformance, measurePerformance, PERF_MARKS } from "../utils/performance.js";

// Add requestIdleCallback polyfill for browsers that don't support it
const requestIdleCallback = 
  typeof window !== 'undefined' 
    ? window.requestIdleCallback || 
      ((cb) => {
        const start = Date.now();
        return setTimeout(() => {
          cb({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
          });
        }, 1);
      }) 
    : (cb) => setTimeout(cb, 1);

// Lazy load components with prefetching hints
const LazyDataTable = lazy(() => {
  markPerformance('datatable-import-start');
  return import("@shopify/polaris").then(module => {
    markPerformance('datatable-import-end');
    return { default: module.DataTable };
  });
});

const LazyVirtualizedDataTable = lazy(() => {
  markPerformance('virtual-table-import-start');
  return import("../components/VirtualizedDataTable.jsx").then(module => {
    markPerformance('virtual-table-import-end');
    return { default: module.default };
  });
});

const LazyStatCard = lazy(() => {
  markPerformance('statcard-import-start');
  return import("../components/StatCard.jsx").then(module => {
    markPerformance('statcard-import-end');
    return { default: module.default };
  });
});

// Define our own Stack components to replace Shopify Polaris ones
const BlockStack = ({ children, gap = "0", ...props }) => {
  const gapSizes = {
    "0": "0",
    "100": "4px",
    "200": "8px",
    "300": "12px",
    "400": "16px",
    "500": "20px",
    "800": "32px",
  };
  
  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: gapSizes[gap] || gap, 
        ...props.style 
      }}
      {...props}
    >
      {children}
    </div>
  );
};

const InlineStack = ({ children, gap = "0", align = "start", blockAlign = "center", wrap = true, ...props }) => {
  const gapSizes = {
    "0": "0",
    "100": "4px",
    "200": "8px",
    "300": "12px",
    "400": "16px",
    "500": "20px",
    "800": "32px",
  };
  
  const alignments = {
    "start": "flex-start",
    "end": "flex-end",
    "center": "center",
    "space-between": "space-between",
    "space-around": "space-around",
    "space-evenly": "space-evenly",
  };
  
  const blockAlignments = {
    "start": "flex-start",
    "end": "flex-end",
    "center": "center",
    "baseline": "baseline",
    "stretch": "stretch",
  };
  
  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'row', 
        gap: gapSizes[gap] || gap,
        justifyContent: alignments[align] || align,
        alignItems: blockAlignments[blockAlign] || blockAlign,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        ...props.style 
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// Check if Layout has Section property and add it if not
if (!Layout.Section) {
  Layout.Section = ({ children, ...props }) => (
    <div style={{ marginBottom: '20px' }} {...props}>
      {children}
    </div>
  );
}

// Add metadata for SEO
export const meta = () => {
  return generateMeta({
    title: "Orders & Shipments - TrackProfit",
    description: "Track your Shopify store orders, manage shipments, and analyze profit margins with TrackProfit",
    keywords: "shopify orders, shipment tracking, order management, profit tracking, zrexpress integration"
  });
};

// Add preloaded resources
export const links = () => {
  return preloadResources([
    { rel: "preconnect", href: "https://cdn.shopify.com" },
    { rel: "dns-prefetch", href: "https://cdn.shopify.com" },
    { rel: "preload", href: "/data/communes.json", as: "fetch", crossOrigin: "anonymous" },
    { rel: "preload", href: "/data/wilayas.json", as: "fetch", crossOrigin: "anonymous" }
  ]);
};

// Define server-side cache TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// LOADER FUNCTION
export const loader = async ({ request }) => {
  // Add cache control headers for CDN caching
  const headers = new Headers();
  headers.append('Cache-Control', 'public, max-age=60, s-maxage=300');
  headers.append('Vary', 'Accept-Encoding');
  
  
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "true";
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  
  // Cache key based on shop and pagination
  const cacheKey = `orders-${session.shop}-${page}-${pageSize}`;
  
  try {
    // Try to get data from cache if not forcing refresh
    if (!forceRefresh) {
      try {
        // Make sure prisma is available before attempting to use it
        if (prisma && typeof prisma.appCache?.findUnique === 'function') {
          const cachedData = await prisma.appCache.findUnique({
            where: { key: cacheKey }
          });
          
          if (cachedData && (Date.now() - cachedData.updatedAt.getTime() < CACHE_TTL)) {
            console.log('Using cached orders data from', new Date(cachedData.updatedAt).toISOString());
            const parsedData = JSON.parse(cachedData.value);
            return json({
              ...parsedData,
              timestamp: Date.now(),
              isFromCache: true
            });
          }
        } else {
          console.warn('Prisma client or appCache model not available, skipping cache check');
        }
      } catch (cacheError) {
        console.error('Error accessing cache:', cacheError);
        // Continue with fetching fresh data
      }
    }
    
    console.log('Cache miss or forced refresh, fetching fresh data');
    
    // Get ZRExpress credentials
    let cities = [];
    try {
      const credentials = await prisma.ZRExpressCredential.findUnique({
        where: { shop: session.shop }
      });

      console.log('ZRExpress Credentials:', credentials ? 'Found' : 'Not Found');

      // Get cities from ZRExpress if we have credentials
      if (credentials) {
        const zrexpress = new ZRExpressService();
        try {
          const tarificationData = await zrexpress.getTarification(
            credentials.token,
            credentials.key
          );
          
          cities = tarificationData
            .filter(item => item.Domicile !== "0" || item.Stopdesk !== "0")
            .map(item => ({
              label: item.Wilaya,
              value: item.IDWilaya.toString()
            }))
            .sort((a, b) => parseInt(a.value) - parseInt(b.value));

          console.log('Cities loaded:', cities.length);
        } catch (zrError) {
          console.error('ZRExpress Tarification Error:', zrError);
        }
      }
    } catch (dbError) {
      console.error('Database Error:', dbError);
    }

    // Get orders through GraphQL with pagination - only fetch the current page
    console.log(`Fetching orders page ${page} with size ${pageSize} via GraphQL...`);
    
    const query = `#graphql
      query getOrders($first: Int!, $after: String) {
        orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              name
              createdAt
              displayFinancialStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              note
              lineItems(first: 20) {
                edges {
                  node {
                    id
                    title
                    quantity
                    variant {
                      id
                      inventoryItem {
                        id
                        unitCost {
                          amount
                          currencyCode
                        }
                      }
                    }
                    product {
                      id
                      title
                    }
                    originalUnitPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    originalTotalSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
            cursor
          }
          pageInfo {
            hasNextPage
            endCursor
            hasPreviousPage
            startCursor
          }
        }
      }
    `;

    const response = await admin.graphql(query, {
      variables: {
        first: pageSize,
        after: null // We'll implement cursor-based pagination in the component
      }
    });

    const responseJson = await response.json();

    if (responseJson.errors) {
      console.error("GraphQL Errors:", responseJson.errors);
      throw new Error(responseJson.errors[0].message);
    }

    const orders = responseJson.data.orders;
    const orderEdges = orders.edges;
    
    console.log(`Fetched ${orderEdges.length} orders, getting shipment status...`);

    // Get all shipments for these orders efficiently in a single query
    const orderIds = orderEdges.map(({ node }) => node.id.split('/').pop());
    const shipments = await prisma.shipment.findMany({
      where: {
        shop: session.shop,
        orderId: { in: orderIds }
      },
      select: {
        orderId: true,
        status: true,
        statusId: true,
        tracking: true
      }
    });

    const shipmentsMap = shipments.reduce((acc, shipment) => {
      acc[shipment.orderId] = shipment;
      return acc;
    }, {});

    // Get order additional details in parallel (much faster than sequential)
    const orderDetails = await Promise.all(
      orderEdges.map(async ({ node }) => {
        const orderId = node.id.split('/').pop();
        const shipment = shipmentsMap[orderId];
        
        try {
          const orderResponse = await fetch(
            `https://${session.shop}/admin/api/2024-01/orders/${orderId}.json`,
            {
              method: 'GET',
              headers: {
                'X-Shopify-Access-Token': session.accessToken,
                'Content-Type': 'application/json'
              }
            }
          );

          if (!orderResponse.ok) {
            console.error(`Order ${orderId} fetch failed:`, orderResponse.status);
            return {
              ...node,
              note_attributes: [],
              shipping_address: {},
              shipment_status: shipment ? shipment.status : null,
              tracking_info: shipment ? shipment.tracking : null
            };
          }

          const orderData = await orderResponse.json();
          return {
            ...node,
            note_attributes: orderData.order.note_attributes || [],
            shipping_address: orderData.order.shipping_address || {},
            shipment_status: shipment ? shipment.status : null,
            tracking_info: shipment ? shipment.tracking : null
          };
        } catch (error) {
          console.error(`Failed to fetch details for order ${node.name}:`, error);
          return {
            ...node,
            note_attributes: [],
            shipping_address: {},
            shipment_status: shipment ? shipment.status : null,
            tracking_info: shipment ? shipment.tracking : null
          };
        }
      })
    );

    console.log('All order details fetched successfully');

    // Shopify API doesn't provide a direct count, so we'll use a default value for pagination
    const totalCount = 250; // Default to a reasonable number

    // Prepare result data
    const resultData = {
      orders: {
        edges: orderDetails.map(order => ({ node: order })),
        pageInfo: orders.pageInfo
      },
      totalCount,
      cities,
      error: null,
      shop: session.shop,
      timestamp: Date.now(),
      pageSize,
      currentPage: page
    };

    // Store in cache for future requests
    try {
      // Make sure prisma is available and the appCache model exists
      if (prisma && typeof prisma.appCache?.upsert === 'function') {
        await prisma.appCache.upsert({
          where: { key: cacheKey },
          update: { 
            value: JSON.stringify(resultData),
            updatedAt: new Date()
          },
          create: {
            key: cacheKey,
            value: JSON.stringify(resultData),
            updatedAt: new Date()
          }
        });
        console.log('Orders data cached successfully');
      } else {
        console.warn('Prisma client or appCache model not available, skipping cache update');
      }
      console.log('Orders data cached successfully');
    } catch (cacheError) {
      console.error('Failed to cache orders data:', cacheError);
      // Don't fail the request if caching fails
    }

    return json(resultData, { headers });

  } catch (error) {
    console.error("Orders Query Error:", error);
    return json({
      orders: { edges: [] },
      cities: [],
      error: error.message,
      shop: session.shop,
      timestamp: Date.now(),
      pageSize,
      currentPage: page
    }, { status: 500 });
  }
};

// ACTION FUNCTION
export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const { _action, ...shipmentValues } = Object.fromEntries(formData);

  console.log('Action triggered:', _action);
  console.log('Shipment values received:', shipmentValues);

  if (_action === 'createShipment') {
    try {
      // Validate required fields
      const requiredFields = ['Client', 'MobileA', 'Adresse', 'IDWilaya', 'Commune', 'Total', 'TProduit', 'Confrimee'];
      const missingFields = requiredFields.filter(field => !shipmentValues[field]);
      
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        return json({ 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        }, { status: 400 });
      }

      // Prepare shipment data with cost information
      const totalCost = parseFloat(shipmentValues.totalCost || "0");
      const totalRevenue = parseFloat(shipmentValues.Total || "0");
      const totalProfit = totalRevenue - totalCost;
      
      const enhancedShipmentValues = {
        ...shipmentValues,
        totalCost: totalCost.toString(),
        totalRevenue: totalRevenue.toString(),
        totalProfit: totalProfit.toString()
      };
      
      console.log('Enhanced shipment values with COGS:', enhancedShipmentValues);

      const credentials = await prisma.ZRExpressCredential.findUnique({
        where: { shop: session.shop },
      });

      if (!credentials) {
        console.error('ZRExpress credentials not found for shop:', session.shop);
        return json({ success: false, error: 'ZRExpress credentials not found.' }, { status: 400 });
      }

      const zrexpress = new ZRExpressService();
      console.log('Calling ZRExpress addColis with token, key, and values');
      
      // Create ZRExpress shipment
      const result = await zrexpress.addColis(
        credentials.token,
        credentials.key,
        enhancedShipmentValues,
        session
      );

      console.log('ZRExpress addColis result:', result);

      if (!result.success) {
        console.error('Failed to create shipment:', result.error);
        return json({ success: false, error: result.error || t('errors.shipmentCreation', { error: 'Unknown error' }) }, { status: 500 });
      }
      
      console.log('Shipment created successfully with ID:', result.shipment?.id);
      
      if (result.shipment?.id && shipmentValues.orderId) {
        // Save order COGS information separately if we have a Shopify order ID
        try {
          const orderId = shipmentValues.orderId;
          const orderName = shipmentValues.TProduit;
          const totalCost = parseFloat(shipmentValues.totalCost || 0);
          const totalRevenue = parseFloat(shipmentValues.Total || 0);
          const profit = totalRevenue - totalCost;
          
          // Parse line items if they were passed
          let lineItems = [];
          if (shipmentValues.lineItems) {
            try {
              lineItems = JSON.parse(shipmentValues.lineItems);
            } catch (err) {
              console.error('Failed to parse line items:', err);
            }
          }
          
          // Save the COGS information to the database
          await prisma.OrderCOGS.upsert({
            where: {
              shop_orderId: {
                shop: session.shop,
                orderId: orderId
              }
            },
            update: {
              totalCost,
              totalRevenue,
              profit,
              // Add items if we have them
              ...(lineItems.length > 0 ? {
                items: {
                  deleteMany: {},
                  create: lineItems
                }
              } : {})
            },
            create: {
              shop: session.shop,
              orderId,
              orderName,
              totalCost,
              totalRevenue,
              profit,
              // Add items if we have them
              ...(lineItems.length > 0 ? {
                items: {
                  create: lineItems
                }
              } : {})
            }
          });
          
          console.log(`COGS information saved for order ${orderId}`);
        } catch (cogsError) {
          console.error('Failed to save COGS information:', cogsError);
          // We don't want to fail the whole request if just the COGS save fails
        }
      }

      // Return success response for the shipment creation
      return json({ 
        success: true, 
        shipmentId: result.shipment?.id,
        message: 'Shipment created successfully!'
      });

    } catch (error) {
      console.error("Create Shipment Action Error:", error);
      return json({ success: false, error: error.message }, { status: 500 });
    }
  }

  return json({ success: false, error: 'Invalid action.' }, { status: 400 });
};

// COMPONENT
export default function Orders() {
  // Add component profiling in development
  if (process.env.NODE_ENV !== 'production') {
    console.time('Orders component render');
    
    useEffect(() => {
      console.timeEnd('Orders component render');
      return () => console.time('Orders component unmount');
    }, []);
  }
  const initialData = useLoaderData();
  const [data, setData] = useState(initialData);
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";
  const fetcher = useFetcher();
  const { revalidate } = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize performance monitoring
  useEffect(() => {
    markPerformance(PERF_MARKS.APP_INIT);
    initPerformanceMonitoring();
    return () => {
      // Measure total time on component unmount
      measurePerformance('orders-page-lifetime', PERF_MARKS.APP_INIT, 'orders-page-unmount');
    };
  }, []);
  
  // Set a mark when initial rendering completes
  useEffect(() => {
    requestIdleCallback(() => {
      markPerformance(PERF_MARKS.RENDERING_COMPLETE);
      measurePerformance('initial-render-time', PERF_MARKS.APP_INIT, PERF_MARKS.RENDERING_COMPLETE);
    });
  }, []);
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { language, t, isRTL, setLanguage } = useLanguage();
  const isArabic = language === 'ar';
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedDates, setSelectedDates] = useState({ start: new Date(), end: new Date() });
  const [datePickerActive, setDatePickerActive] = useState(false);
  const [filteredData, setFilteredData] = useState([]);

  // Define the missing variables and options
  const [filteredCommunes, setFilteredCommunes] = useState([]);
  
  // Define delivery, package types, and confirmation options
  const deliveryTypes = useMemo(() => [
    { label: t('orders.deliveryTypes.home'), value: "0" },
    { label: t('orders.deliveryTypes.desk'), value: "1" }
  ], [t]);
  
  const packageTypes = useMemo(() => [
    { label: t('orders.packageTypes.standard'), value: "0" },
    { label: t('orders.packageTypes.fragile'), value: "1" },
    { label: t('orders.packageTypes.documents'), value: "2" }
  ], [t]);
  
  const confirmedStatusOptions = useMemo(() => [
    { label: t('orders.confirmationStatus.confirmed'), value: "1" },
    { label: t('orders.confirmationStatus.unconfirmed'), value: "0" }
  ], [t]);
  
  // Use memo to avoid recalculating data on every render
  const memoizedOrdersData = useMemo(() => {
    // Handle different data structures that might come from the server or cache
    if (!data) return [];
    
    // Case 1: data.orders?.edges exists (standard structure)
    if (data.orders?.edges) {
      return data.orders.edges;
    }
    
    // Case 2: data.orders is an array
    if (Array.isArray(data.orders)) {
      return data.orders;
    }
    
    // Case 3: data itself is an array of orders
    if (Array.isArray(data)) {
      return data;
    }
    
    // Default: return empty array
    return [];
  }, [data]);
  
  // Pagination state
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const totalCount = data.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  
  // Use refs to track if we need to refresh data
  const lastRefreshTimestamp = useRef(data.timestamp || Date.now());
  const refreshInterval = 5 * 60 * 1000; // 5 minutes
  
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    avgOrderValue: 0,
    avgProfit: 0
  });
  
  // Memoize the initial form state to avoid recreating on every render
  const initialShipmentForm = useMemo(() => ({
    Client: "",
    MobileA: "",
    MobileB: "",
    Adresse: "",
    IDWilaya: "",
    Wilaya: "",
    Commune: "",
    Total: "",
    Note: "",
    TProduit: "",
    TypeLivraison: "0",
    TypeColis: "0",
    Confrimee: "1",
    DeliveryPartner: "zrexpress",
    orderId: "",
    deliveryFee: "0",
    cancelFee: "0"
  }), []);

  // Initialize shipment form state with the initial values
  const [shipmentForm, setShipmentForm] = useState(initialShipmentForm);

  // Add toast markup
  const toastMarkup = useMemo(() => {
    return toastMessage ? (
      <Toast
        content={toastMessage.content}
        error={toastMessage.error}
        onDismiss={() => setToastMessage(null)}
        duration={3000}
      />
    ) : null;
  }, [toastMessage]);

  // Add the missing handlePageChange function
  const handlePageChange = useCallback((newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);
    
    // Refresh data when changing pages
    revalidate();
  }, [searchParams, setSearchParams, totalPages, revalidate]);

  // Add the missing handlePageSizeChange function
  const handlePageSizeChange = useCallback((value) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("pageSize", value);
    newParams.set("page", "1"); // Reset to first page when changing page size
    setSearchParams(newParams);
    
    // Refresh data when changing page size
    revalidate();
  }, [searchParams, setSearchParams, revalidate]);

  // Add the missing preloadNextPage function
  const preloadNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      // Logic to preload next page data if needed
      console.log('Preloading next page data...');
      // You could implement actual preloading logic here
    }
  }, [currentPage, totalPages]);

  // Add the missing handleShipmentSubmit function
  const handleShipmentSubmit = useCallback(() => {
    // Basic validation
    const requiredFields = ['Client', 'MobileA', 'Adresse', 'IDWilaya', 'Commune', 'Total', 'TProduit'];
    const missingFields = requiredFields.filter(field => !shipmentForm[field]);
    
    if (missingFields.length > 0) {
      setToastMessage({
        content: t('orders.missingRequiredFields'),
        error: true
      });
      return;
    }
    
    // Prepare form data for submission
    const formData = new FormData();
    formData.append('_action', 'createShipment');
    
    // Add all shipment form fields
    Object.entries(shipmentForm).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    // Add additional fields
    if (selectedOrder) {
      formData.append('orderId', selectedOrder.id.split('/').pop());
      
      // Calculate and add total cost information
      let totalCost = 0;
      selectedOrder.lineItems?.edges.forEach(({ node }) => {
        const quantity = node.quantity || 1;
        const unitCost = parseFloat(node.variant?.inventoryItem?.unitCost?.amount || 0);
        totalCost += (unitCost * quantity);
      });
      
      formData.append('totalCost', totalCost.toString());
      
      // Add line items information as JSON
      const lineItemsData = selectedOrder.lineItems?.edges.map(({ node }) => ({
        productId: node.product?.id,
        variantId: node.variant?.id,
        title: node.title,
        quantity: node.quantity || 1,
        unitCost: parseFloat(node.variant?.inventoryItem?.unitCost?.amount || 0),
        unitPrice: parseFloat(node.originalUnitPriceSet?.shopMoney?.amount || 0)
      }));
      
      formData.append('lineItems', JSON.stringify(lineItemsData || []));
    }
    
    // Submit the form
    fetcher.submit(formData, { method: 'post' });
  }, [shipmentForm, fetcher, selectedOrder, t]);

  // Effect to update filtered communes when wilaya changes
  useEffect(() => {
    if (shipmentForm.IDWilaya) {
      try {
        const wilayaId = parseInt(shipmentForm.IDWilaya, 10);
        // Filter communes data based on selected wilaya
        const communes = communesData.filter(commune => 
          commune.wilaya_id === wilayaId
        );
        setFilteredCommunes(communes);
      } catch (error) {
        console.error('Error filtering communes:', error);
        setFilteredCommunes([]);
      }
    } else {
      setFilteredCommunes([]);
    }
  }, [shipmentForm.IDWilaya]);

  // Get order status tone for the badge
  const getOrderStatusTone = (status) => {
    if (!status) return "critical";
    status = status.toLowerCase();
    if (status.includes('paid')) return "success";
    if (status.includes('refund')) return "warning";
    if (status.includes('pending')) return "info";
    return "critical";
  };
  
  // Get order fulfillment tone for the badge
  const getOrderFulfillmentTone = (status) => {
    if (!status) return "critical";
    status = status.toLowerCase();
    if (status.includes('fulfilled')) return "success";
    if (status.includes('partial')) return "warning";
    if (status.includes('restocked')) return "info";
    return "critical";
  };
  
  // Handler for viewing order details
  const handleViewOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
    
    // Pre-fill the shipment form with order details
    if (order) {
      const shippingAddress = order.shipping_address || {};
      setShipmentForm(prev => ({
        ...initialShipmentForm,
        Client: `${shippingAddress.first_name || ''} ${shippingAddress.last_name || ''}`.trim() || prev.Client,
        MobileA: shippingAddress.phone || prev.MobileA,
        Adresse: shippingAddress.address1 || prev.Adresse,
        TProduit: order.name || prev.TProduit,
        Total: order.totalPriceSet?.shopMoney?.amount || prev.Total,
        orderId: order.id?.split('/').pop() || ''
      }));
    }
  };
  
  // Define table headings based on language
  const tableHeadings = [
    t('orders.orderNumber'),
    t('orders.customer'),
    t('orders.total'),
    t('orders.date'),
    t('orders.status'),
    t('orders.fulfillment'),
    t('orders.payment'),
    t('orders.delivery'),
    t('orders.profit'),
    t('orders.actions')
  ];
  
  // Create table rows from filtered data
  const tableRows = filteredData.map(order => [
    order.name || '-',
    order.customer?.displayName || t('orders.anonymous'),
    formatCurrency(order.totalPriceSet?.shopMoney?.amount || 0),
    formatDate(order.createdAt),
    <Badge tone={getOrderStatusTone(order.displayFinancialStatus)}>{order.displayFinancialStatus || t('orders.unknown')}</Badge>,
    <Badge tone={getOrderFulfillmentTone(order.displayFulfillmentStatus)}>{order.displayFulfillmentStatus || t('orders.unfulfilled')}</Badge>,
    order.paymentGatewayNames?.join(', ') || '-',
    order.shipping_address?.city || t('orders.noAddress'),
    order.totalCost ? formatCurrency(order.totalPriceSet?.shopMoney?.amount - order.totalCost) : '-',
    <Button size="slim" onClick={() => handleViewOrderDetails(order)}>
      {t('orders.view')}
    </Button>
  ]);
  
  // Table footer content
  const tableFooterContent = `${t('orders.showing')} ${filteredData.length} ${t('orders.of')} ${totalCount} ${t('orders.orders')}`;

  markPerformance(PERF_MARKS.RENDERING);
  
  // Use effect to update filtered data when orders data changes
  useEffect(() => {
    console.log('Orders data changed:', memoizedOrdersData);
    console.log('Raw data structure:', data);
    
    // If data error exists, show it
    if (data.error) {
      console.error('Data error:', data.error);
      setToastMessage({
        content: `Error loading orders: ${data.error}`,
        error: true
      });
    }
    
    // Safety check for valid data structure
    if (memoizedOrdersData && Array.isArray(memoizedOrdersData) && memoizedOrdersData.length > 0) {
      // Transform edges to nodes for easier processing
      const processedData = memoizedOrdersData.map(edge => {
        // Handle both formats: {node: {...}} and direct objects
        return edge.node || edge;
      }).filter(Boolean); // Remove any undefined items
      
      console.log('Processed data:', processedData);
      setFilteredData(processedData);
      
      // Calculate stats for the dashboard
      const revenue = processedData.reduce((sum, order) => {
        const amount = order.totalPriceSet?.shopMoney?.amount || 
                       (order.totalPrice && typeof order.totalPrice === 'string' ? order.totalPrice : '0');
        return sum + parseFloat(amount || 0);
      }, 0);
      
      const costs = processedData.reduce((sum, order) => sum + parseFloat(order.totalCost || 0), 0);
      const profit = revenue - costs;
      
      setStats({
        totalOrders: processedData.length,
        totalRevenue: revenue,
        totalCost: costs,
        totalProfit: profit,
        avgOrderValue: processedData.length > 0 ? revenue / processedData.length : 0,
        avgProfit: processedData.length > 0 ? profit / processedData.length : 0
      });
    } else {
      console.log('No orders data available or invalid structure, clearing filtered data');
      // Check if we need to load mock data for testing
      const useMockData = new URLSearchParams(window.location.search).get('mock') === 'true';
      
      if (useMockData) {
        console.log('Loading mock data for testing...');
        const mockOrders = Array.from({ length: 5 }, (_, i) => ({
          id: `gid://shopify/Order/${i + 1}`,
          name: `#${1000 + i}`,
          createdAt: new Date().toISOString(),
          displayFinancialStatus: 'Paid',
          displayFulfillmentStatus: 'Fulfilled',
          totalPriceSet: {
            shopMoney: {
              amount: (1000 + (i * 100)).toString(),
              currencyCode: 'DZD'
            }
          },
          customer: {
            displayName: `Test Customer ${i + 1}`
          },
          shipping_address: {
            city: 'Algiers'
          },
          totalCost: 500 + (i * 50)
        }));
        
        setFilteredData(mockOrders);
        
        // Calculate stats
        const revenue = mockOrders.reduce((sum, order) => sum + parseFloat(order.totalPriceSet.shopMoney.amount), 0);
        const costs = mockOrders.reduce((sum, order) => sum + order.totalCost, 0);
        const profit = revenue - costs;
        
        setStats({
          totalOrders: mockOrders.length,
          totalRevenue: revenue,
          totalCost: costs,
          totalProfit: profit,
          avgOrderValue: revenue / mockOrders.length,
          avgProfit: profit / mockOrders.length
        });
      } else {
        setFilteredData([]);
      }
    }
  }, [memoizedOrdersData, data]);
  
  // Add effect to handle data loading
  useEffect(() => {
    if (initialData) {
      console.log('Initial data loaded:', initialData);
      
      // If we detect that the data doesn't have the expected structure,
      // try to fetch fresh data with refresh=true
      if (!initialData.orders?.edges && !Array.isArray(initialData.orders)) {
        console.log('Data structure not as expected, triggering refresh...');
        const newParams = new URLSearchParams(searchParams);
        newParams.set("refresh", "true");
        setSearchParams(newParams);
        revalidate();
      }
    }
  }, [initialData, searchParams, setSearchParams, revalidate]);
  
  // Define date range presets
  const dateRangePresets = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'thisWeek' },
    { label: 'Last Week', value: 'lastWeek' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'This Year', value: 'thisYear' }
  ];

  // Get dates based on preset
  const getPresetDates = (preset) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch(preset) {
      case 'today':
        return { start: today, end: now };
      
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday, end: new Date(today.getTime() - 1) };
      }
      
      case 'thisWeek': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return { start: startOfWeek, end: now };
      }
      
      case 'lastWeek': {
        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
        const endOfLastWeek = new Date(today);
        endOfLastWeek.setDate(today.getDate() - today.getDay() - 1);
        return { start: startOfLastWeek, end: endOfLastWeek };
      }
      
      case 'thisMonth': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: startOfMonth, end: now };
      }
      
      case 'lastMonth': {
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return { start: startOfLastMonth, end: endOfLastMonth };
      }
      
      case 'thisYear': {
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        return { start: startOfYear, end: now };
      }
      
      default:
        return { start: today, end: now };
    }
  };
  
  // Handler for date preset button click
  const handleDatePresetClick = (preset) => {
    const { start, end } = getPresetDates(preset);
    setSelectedDates({ start, end });
    
    // Optionally, you can also trigger a data refresh here if needed
    // revalidate();
  };
  
  // Handler for date range change
  const handleDateChange = (dates) => {
    setSelectedDates(dates);
  };
  
  // Refresh data function
  const refreshData = async () => {
    // Check if enough time has passed since the last refresh
    const now = Date.now();
    if (now - lastRefreshTimestamp.current < refreshInterval) {
      console.log('Refresh skipped - interval not elapsed');
      return;
    }
    
    lastRefreshTimestamp.current = now;
    console.log('Refreshing data...');
    
    // Option 1: Soft refresh - revalidate current data (useful if only timestamps have changed)
    revalidate();
    
    // Option 2: Hard refresh - fetch fresh data from the server
    // const freshData = await fetchDataFromServer();
    // setData(freshData);
  };
  
  // Periodically refresh data every minute
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 60 * 1000); // 60 seconds

    return () => clearInterval(interval);
  }, []);
  
  // Add a direct data loading function that bypasses the cache
  const loadDirectData = useCallback(async () => {
    console.log('Loading data directly without cache...');
    try {
      // Show loading state
      setToastMessage({
        content: 'Loading orders directly...',
        error: false
      });
      
      // Make a direct fetch request to the loader endpoint with cache bypass
      const response = await fetch(`/app/orders?refresh=true&_data=routes%2Fapp.orders`);
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status}`);
      }
      
      const freshData = await response.json();
      console.log('Direct data loaded:', freshData);
      
      // Update the data state
      setData(freshData);
      
      setToastMessage({
        content: 'Orders loaded successfully!',
        error: false
      });
    } catch (error) {
      console.error('Failed to load data directly:', error);
      setToastMessage({
        content: `Error loading data: ${error.message}`,
        error: true
      });
    }
  }, [setToastMessage, setData]);
  
  return (
    <Frame>
      <Page
        fullWidth
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', direction: isRTL ? 'rtl' : 'ltr' }}>
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', padding: '8px', color: 'white', fontSize: '20px', fontWeight: 'bold' }}>📦</div>
            <Text variant="headingXl" as="h1">{t('orders.title')}</Text>
          </div>
        }
        secondaryActions={[
          { 
            content: language === 'ar' ? '🌐 English' : '🌐 العربية', 
            onAction: () => language === 'ar' ? setLanguage('en') : setLanguage('ar') 
          }
        ]}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="400">
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center" wrap={false}>
                    <BlockStack gap="200">
                      <Text variant="headingLg" as="h2">{t('orders.dashboardTitle')}</Text>
                      <InlineStack gap="300" align="start">
                        {isLoading && <Badge tone="warning" size="large">{t('orders.updating')}</Badge>}
                        {data.isFromCache && (
                          <Badge tone="info" size="large">
                            {t('orders.cachedData')} - {new Date(data.timestamp).toLocaleTimeString()}
                          </Badge>
                        )}
                      </InlineStack>
                    </BlockStack>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: isArabic ? 'flex-start' : 'flex-end', position: 'relative' }}>
                      <Button onClick={() => {
                        console.log('Manual refresh triggered');
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set("refresh", "true");
                        setSearchParams(newParams);
                        revalidate();
                      }} primary>
                        🔄 Refresh Data
                      </Button>
                      <Button onClick={loadDirectData} tone="critical">
                        ⚡ Direct Load (No Cache)
                      </Button>
                      <InlineStack gap="200" wrap={false}>
                        {dateRangePresets.map(preset => (
                          <Button key={preset.value} size="slim" onClick={() => handleDatePresetClick(preset.value)}>
                            {preset.label}
                          </Button>
                        ))}
                      </InlineStack>
                      <Button onClick={() => setDatePickerActive(!datePickerActive)} disclosure={datePickerActive ? "up" : "down"}>
                        {`📅 ${formatDate(selectedDates.start)} - ${formatDate(selectedDates.end)}`}
                      </Button>
                      {datePickerActive && (
                        <div style={{
                          position: 'absolute', top: '105%', zIndex: 400,
                          right: isArabic ? undefined : 0, left: isArabic ? 0 : undefined
                        }}>
                          <Card>
                            <DatePicker
                              month={selectedDates.end.getMonth()}
                              year={selectedDates.end.getFullYear()}
                              onChange={handleDateChange}
                              onMonthChange={(month, year) => setSelectedDates(prev => ({ start: new Date(year, month, 1), end: new Date(year, month + 1, 0) }))}
                              selected={{ start: selectedDates.start, end: selectedDates.end, }}
                              allowRange
                            />
                          </Card>
                        </div>
                      )}
                    </div>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <Suspense fallback={<LoadingFallback />}>
                <LazyStatCard title={t('orders.stats.totalOrders')} value={stats.totalOrders} icon="🛒" color="success" />
                <LazyStatCard title={t('orders.stats.totalRevenue')} value={formatCurrency(stats.totalRevenue)} icon="💵" color="info" />
                <LazyStatCard title={t('orders.stats.totalCost')} value={formatCurrency(stats.totalCost)} icon="💸" color="warning" />
                <LazyStatCard title={t('orders.stats.totalProfit')} value={formatCurrency(stats.totalProfit)} icon="💰" color="success" />
                <LazyStatCard title={t('orders.stats.avgOrderValue')} value={formatCurrency(stats.avgOrderValue)} icon="💎" color="success" />
                <LazyStatCard title={t('orders.stats.avgProfit')} value={formatCurrency(stats.avgProfit)} icon="📈" color="info" />
              </Suspense>
            </div>
          </Layout.Section>

          <Layout.Section>
            <Card>
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Spinner accessibilityLabel={t('orders.loadingOrders')} size="large" />
                </div>
              ) : !filteredData.length ? (
                <Box padding="400" style={{ textAlign: 'center' }}>
                  <Text variant="bodyMd" as="p">{t('orders.noOrdersInRange')}</Text>
                </Box>
              ) : (
                <Suspense fallback={<LoadingFallback />}>
                  {filteredData.length <= 25 ? (
                    <LazyDataTable
                      columnContentTypes={['text', 'text', 'numeric', 'text', 'text', 'text', 'text', 'text', 'text', 'text']}
                      headings={tableHeadings}
                      rows={tableRows}
                      footerContent={
                        <div style={{
                          padding: '16px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          fontWeight: 'bold',
                          textAlign: 'center'
                        }}>
                          {tableFooterContent}
                        </div>
                      }
                    />
                  ) : (
                    <LazyVirtualizedDataTable
                      columnContentTypes={['text', 'text', 'numeric', 'text', 'text', 'text', 'text', 'text', 'text', 'text']}
                      headings={tableHeadings}
                      rows={tableRows}
                      footerContent={tableFooterContent}
                    />
                  )}

                  {totalPages > 1 && (
                    <Box padding="400">
                      <InlineStack gap="400" align="center">
                        <Button 
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage <= 1}
                        >
                          {t('orders.pagination.previous')}
                        </Button>
                        <Text variant="bodyMd" as="span">
                          {`${t('orders.pagination.page')} ${currentPage} ${t('orders.pagination.of')} ${totalPages}`}
                        </Text>
                        <Button 
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage >= totalPages}
                          onMouseEnter={preloadNextPage}
                        >
                          {t('orders.pagination.next')}
                        </Button>
                        <Select 
                          label=""
                          labelHidden
                          options={[
                            { label: '10 per page', value: '10' },
                            { label: '20 per page', value: '20' },
                            { label: '50 per page', value: '50' },
                          ]}
                          value={pageSize.toString()}
                          onChange={handlePageSizeChange}
                        />
                      </InlineStack>
                    </Box>
                  )}
                </Suspense>
              )}
              }
            </Card>
          </Layout.Section>
        </Layout>

        {/* Render the modal only when it's needed - helps with initial load performance */}
        {isModalOpen && (
          <Modal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={t('orders.createShipment')}
            primaryAction={{
              content: t('orders.createShipmentButton'),
              onAction: handleShipmentSubmit,
              loading: fetcher.state === "submitting"
            }}
            secondaryActions={[
              {
                content: t('general.cancel'),
                onAction: () => setIsModalOpen(false)
              }
            ]}
          >
            <Modal.Section>
              <FormLayout>
                {/* Calculate cost summary information */}
                {selectedOrder && (
                  <Card>
                    <Box padding="300" background="bg-surface-secondary">
                      <BlockStack gap="300">
                        <Text variant="headingMd" as="h3">{t('orders.stats.totalCost')}</Text>
                        <BlockStack gap="200">
                          {selectedOrder.lineItems?.edges.map(({ node }, index) => {
                            const quantity = node.quantity || 1;
                            const unitCost = parseFloat(node.variant?.inventoryItem?.unitCost?.amount || 0);
                            const unitPriceSet = node.originalUnitPriceSet?.shopMoney?.amount;
                            const price = parseFloat(unitPriceSet || 0);
                            const itemTotalCost = unitCost * quantity;
                            const itemTotalRevenue = price * quantity;
                            const itemProfit = itemTotalRevenue - itemTotalCost;
                            const itemMargin = price > 0 ? ((price - unitCost) / price * 100) : 0;
                            const currency = node.originalTotalSet?.shopMoney?.currencyCode || 'DZD';
                            
                            return (
                              <InlineStack 
                                key={index}
                                align="space-between"
                                blockAlign="center"
                              >
                                <Text variant="bodyMd">{node.title} (x{quantity})</Text>
                                <InlineStack gap="200">
                                  <Text variant="bodyMd" tone="subdued">
                                    {t('orders.stats.totalCost')}: {formatCurrency(itemTotalCost, false, currency)}
                                  </Text>
                                  <Text 
                                    variant="bodyMd" 
                                    tone={itemProfit >= 0 ? "success" : "critical"}
                                  >
                                    {t('orders.stats.totalProfit')}: {formatCurrency(itemProfit, false, currency)} ({formatPercentage(itemMargin)})
                                  </Text>
                                </InlineStack>
                              </InlineStack>
                            );
                          })}
                          
                          {/* Total summary */}
                          {(() => {
                            let totalCost = 0;
                            let totalRevenue = parseFloat(shipmentForm.Total || 0);
                            
                            selectedOrder.lineItems?.edges.forEach(({ node }) => {
                              const quantity = node.quantity || 1;
                              const unitCost = parseFloat(node.variant?.inventoryItem?.unitCost?.amount || 0);
                              totalCost += (unitCost * quantity);
                            });
                            
                            const profit = totalRevenue - totalCost;
                            const margin = totalRevenue > 0 ? (profit / totalRevenue * 100) : 0;
                            const currency = selectedOrder.totalPriceSet?.shopMoney?.currencyCode || 'DZD';
                            
                            return (
                              <InlineStack 
                                align="space-between"
                                blockAlign="center"
                              >
                                <Text variant="headingSm" as="h4">{t('orders.totalSummary')}</Text>
                                <InlineStack gap="200">
                                  <Text variant="headingSm" tone="subdued">
                                    {t('orders.cost')} {formatCurrency(totalCost, false, currency)}
                                  </Text>
                                  <Text 
                                    variant="headingSm" 
                                    tone={profit >= 0 ? "success" : "critical"}
                                  >
                                    {t('orders.profit')} {formatCurrency(profit, false, currency)} ({formatPercentage(margin)})
                                  </Text>
                                </InlineStack>
                              </InlineStack>
                            );
                          })()}
                        </BlockStack>
                      </BlockStack>
                    </Box>
                  </Card>
                )}
                
                <FormLayout.Group>
                  <TextField
                    label={t('orders.customer')}
                    value={shipmentForm.Client}
                    onChange={(value) => setShipmentForm({...shipmentForm, Client: value})}
                    autoComplete="off"
                    requiredIndicator
                  />
                  <TextField
                    label={t('orders.phone')}
                    value={shipmentForm.MobileA}
                    onChange={(value) => setShipmentForm({...shipmentForm, MobileA: value})}
                    type="tel"
                    autoComplete="off"
                    requiredIndicator
                  />
                </FormLayout.Group>
                
                <FormLayout.Group>
                  <TextField
                    label={t('orders.secondaryPhone')}
                    value={shipmentForm.MobileB}
                    onChange={(value) => setShipmentForm({...shipmentForm, MobileB: value})}
                    type="tel"
                    autoComplete="off"
                  />
                  <TextField
                    label={t('orders.total')}
                    value={shipmentForm.Total}
                    onChange={(value) => setShipmentForm({...shipmentForm, Total: value})}
                    type="number"
                    autoComplete="off"
                    requiredIndicator
                    prefix="DZD"
                  />
                </FormLayout.Group>
                
                <FormLayout.Group>
                  <TextField
                    label={t('orders.address')}
                    value={shipmentForm.Adresse}
                    onChange={(value) => setShipmentForm({...shipmentForm, Adresse: value})}
                    autoComplete="off"
                    multiline={3}
                    requiredIndicator
                  />
                </FormLayout.Group>
                
                <FormLayout.Group>
                  <Select
                    label={t('orders.state')}
                    options={data.cities}
                    value={shipmentForm.IDWilaya}
                    onChange={(value) => {
                      const selectedCity = data.cities.find(city => city.value === value);
                      setShipmentForm({
                        ...shipmentForm, 
                        IDWilaya: value,
                        Wilaya: selectedCity ? selectedCity.label : ""
                      });
                    }}
                    requiredIndicator
                  />
                  <Select
                    label={t('orders.city')}
                    value={shipmentForm.Commune}
                    options={filteredCommunes.map(commune => ({
                      label: commune.commune_name_ascii,
                      value: commune.commune_name_ascii
                    }))}
                    onChange={(value) => setShipmentForm({...shipmentForm, Commune: value})}
                    requiredIndicator
                    disabled={!shipmentForm.IDWilaya || filteredCommunes.length === 0}
                    placeholder={filteredCommunes.length === 0 ? t('orders.selectWilayaFirst') : t('orders.selectCommune')}
                  />
                </FormLayout.Group>
                
                <FormLayout.Group>
                  <Select
                    label={t('orders.deliveryType')}
                    options={deliveryTypes}
                    value={shipmentForm.TypeLivraison}
                    onChange={(value) => setShipmentForm({...shipmentForm, TypeLivraison: value})}
                  />
                  <Select
                    label={t('orders.packageType')}
                    options={packageTypes}
                    value={shipmentForm.TypeColis}
                    onChange={(value) => setShipmentForm({...shipmentForm, TypeColis: value})}
                  />
                </FormLayout.Group>
                
                <FormLayout.Group>
                  <TextField
                    label={t('orders.productDescription')}
                    value={shipmentForm.TProduit}
                    onChange={(value) => setShipmentForm({...shipmentForm, TProduit: value})}
                    autoComplete="off"
                    requiredIndicator
                  />
                  <Select
                    label={t('orders.confirmationStatus')}
                    options={confirmedStatusOptions}
                    value={shipmentForm.Confrimee}
                    onChange={(value) => setShipmentForm({...shipmentForm, Confrimee: value})}
                    requiredIndicator
                  />
                </FormLayout.Group>
                
                <TextField
                  label={t('orders.notes')}
                  value={shipmentForm.Note}
                  onChange={(value) => setShipmentForm({...shipmentForm, Note: value})}
                  autoComplete="off"
                  multiline={2}
                />
              </FormLayout>
            </Modal.Section>
          </Modal>
        )}
        {toastMarkup}
      </Page>
    </Frame>
  );
}