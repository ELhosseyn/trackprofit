import { useState, useEffect, useCallback, lazy, Suspense, useMemo } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData, useNavigate } from "@remix-run/react";
import { 
  Card, 
  Layout, 
  Page, 
  Text, 
  Badge,
  DataTable,
  Form,
  FormLayout,
  TextField,
  Select,
  Modal,
  Toast,
  Frame,
  Banner,
  Box,
  BlockStack,
  InlineStack,
  Button,
  Pagination,
  ChoiceList,
  DatePicker,
  Spinner,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { zrexpress } from "../services/zrexpress.server.js";
import { formatCurrency, formatNumber } from "../utils/formatters";

// Lazy load heavy dependencies for client-side only
const XLSX = lazy(() => import('xlsx'));
import { useLanguage } from "../utils/i18n/LanguageContext.jsx";


// Lazy load components with automatic retry on failure
const StatCard = lazy(() => import("../components/StatCard"));
const LoadingSpinner = lazy(() => import("../components/LoadingSpinner"));

// Loading fallback component defined locally to avoid extra imports
const LoadingFallback = () => (
  <Card>
    <Box padding="400">
      <BlockStack gap="400" align="center">
        <Spinner size="large" />
        <Text variant="bodyMd">Loading...</Text>
      </BlockStack>
    </Box>
  </Card>
);

export function links() {
  return [
    // Critical resources with high priority
    {
      rel: "preload",
      href: "https://cdn.shopify.com/shopifycloud/app-bridge.js",
      as: "script",
      fetchpriority: "high",
      crossOrigin: "anonymous"
    },
    // Non-critical resources with lower priority
    {
      rel: "prefetch",
      href: "https://code.jquery.com/jquery-3.6.0.min.js",
      as: "script",
      importance: "low"
    },
    // Add SEO meta tags
    {
      rel: "canonical",
      href: "https://app.trackprofit.com/app/zrexpress",
    },
    // Add preconnect for faster loading
    {
      rel: "preconnect",
      href: "https://cdn.shopify.com",
      crossOrigin: "anonymous"
    },
    {
      rel: "preconnect", 
      href: "https://fonts.googleapis.com",
      crossOrigin: "anonymous"
    },
    {
      rel: "dns-prefetch",
      href: "https://cdn.shopify.com"
    },
    // Prefetch essential data files
    {
      rel: "prefetch",
      href: "/data/communes.json",
      as: "fetch",
      type: "application/json"
    }
  ];
}

export const meta = () => {
  return [
    { title: "ZR Express Shipping Management | TrackProfit" },
    { name: "description", content: "Manage your ZR Express shipping in an easy and efficient way. Track shipments, create new orders, and view analytics." },
    { property: "og:title", content: "ZR Express Shipping Management | TrackProfit" },
    { property: "og:description", content: "Manage your ZR Express shipping in an easy and efficient way. Track shipments, create new orders, and view analytics." },
    { name: "robots", content: "noindex, nofollow" }, // Prevent indexing of admin tools
  ];
};

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    
    // Create initial response structure
    const initialResponse = {
      isConnected: false,
      connectionError: null,
      shippingData: [],
      cities: [],
      hasCredentials: false,
      stats: {
        grossAmount: 0,
        totalShippingAndCancel: 0,
        netRevenue: 0,
        deliveredCount: 0,
        inPreparationCount: 0,
        inTransitCount: 0,
      },
      shop: session.shop,
      timestamp: Date.now() // Add timestamp for cache invalidation
    };

    // Check if credentials exist in a single query
    const credentials = await prisma.ZRExpressCredential.findUnique({
      where: { shop: session.shop },
      select: { token: true, key: true } // Only select needed fields
    });

    if (!credentials) {
      return json(initialResponse, {
        headers: {
          "Cache-Control": "private, max-age=10" // Cache for 10 seconds
        }
      });
    }

    // Update response with credentials status
    initialResponse.hasCredentials = true;

    try {
      // Validate credentials and fetch initial data in parallel
      const [validationResult, tarificationData] = await Promise.all([
        zrexpress.validateCredentials(credentials.token, credentials.key),
        zrexpress.getTarification(credentials.token, credentials.key).catch(() => [])
      ]);

      initialResponse.isConnected = validationResult.success;

      if (!validationResult.success) {
        initialResponse.connectionError = "Invalid credentials";
        return json(initialResponse, {
          headers: {
            "Cache-Control": "private, max-age=30"
          }
        });
      }

      // Process cities data
      if (Array.isArray(tarificationData) && tarificationData.length > 0) {
        initialResponse.cities = tarificationData
          .filter(item => item.Domicile !== "0" || item.Stopdesk !== "0")
          .map(item => ({
            label: item.Wilaya,
            value: item.IDWilaya.toString(),
            prices: {
              domicile: item.Domicile,
              stopdesk: item.Stopdesk,
              cancel: item.Annuler,
            },
          }))
          .sort((a, b) => parseInt(a.value) - parseInt(b.value));
      }
      
      // Fetch shipment data
      const shipments = await zrexpress.getShipmentStatuses(
        credentials.token, 
        credentials.key, 
        [], 
        session.shop
      ).catch(() => []);
      
      if (Array.isArray(shipments) && shipments.length > 0) {
        // Calculate stats efficiently
        const stats = shipments.reduce((acc, shipment) => {
          const totalAmount = parseFloat(shipment.total || 0);
          const deliveryFee = parseFloat(shipment.deliveryFee || 0);
          const cancelFee = parseFloat(shipment.cancelFee || 0);
          const status = (shipment.status || "").trim();

          if ( status === "Livrée" ) {
            acc.grossAmount += totalAmount;
            acc.totalShippingAndCancel += deliveryFee;
            acc.netRevenue += totalAmount - deliveryFee;
            acc.totalShippingAndCancel += cancelFee;
            acc.deliveredCount++;
          } 
          else if (status === "En Préparation") {
            acc.inPreparationCount++;
          } 
          else if (status.includes("Router") || status === "Retour Expéditeur" || status === "Annuler") {
            acc.totalShippingAndCancel += cancelFee;
            acc.inTransitCount++;
          }
          return acc;
        }, {
          grossAmount: 0,
          totalShippingAndCancel: 0,
          netRevenue: 0,
          deliveredCount: 0,
          inPreparationCount: 0,
          inTransitCount: 0,
        });

        initialResponse.stats = {
          grossAmount: Number(stats.grossAmount.toFixed(2)),
          totalShippingAndCancel: Number(stats.totalShippingAndCancel.toFixed(2)),
          netRevenue: Number(stats.netRevenue.toFixed(2)),
          deliveredCount: stats.deliveredCount,
          inPreparationCount: stats.inPreparationCount,
          inTransitCount: stats.inTransitCount
        };

        // Format shipping data efficiently
        initialResponse.shippingData = shipments.map(shipment => {
          const updatedAt = new Date(shipment.updatedAt);
          return [
            updatedAt.toLocaleDateString('fr-FR'),
            shipment.tracking,
            shipment.client,
            shipment.mobileA,
            shipment.mobileB || '',
            shipment.wilaya,
            shipment.commune,
            shipment.status,
            `${shipment.total} دج`
          ];
        });
      }
      
      return json(initialResponse, {
        headers: {
          "Cache-Control": "private, max-age=30" // Cache for 30 seconds
        }
      });
    } catch (validationError) {
      initialResponse.connectionError = "Error validating credentials";
      return json(initialResponse, {
        headers: {
          "Cache-Control": "private, max-age=30"
        }
      });
    }
  } catch (error) {
    console.error("ZRExpress loader error:", error);
    return json({ 
      error: "Server error", 
      isConnected: false, 
      hasCredentials: false,
      shippingData: [],
      cities: [],
      stats: {
        grossAmount: 0,
        totalShippingAndCancel: 0,
        netRevenue: 0,
        deliveredCount: 0,
        inPreparationCount: 0,
        inTransitCount: 0,
      },
      shop: null
    }, { status: 500 });
  }
};

