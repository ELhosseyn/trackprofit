import { useState, useEffect, useCallback, useMemo } from "react";
import { json } from "@remix-run/node";
import { useLoaderData,  useNavigation, useFetcher } from "@remix-run/react";
import { 
  Page, Text, Card, Button, Modal, TextField, Select, 
  Toast, Frame, FormLayout, DataTable,  Banner, 
  Badge,  DatePicker, Layout, Spinner, Box
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { ZRExpressService } from "../services/zrexpress.server";
import prisma from "../db.server";
import { useLanguage } from "../utils/i18n/LanguageContext.jsx";
import { formatCurrency, formatNumber } from "../utils/formatters";

const BlockStack = ({ children, gap = "0", ...props }) => {
  const gapSizes = {"0": "0", "100": "4px", "200": "8px", "300": "12px", "400": "16px", "500": "20px", "800": "32px"};
  return (<div style={{ display: 'flex', flexDirection: 'column', gap: gapSizes[gap] || gap, ...props.style }} {...props}>{children}</div>);
};

const InlineStack = ({ children, gap = "0", align = "start", blockAlign = "center", wrap = true, ...props }) => {
  const gapSizes = {"0": "0", "100": "4px", "200": "8px", "300": "12px", "400": "16px", "500": "20px", "800": "32px"};
  const alignments = {"start": "flex-start", "end": "flex-end", "center": "center", "space-between": "space-between", "space-around": "space-around", "space-evenly": "space-evenly"};
  const blockAlignments = {"start": "flex-start", "end": "flex-end", "center": "center", "baseline": "baseline", "stretch": "stretch"};
  return (<div style={{ display: 'flex', flexDirection: 'row', gap: gapSizes[gap] || gap, justifyContent: alignments[align] || align, alignItems: blockAlignments[blockAlign] || blockAlign, flexWrap: wrap ? 'wrap' : 'nowrap', ...props.style }} {...props}>{children}</div>);
};

if (!Layout.Section) {
  Layout.Section = ({ children, ...props }) => (<div style={{ marginBottom: '20px' }} {...props}>{children}</div>);
}

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  try {
    let cities = [];
    try {
      const credentials = await prisma.ZRExpressCredential.findUnique({ where: { shop: session.shop } });
      if (credentials) {
        const zrexpress = new ZRExpressService();
        try {
          const tarificationData = await zrexpress.getTarification(credentials.token, credentials.key);
          cities = tarificationData
            .filter(item => item.Domicile !== "0" || item.Stopdesk !== "0")
            .map(item => ({ label: item.Wilaya, value: item.IDWilaya.toString() }))
            .sort((a, b) => parseInt(a.value) - parseInt(b.value));
        } catch (zrError) { console.error('ZRExpress Tarification Error:', zrError); }
      }
    } catch (dbError) { console.error('Database Error:', dbError); }

    let allOrders = [];
    let hasNextPage = true;
    let cursor = null;
    while (hasNextPage) {
      const query = `#graphql
        query getOrders($first: Int!, $after: String) {
          orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
            edges {
              node {
                id
                name
                createdAt
                displayFinancialStatus
                totalPriceSet { shopMoney { amount currencyCode } }
                note
                lineItems(first: 20) {
                  edges {
                    node {
                      id
                      title
                      quantity
                      variant { id inventoryItem { id unitCost { amount currencyCode } } }
                      product { id title }
                      originalUnitPriceSet { shopMoney { amount currencyCode } }
                      originalTotalSet { shopMoney { amount currencyCode } }
                    }
                  }
                }
              }
              cursor
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      `;
      const response = await admin.graphql(query, { variables: { first: 20, after: cursor } });
      const responseJson = await response.json();
      if (responseJson.errors) {
        const accessError = responseJson.errors.find(error => error.message && error.message.includes("not approved to access the Order object"));
        if (accessError) { throw new Error("This app is not approved to access the Order object. Please ensure your app has the necessary permissions and is properly configured for accessing protected customer data. See https://shopify.dev/docs/apps/launch/protected-customer-data for more details."); }
        throw new Error(responseJson.errors[0].message);
      }
      const orders = responseJson.data.orders;
      allOrders = [...allOrders, ...orders.edges];
      hasNextPage = orders.pageInfo.hasNextPage;
      cursor = orders.pageInfo.endCursor;
      if (hasNextPage) { await new Promise(resolve => setTimeout(resolve, 100)); }
    }

    const shipments = await prisma.Shipment.findMany({
      where: { shop: session.shop, orderId: { in: allOrders.map(({ node }) => node.id.split('/').pop()) } },
      select: { orderId: true, status: true, statusId: true, tracking: true }
    });
    const shipmentsMap = shipments.reduce((acc, shipment) => { acc[shipment.orderId] = shipment; return acc; }, {});

    const ordersWithDetails = await Promise.all(allOrders.map(async ({ node }) => {
      try {
        const orderId = node.id.split('/').pop();
        const shipment = shipmentsMap[orderId];
        const orderResponse = await fetch(`https://${session.shop}/admin/api/2024-01/orders/${orderId}.json`, {
          method: 'GET',
          headers: { 'X-Shopify-Access-Token': session.accessToken, 'Content-Type': 'application/json' }
        });
        if (!orderResponse.ok) {
          console.error(`Order ${orderId} fetch failed:`, orderResponse.status, await orderResponse.text());
          throw new Error(`HTTP error! status: ${orderResponse.status}`);
        }
        const orderData = await orderResponse.json();
        return { ...node, note_attributes: orderData.order.note_attributes || [], shipping_address: orderData.order.shipping_address || {}, shipment_status: shipment ? shipment.status : null, tracking_info: shipment ? shipment.tracking : null };
      } catch (error) {
        console.error(`Failed to fetch details for order ${node.name}:`, error);
        return node;
      }
    }));

    return json({
      orders: { edges: ordersWithDetails.map(order => ({ node: order })) },
      totalCount: ordersWithDetails.length,
      cities, error: null, shop: session.shop, timestamp: Date.now()
    });

  } catch (error) {
    console.error("Orders Query Error:", error);
    return json({ orders: null, cities: [], error: error.message, shop: session.shop, timestamp: Date.now() }, { status: 500 });
  }
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const { _action, ...shipmentValues } = Object.fromEntries(formData);

  if (_action === 'createShipment') {
    try {
      const requiredFields = ['Client', 'MobileA', 'Adresse', 'IDWilaya', 'Commune', 'Total', 'TProduit', 'Confrimee'];
      const missingFields = requiredFields.filter(field => !shipmentValues[field]);
      if (missingFields.length > 0) {
        return json({ success: false, error: `Missing required fields: ${missingFields.join(', ')}` }, { status: 400 });
      }

      const totalCost = parseFloat(shipmentValues.totalCost || "0");
      const totalRevenue = parseFloat(shipmentValues.Total || "0");
      const totalProfit = totalRevenue - totalCost;
      
      const enhancedShipmentValues = {
        ...shipmentValues,
        totalCost: totalCost.toString(),
        totalRevenue: totalRevenue.toString(),
        totalProfit: totalProfit.toString()
      };

      const credentials = await prisma.ZRExpressCredential.findUnique({ where: { shop: session.shop } });
      if (!credentials) {
        return json({ success: false, error: 'ZRExpress credentials not found.' }, { status: 400 });
      }

      const zrexpress = new ZRExpressService();
      const result = await zrexpress.addColis(credentials.token, credentials.key, enhancedShipmentValues, session);
      if (!result.success) {
        return json({ success: false, error: result.error || 'Error creating shipment' }, { status: 500 });
      }

      if (result.shipment?.id && shipmentValues.orderId) {
        try {
          const orderId = shipmentValues.orderId;
          const orderName = shipmentValues.TProduit;
          const totalCost = parseFloat(shipmentValues.totalCost || 0);
          const totalRevenue = parseFloat(shipmentValues.Total || 0);
          const profit = totalRevenue - totalCost;
          
          let lineItems = [];
          if (shipmentValues.lineItems) {
            try { lineItems = JSON.parse(shipmentValues.lineItems); } catch (err) { console.error('Failed to parse line items:', err); }
          }
          
          await prisma.OrderCOGS.upsert({
            where: { shop_orderId: { shop: session.shop, orderId: orderId } },
            update: { totalCost, totalRevenue, profit, ...(lineItems.length > 0 ? { items: { deleteMany: {}, create: lineItems } } : {}) },
            create: { shop: session.shop, orderId, orderName, totalCost, totalRevenue, profit, ...(lineItems.length > 0 ? { items: { create: lineItems } } : {}) }
          });
        } catch (cogsError) { console.error('Failed to save COGS information:', cogsError); }
      }
      return json({ success: true, shipmentId: result.shipment?.id, message: 'Shipment created successfully!' });
    } catch (error) {
      console.error("Create Shipment Action Error:", error);
      return json({ success: false, error: error.message }, { status: 500 });
    }
  }
  return json({ success: false, error: 'Invalid action.' }, { status: 400 });
};

