import { useState, useEffect, useCallback, useMemo, Suspense, lazy, useRef } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useSubmit, useNavigation, useSearchParams, useFetcher } from "@remix-run/react";
import { 
  Page, Text, Card, Button, Modal, TextField, Select, 
  Toast, Frame, FormLayout, DataTable, Pagination, Banner, 
  Badge, ChoiceList, DatePicker, Loading, Checkbox,
  Form, Icon, Popover, Tooltip, Layout, Spinner, Box
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { ZRExpressService } from "../services/zrexpress.server";
import prisma from "../db.server";
import { useLanguage } from "../utils/i18n/LanguageContext.jsx";
import communesData from "../../public/data/communes.json";

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

// LOADER FUNCTION
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    // Get ZRExpress credentials
    let cities = [];
    try {
      const credentials = await prisma.ZRExpressCredential.findUnique({
        where: { shop: session.shop }
      });

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

        } catch (zrError) {
          console.error('ZRExpress Tarification Error:', zrError);
        }
      }
    } catch (dbError) {
      console.error('Database Error:', dbError);
    }

    // Get ALL orders through GraphQL with pagination

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
            }
          }
        }
      `;

      const response = await admin.graphql(query, {
        variables: {
          first: 20,
          after: cursor
        }
      });

      const responseJson = await response.json();

      if (responseJson.errors) {
        console.error("GraphQL Errors:", responseJson.errors);
        throw new Error(responseJson.errors[0].message);
      }

      const orders = responseJson.data.orders;
      allOrders = [...allOrders, ...orders.edges];
      
      hasNextPage = orders.pageInfo.hasNextPage;
      cursor = orders.pageInfo.endCursor;

      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Get all shipments for these orders
    const shipments = await prisma.shipment.findMany({
      where: {
        shop: session.shop,
        orderId: {
          in: allOrders.map(({ node }) => node.id.split('/').pop())
        }
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

    const ordersWithDetails = await Promise.all(
      allOrders.map(async ({ node }) => {
        try {
          const orderId = node.id.split('/').pop();
          const shipment = shipmentsMap[orderId];

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
            console.error(`Order ${orderId} fetch failed:`, orderResponse.status, await orderResponse.text());
            throw new Error(`HTTP error! status: ${orderResponse.status}`);
          }

          const orderData = await orderResponse.json();
          return {
            ...node,
            note_attributes: orderData.order.note_attributes || [],
            shipping_address: orderData.order.shipping_address || {},
            shipment_status: shipment ? shipment.status : null, // Add shipment status
            tracking_info: shipment ? shipment.tracking : null // Add tracking info
          };
        } catch (error) {
          console.error(`Failed to fetch details for order ${node.name}:`, error);
          return node;
        }
      })
    );

    return json({
      orders: {
        edges: ordersWithDetails.map(order => ({ node: order }))
      },
      totalCount: ordersWithDetails.length,
      cities,
      error: null,
      shop: session.shop,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error("Orders Query Error:", error);
    return json({
      orders: null,
      cities: [],
      error: error.message,
      shop: session.shop,
      timestamp: Date.now()
    }, { status: 500 });
  }
};

// ACTION FUNCTION
export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const { _action, ...shipmentValues } = Object.fromEntries(formData);


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

      const credentials = await prisma.ZRExpressCredential.findUnique({
        where: { shop: session.shop },
      });

      if (!credentials) {
        console.error('ZRExpress credentials not found for shop:', session.shop);
        return json({ success: false, error: 'ZRExpress credentials not found.' }, { status: 400 });
      }

      const zrexpress = new ZRExpressService();

      // Create ZRExpress shipment
      const result = await zrexpress.addColis(
        credentials.token,
        credentials.key,
        enhancedShipmentValues,
        session
      );

      if (!result.success) {
        console.error('Failed to create shipment:', result.error);
        return json({ success: false, error: result.error || t('errors.shipmentCreation', { error: 'Unknown error' }) }, { status: 500 });
      }

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
  const initialData = useLoaderData();
  const [data, setData] = useState(initialData);
  const navigation = useNavigation();
  const [formattedOrders, setFormattedOrders] = useState([]);
  const isLoading = navigation.state === "loading";
  const fetcher = useFetcher();
  const { language, t, isRTL } = useLanguage();

  // Initialize all state variables
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shipmentForm, setShipmentForm] = useState({
    Client: "",
    MobileA: "",
    MobileB: "",
    Adresse: "",
    IDWilaya: "",
    Wilaya: "",
    Commune: "",
    Total: "0",
    Note: "",
    TProduit: "",
    TypeLivraison: "0",
    TypeColis: "0",
    Confrimee: "1",
    DeliveryPartner: "zrexpress",
    orderId: "",
    deliveryFee: "0",
    cancelFee: "0"
  });

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {

    }
  }, [isModalOpen, selectedOrder, shipmentForm]);

  const isArabic = language === 'ar';
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedDates, setSelectedDates] = useState({ start: new Date(), end: new Date() });
  const [datePickerActive, setDatePickerActive] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    avgOrderValue: 0,
    avgProfit: 0
  });

  const deliveryTypes = [
    { label: t('orders.deliveryTypes.home'), value: "0" },
    { label: t('orders.deliveryTypes.office'), value: "1" }
  ];

  const packageTypes = [
    { label: t('orders.packageTypes.regular'), value: "0" },
    { label: t('orders.packageTypes.exchange'), value: "1" }
  ];
  
  const confirmedStatusOptions = [
    { label: t('orders.confirmationStatus.confirmed'), value: "1" },
    { label: t('orders.confirmationStatus.notConfirmed'), value: "0" }
  ];
  
  // Filter communes based on selected wilaya
  const filteredCommunes = useMemo(() => {
    if (shipmentForm.IDWilaya) {
      // Convert IDWilaya to wilaya_code format (e.g. 1 -> "01")
      const wilayaCode = shipmentForm.IDWilaya.toString().padStart(2, '0');
      const communes = communesData.filter(commune => commune.wilaya_code === wilayaCode);
      
      // If we have a commune value but it's not in the list, try to find a match
      if (shipmentForm.Commune && communes.length > 0) {
        // Split the commune name into words for matching
        const communeWords = shipmentForm.Commune.toLowerCase().split(/\s+/).filter(word => word.length > 1);
        
        // Check if we have an exact match
        const hasExactMatch = communes.some(item => 
          item.commune_name_ascii.toLowerCase() === shipmentForm.Commune.toLowerCase() ||
          item.commune_name.toLowerCase() === shipmentForm.Commune.toLowerCase()
        );
        
        // Check if we have a word match (any word from original commune name exists in available communes)
        const hasWordMatch = communes.some(item => {
          const itemNameLower = item.commune_name_ascii.toLowerCase();
          return communeWords.some(word => itemNameLower.includes(word));
        });

      } else {

      }
      
      return communes;
    }
    return [];
  }, [shipmentForm.IDWilaya, shipmentForm.Commune, communesData]);

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
    if (!Array.isArray(data.orders.edges) || data.orders.edges.length === 0) return new Date();
    return data.orders.edges.reduce((min, edge) => {
      const d = getCreatedAt(edge.node);
      return d < min ? d : min;
    }, new Date());
  }, [data.orders.edges]);

  const filterOrdersByDateRange = useCallback((start, end) => {
    if (!Array.isArray(data.orders.edges)) return [];
    const startDate = new Date(start); startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end); endDate.setHours(23, 59, 59, 999);
    return data.orders.edges.filter((edge) => {
      const createdAt = getCreatedAt(edge.node);
      return createdAt >= startDate && createdAt <= endDate;
    });
  }, [data.orders.edges]);

  useEffect(() => {
    if (data.orders.edges.length > 0) {
      const minDate = getEarliestOrderDate();
      setSelectedDates({ start: minDate, end: new Date() });
    }
  }, [data.orders.edges.length, getEarliestOrderDate]);

  useEffect(() => {
    const filtered = filterOrdersByDateRange(selectedDates.start, selectedDates.end);
    setFilteredData(filtered);
    setCurrentPage(1);

    let totalOrders = 0, totalRevenue = 0, totalCost = 0, totalProfit = 0;
    filtered.forEach(({ node }) => {
      totalOrders++;
      const orderAmount = parseFloat(node.totalPriceSet?.shopMoney?.amount || 0);
      totalRevenue += orderAmount;
      
      // Calculate cost if available
      let orderCost = 0;
      node.lineItems?.edges.forEach(({ node: item }) => {
        const quantity = item.quantity || 1;
        const costPerItem = parseFloat(item.variant?.inventoryItem?.unitCost?.amount || 0);
        orderCost += (costPerItem * quantity);
      });
      
      totalCost += orderCost;
      const orderProfit = orderAmount - orderCost;
      totalProfit += orderProfit;
    });

    setStats({
      totalOrders,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      avgOrderValue: totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0,
      avgProfit: totalOrders > 0 ? Number((totalProfit / totalOrders).toFixed(2)) : 0
    });
  }, [selectedDates, data.orders.edges, filterOrdersByDateRange]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-CA');
  };

  // Default wilaya for when no city is selected
  const defaultWilaya = useMemo(() => 
    data.cities?.[0] || { value: "16", label: "Alger" }
  , [data.cities]);

  const handleOrderSelect = useCallback((order) => {
    setSelectedOrder(order);

    // Pre-populate form with order data and ensure required fields exist
    const shippingAddress = order.shipping_address || {};
    const noteAttributes = Array.isArray(order.note_attributes) ? order.note_attributes : [];
    const orderTotal = order.totalPriceSet?.shopMoney?.amount || "0";
    
    // Extract information from note_attributes
    const findNoteAttribute = (names, defaultValue = "") => {
      if (!Array.isArray(names)) names = [names];
      for (const name of names) {
        const attribute = noteAttributes.find(attr => 
          attr.name.toLowerCase() === name.toLowerCase() ||
          attr.name.toLowerCase().replace(/[()]/g, '') === name.toLowerCase()
        );
        if (attribute && attribute.value) return attribute.value;
      }
      return defaultValue;
    };
    
    // Extract customer information from note_attributes with fallback to shipping_address
    const firstName = findNoteAttribute(['First name', 'Name']);
    const lastName = findNoteAttribute(['Last name']);
    const customerName = lastName ? `${firstName} ${lastName}`.trim() : firstName.trim();
    
    // Get primary phone with various possible field names
    let primaryPhone = findNoteAttribute(
      ['Phone number', 'Phone', 'MobileA'], 
      shippingAddress.phone
    );

    // Clean up phone number
    if (primaryPhone.startsWith("+213")) {
      primaryPhone = primaryPhone.replace("+213", "0");
    }
    primaryPhone = primaryPhone.replace(/\s+/g, "");

    // Get secondary phone if available
    const secondaryPhone = findNoteAttribute([
      'phone_2',
      'secondary_phone',
      'Phone number 2',
      'MobileB'
    ]);

    // Process address from note_attributes with multiple possible field names
    const address1 = findNoteAttribute(['Address', 'Adresse'], shippingAddress.address1);
    const address2 = findNoteAttribute(['Address 2', 'Adresse 2'], shippingAddress.address2);

    // Get wilaya and commune information from various possible fields
    const rawCity = findNoteAttribute(['city', 'Wilaya الولاية', 'Province (State)'], shippingAddress.city);
    const rawProvince = findNoteAttribute(['Province', 'Province (State)'], shippingAddress.province);
    const rawCommune = findNoteAttribute(['Commune', 'City'], '');

    let wilayaId = "";
    let wilayaName = "";
    let commune = "";

    // Normalize the cities list with padded wilaya IDs
    const normalizedCities = data.cities?.map(city => ({
      ...city,
      normalizedValue: city.value.toString().padStart(2, '0')
    }));

    // First attempt: Try to match the "XX - Name" format
    const cityRegex = /^(\d+)\s*-\s*(.+?)(?:\s+[\u0600-\u06FF]+)?$/;
    const cityMatch = rawCity.match(cityRegex);

    if (cityMatch) {
      // Format: "05 - Batna باتنة" or "03 - Laghouat الأغواط"
      const rawId = cityMatch[1].trim();
      // Important: Store the normalized ID as a string without leading zeros for IDWilaya
      wilayaId = parseInt(rawId).toString(); // Without leading zeros for IDWilaya
      wilayaName = cityMatch[2].trim();
      // Use commune from explicit commune field, or fallback to province
      commune = rawCommune || rawProvince || '';
    } else {
      // Second attempt: Try to find wilaya in the cities list by name
      const matchedCity = normalizedCities?.find(city => 
        city.label.toLowerCase() === rawCity?.toLowerCase() ||
        rawCity?.toLowerCase().includes(city.label.toLowerCase())
      );

      if (matchedCity) {
        // Important: Store the normalized ID as a string without leading zeros for IDWilaya
        wilayaId = parseInt(matchedCity.normalizedValue).toString(); // Without leading zeros for IDWilaya
        wilayaName = matchedCity.label;
        commune = rawCommune || rawProvince || rawCity || '';
      } else {
        // Third attempt: Try to extract wilaya ID from city or province
        const extractWilayaId = (str) => {
          const match = str?.match(/^(\d+)/);
          return match ? match[1] : null;
        };

        const cityWilayaId = extractWilayaId(rawCity);
        const provinceWilayaId = extractWilayaId(rawProvince);
        
        // Add padding for comparison with normalizedCities
        const paddedCityWilayaId = cityWilayaId ? cityWilayaId.toString().padStart(2, '0') : null;
        const paddedProvinceWilayaId = provinceWilayaId ? provinceWilayaId.toString().padStart(2, '0') : null;
        
        const matchById = normalizedCities?.find(city => 
          city.normalizedValue === paddedCityWilayaId || 
          city.normalizedValue === paddedProvinceWilayaId
        );

        if (matchById) {
          // Important: Store the normalized ID as a string without leading zeros for IDWilaya
          wilayaId = parseInt(matchById.normalizedValue).toString(); // Without leading zeros for IDWilaya
          wilayaName = matchById.label;
          commune = matchById.normalizedValue === paddedProvinceWilayaId ? rawCity : (rawCommune || rawProvince || '');
        }
      }
    }

    // Clean up commune - make sure it's not the same as wilaya name
    if (commune && commune.toLowerCase().includes(wilayaName.toLowerCase())) {
      commune = '';
    }

    // Try to match commune with available communes for this wilaya
    // Use padded wilaya ID for matching with communes data
    const paddedWilayaId = wilayaId ? wilayaId.toString().padStart(2, '0') : '';
    const availableCommunes = communesData?.filter(item => 
      item?.wilaya_code === paddedWilayaId
    ) || [];

    if (commune && availableCommunes.length > 0) {
      // Split the commune name into words for matching
      const communeWords = commune.toLowerCase().split(/\s+/).filter(word => word.length > 1);

      // Try different matching strategies in order of precision
      let matchedCommune = null;
      
      // 1. Try exact match
      matchedCommune = availableCommunes.find(item =>
        item.commune_name_ascii.toLowerCase() === commune.toLowerCase() ||
        item.commune_name.toLowerCase() === commune.toLowerCase()
      );
      
      // 2. If no exact match, try scoring by word matches
      if (!matchedCommune && communeWords.length > 0) {
        // Score communes by how many words from the original commune name they match
        const scoredCommunes = availableCommunes.map(item => {
          const itemNameLower = item.commune_name_ascii.toLowerCase();
          // Count how many words from the commune match this commune name
          const matchCount = communeWords.filter(word => 
            itemNameLower.includes(word)
          ).length;
          return { item, matchCount };
        });
        
        // Sort by match count (descending)
        scoredCommunes.sort((a, b) => b.matchCount - a.matchCount);
        
        // Get the commune with the highest match count
        if (scoredCommunes.length > 0 && scoredCommunes[0].matchCount > 0) {
          matchedCommune = scoredCommunes[0].item;

        }
      }
      
      if (matchedCommune) {
        commune = matchedCommune.commune_name_ascii || matchedCommune.commune_name;

      } else {

      }
    }
    
    // Prepare address parts without including wilaya/commune to avoid duplication
    const addressParts = [address1, address2].filter(Boolean);
    const fullAddress = addressParts.join(", ");
    
    // Get product information
    let productDescription = "";
    if (order.lineItems?.edges?.length > 0) {
      const items = order.lineItems.edges.map(({ node }) => 
        `${node.title} (x${node.quantity})`
      );
      productDescription = items.join(", ");
    } else {
      productDescription = 'N/A';
    }
    
    // Get note content
    const noteContent = order.note || "";
    
    const updatedForm = {
      ...shipmentForm,
      Client: customerName || 'N/A',
      MobileA: primaryPhone || 'N/A',
      MobileB: secondaryPhone || '',
      Adresse: fullAddress || 'N/A',
      // For IDWilaya, we want the unpadded version as it matches the Select component value format
      IDWilaya: wilayaId || defaultWilaya.value.toString(), // Already normalized (no leading zeros)
      Wilaya: wilayaName || defaultWilaya.label,
      Commune: commune || '',
      Total: orderTotal,
      TProduit: productDescription || order.name || 'N/A',
      orderId: order.id.split('/').pop(),
      Note: order.note || '',
      TypeLivraison: "0", // Default to home delivery
      TypeColis: "0",     // Default to regular package
      Confrimee: "1",     // Default to confirmed
      DeliveryPartner: "zrexpress",
      deliveryFee: "0",
      cancelFee: "0"
    };


    // Update state in a batch to ensure consistent render
    const batch = () => {
      setShipmentForm(updatedForm);
      setIsModalOpen(true);
    };
    
    // Execute state updates
    batch();

  }, [shipmentForm, defaultWilaya, communesData]);

  const handleShipmentSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (fetcher.state === "submitting") return;
    
    // Calculate the total cost of all items in the order
    let totalCost = 0;
    let lineItems = [];
    
    if (selectedOrder?.lineItems?.edges) {
      selectedOrder.lineItems.edges.forEach(({ node }) => {
        const quantity = node.quantity || 1;
        const unitCost = parseFloat(node.variant?.inventoryItem?.unitCost?.amount || 0);
        const price = parseFloat(node.originalUnitPrice || 0);
        const itemTotalCost = unitCost * quantity;
        const itemTotalRevenue = price * quantity;
        const itemProfit = itemTotalRevenue - itemTotalCost;
        
        totalCost += itemTotalCost;
        
        // Store line item COGS info for database
        lineItems.push({
          productId: node.product?.id?.split('/').pop() || '',
          variantId: node.variant?.id?.split('/').pop() || '',
          title: node.title,
          quantity,
          unitCost,
          price,
          totalCost: itemTotalCost,
          totalRevenue: itemTotalRevenue,
          profit: itemProfit
        });
      });
    }
    
    // Calculate revenue and profit
    const totalRevenue = parseFloat(shipmentForm.Total || 0);
    const profit = totalRevenue - totalCost;
    
    // Prepare form data
    const formData = new FormData();
    Object.entries(shipmentForm).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    // Add
    formData.append("totalCost", totalCost.toString());
    formData.append("totalRevenue", totalRevenue.toString());
    formData.append("totalProfit", profit.toString());
    formData.append("lineItems", JSON.stringify(lineItems));
    formData.append("_action", "createShipment");

    fetcher.submit(formData, { method: "post" });
    setIsModalOpen(false);
  }, [fetcher, shipmentForm, selectedOrder]);

  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      if (fetcher.data.success) {
        setToastMessage({
          content: t('toast.shipmentCreated'),
          error: false
        });
        
        // Optionally refresh data here
      } else {
        setToastMessage({
          content: t('errors.shipmentCreation', { error: fetcher.data.error }),
          error: true
        });
      }
    }
  }, [fetcher.data, fetcher.state, t]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const currentPageData = filteredData.slice((safeCurrentPage - 1) * rowsPerPage, safeCurrentPage * rowsPerPage);

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

  if (data.error) {
    return (
      <Page title={t('orders.title')}>
        <Layout>
          <Layout.Section>
            <Banner status="critical">
              <p>{t('errors.ordersLoading')}: {data.error}</p>
              <p>{t('general.shop')}: {data.shop}</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const toastMarkup = toastMessage ? (
    <Toast 
      content={toastMessage.content} 
      error={toastMessage.error} 
      onDismiss={() => setToastMessage(null)} 
      duration={4000} 
    />
  ) : null;

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
                      </InlineStack>
                    </BlockStack>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: isArabic ? 'flex-start' : 'flex-end', position: 'relative' }}>
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
              <StatCard title={t('orders.stats.totalOrders')} value={stats.totalOrders} icon="🛒" color="success" />
              <StatCard title={t('orders.stats.totalRevenue')} value={`${stats.totalRevenue} DZD`} icon="💵" color="info" />
              <StatCard title={t('orders.stats.totalCost')} value={`${stats.totalCost} DZD`} icon="💸" color="warning" />
              <StatCard title={t('orders.stats.totalProfit')} value={`${stats.totalProfit} DZD`} icon="💰" color="success" />
              <StatCard title={t('orders.stats.avgOrderValue')} value={`${stats.avgOrderValue} DZD`} icon="💎" color="success" />
              <StatCard title={t('orders.stats.avgProfit')} value={`${stats.avgProfit} DZD`} icon="📈" color="info" />
            </div>
          </Layout.Section>

          <Layout.Section>
            <Card>
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Spinner accessibilityLabel={t('orders.loadingOrders')} size="large" />
                </div>
              ) : !currentPageData.length ? (
                <Box padding="400" style={{ textAlign: 'center' }}>
                  <Text variant="bodyMd" as="p">{t('orders.noOrdersInRange')}</Text>
                </Box>
              ) : (
                <>
                  <DataTable
                    columnContentTypes={['text', 'text', 'numeric', 'text', 'text', 'text', 'text', 'text', 'text', 'text']}
                    headings={[
                      `📅 ${t('orders.table.date')}`,
                      `🔢 ${t('orders.table.order')}`,
                      `� ${t('orders.table.total')}`,
                      `👤 ${t('orders.table.customer')}`,
                      `📱 ${t('orders.phone')} 1`,
                      `📱 ${t('orders.phone')} 2`,
                      `🏙️ ${t('orders.state')}`,
                      `🏢 ${t('orders.city')}`,
                      `📍 ${t('orders.table.status')}`,
                      `🚚 ${t('orders.shipmentDetails')}`
                    ]}
                    rows={currentPageData.map(({ node }) => {
                      // Extract customer name and phone from note_attributes
                      const noteAttributes = node.note_attributes || [];
                      const findNoteAttribute = (names) => {
                        const nameArray = Array.isArray(names) ? names : [names];
                        for (const name of nameArray) {
                          const attr = noteAttributes.find(a => 
                            a.name === name || 
                            a.name.toLowerCase() === name.toLowerCase()
                          );
                          if (attr?.value) return attr.value;
                        }
                        return null;
                      };
                      
                      // Get customer name from either format
                      const firstName = findNoteAttribute(['First name', 'Name']) || 
                                      (node.shipping_address && node.shipping_address.first_name);
                      const lastName = findNoteAttribute(['Last name']) || 
                                     (node.shipping_address && node.shipping_address.last_name);
                      const customerName = [firstName, lastName].filter(Boolean).join(' ') || 'N/A';
                      
                      // Get phone numbers from either format
                      const phone1 = findNoteAttribute(['Phone number', 'Phone', 'Phone 1']) || 
                                   (node.shipping_address && node.shipping_address.phone) || 'N/A';
                      
                      const phone2 = findNoteAttribute(['Phone number 2', 'phone_2', 'secondary_phone', 'Phone 2']) || '-';
                      
                      // Extract wilaya (province) from city field
                      // Get state/wilaya from either format
                      let wilaya = findNoteAttribute(['Wilaya الولاية', 'Province (State)', 'city']) || 
                                 (node.shipping_address && node.shipping_address.city) || '';
                      
                      // Handle format "05 - Batna باتنة"
                      const cityRegex = /^(\d+)\s*-\s*([^-]+?)(?:\s+[\u0600-\u06FF]+)?$/;
                      const cityMatch = wilaya.match(cityRegex);
                      if (cityMatch) {
                        wilaya = cityMatch[2].trim(); // Use the name part
                      }
                      
                      // Get municipality/province from either format
                      const municipality = findNoteAttribute(['Province', 'Province (State)']) || 
                                         (node.shipping_address && node.shipping_address.province) || '-';
                      
                      const amount = parseFloat(node.totalPriceSet?.shopMoney?.amount || 0);
                      const currency = node.totalPriceSet?.shopMoney?.currencyCode || 'DZD';
                      
                      // Calculate cost and profit
                      let orderCost = 0;
                      node.lineItems?.edges.forEach(({ node: item }) => {
                        const quantity = item.quantity || 1;
                        const costPerItem = parseFloat(item.variant?.inventoryItem?.unitCost?.amount || 0);
                        orderCost += (costPerItem * quantity);
                      });
                      
                      const profit = amount - orderCost;
                      const margin = amount > 0 ? ((profit / amount) * 100) : 0;
                      
                      return [
                        formatDate(node.createdAt),
                        node.name,
                        `${amount.toFixed(2)} ${currency}`,
                        customerName,
                        phone1,
                        phone2,
                        wilaya,
                        municipality,
                        <Badge tone={node.displayFinancialStatus === 'PAID' ? 'success' : 'warning'}>{node.displayFinancialStatus}</Badge>,
                        node.shipment_status ? 
                          <Badge tone="success">{node.shipment_status}</Badge> : 
                          <Button size="slim" onClick={() => handleOrderSelect(node)}>
                            {t('orders.createShipmentButton')}
                          </Button>
                      ];
                    })}
                    footerContent={
                      <div style={{ padding: '16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                        {`📊 ${t('orders.stats.totalOrders')}: ${filteredData.length} | ${t('orders.pagination.page')} ${safeCurrentPage} ${t('orders.pagination.of')} ${totalPages}`}
                      </div>
                    }
                  />
                  {totalPages > 1 && (
                    <Box padding="400">
                      <InlineStack gap="400" align="center">
                        <Button onClick={() => setCurrentPage(safeCurrentPage - 1)} disabled={safeCurrentPage <= 1}>
                          {t('orders.pagination.previous')}
                        </Button>
                        <Text variant="bodyMd" as="span">{`${t('orders.pagination.page')} ${safeCurrentPage} ${t('orders.pagination.of')} ${totalPages}`}</Text>
                        <Button onClick={() => setCurrentPage(safeCurrentPage + 1)} disabled={safeCurrentPage >= totalPages}>
                          {t('orders.pagination.next')}
                        </Button>
                      </InlineStack>
                    </Box>
                  )}
                </>
              )}
            </Card>
          </Layout.Section>
        </Layout>

        {/* Debug info removed for production */}
        <Modal
          open={isModalOpen}
          onClose={() => {

            setIsModalOpen(false);
          }}
          title={t('orders.createShipment')}
          primaryAction={{
            content: t('orders.createShipmentButton'),
            onAction: handleShipmentSubmit,
            loading: fetcher.state === "submitting"
          }}
          secondaryActions={[
            {
              content: t('general.cancel'),
              onAction: () => {

                setIsModalOpen(false);
              }
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
                          const price = parseFloat(node.originalUnitPrice || 0);
                          const itemTotalCost = unitCost * quantity;
                          const itemTotalRevenue = price * quantity;
                          const itemProfit = itemTotalRevenue - itemTotalCost;
                          const itemMargin = price > 0 ? ((price - unitCost) / price * 100) : 0;
                          const currency = node.originalTotalSet?.shopMoney?.currencyCode || 'DZD';
                          
                          return (
                            <InlineStack key={index} align="space-between" blockAlign="center">
                              <Text variant="bodyMd">{node.title} (x{quantity})</Text>
                              <InlineStack gap="200">
                                <Text variant="bodyMd" tone="subdued">{t('orders.stats.totalCost')}: {(unitCost * quantity).toFixed(2)} {currency}</Text>
                                <Text variant="bodyMd" tone={itemProfit >= 0 ? "success" : "critical"}>{t('orders.stats.totalProfit')}: {itemProfit.toFixed(2)} {currency} ({itemMargin.toFixed(1)}%)</Text>
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
                            <InlineStack align="space-between" blockAlign="center">
                              <Text variant="headingSm" as="h4">{t('orders.totalSummary')}</Text>
                              <InlineStack gap="200">
                                <Text variant="headingSm" tone="subdued">{t('orders.cost')} {totalCost.toFixed(2)} {currency}</Text>
                                <Text variant="headingSm" tone={profit >= 0 ? "success" : "critical"}>{t('orders.profit')} {profit.toFixed(2)} {currency} ({margin.toFixed(1)}%)</Text>
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
                  label={t('orders.wilaya')}
                  options={data.cities}
                  value={shipmentForm.IDWilaya}
                  onChange={(value) => {
                      // Normalize the wilaya ID by removing leading zeros and converting to string
                      const normalizedValue = value ? parseInt(value).toString() : "";
                      
                      // Find the selected city by value (ensuring comparison format matches)
                      const selectedCity = data.cities.find(city => 
                        parseInt(city.value).toString() === normalizedValue
                      );
                      
                      // Get the corresponding communes for this wilaya
                      const wilayaCode = normalizedValue.toString().padStart(2, '0');
                      const availableCommunes = communesData.filter(commune => 
                        commune.wilaya_code === wilayaCode
                      );
                      
                      // Try to find a matching commune from the selected order if we have one
                      let matchedCommune = "";
                      if (selectedOrder && availableCommunes.length > 0) {
                        const shippingAddress = selectedOrder.shipping_address || {};
                        const noteAttributes = Array.isArray(selectedOrder.note_attributes) ? selectedOrder.note_attributes : [];
                        
                        // Helper to find attributes in note_attributes
                        const findNoteAttribute = (names, defaultValue = "") => {
                          if (!Array.isArray(names)) names = [names];
                          for (const name of names) {
                            const attribute = noteAttributes.find(attr => 
                              attr.name.toLowerCase() === name.toLowerCase() ||
                              attr.name.toLowerCase().replace(/[()]/g, '') === name.toLowerCase()
                            );
                            if (attribute && attribute.value) return attribute.value;
                          }
                          return defaultValue;
                        };
                        
                        // Try to find commune from note attributes or shipping address
                        const rawCommune = findNoteAttribute(['Commune', 'City'], 
                          shippingAddress.province || shippingAddress.city || '');
                        
                        if (rawCommune) {
                          // Split the commune name into words for matching
                          const communeWords = rawCommune.toLowerCase().split(/\s+/).filter(word => word.length > 1);

                          // Try different matching strategies in order of precision
                          let matchedCommuneObj = null;
                          
                          // 1. Try exact match
                          matchedCommuneObj = availableCommunes.find(item =>
                            item.commune_name_ascii.toLowerCase() === rawCommune.toLowerCase() ||
                            item.commune_name.toLowerCase() === rawCommune.toLowerCase()
                          );
                          
                          // 2. If no exact match, try scoring by word matches
                          if (!matchedCommuneObj && communeWords.length > 0) {
                            // Score communes by how many words from the original commune name they match
                            const scoredCommunes = availableCommunes.map(item => {
                              const itemNameLower = item.commune_name_ascii.toLowerCase();
                              // Count how many words from the raw commune match this commune name
                              const matchCount = communeWords.filter(word => 
                                itemNameLower.includes(word)
                              ).length;
                              return { item, matchCount };
                            });
                            
                            // Sort by match count (descending)
                            scoredCommunes.sort((a, b) => b.matchCount - a.matchCount);
                            
                            // Get the commune with the highest match count
                            if (scoredCommunes.length > 0 && scoredCommunes[0].matchCount > 0) {
                              matchedCommuneObj = scoredCommunes[0].item;

                            }
                          }
                          
                          if (matchedCommuneObj) {
                            matchedCommune = matchedCommuneObj.commune_name_ascii || matchedCommuneObj.commune_name;

                          } else {

                          }
                        }
                      }
                      
                      // Update form with normalized ID, city label, and matched commune if found
                      setShipmentForm({
                        ...shipmentForm, 
                        IDWilaya: normalizedValue, // Store normalized value without leading zeros
                        Wilaya: selectedCity ? selectedCity.label : "",
                        Commune: matchedCommune // Set matched commune or empty string if not found
                      });

                  }}
                  requiredIndicator
                />
                <Select
                  label={t('orders.commune')}
                  value={shipmentForm.Commune}
                  options={filteredCommunes.map(commune => ({
                    label: commune.commune_name_ascii,
                    value: commune.commune_name_ascii
                  }))}
                  onChange={(value) => setShipmentForm({...shipmentForm, Commune: value})}
                  requiredIndicator
                  disabled={!shipmentForm.IDWilaya || filteredCommunes.length === 0}
                  placeholder={filteredCommunes.length === 0 ? t('orders.selectWilayaFirst') : t('orders.selectCommune')}
                  onFocus={() => {
                    // If we have a commune value but it's not in the options list, try to find a match
                    if (shipmentForm.Commune && filteredCommunes.length > 0) {
                      // Check if the commune is already in the options
                      const communeExists = filteredCommunes.some(
                        item => item.commune_name_ascii === shipmentForm.Commune
                      );
                      
                      if (!communeExists) {
                        // Split the commune name into words for matching
                        const communeWords = shipmentForm.Commune.toLowerCase().split(/\s+/).filter(word => word.length > 1);
                        
                        // Try different matching strategies
                        let matchingCommune = null;
                        
                        // 1. Try exact match (although we already checked communeExists)
                        matchingCommune = filteredCommunes.find(item =>
                          item.commune_name_ascii.toLowerCase() === shipmentForm.Commune.toLowerCase() ||
                          item.commune_name.toLowerCase() === shipmentForm.Commune.toLowerCase()
                        );
                        
                        // 2. Try word matching
                        if (!matchingCommune && communeWords.length > 0) {
                          // Score communes by how many words from the original commune name they match
                          const scoredCommunes = filteredCommunes.map(item => {
                            const itemNameLower = item.commune_name_ascii.toLowerCase();
                            // Count how many words from the commune match this commune name
                            const matchCount = communeWords.filter(word => 
                              itemNameLower.includes(word)
                            ).length;
                            return { item, matchCount };
                          });
                          
                          // Sort by match count (descending)
                          scoredCommunes.sort((a, b) => b.matchCount - a.matchCount);
                          
                          // Get the commune with the highest match count
                          if (scoredCommunes.length > 0 && scoredCommunes[0].matchCount > 0) {
                            matchingCommune = scoredCommunes[0].item;

                          }
                        }
                        
                        // Update the form with the matched commune name
                        if (matchingCommune) {

                          setShipmentForm({...shipmentForm, Commune: matchingCommune.commune_name_ascii});
                        }
                      }
                    }
                  }}
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
                  label={t('orders.confirmationStatus.label')}
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
        {toastMarkup}
      </Page>
    </Frame>
  );
}