export const action = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    const contentType = request.headers.get("Content-Type") || "";
    let formData;
    if (contentType.includes("multipart/form-data")) {
      formData = await request.formData();
    } else {
      const text = await request.text();
      formData = new URLSearchParams(text);
    }

    const action = formData.get("action");

    if (!session?.shop) {
      return json({ success: false, error: 'No shop found' }, { status: 401 }, {
    headers: {
      "Cache-Control": "private, max-age=30"
    }
  });
    }

    if (action === "saveCredentials") {
      const token = formData.get("token")?.trim();
      const key = formData.get("key")?.trim();

      if (!token || !key) {
        return json({ success: false, error: 'رمز الوصول ومفتاح الوصول مطلوبان' }, {
    headers: {
      "Cache-Control": "private, max-age=30"
    }
  });
      }

      try {
        const validationResult = await zrexpress.validateCredentials(token, key);
        
        if (!validationResult.success) {
          console.error('Validation failed:', validationResult.error);
          return json({ 
            success: false, 
            error: validationResult.error || 'بيانات الاعتماد غير صالحة - يرجى التحقق من الرمز والمفتاح' 
          });
        }

        try {
          await prisma.ZRExpressCredential.upsert({
            where: { shop: session.shop },
            update: { 
              token, 
              key, 
              updatedAt: new Date() 
            },
            create: { 
              shop: session.shop, 
              token, 
              key, 
              createdAt: new Date(),
              updatedAt: new Date() 
            },
          });

          return json({ success: true }, { headers: { "Set-Cookie": await admin.session.commit() } });
        } catch (dbError) {
          console.error('Database error:', dbError);
          return json({ success: false, error: 'حدث خطأ أثناء حفظ بيانات الاعتماد في قاعدة البيانات' });
        }
      } catch (error) {
        console.error('Operation error:', error);
        return json({ 
          success: false, 
          error: 'حدث خطأ أثناء التحقق أو حفظ بيانات الاعتماد: ' + (error.message || 'خطأ غير معروف')
        });
      }
    }

    if (action === "createShipment") {
      const credentials = await prisma.ZRExpressCredential.findUnique({
        where: { shop: session.shop },
      });

      if (!credentials) {
        return json({ success: false, error: 'No credentials found' }, {
    headers: {
      "Cache-Control": "private, max-age=30"
    }
  });
      }

      const shipmentData = {
        Client: formData.get("Client"),
        MobileA: formData.get("MobileA"),
        MobileB: formData.get("MobileB"),
        Adresse: formData.get("Adresse"),
        IDWilaya: formData.get("IDWilaya"),
        Commune: formData.get("Commune"),
        Total: formData.get("Total"),
        Note: formData.get("Note"),
        TProduit: formData.get("TProduit"),
        TypeLivraison: formData.get("TypeLivraison") || "0",
        TypeColis: formData.get("TypeColis") || "0",
        Confrimee: formData.get("Confrimee") || "",
        orderId: formData.get("orderId") || null, // Add orderId field to track COGS
      };

      const requiredFields = ['Client', 'MobileA', 'Adresse', 'IDWilaya', 'Commune'];
      for (const field of requiredFields) {
        if (!shipmentData[field]) {
          return json({ success: false, error: `الحقل ${field} مطلوب` }, {
    headers: {
      "Cache-Control": "private, max-age=30"
    }
  });
        }
      }

      const result = await zrexpress.addColis(credentials.token, credentials.key, shipmentData, session);
      return json(result, {
    headers: {
      "Cache-Control": "private, max-age=30"
    }
  });
    }

    if (action === "uploadExcel") {
      const credentials = await prisma.ZRExpressCredential.findUnique({
        where: { shop: session.shop },
      });

      if (!credentials) {
        return json({ success: false, error: 'No credentials found' }, {
    headers: {
      "Cache-Control": "private, max-age=30"
    }
  });
      }

      const uploadedFile = formData.get("file");
      
      if (!uploadedFile || !(uploadedFile instanceof Blob)) {
        return json({ success: false, error: 'No valid file selected' }, {
    headers: {
      "Cache-Control": "private, max-age=30"
    }
  });
      }

      try {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!data || data.length < 2) {
          return json({ success: false, error: 'No data found in Excel file' }, {
    headers: {
      "Cache-Control": "private, max-age=30"
    }
  });
        }

        const headers = data[0].map(h => String(h || '').trim().toLowerCase());
        const trackingIndex = headers.findIndex(header => header === 'tracking' || header === 'رقم التتبع');

        if (trackingIndex === -1) {
          return json({ success: false, error: 'Could not find Tracking column.' }, {
    headers: {
      "Cache-Control": "private, max-age=30"
    }
  });
        }

        const trackingNumbers = [];
        const trackingDates = new Map();

        data.slice(1).forEach(row => {
          const tracking = row[trackingIndex];
          if (tracking && String(tracking).trim()) {
            trackingNumbers.push(String(tracking).trim());
            if (row[0]) trackingDates.set(String(tracking).trim(), row[0]);
          }
        });

        if (trackingNumbers.length === 0) {
          return json({ success: false, error: 'No valid tracking numbers found in file' }, {
    headers: {
      "Cache-Control": "private, max-age=30"
    }
  });
        }

        const result = await zrexpress.getShipmentStatuses(
          credentials.token,
          credentials.key,
          trackingNumbers,
          session.shop,
          trackingDates
        );

        if (!result || !Array.isArray(result)) {
          return json({ success: false, error: 'Failed to fetch shipment statuses' }, {
    headers: {
      "Cache-Control": "private, max-age=30"
    }
  });
        }

        const exportData = result.map(shipment => ({
          'Date': trackingDates.get(shipment.tracking) || new Date(shipment.createdAt).toLocaleDateString('fr-FR'),
          'Tracking': shipment.tracking,
          'ID': shipment.externalId,
          'Client': shipment.client,
          'Mobile1': shipment.mobileA,
          'Mobile2': shipment.mobileB || '',
          'adresse': shipment.address,
          'Wilaya': shipment.wilaya,
          'Commune': shipment.commune,
          'Produit': shipment.productType,
          'Note': shipment.note || '',
          'Situation': shipment.status,
          'Commentaire': '',
          'Date Action': new Date(shipment.updatedAt).toLocaleDateString('fr-FR'),
          'Total': shipment.total.toString()
        }));

        return json({ success: true, data: result, exportData: exportData, shop: session.shop }, {
    headers: {
      "Cache-Control": "private, max-age=30"
    }
  });
      } catch (error) {
        console.error('File processing error:', error);
        return json({ success: false, error: `Error processing file: ${error.message}`}, {
    headers: {
      "Cache-Control": "private, max-age=30"
    }
  });
      }
    }

    return json({ success: false, error: 'Invalid action' }, {
    headers: {
      "Cache-Control": "private, max-age=30"
    }
  });
  } catch (error) {
    console.error('Action error:', error);
    return json({ success: false, error: 'System error occurred - please try again' }, {
    headers: {
      "Cache-Control": "private, max-age=30"
    }
  });
  }
};