export default function Orders() {
const initialData = useLoaderData();
const [data, setData] = useState(initialData);
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";
  const fetcher = useFetcher();
  const { language, isRTL, t } = useLanguage();

  // ✅ FIX: Dynamically determine the currency code from the loaded data.
  const currencyCode = useMemo(() => {
    if (data?.orders?.edges?.length > 0) {
      const firstOrderWithCurrency = data.orders.edges.find(edge => edge?.node?.totalPriceSet?.shopMoney?.currencyCode);
      if (firstOrderWithCurrency) {
        return firstOrderWithCurrency.node.totalPriceSet.shopMoney.currencyCode;
      }
    }
    return 'DZD'; // Fallback currency
  }, [data.orders]);
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [communesData, setCommunesData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const loadCommunes = async () => {
      try {
        const response = await fetch('/data/communes.json');
        if (response.ok) {
          const data = await response.json();
          setCommunesData(data);
        }
      } catch (error) {
        console.warn('Could not load communes data:', error)
      }
    };
    if (typeof window !== 'undefined' && communesData.length === 0) {
      loadCommunes();
    }
  }, [communesData.length]);

  const [shipmentForm, setShipmentForm] = useState({
    Client: "", MobileA: "", MobileB: "", Adresse: "", IDWilaya: "", Wilaya: "",
    Commune: "", Total: "0", Note: "", TProduit: "", TypeLivraison: "0",
    TypeColis: "0", Confrimee: "1", DeliveryPartner: "zrexpress", orderId: "",
    deliveryFee: "0", cancelFee: "0"
  });

  const isArabic = language === 'ar';
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedDates, setSelectedDates] = useState({ start: new Date(), end: new Date() });
  const [datePickerActive, setDatePickerActive] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [stats, setStats] = useState({
    totalOrders: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0,
    avgOrderValue: 0, avgProfit: 0
  });

  const deliveryTypes = useMemo(() => [
    { label: t('orders.deliveryTypes.home'), value: "0" },
    { label: t('orders.deliveryTypes.office'), value: "1" }
  ], [t]);
  const packageTypes = useMemo(() => [
    { label: t('orders.packageTypes.regular'), value: "0" },
    { label: t('orders.packageTypes.exchange'), value: "1" }
  ], [t]);
  const confirmedStatusOptions = useMemo(() => [
    { label: t('orders.confirmationStatus.confirmed'), value: "1" },
    { label: t('orders.confirmationStatus.notConfirmed'), value: "0" }
  ], [t]);
  
  const filteredCommunes = useMemo(() => {
    if (shipmentForm.IDWilaya) {
      const wilayaCode = shipmentForm.IDWilaya.toString().padStart(2, '0');
      return communesData.filter(commune => commune.wilaya_code === wilayaCode);
    }
    return [];
  }, [shipmentForm.IDWilaya, communesData]);

  const dateRangePresets = useMemo(() => [
    { label: t('orders.datePresets.today'), value: 'daily' },
    { label: t('orders.datePresets.last7Days'), value: '7-day' },
    { label: t('orders.datePresets.thisMonth'), value: 'monthly' },
    { label: t('orders.datePresets.last3Months'), value: '3-month' },
    { label: t('orders.datePresets.last6Months'), value: '6-month' },
    { label: t('orders.datePresets.thisYear'), value: 'yearly' },
  ], [t]);

  const getPresetDates = useCallback((preset) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (preset) {
      case 'daily': return { start: today, end: now };
      case '7-day': const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 6); return { start: sevenDaysAgo, end: now };
      case 'monthly': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
      case '3-month': return { start: new Date(now.getFullYear(), now.getMonth() - 3, 1), end: now };
      case '6-month': return { start: new Date(now.getFullYear(), now.getMonth() - 6, 1), end: now };
      case 'yearly': return { start: new Date(now.getFullYear(), 0, 1), end: now };
      default: return { start: today, end: now };
    }
  }, []);

  const handleDatePresetClick = useCallback((preset) => {
    setSelectedDates(getPresetDates(preset));
    setDatePickerActive(false);
  }, [getPresetDates]);

  const handleDateChange = useCallback(({ start, end }) => {
    setSelectedDates({ start, end });
    setDatePickerActive(false);
  }, []);

  const getCreatedAt = (node) => new Date(node.createdAt);

  const getEarliestOrderDate = useCallback(() => {
    if (!data.orders || !Array.isArray(data.orders.edges) || data.orders.edges.length === 0) return new Date();
    return data.orders.edges.reduce((min, edge) => {
      const d = getCreatedAt(edge.node);
      return d < min ? d : min;
    }, new Date());
  }, [data.orders]);

  const filterOrdersByDateRange = useCallback((start, end) => {
    if (!data.orders || !Array.isArray(data.orders.edges)) return [];
    const startDate = new Date(start); startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end); endDate.setHours(23, 59, 59, 999);
    return data.orders.edges.filter((edge) => {
      const createdAt = getCreatedAt(edge.node);
      return createdAt >= startDate && createdAt <= endDate;
    });
  }, [data.orders]);

  useEffect(() => {
    if (data.orders && data.orders.edges && data.orders.edges.length > 0) {
      const minDate = getEarliestOrderDate();
      setSelectedDates({ start: minDate, end: new Date() });
    }
  }, [data.orders, getEarliestOrderDate]);

  useEffect(() => {
    const filtered = filterOrdersByDateRange(selectedDates.start, selectedDates.end);
    setFilteredData(filtered);
    setCurrentPage(1);

    let totalOrders = 0, totalRevenue = 0, totalCost = 0, totalProfit = 0;
    let totalShippingFee = 0, totalCancelFee = 0;
    filtered.forEach(({ node }) => {
      if (node.displayFinancialStatus) {
        totalOrders++;
        const orderAmount = parseFloat(node.totalPriceSet?.shopMoney?.amount || 0);
        totalRevenue += orderAmount;

        let orderCost = 0;
        node.lineItems?.edges.forEach(({ node: item }) => {
          const quantity = item.quantity || 1;
          const costPerItem = parseFloat(item.variant?.inventoryItem?.unitCost?.amount || 0);
          orderCost += (costPerItem * quantity);
        });

        // Aggregate shippingFee and cancelFee from note_attributes or shipment data if available
        if (Array.isArray(node.note_attributes)) {
          const shippingFeeAttr = node.note_attributes.find(attr => attr.name.toLowerCase().includes('shippingfee') || attr.name.toLowerCase().includes('deliveryfee'));
          const cancelFeeAttr = node.note_attributes.find(attr => attr.name.toLowerCase().includes('cancelfee'));
          if (shippingFeeAttr && shippingFeeAttr.value) {
            totalShippingFee += parseFloat(shippingFeeAttr.value) || 0;
          }
          if (cancelFeeAttr && cancelFeeAttr.value) {
            totalCancelFee += parseFloat(cancelFeeAttr.value) || 0;
          }
        }
        // If shipment data is available, aggregate from there as well
        if (node.shipment_status && node.tracking_info) {
          if (typeof node.tracking_info.deliveryFee !== 'undefined') {
            totalShippingFee += parseFloat(node.tracking_info.deliveryFee) || 0;
          }
          if (typeof node.tracking_info.cancelFee !== 'undefined') {
            totalCancelFee += parseFloat(node.tracking_info.cancelFee) || 0;
          }
        }

        totalCost += orderCost;
        totalProfit += (orderAmount - orderCost);
      }
    });

    setStats({
      totalOrders,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      avgOrderValue: totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0,
      avgProfit: totalOrders > 0 ? Number((totalProfit / totalOrders).toFixed(2)) : 0,
      totalShippingFee: Number(totalShippingFee.toFixed(2)),
      totalCancelFee: Number(totalCancelFee.toFixed(2)),
      totalShippingAndCancelFee: Number((totalShippingFee + totalCancelFee).toFixed(2))
    });
  }, [selectedDates, data.orders, filterOrdersByDateRange]);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('fr-CA');

  const defaultWilaya = useMemo(() => data.cities?.[0] || { value: "16", label: "Alger" }, [data.cities]);

  const handleOrderSelect = useCallback((order) => {
    setSelectedOrder(order);
    const shippingAddress = order.shipping_address || {};
    const noteAttributes = Array.isArray(order.note_attributes) ? order.note_attributes : [];
    const orderTotal = order.totalPriceSet?.shopMoney?.amount || "0";
    
    const findNoteAttribute = (names, defaultValue = "") => {
      if (!Array.isArray(names)) names = [names];
      for (const name of names) {
        const attribute = noteAttributes.find(attr => attr.name.toLowerCase() === name.toLowerCase() || attr.name.toLowerCase().replace(/[()]/g, '') === name.toLowerCase());
        if (attribute && attribute.value) return attribute.value;
      }
      return defaultValue;
    };
    
    const firstName = findNoteAttribute(['First name', 'Name']) || shippingAddress.first_name || '';
    const lastName = findNoteAttribute(['Last name']) || shippingAddress.last_name || '';
    const customerName = `${firstName} ${lastName}`.trim();
    
    let primaryPhone = findNoteAttribute(['Phone number', 'Phone', 'MobileA']) || shippingAddress.phone || '';
    if (primaryPhone.startsWith("+213")) primaryPhone = primaryPhone.replace("+213", "0");
    primaryPhone = primaryPhone.replace(/\s+/g, "");

    const secondaryPhone = findNoteAttribute(['phone_2', 'secondary_phone', 'Phone number 2', 'MobileB']) || '';
    const address1 = findNoteAttribute(['Address', 'Adresse']) || shippingAddress.address1 || '';
    const address2 = findNoteAttribute(['Address 2', 'Adresse 2']) || shippingAddress.address2 || '';
    const rawCity = findNoteAttribute(['city', 'Wilaya الولاية', 'Province (State)']) || shippingAddress.city || '';
    const rawProvince = findNoteAttribute(['Province', 'Province (State)']) || shippingAddress.province || '';
    const rawCommune = findNoteAttribute(['Commune', 'City']) || '';

    let wilayaId = "";
    let wilayaName = "";
    let commune = "";

    const normalizedCities = data.cities?.map(city => ({ ...city, normalizedValue: city.value.toString().padStart(2, '0') }));
    const cityRegex = /^([\d]+)\s*-\s*(.+?)(?:\s+[\u0600-\u06FF]+)?$/;
    const cityMatch = rawCity.match(cityRegex);

    if (cityMatch) {
      wilayaId = parseInt(cityMatch[1].trim()).toString();
      wilayaName = cityMatch[2].trim();
      commune = rawCommune || rawProvince || '';
    } else {
      const matchedCity = normalizedCities?.find(city => city.label.toLowerCase() === rawCity?.toLowerCase() || rawCity?.toLowerCase().includes(city.label.toLowerCase()));
      if (matchedCity) {
        wilayaId = parseInt(matchedCity.normalizedValue).toString();
        wilayaName = matchedCity.label;
        commune = rawCommune || rawProvince || rawCity || '';
      } else {
        const extractWilayaId = (str) => str?.match(/^([\d]+)/)?.[1] || null;
        const cityWilayaId = extractWilayaId(rawCity);
        const provinceWilayaId = extractWilayaId(rawProvince);
        const paddedCityWilayaId = cityWilayaId ? cityWilayaId.padStart(2, '0') : null;
        const paddedProvinceWilayaId = provinceWilayaId ? provinceWilayaId.padStart(2, '0') : null;
        const matchById = normalizedCities?.find(city => city.normalizedValue === paddedCityWilayaId || city.normalizedValue === paddedProvinceWilayaId);
        if (matchById) {
          wilayaId = parseInt(matchById.normalizedValue).toString();
          wilayaName = matchById.label;
          commune = matchById.normalizedValue === paddedProvinceWilayaId ? rawCity : (rawCommune || rawProvince || '');
        }
      }
    }

    // Prioritize Region note attribute for commune selection
    const paddedWilayaId = wilayaId ? wilayaId.padStart(2, '0') : '';
    const availableCommunes = communesData?.filter(item => item?.wilaya_code === paddedWilayaId) || [];
    const regionCommune = findNoteAttribute(['Region']);
    if (regionCommune) {
      // Try to match regionCommune to availableCommunes
      let matchedCommune = availableCommunes.find(item =>
        (item.commune_name_ascii && item.commune_name_ascii === regionCommune) ||
        (item.commune_name && item.commune_name === regionCommune)
      );
      if (!matchedCommune) {
        // Try case-insensitive match
        matchedCommune = availableCommunes.find(item =>
          (item.commune_name_ascii && item.commune_name_ascii.toLowerCase() === regionCommune.toLowerCase()) ||
          (item.commune_name && item.commune_name.toLowerCase() === regionCommune.toLowerCase())
        );
      }
      if (!matchedCommune) {
        // Try partial match
        matchedCommune = availableCommunes.find(item =>
          (item.commune_name_ascii && item.commune_name_ascii.includes(regionCommune)) ||
          (item.commune_name && item.commune_name.includes(regionCommune))
        );
      }
      commune = matchedCommune ? (matchedCommune.commune_name_ascii || matchedCommune.commune_name) : regionCommune;
    } else {
      if (commune && commune.toLowerCase().includes(wilayaName.toLowerCase())) commune = '';
      let matchedCommune = null;
      // Normalize city if it matches pattern like '32- البيض'
      let normalizedCity = rawCity;
      const cityNumMatch = rawCity.match(/^([\d]+)[-\s]+(.+)$/);
      if (cityNumMatch) {
        normalizedCity = cityNumMatch[2].trim();
      }
      if (availableCommunes.length > 0) {
        // Try exact match (ascii or arabic)
        if (commune) {
          matchedCommune = availableCommunes.find(item =>
            (item.commune_name_ascii && item.commune_name_ascii.toLowerCase() === commune.toLowerCase()) ||
            (item.commune_name && item.commune_name.toLowerCase() === commune.toLowerCase())
          );
        }
        // Try partial/fuzzy match if not found or commune is empty
        if (!matchedCommune && commune && commune.length > 1) {
          const communeWords = commune.toLowerCase().split(/\s+/).filter(word => word.length > 1);
          const scoredCommunes = availableCommunes.map(item => {
            const ascii = item.commune_name_ascii ? item.commune_name_ascii.toLowerCase() : '';
            const arabic = item.commune_name ? item.commune_name.toLowerCase() : '';
            const matchCount = communeWords.filter(word => ascii.includes(word) || arabic.includes(word)).length;
            return { item, matchCount };
          });
          scoredCommunes.sort((a, b) => b.matchCount - a.matchCount);
          if (scoredCommunes.length > 0 && scoredCommunes[0].matchCount > 0) {
            matchedCommune = scoredCommunes[0].item;
          }
        }
        // If still not matched, try to match by city/province if commune is empty
        if (!matchedCommune && (!commune || commune.trim() === '')) {
          // Try to match by province/city, including normalized city
          const possibleNames = [rawCommune, rawProvince, rawCity, normalizedCity].map(x => x && x.toLowerCase().trim()).filter(Boolean);
          matchedCommune = availableCommunes.find(item =>
            possibleNames.some(name =>
              (item.commune_name_ascii && item.commune_name_ascii.toLowerCase() === name) ||
              (item.commune_name && item.commune_name.toLowerCase() === name)
            )
          );
        }
        // If still not matched, try to match by partial city/province
        if (!matchedCommune && (!commune || commune.trim() === '')) {
          const possibleNames = [rawCommune, rawProvince, rawCity, normalizedCity].map(x => x && x.toLowerCase().trim()).filter(Boolean);
          matchedCommune = availableCommunes.find(item =>
            possibleNames.some(name =>
              (item.commune_name_ascii && item.commune_name_ascii.toLowerCase().includes(name)) ||
              (item.commune_name && item.commune_name.toLowerCase().includes(name))
            )
          );
        }
      }
      // If no match, set commune to empty string (forces UI to show 'Select commune')
      commune = matchedCommune ? (matchedCommune.commune_name_ascii || matchedCommune.commune_name) : '';
    }
    
    let fullAddress = [address1, address2].filter(Boolean).join(", ");
    if (!fullAddress && shippingAddress) fullAddress = [shippingAddress.address1, shippingAddress.address2].filter(Boolean).join(", ");
    
    const productDescription = order.lineItems?.edges?.length > 0 ? order.lineItems.edges.map(({ node }) => `${node.title} (x${node.quantity})`).join(", ") : 'N/A';
    
    const updatedForm = {
      ...shipmentForm, Client: customerName || 'N/A', MobileA: primaryPhone || 'N/A', MobileB: secondaryPhone || '',
      Adresse: fullAddress || 'N/A', IDWilaya: wilayaId || defaultWilaya.value.toString(), Wilaya: wilayaName || defaultWilaya.label,
      Commune: commune || '', Total: orderTotal, TProduit: productDescription || order.name || 'N/A',
      orderId: order.id.split('/').pop(), Note: order.note || ''
    };
    
    setShipmentForm(updatedForm);
    setIsModalOpen(true);
  }, [shipmentForm, defaultWilaya, communesData, data.cities]);

  const handleShipmentSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (fetcher.state === "submitting") return;
    
    const requiredFields = { Client: shipmentForm.Client, MobileA: shipmentForm.MobileA, Adresse: shipmentForm.Adresse, IDWilaya: shipmentForm.IDWilaya, Commune: shipmentForm.Commune, Total: shipmentForm.Total, TProduit: shipmentForm.TProduit };
    const missingFields = Object.entries(requiredFields).filter(([key, value]) => !value || value.trim() === '').map(([key]) => key);
    if (missingFields.length > 0) {
      setToastMessage({ content: `Please fill in required fields: ${missingFields.join(', ')}`, error: true });
      return;
    }
    
    let totalCost = 0;
    let lineItems = [];
    if (selectedOrder?.lineItems?.edges) {
      selectedOrder.lineItems.edges.forEach(({ node }) => {
        const quantity = node.quantity || 1;
        const unitCost = parseFloat(node.variant?.inventoryItem?.unitCost?.amount || 0);
        const price = parseFloat(node.originalUnitPriceSet?.shopMoney?.amount || 0);
        const itemTotalCost = unitCost * quantity;
        const itemTotalRevenue = price * quantity;
        totalCost += itemTotalCost;
        lineItems.push({
          productId: node.product?.id?.split('/').pop() || '', variantId: node.variant?.id?.split('/').pop() || '', title: node.title,
          quantity, unitCost, price, totalCost: itemTotalCost, totalRevenue: itemTotalRevenue, profit: itemTotalRevenue - itemTotalCost
        });
      });
    }
    
    const formData = new FormData();
    Object.entries(shipmentForm).forEach(([key, value]) => formData.append(key, value));
    formData.append("totalCost", totalCost.toString());
    formData.append("totalRevenue", parseFloat(shipmentForm.Total || 0).toString());
    formData.append("totalProfit", (parseFloat(shipmentForm.Total || 0) - totalCost).toString());
    formData.append("lineItems", JSON.stringify(lineItems));
    formData.append("_action", "createShipment");
    fetcher.submit(formData, { method: "post" });
  }, [fetcher, shipmentForm, selectedOrder]);

  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      if (fetcher.data.success) {
        setToastMessage({ content: `${t('toast.shipmentCreated')} Tracking: ${fetcher.data.shipmentId || 'N/A'}`, error: false });
        setIsModalOpen(false);
        if (selectedOrder) {
          setData(prevData => {
            if (!prevData.orders || !prevData.orders.edges) return prevData;
            const updatedEdges = prevData.orders.edges.map(edge => {
              if (edge.node.id === selectedOrder.id) {
                return { ...edge, node: { ...edge.node, shipment_status: 'En Préparation', tracking_info: fetcher.data.shipmentId } };
              }
              return edge;
            });
            return { ...prevData, orders: { ...prevData.orders, edges: updatedEdges } };
          });
          setSelectedOrder(null);
        }
      } else {
        setToastMessage({ content: t('errors.shipmentCreation') + ': ' + (fetcher.data.error || 'Unknown error'), error: true });
      }
    }
  }, [fetcher.data, fetcher.state, t, selectedOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const currentPageData = useMemo(() => filteredData.slice((safeCurrentPage - 1) * rowsPerPage, safeCurrentPage * rowsPerPage), [filteredData, safeCurrentPage, rowsPerPage]);

  const StatCard = ({ title, value, icon, color = "subdued" }) => (
    <Card padding="400">
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="start">
          <Text variant="bodyMd" tone={color}>{title}</Text>
          <div style={{ fontSize: '24px' }}>{icon}</div>
        </InlineStack>
        <Text variant="heading2xl" as="h3">{value}</Text>
      </BlockStack>
    </Card>
  );

  if (data.error || !data.orders) {
    return (
      <Page title={t('orders.title')}>
        <Layout>
          <Layout.Section>
            <Banner status="critical">
              <p>{t('errors.ordersLoading')}: {data.error || 'Orders data is not available'}</p>
              <p>{t('general.shop')}: {data.shop}</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const toastMarkup = toastMessage ? (<Toast content={toastMessage.content} error={toastMessage.error} onDismiss={() => setToastMessage(null)} duration={4000} />) : null;

  return (
    <Frame>
      <Page fullWidth title={<div style={{ display: 'flex', alignItems: 'center', gap: '12px', direction: isRTL ? 'rtl' : 'ltr' }}>
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', padding: '8px', color: 'white', fontSize: '20px', fontWeight: 'bold' }}>📦</div>
            <Text variant="headingXl" as="h1">{t('orders.title')}</Text>
          </div>}>
        <Layout>
          <Layout.Section>
            <Card><Box padding="400"><BlockStack gap="400"><InlineStack align="space-between" blockAlign="center" wrap={false}>
              <BlockStack gap="200">
                <Text variant="headingLg" as="h2">{t('orders.dashboardTitle')}</Text>
                <InlineStack gap="300" align="start">{isLoading && <Badge tone="warning" size="large">{t('orders.updating')}</Badge>}</InlineStack>
              </BlockStack>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: isArabic ? 'flex-start' : 'flex-end', position: 'relative' }}>
                <InlineStack gap="200" wrap={false}>{dateRangePresets.map(preset => (<Button key={preset.value} size="slim" onClick={() => handleDatePresetClick(preset.value)}>{preset.label}</Button>))}</InlineStack>
                <Button onClick={() => setDatePickerActive(!datePickerActive)} disclosure={datePickerActive ? "up" : "down"}>{`📅 ${formatDate(selectedDates.start)} - ${formatDate(selectedDates.end)}`}</Button>
                {datePickerActive && (<div style={{ position: 'absolute', top: '105%', zIndex: 400, right: isArabic ? undefined : 0, left: isArabic ? 0 : undefined }}>
                  <Card><DatePicker month={selectedDates.end.getMonth()} year={selectedDates.end.getFullYear()} onChange={handleDateChange} onMonthChange={(month, year) => setSelectedDates(prev => ({ start: new Date(year, month, 1), end: new Date(year, month + 1, 0) }))} selected={{ start: selectedDates.start, end: selectedDates.end, }} allowRange/></Card>
                </div>)}
              </div>
            </InlineStack></BlockStack></Box></Card>
          </Layout.Section>

          <Layout.Section>
            {/* ✅ FIX: Update Stat Cards to use dynamic currency */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <StatCard title={t('orders.stats.totalOrders')} value={formatNumber(stats.totalOrders)} icon="🛒" color="success" />
              <StatCard title={t('orders.stats.totalRevenue')} value={formatCurrency(stats.totalRevenue, false, currencyCode)} icon="💵" color="info" />
              <StatCard title={t('orders.stats.totalCost')} value={formatCurrency(stats.totalCost, false, currencyCode)} icon="💸" color="warning" />
              <StatCard title={t('orders.stats.totalProfit')} value={formatCurrency(stats.totalProfit, stats.totalProfit < 0, currencyCode)} icon="💰" color="success" />
              <StatCard title={t('orders.stats.avgOrderValue')} value={formatCurrency(stats.avgOrderValue, false, currencyCode)} icon="💎" color="success" />
              <StatCard title={t('orders.stats.avgProfit')} value={formatCurrency(stats.avgProfit, stats.avgProfit < 0, currencyCode)} icon="📈" color="info" />
            </div>
          </Layout.Section>

          <Layout.Section>
            <Card>
              {isLoading ? (<div style={{ textAlign: 'center', padding: '2rem' }}><Spinner accessibilityLabel={t('orders.loadingOrders')} size="large" /></div>) : !currentPageData.length ? (<Box padding="400" style={{ textAlign: 'center' }}><Text variant="bodyMd" as="p">{t('orders.noOrdersInRange')}</Text></Box>) : (
                <>
                  <DataTable columnContentTypes={['text', 'text', 'numeric', 'text', 'text', 'text', 'text', 'text', 'text', 'text']}
                    headings={[`📅 ${t('orders.table.date')}`, `🔢 ${t('orders.table.order')}`, `💰 ${t('orders.table.total')}`, `👤 ${t('orders.table.customer')}`, `📱 ${t('orders.phone')} 1`, `📱 ${t('orders.phone')} 2`, `🏙️ ${t('orders.state')}`, `🏢 ${t('orders.city')}`, `📍 ${t('orders.table.status')}`, `🚚 ${t('orders.shipmentDetails')}`]}
                    rows={currentPageData.map(({ node }) => {
                      const noteAttributes = node.note_attributes || [];
                      const findNoteAttribute = (names) => {
                        const nameArray = Array.isArray(names) ? names : [names];
                        for (const name of nameArray) { const attr = noteAttributes.find(a => a.name.toLowerCase() === name.toLowerCase()); if (attr?.value) return attr.value; }
                        return null;
                      };
                      const firstName = findNoteAttribute(['first name', 'name']) || node.shipping_address?.first_name;
                      const lastName = findNoteAttribute('last name') || node.shipping_address?.last_name;
                      const customerName = [firstName, lastName].filter(Boolean).join(' ') || 'N/A';
                      const phone1 = findNoteAttribute(['phone number', 'phone', 'phone 1']) || node.shipping_address?.phone || 'N/A';
                      const phone2 = findNoteAttribute(['phone number 2', 'phone_2', 'secondary_phone', 'phone 2']) || '-';
                      let wilaya = findNoteAttribute(['wilaya الولاية', 'province (state)', 'city']) || node.shipping_address?.city || '';
                      const cityMatch = wilaya.match(/^(\d+)\s*-\s*([^-]+?)(?:\s+[\u0600-\u06FF]+)?$/);
                      if (cityMatch) wilaya = cityMatch[2].trim();
                      // City (Commune/Region)
                      let city = findNoteAttribute(['Region', 'Commune', 'Province']) || node.shipping_address?.province || '-';
                      // Special case: if wilaya and city are the same, but Region exists, use Region
                      if (wilaya && city && wilaya === city) {
                        const region = findNoteAttribute(['Region']);
                        if (region) city = region;
                      }
                      const amount = parseFloat(node.totalPriceSet?.shopMoney?.amount || 0);
                      // ✅ FIX: Use dynamic currency in data table.
                      const currency = node.totalPriceSet?.shopMoney?.currencyCode || currencyCode;
                      return [
                        formatDate(node.createdAt), node.name, formatCurrency(amount, false, currency), customerName, phone1, phone2, wilaya, city,
                        <Badge tone={node.displayFinancialStatus === 'PAID' ? 'success' : 'warning'}>{node.displayFinancialStatus}</Badge>,
                        node.shipment_status ? <Badge tone="success">📦 {node.shipment_status}</Badge> : <Button size="slim" onClick={() => handleOrderSelect(node)}>{t('orders.createShipmentButton')}</Button>
                      ];
                    })}
                    footerContent={<div style={{ padding: '16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontWeight: 'bold', textAlign: 'center' }}>{`📊 ${t('orders.stats.totalOrders')}: ${filteredData.length} | ${t('orders.pagination.page')} ${safeCurrentPage} ${t('orders.pagination.of')} ${totalPages}`}</div>}
                  />
                  {totalPages > 1 && (<Box padding="400"><InlineStack gap="400" align="center">
                    <Button onClick={() => setCurrentPage(safeCurrentPage - 1)} disabled={safeCurrentPage <= 1}>{t('orders.pagination.previous')}</Button>
                    <Text variant="bodyMd" as="span">{`${t('orders.pagination.page')} ${safeCurrentPage} ${t('orders.pagination.of')} ${totalPages}`}</Text>
                    <Button onClick={() => setCurrentPage(safeCurrentPage + 1)} disabled={safeCurrentPage >= totalPages}>{t('orders.pagination.next')}</Button>
                  </InlineStack></Box>)}
                </>
              )}
            </Card>
          </Layout.Section>
        </Layout>
        <Modal open={isModalOpen} onClose={() => {if (fetcher.state === "submitting") return; setIsModalOpen(false);}} title={t('orders.createShipment')}
          primaryAction={{ content: t('orders.createShipmentButton'), onAction: handleShipmentSubmit, loading: fetcher.state === "submitting", disabled: fetcher.state === "submitting" }}
          secondaryActions={[{ content: t('general.cancel'), onAction: () => {if (fetcher.state === "submitting") return; setIsModalOpen(false);}, disabled: fetcher.state === "submitting" }]}>
          <Modal.Section>
            {fetcher.state === "submitting" && (<Banner tone="info"><InlineStack gap="200" align="center"><Spinner size="small" /><Text variant="bodyMd">Creating shipment, please wait...</Text></InlineStack></Banner>)}
            <FormLayout>
              {selectedOrder && (<Card><Box padding="300" background="bg-surface-secondary"><BlockStack gap="300">
                <Text variant="headingMd" as="h3">{t('orders.stats.totalCost')}</Text>
                <BlockStack gap="200">
                  {selectedOrder.lineItems?.edges.map(({ node }, index) => {
                    const quantity = node.quantity || 1;
                    const unitCost = parseFloat(node.variant?.inventoryItem?.unitCost?.amount || 0);
                    const price = parseFloat(node.originalUnitPriceSet?.shopMoney?.amount || 0);
                    const itemProfit = (price * quantity) - (unitCost * quantity);
                    const itemMargin = price > 0 ? ((price - unitCost) / price * 100) : 0;
                    
                    // ✅ FIX: Use dynamic currency in modal summary.
                    const currency = node.originalTotalSet?.shopMoney?.currencyCode || currencyCode;
                    
                    return (
                      <InlineStack key={index} align="space-between" blockAlign="center">
                        <Text variant="bodyMd">{node.title} (x{quantity})</Text>
                        <InlineStack gap="200">
                          <Text variant="bodyMd" tone="subdued">{t('orders.stats.totalCost')}: {formatCurrency(unitCost * quantity, false, currency)}</Text>
                          <Text variant="bodyMd" tone={itemProfit >= 0 ? "success" : "critical"}>{t('orders.stats.totalProfit')}: {formatCurrency(itemProfit, itemProfit < 0, currency)} ({itemMargin.toFixed(1)}%)</Text>
                        </InlineStack>
                      </InlineStack>
                    );
                  })}
                </BlockStack>
              </BlockStack></Box></Card>)}
              
              <FormLayout.Group>
                <TextField label={t('orders.customer')} value={shipmentForm.Client} onChange={(v) => setShipmentForm({...shipmentForm, Client: v})} autoComplete="off" requiredIndicator/>
                <TextField label={t('orders.phone')} value={shipmentForm.MobileA} onChange={(v) => setShipmentForm({...shipmentForm, MobileA: v})} type="tel" autoComplete="off" requiredIndicator/>
              </FormLayout.Group>
              <FormLayout.Group>
                <TextField label={t('orders.secondaryPhone')} value={shipmentForm.MobileB} onChange={(v) => setShipmentForm({...shipmentForm, MobileB: v})} type="tel" autoComplete="off"/>
                {/* ✅ FIX: Use dynamic currency prefix in modal form field. */}
                <TextField label={t('orders.total')} value={shipmentForm.Total} onChange={(v) => setShipmentForm({...shipmentForm, Total: v})} type="number" autoComplete="off" requiredIndicator prefix={currencyCode}/>
              </FormLayout.Group>
              <TextField label={t('orders.address')} value={shipmentForm.Adresse} onChange={(v) => setShipmentForm({...shipmentForm, Adresse: v})} autoComplete="off" multiline={3} requiredIndicator/>
              <FormLayout.Group>
                <Select
                  label={t('orders.wilaya')}
                  options={data.cities}
                  value={shipmentForm.IDWilaya}
                  onChange={v => {
                    const normV = v ? parseInt(v).toString() : "";
                    const selCity = data.cities.find(c => parseInt(c.value).toString() === normV);
                    setShipmentForm({ ...shipmentForm, IDWilaya: normV, Wilaya: selCity ? selCity.label : "", Commune: "" });
                  }}
                  requiredIndicator
                />
                <Select
                  label={t('orders.commune')}
                  value={shipmentForm.Commune}
                  options={filteredCommunes.map(c => ({ key: c.id || c.commune_name_ascii, label: c.commune_name_ascii, value: c.commune_name_ascii }))}
                  onChange={v => setShipmentForm({ ...shipmentForm, Commune: v })}
                  requiredIndicator
                  disabled={!shipmentForm.IDWilaya || filteredCommunes.length === 0}
                  placeholder={filteredCommunes.length === 0 ? t('orders.selectWilayaFirst') : t('orders.selectCommune')}
                />
              </FormLayout.Group>
              <FormLayout.Group>
                <Select label={t('orders.deliveryType')} options={deliveryTypes} value={shipmentForm.TypeLivraison} onChange={(v) => setShipmentForm({...shipmentForm, TypeLivraison: v})}/>
                <Select label={t('orders.packageType')} options={packageTypes} value={shipmentForm.TypeColis} onChange={(v) => setShipmentForm({...shipmentForm, TypeColis: v})}/>
              </FormLayout.Group>
              <FormLayout.Group>
                <TextField label={t('orders.productDescription')} value={shipmentForm.TProduit} onChange={(v) => setShipmentForm({...shipmentForm, TProduit: v})} autoComplete="off" requiredIndicator/>
                <Select label={t('orders.confirmationStatus.label')} options={confirmedStatusOptions} value={shipmentForm.Confrimee} onChange={(v) => setShipmentForm({...shipmentForm, Confrimee: v})} requiredIndicator/>
              </FormLayout.Group>
              <TextField label={t('orders.notes')} value={shipmentForm.Note} onChange={(v) => setShipmentForm({...shipmentForm, Note: v})} autoComplete="off" multiline={2}/>
            </FormLayout>
          </Modal.Section>
        </Modal>
        {toastMarkup}
      </Page>
    </Frame>
  );
}