export default function ZRExpressManagement() {
  const { t, language, changeLanguage } = useLanguage();
  const isRTL = language === 'ar';
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigate = useNavigate();
  
  // Initial state from loader data
  const [isConnected, setIsConnected] = useState(loaderData?.isConnected || false);
  const [shippingData, setShippingData] = useState(loaderData?.shippingData || []);
  const [cities, setCities] = useState(loaderData?.cities || []);
  const [stats, setStats] = useState(loaderData?.stats || {
    grossAmount: 0,
    totalShippingAndCancel: 0,
    netRevenue: 0,
    deliveredCount: 0,
    inPreparationCount: 0,
    inTransitCount: 0,
  });
  
  // UI state
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showNewShipment, setShowNewShipment] = useState(false);
  const [token, setToken] = useState("");
  const [key, setKey] = useState("");
  const [connectionError, setConnectionError] = useState(loaderData?.connectionError || null);
  const [hasCredentials, setHasCredentials] = useState(loaderData?.hasCredentials || false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [exportData, setExportData] = useState([]);
  const [dataIsReady, setDataIsReady] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [communesData, setCommunesData] = useState([]);
  
  // Shipment form state
  const [selectedDates, setSelectedDates] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  });
  const [datePickerActive, setDatePickerActive] = useState(false);
  const [datePreset, setDatePreset] = useState("last30Days");
  
  // New shipment form
  const [newShipment, setNewShipment] = useState({
    Client: "",
    MobileA: "",
    MobileB: "",
    Adresse: "",
    IDWilaya: "",
    Commune: "",
    Total: "",
    TypeLivraison: "domicile",
    TypeProduit: "normal",
    Produit: "",
    Remarque: "",
  });
  
  // Define filtered communes with memoization for better performance
  const filteredCommunes = useMemo(() => {
    if (!newShipment.IDWilaya || !communesData || !communesData.length) return [];
    // The wilaya_code in JSON is padded with leading zeros (like "01")
    // We need to ensure proper string comparison
    const wilayaCode = newShipment.IDWilaya.toString().padStart(2, '0');
    
    return communesData.filter(
      commune => commune.wilaya_code === wilayaCode
    );
  }, [newShipment.IDWilaya, communesData]);
  
  // =================================================================
  // FIX START: This block contains the corrected client-side filtering logic.
  // =================================================================
  
  // Memoize the filtered data based on the selected date range.
  // This runs on the client-side whenever the date range changes, without a server reload.
  const filteredData = useMemo(() => {
    if (!shippingData || !Array.isArray(shippingData)) {
      return [];
    }

    // Set start of the day for the start date for accurate comparison
    const startDate = new Date(selectedDates.start);
    startDate.setHours(0, 0, 0, 0);
    const startTimestamp = startDate.getTime();

    // Set end of the day for the end date for accurate comparison
    const endDate = new Date(selectedDates.end);
    endDate.setHours(23, 59, 59, 999);
    const endTimestamp = endDate.getTime();

    // Filter the original, unmodified shippingData array
    return shippingData.filter(row => {
      // Gracefully handle rows that don't have a date in the first column
      if (!row || !row[0]) return false;
      
      // The date is in 'dd/mm/yyyy' format from toLocaleDateString('fr-FR')
      const parts = row[0].split('/');
      if (parts.length !== 3) return false;
      
      // Create a Date object: new Date(year, monthIndex, day)
      const dateObj = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
      
      // Handle invalid dates that might result from parsing
      if (isNaN(dateObj.getTime())) return false;
      
      const timestamp = dateObj.getTime();
      
      // Check if the row's date is within the selected range
      return timestamp >= startTimestamp && timestamp <= endTimestamp;
    });
  }, [shippingData, selectedDates]); // Dependencies: re-runs only when source data or dates change

  // When the filtered data changes, reset the user to the first page of results.
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredData]);

  // Pagination calculation, now based on the *filtered* data length
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  }, [filteredData.length, rowsPerPage]);

  // Data for the current page, sliced from the *filtered* data
  const currentPageData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, rowsPerPage]);
  
  // =================================================================
  // FIX END
  // =================================================================

  // Memoize shipping price for selected wilaya
  const shippingPrice = useMemo(() => {
    if (!newShipment.IDWilaya || !cities.length) return { domicile: 0, stopdesk: 0 };
    const city = cities.find(c => c.value === newShipment.IDWilaya);
    return city ? city.prices : { domicile: 0, stopdesk: 0 };
  }, [newShipment.IDWilaya, cities]);

  // Calculate selected delivery price
  const deliveryPrice = useMemo(() => {
    return newShipment.TypeLivraison === "domicile" 
      ? shippingPrice.domicile 
      : shippingPrice.stopdesk;
  }, [newShipment.TypeLivraison, shippingPrice]);

  // =====================
  // Recalculate stats based on filteredData
  // =====================
  const filteredStats = useMemo(() => {
    // filteredData: [date, tracking, client, mobileA, mobileB, wilaya, commune, status, total]
    let grossAmount = 0;
    let totalShippingAndCancel = 0;
    let netRevenue = 0;
    let deliveredCount = 0;
    let inPreparationCount = 0;
    let inTransitCount = 0;

    filteredData.forEach(row => {
      // Defensive: row[7] is status, row[8] is total (e.g. "123 دج")
      const status = (row[7] || '').trim();
      // Remove non-numeric chars for total
      const totalAmount = parseFloat((row[8] || '').replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
      // You may want to improve this if you have delivery/cancel fee columns
      // For now, only gross/net based on available columns

      if ( status === "Livrée" ) {
        grossAmount += totalAmount;
        // No delivery fee column in table, so set to 0
        // netRevenue = grossAmount - totalShippingAndCancel (if you have fee columns)
        deliveredCount += status === "Livrée" ? 1 : 0;
        inPreparationCount += status === "En Préparation" ? 1 : 0;
      } else if (status.includes("Router") || status === "Retour Expéditeur" || status === "Annuler") {
        inTransitCount++;
      }
    });

    // For demo, netRevenue = grossAmount - totalShippingAndCancel (which is 0 here)
    netRevenue = grossAmount - totalShippingAndCancel;

    return {
      grossAmount: Number(grossAmount.toFixed(2)),
      totalShippingAndCancel: Number(totalShippingAndCancel.toFixed(2)),
      netRevenue: Number(netRevenue.toFixed(2)),
      deliveredCount,
      inPreparationCount,
      inTransitCount
    };
  }, [filteredData]);

  // Table headers with memoization
  const tableHeaders = useMemo(() => [
    t('zrExpress.date'),
    t('zrExpress.trackingNumber'),
    t('zrExpress.client'),
    t('zrExpress.phone1'),
    t('zrExpress.phone2'),
    t('zrExpress.wilaya'),
    t('zrExpress.commune'),
    t('zrExpress.status'),
    t('zrExpress.amount')
  ], [t]);

  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        setToastMessage({
          content: t('zrExpress.dataUpdatedSuccess'),
          error: false
        });
        if (actionData.exportData) {
          setExportData(actionData.exportData);
        }
        setIsUploading(false);
        navigate(".", { replace: true });
      } else if (actionData.error) {
        setToastMessage({
          content: actionData.error,
          error: true
        });
        setIsUploading(false);
      }
      setShowToast(true);
    }
  }, [actionData, navigate, t, setExportData, setIsUploading]);

  useEffect(() => {
    // Set data ready after a small delay to allow UI to render first
    const timer = setTimeout(() => {
      setDataIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSaveCredentials = () => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("action", "saveCredentials");
    formData.append("token", token);
    formData.append("key", key);
    submit(formData, { method: "post" });
  };

  const handleNewShipment = (e) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData();
    formData.append("action", "createShipment");
    Object.entries(newShipment).forEach(([key, value]) => formData.append(key, value || ""));
    submit(formData, { method: "post" });
    setShowNewShipment(false);
  };

  // Load communes data only when needed using lazy-loading
  useEffect(() => {
    const loadCommunesData = async () => {
      try {
        // Check if we already have communes data
        if (communesData.length > 0) return;
        
        // Load communes data
        const response = await fetch('/data/communes.json');
        if (!response.ok) {
          throw new Error(`Failed to load communes: ${response.status}`);
        }
        const data = await response.json();
        setCommunesData(data);
      } catch (error) {
        console.error("Error loading communes data:", error);
      }
    };
    
    // Load communes data when the component mounts or when showing new shipment
    loadCommunesData();
  }, [showNewShipment, communesData.length]);

  // Update state when loader data changes
  useEffect(() => {
    if (loaderData) {
      setIsConnected(loaderData.isConnected || false);
      setShippingData(loaderData.shippingData || []);
      setCities(loaderData.cities || []);
      setStats(loaderData.stats || {
        grossAmount: 0,
        totalShippingAndCancel: 0,
        netRevenue: 0,
        deliveredCount: 0,
        inPreparationCount: 0,
        inTransitCount: 0,
      });
      setConnectionError(loaderData.connectionError);
      setHasCredentials(loaderData.hasCredentials || false);
      // Reset loading state after loader data changes
      setIsLoading(false);
    }
  }, [loaderData]);

  // Handle action data changes
  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        // Close modals and reset forms on success
        setShowCredentialsModal(false);
        setToken("");
        setKey("");
        setConnectionError(null);
        
        // Show success toast
        setToastMessage({
          content: "Operation completed successfully",
          error: false
        });
        
        // Refresh data after successful action
        navigate(".", { replace: true });
      } else if (actionData.error) {
        setConnectionError(actionData.error);
        setToastMessage({
          content: actionData.error,
          error: true
        });
      }
    }
  }, [actionData, navigate]);

  // Handle optimized date preset change
  const handleDatePresetChange = useCallback((value) => {
    setDatePreset(value);
    const today = new Date();
    let start = new Date();
    
    switch (value) {
      case "today":
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        break;
      case "lastSevenDays":
        start = new Date(today);
        start.setDate(start.getDate() - 7);
        break;
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "lastThreeMonths":
        start = new Date(today);
        start.setMonth(start.getMonth() - 3);
        break;
      case "lastSixMonths":
        start = new Date(today);
        start.setMonth(start.getMonth() - 6);
        break;
      case "thisYear":
        start = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(today);
        start.setDate(start.getDate() - 30);
    }
    
    setSelectedDates({
      start,
      end: new Date()
    });
    
    // Close date picker if open
    if (datePickerActive) {
      setDatePickerActive(false);
    }
  }, [datePickerActive]);

  // Optimized shipment form handlers
  const handleCredentialsSubmit = useCallback(() => {
    if (!token || !key) {
      setConnectionError(t('zrExpress.credentialsRequired'));
      return;
    }
    
    const formData = new FormData();
    formData.append("action", "saveCredentials");
    formData.append("token", token);
    formData.append("key", key);
    
    setIsLoading(true);
    submit(formData, { method: "post" });
  }, [token, key, t, submit]);

  const handleShipmentSubmit = useCallback(() => {
    // Form validation
    const errors = {};
    
    if (!newShipment.Client) errors.client = t('zrExpress.clientRequired');
    if (!newShipment.IDWilaya) errors.wilaya = t('zrExpress.wilayaRequired');
    if (!newShipment.Commune) errors.commune = t('zrExpress.communeRequired');
    if (!newShipment.MobileA) errors.mobileA = t('zrExpress.phoneRequired');
    if (!newShipment.Total) errors.total = t('zrExpress.amountRequired');
    if (!newShipment.Produit) errors.product = t('zrExpress.productDetailsRequired');
    
    // If there are validation errors, display them and don't submit
    if (Object.keys(errors).length > 0) {
      // You can set these errors to state if you have error display UI

      return;
    }
    
    setIsLoading(true);
    const formData = new FormData();
    formData.append("action", "createShipment");
    
    // Add all shipment data to form
    Object.entries(newShipment).forEach(([key, value]) => {
      formData.append(key, value || "");
    });
    
    submit(formData, { method: "post" });
    setShowNewShipment(false);
  }, [newShipment, t, submit]);

  const handleCityChange = useCallback((value) => {

    // Reset commune when wilaya changes
    setNewShipment(prev => ({ 
      ...prev, 
      IDWilaya: value,
      Commune: "" 
    }));
    
    // Optionally log the available communes for this wilaya
    if (communesData.length > 0 && value) {
      const wilayaCode = value.toString().padStart(2, '0');
      const communes = communesData.filter(c => c.wilaya_code === wilayaCode);

    }
  }, [communesData]);

  const handleCustomDateApply = useCallback((range) => {
    if (range.start && range.end) {
      setSelectedDates(range);
      setDatePickerActive(false);
      setDatePreset("custom");
    }
  }, []);

  // Optimized file upload handlers
  const handleFileSelectOptimized = useCallback((event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Check if file is Excel
      if (!/\.(xlsx|xls)$/i.test(selectedFile.name)) {
        setToastMessage({
          content: t('zrExpress.selectExcelFile'),
          error: true
        });
        return;
      }
      
      setFile(selectedFile);
    }
  }, [t, setFile, setToastMessage]);

  const handleFileUploadOptimized = useCallback(() => {
    if (!file) {
      setToastMessage({
        content: t('zrExpress.selectFileFirst'),
        error: true
      });
      return;
    }
    
    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // Dynamic import XLSX only when needed
        const XLSX = await import('xlsx');
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (!excelData || excelData.length < 2) {
          setToastMessage({
            content: "No data found in Excel file",
            error: true
          });
          setIsUploading(false);
          return;
        }
        
        const formData = new FormData();
        formData.append("action", "processExcel");
        formData.append("excelData", JSON.stringify(excelData));
        
        submit(formData, { method: "post" });
      } catch (error) {
        console.error("Error processing Excel file:", error);
        setToastMessage({
          content: "Error processing Excel file",
          error: true
        });
        setIsUploading(false);
      }
    };
    
    reader.onerror = () => {
      setToastMessage({
        content: "Error reading file",
        error: true
      });
      setIsUploading(false);
    };
    
    reader.readAsArrayBuffer(file);
  }, [file, t, submit]);

  // Optimize rendering with memoization
  const renderStats = useMemo(() => {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '16px', 
          marginBottom: '24px' 
        }}>
          <StatCard 
            title={t('zrExpress.totalSales')} 
            value={formatCurrency(filteredStats.grossAmount)} 
            icon="💰" 
            color="success" 
          />
          <StatCard 
            title={t('zrExpress.shippingCancelFees')} 
            value={formatCurrency(filteredStats.totalShippingAndCancel)} 
            icon="🚚" 
            color="critical" 
          />
          <StatCard 
            title={t('zrExpress.netRevenue')} 
            value={formatCurrency(filteredStats.netRevenue)} 
            icon="💎" 
            color="success" 
          />
          <StatCard 
            title={t('zrExpress.delivered')} 
            value={filteredStats.deliveredCount.toString()} 
            icon="✅" 
          />
          <StatCard 
            title={t('zrExpress.inPreparation')} 
            value={filteredStats.inPreparationCount.toString()} 
            icon="⏳" 
          />
          <StatCard 
            title={t('zrExpress.inTransit')} 
            value={filteredStats.inTransitCount.toString()} 
            icon="🚛" 
          />
        </div>
      </Suspense>
    );
  }, [filteredStats, t]);

  // Optimized table rendering
  const renderShippingTable = useMemo(() => {
    if (currentPageData.length === 0) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <Text variant="bodyLg">{t('zrExpress.noShipmentsFound')}</Text>
        </div>
      );
    }
    
    return (
      <div style={{ overflowX: 'auto' }}>
        <DataTable
          columnContentTypes={Array(9).fill('text')}
          headings={tableHeaders}
          rows={currentPageData}
          truncate
          footerContent={t('zrExpress.totalShipments', { 
            count: filteredData.length, 
            currentPage, 
            totalPages 
          })}
        />

        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          padding: '16px 0',
          flexDirection: isRTL ? 'row-reverse' : 'row'
        }}>
          <Pagination
            hasPrevious={currentPage > 1}
            onPrevious={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            hasNext={currentPage < totalPages}
            onNext={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          />
        </div>
      </div>
    );
  }, [currentPageData, tableHeaders, currentPage, totalPages, filteredData.length, t, isRTL]);

  // Optimized modal forms with memoization
  const renderCredentialsModal = useMemo(() => (
    <Modal
      open={showCredentialsModal}
      onClose={() => setShowCredentialsModal(false)}
      title={t('zrExpress.connectionSettingsTitle')}
      primaryAction={{
        content: t('general.save'),
        onAction: handleCredentialsSubmit,
        loading: isLoading
      }}
      secondaryActions={[
        {
          content: t('general.cancel'),
          onAction: () => setShowCredentialsModal(false)
        }
      ]}
    >
      <Modal.Section>
        {connectionError && (
          <Banner status="critical" title={t('zrExpress.invalidCredentials')} onDismiss={() => setConnectionError(null)}>
            <p>{connectionError}</p>
          </Banner>
        )}
        <FormLayout>
          <TextField
            label="Token"
            value={token}
            onChange={setToken}
            autoComplete="off"
            requiredIndicator
            disabled={isLoading}
          />
          <TextField
            label="Key"
            value={key}
            onChange={setKey}
            autoComplete="off"
            requiredIndicator
            disabled={isLoading}
          />
        </FormLayout>
      </Modal.Section>
    </Modal>
  ), [showCredentialsModal, t, token, key, connectionError, isLoading, handleCredentialsSubmit]);

  // Toast message component
  const toastMarkup = useMemo(() => {
    if (!toastMessage) return null;
    
    return (
      <Toast 
        content={toastMessage.content} 
        error={toastMessage.error} 
        onDismiss={() => setToastMessage(null)}
        duration={4000}
      />
    );
  }, [toastMessage]);

  // Final optimized render method
  return (
    <Frame>
      {toastMarkup}
      <Page
        fullWidth
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', direction: isRTL ? 'rtl' : 'ltr' }}>
            <div style={{ background: 'linear-gradient(135deg, #F2994A 0%, #F2C94C 100%)', borderRadius: '12px', padding: '8px', color: 'white', fontSize: '20px', fontWeight: 'bold' }}>🚚</div>
            <Text variant="headingXl" as="h1">
              {t('zrExpress.title')}
            </Text>
          </div>
        }
        primaryAction={hasCredentials ? { 
          content: t('zrExpress.createNewShipment'), 
          onAction: () => setShowNewShipment(true), 
          variant: "primary", 
          size: "large",
          disabled: isLoading
        } : undefined}
        secondaryActions={[
          hasCredentials && { 
            content: t('zrExpress.connectionSettings'), 
            onAction: () => setShowCredentialsModal(true),
            disabled: isLoading
          },
          hasCredentials && {
            content: t('zrExpress.uploadExcel'),
            onAction: () => document.getElementById('file-upload').click(),
            disabled: isLoading || isUploading
          }
        ].filter(Boolean)}
      >
        {/* Hidden file input for Excel upload */}
        <input
          type="file"
          id="file-upload"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileSelectOptimized}
        />

        {/* File upload banner */}
        {file && (
          <Layout.Section>
            <Banner
              title={t('zrExpress.fileSelected')}
              action={{
                content: t('general.upload'),
                onAction: handleFileUploadOptimized,
                loading: isUploading,
                disabled: isLoading || isUploading
              }}
              onDismiss={() => setFile(null)}
            >
              <p>{file.name} ({Math.round(file.size / 1024)} KB)</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout>
          {/* Date Range Section - Always render this first for immediate UI */}
          <Layout.Section>
            <Card>
              <Box padding="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="200">
                    <Text variant="headingLg" as="h2">{t('zrExpress.dateRange')}</Text>
                    <Text variant="bodyMd" as="p">
                      {t('zrExpress.showingResultsFrom', { 
                        startDate: selectedDates.start.toLocaleDateString(language === 'ar' ? 'ar-DZ' : 'en-US'), 
                        endDate: selectedDates.end.toLocaleDateString(language === 'ar' ? 'ar-DZ' : 'en-US')
                      })}
                    </Text>
                  </BlockStack>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                    <InlineStack gap="200" wrap={false}>
                      {[
                        { value: "today", label: t('zrExpress.today') },
                        { value: "lastSevenDays", label: t('zrExpress.lastSevenDays') },
                        { value: "thisMonth", label: t('zrExpress.thisMonth') },
                        { value: "lastThreeMonths", label: t('zrExpress.lastThreeMonths') },
                        { value: "lastSixMonths", label: t('zrExpress.lastSixMonths') },
                        { value: "thisYear", label: t('zrExpress.thisYear') },
                      ].map(preset => (
                        <Button 
                          key={preset.value} 
                          size="slim" 
                          onClick={() => handleDatePresetChange(preset.value)} 
                          pressed={datePreset === preset.value}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </InlineStack>
                    
                    <Button 
                      onClick={() => setDatePickerActive(!datePickerActive)} 
                      disclosure={datePickerActive ? "up" : "down"}
                    >
                      {`📅 ${selectedDates.start.toLocaleDateString(language === 'ar' ? 'ar-DZ' : 'en-US')} - ${selectedDates.end.toLocaleDateString(language === 'ar' ? 'ar-DZ' : 'en-US')}`}
                    </Button>
                    
                    {datePickerActive && (
                      <div style={{
                        position: 'absolute', top: '105%', zIndex: 400,
                        right: isRTL ? undefined : 0, left: isRTL ? 0 : undefined
                      }}>
                        <Card>
                          <DatePicker
                            month={selectedDates.end.getMonth()}
                            year={selectedDates.end.getFullYear()}
                            onChange={handleCustomDateApply}
                            onMonthChange={(month, year) => setSelectedDates(prev => ({ 
                              start: new Date(year, month, 1), 
                              end: new Date(year, month + 1, 0) 
                            }))}
                            selected={{ start: selectedDates.start, end: selectedDates.end }}
                            allowRange
                          />
                        </Card>
                      </div>
                    )}
                  </div>
                </InlineStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Connection Error Banner */}
          {connectionError && (
            <Layout.Section>
              <Banner status="critical" title={t('zrExpress.connectionError')} onDismiss={() => setConnectionError(null)}>
                <p>{connectionError}</p>
              </Banner>
            </Layout.Section>
          )}

          {/* Dashboard and Stats Cards */}
          <Layout.Section>
            <Card>
              <Box padding="400">
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="200">
                      <Text variant="headingLg" as="h2">{t('zrExpress.dashboard')}</Text>
                      <InlineStack gap="300" align="start">
                        <Badge 
                          tone={isConnected ? "success" : "critical"} 
                          size="large" 
                          progress={isConnected ? "complete" : "incomplete"}
                        >
                          {isConnected ? t('general.connected') : t('general.disconnected')}
                        </Badge>
                        {isLoading && <Badge tone="warning" size="large">{t('general.loading')}</Badge>}
                        {isUploading && <Badge tone="info" size="large">{t('general.uploading')}</Badge>}
                      </InlineStack>
                    </BlockStack>
                    <Text variant="headingMd" as="h3">{loaderData?.shop}</Text>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Stats Cards - Lazy load these */}
          {isConnected && (
            <Layout.Section>
              {renderStats}
            </Layout.Section>
          )}

          {/* Loading or Connection Setup */}
          {!hasCredentials ? (
            <Layout.Section>
              <Card>
                <Box padding="500">
                  <BlockStack gap="400" align="center" inlineAlign="center">
                    <div style={{ background: 'linear-gradient(135deg, #F2994A 0%, #F2C94C 100%)', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                      🔑
                    </div>
                    <BlockStack gap="200" align="center" inlineAlign="center">
                      <Text variant="headingLg" as="h2">{t('zrExpress.connectionSettingsTitle') || "إعدادات الاتصال"}</Text>
                      <Text variant="bodyMd" as="p" alignment="center">
                        {t('zrExpress.credentialsRequired') || "رمز الوصول ومفتاح الوصول مطلوبان"}
                      </Text>
                      <TextField
                        label={t('zrExpress.token') || "رمز الوصول"}
                        value={token}
                        onChange={setToken}
                        autoComplete="off"
                        placeholder="أدخل رمز الوصول من ZR Express"
                        disabled={isLoading}
                        requiredIndicator
                      />
                      <TextField
                        label={t('zrExpress.key') || "مفتاح الوصول"}
                        value={key}
                        onChange={setKey}
                        autoComplete="off"
                        placeholder="أدخل مفتاح الوصول من ZR Express"
                        disabled={isLoading}
                        requiredIndicator
                      />
                      {connectionError && <Banner status="critical">{connectionError}</Banner>}
                      <Button 
                        primary 
                        size="large"
                        onClick={handleCredentialsSubmit}
                        loading={isLoading}
                        disabled={isLoading}
                      >
                        {t('zrExpress.saveAndConnect') || "حفظ وربط"}
                      </Button>
                      <Divider />
                      <Text variant="bodySm" color="subdued" alignment="center">
                        <b>كيفية الحصول على بيانات ZR Express:</b><br />
                        1. قم بتسجيل الدخول إلى حسابك في ZR Express.<br />
                        2. انتقل إلى إعدادات المطور أو واجهة API.<br />
                        3. انسخ رمز الوصول (Token) ومفتاح الوصول (Key) وضعهما هنا.<br />
                        إذا لم يكن لديك بيانات، تواصل مع دعم ZR Express.
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </Box>
              </Card>
            </Layout.Section>
          ) : isLoading ? (
            <Layout.Section>
              <Suspense fallback={<LoadingFallback />}>
                <LoadingSpinner title={t('zrExpress.preparingData')} />
              </Suspense>
            </Layout.Section>
          ) : (
            <Layout.Section>
              <Card>
                <Box padding="0">
                  {renderShippingTable}
                </Box>
              </Card>
            </Layout.Section>
          )}
        </Layout>

        {/* Modals */}
        {renderCredentialsModal}

        {/* New Shipment Modal */}
        <Modal
          open={showNewShipment}
          onClose={() => setShowNewShipment(false)}
          title={t('zrExpress.createNewShipmentTitle')}
          primaryAction={{
            content: t('general.create'),
            onAction: handleShipmentSubmit,
            loading: isLoading,
            disabled: isLoading
          }}
          secondaryActions={[
            {
              content: t('general.cancel'),
              onAction: () => setShowNewShipment(false)
            }
          ]}
          size="large"
        >
          <Modal.Section>
            <Form>
              <FormLayout>
                <TextField
                  label={t('zrExpress.clientName')}
                  value={newShipment.Client}
                  onChange={(v) => setNewShipment({ ...newShipment, Client: v })}
                  autoComplete="name"
                  required
                  disabled={isLoading}
                />
                
                <TextField
                  label={t('zrExpress.phone1Label')}
                  value={newShipment.MobileA}
                  onChange={(v) => setNewShipment({ ...newShipment, MobileA: v })}
                  type="tel"
                  autoComplete="tel"
                  required
                  disabled={isLoading}
                />
                
                <TextField
                  label={t('zrExpress.phone2Label')}
                  value={newShipment.MobileB}
                  onChange={(v) => setNewShipment({ ...newShipment, MobileB: v })}
                  type="tel"
                  autoComplete="tel"
                  disabled={isLoading}
                />
                
                <TextField
                  label={t('zrExpress.address')}
                  value={newShipment.Adresse}
                  onChange={(v) => setNewShipment({ ...newShipment, Adresse: v })}
                  required
                  multiline={3}
                  disabled={isLoading}
                />
                
                <Select
                  label={t('zrExpress.wilayaLabel')}
                  options={cities || []}
                  value={newShipment.IDWilaya}
                  onChange={handleCityChange}
                  required
                  disabled={isLoading}
                />
                
                <Select
                  label={t('zrExpress.communeLabel')}
                  options={[
                    { label: t('zrExpress.selectCommune'), value: '' },
                    ...filteredCommunes.map(commune => ({ 
                      label: commune.commune_name_ascii, 
                      value: commune.commune_name_ascii 
                    }))
                  ]}
                  value={newShipment.Commune}
                  onChange={(v) => setNewShipment({ ...newShipment, Commune: v })}
                  required
                  disabled={isLoading || !newShipment.IDWilaya || filteredCommunes.length === 0}
                  placeholder={filteredCommunes.length === 0 ? t('zrExpress.selectWilayaFirst') : t('zrExpress.selectCommune')}
                />
                
                <TextField
                  label={t('zrExpress.totalAmount')}
                  value={newShipment.Total}
                  onChange={(v) => setNewShipment({ ...newShipment, Total: v })}
                  type="number"
                  required
                  disabled={isLoading}
                  suffix="DZD"
                />
                
                <ChoiceList
                  title={t('zrExpress.deliveryType')}
                  choices={[
                    { label: `${t('zrExpress.homeDelivery')} (${shippingPrice.domicile} ${t('general.currency')})`, value: 'domicile' },
                    { label: `${t('zrExpress.stopDesk')} (${shippingPrice.stopdesk} ${t('general.currency')})`, value: 'stopdesk' },
                  ]}
                  selected={[newShipment.TypeLivraison]}
                  onChange={(values) => setNewShipment({ ...newShipment, TypeLivraison: values[0] })}
                  disabled={isLoading}
                />
                
                <Banner>{t('zrExpress.deliveryPrice', { price: deliveryPrice })}</Banner>
                
                <ChoiceList
                  title={t('zrExpress.packageType')}
                  choices={[
                    { label: t('zrExpress.regularPackage'), value: 'normal' },
                    { label: t('zrExpress.exchange'), value: 'exchange' },
                  ]}
                  selected={[newShipment.TypeProduit]}
                  onChange={(values) => setNewShipment({ ...newShipment, TypeProduit: values[0] })}
                  disabled={isLoading}
                />
                
                <TextField
                  label={t('zrExpress.productType')}
                  value={newShipment.Produit}
                  onChange={(v) => setNewShipment({ ...newShipment, Produit: v })}
                  disabled={isLoading}
                />
                
                <TextField
                  label={t('zrExpress.notes')}
                  value={newShipment.Remarque}
                  onChange={(v) => setNewShipment({ ...newShipment, Remarque: v })}
                  multiline={2}
                  disabled={isLoading}
                />
              </FormLayout>
            </Form>
          </Modal.Section>
        </Modal>
      </Page>
    </Frame>
  );
}