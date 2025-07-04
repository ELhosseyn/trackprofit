import { json } from "@remix-run/node";
import { useLoaderData, useNavigation, useFetcher } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { useEffect, useState, useCallback } from "react";
import {
  Card,
  Layout,
  Page,
  DataTable,
  Spinner,
  Text,
  Banner,
  Modal,
  TextField,
  Button,
  Toast,
  Frame,
  Box,
  BlockStack,
  InlineStack,
  Badge,
  DatePicker,
} from "@shopify/polaris";
import { useLanguage } from "../utils/i18n/LanguageContext.jsx";
import { formatCurrency, formatNumber, formatPercentage, formatDate as formatDateUtil } from "../utils/formatters";

// CORRECTED ACTION FUNCTION
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const productId = formData.get("productId");
  const variantId = formData.get("variantId");
  const cost = formData.get("cost");

  if (!productId || !variantId || !cost) {
    return json({ success: false, error: "Missing required fields" }, { status: 400 });
  }

  try {
    const variantQuery = await admin.graphql(
      `#graphql
      query getVariant($id: ID!) {
        productVariant(id: $id) {
          id
          inventoryItem {
            id
          }
        }
      }`,
      { variables: { id: variantId } }
    );

    const variantResponse = await variantQuery.json();
    if (!variantResponse.data?.productVariant?.inventoryItem?.id) {
      throw new Error("Could not find inventory item for variant");
    }
    const inventoryItemId = variantResponse.data.productVariant.inventoryItem.id;

    // FIXED: Using correct InventoryItemUpdateInput type
    const updateResponse = await admin.graphql(
      `#graphql
      mutation inventoryItemUpdate($inventoryItemId: ID!, $input: InventoryItemUpdateInput!) {
        inventoryItemUpdate(id: $inventoryItemId, input: $input) {
          inventoryItem {
            id
            unitCost {
              amount
              currencyCode
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          inventoryItemId: inventoryItemId,
          input: {
            cost: cost
          }
        }
      }
    );

    const responseJson = await updateResponse.json();

    if (responseJson.data?.inventoryItemUpdate?.userErrors?.length > 0) {
      const error = responseJson.data.inventoryItemUpdate.userErrors[0];
      throw new Error(error.message);
    }

    const inventoryItem = responseJson.data?.inventoryItemUpdate?.inventoryItem;
    if (!inventoryItem) {
      const topLevelErrors = responseJson.errors;
      if(topLevelErrors && topLevelErrors.length > 0) {
        throw new Error(topLevelErrors[0].message);
      }
      throw new Error("Failed to update inventory item and no specific error was returned.");
    }

    return json({
      success: true,
      inventoryItem,
      variantId,
      message: "Cost updated successfully"
    });

  } catch (error) {
    console.error("Update Cost Error:", error);
    return json({
      success: false,
      error: error.message || "Failed to update cost"
    }, { status: 500 });
  }
};


export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  let allProducts = [];
  let hasNextPage = true;
  let cursor = null;

  try {
    while (hasNextPage) {
      const query = `#graphql
        query getProducts($first: Int!, $after: String) {
          products(first: $first, after: $after) {
            edges {
              node {
                id
                title
                status
                totalInventory
                productType
                createdAt
                variants(first: 1) {
                  edges {
                    node {
                      id
                      price
                      inventoryQuantity
                      inventoryItem {
                        id
                        unitCost {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                }
                priceRangeV2 {
                  minVariantPrice {
                    amount
                    currencyCode
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
          first: 50,
          after: cursor
        }
      });

      const responseJson = await response.json();

      if (responseJson.errors) {
        throw new Error(responseJson.errors[0].message);
      }

      const products = responseJson.data.products;
      allProducts = [...allProducts, ...products.edges];

      hasNextPage = products.pageInfo.hasNextPage;
      cursor = products.pageInfo.endCursor;

      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }

    return json({
      products: { edges: allProducts },
      totalCount: allProducts.length,
      error: null,
      shop: session.shop,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error("Products Query Error:", error);
    return json({
      products: { edges: [] },
      error: error.message,
      shop: session.shop,
      timestamp: Date.now()
    }, { status: 500 });
  }
};

export default function Products() {
  const initialData = useLoaderData();
  const [data, setData] = useState(initialData);
  const navigation = useNavigation();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [costValue, setCostValue] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState(false);
  const { language, t, isRTL, changeLanguage } = useLanguage();
  const isArabic = language === 'ar';
  const costUpdateFetcher = useFetcher();
  const refreshFetcher = useFetcher();

  const isPageLoading = navigation.state === "loading";
  const isUpdating = costUpdateFetcher.state === "submitting";

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalInventory: 0,
    totalCost: 0,
    totalProfit: 0,
    avgProfit: 0,
    avgMargin: 0
  });

  const [selectedDates, setSelectedDates] = useState({ start: new Date(), end: new Date() });
  const [datePickerActive, setDatePickerActive] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const rowsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const dateRangePresets = [
    { label: t('orders.datePresets.today'), value: 'daily' },
    { label: t('orders.datePresets.last7Days'), value: '7-day' },
    { label: t('orders.datePresets.thisMonth'), value: 'monthly' },
    { label: t('orders.datePresets.last3Months'), value: '3-month' },
    { label: t('orders.datePresets.last6Months'), value: '6-month' },
    { label: t('orders.datePresets.thisYear'), value: 'yearly' },
  ];

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

  const getCreatedAt = (node) => new Date(node.createdAt);

  const getEarliestProductDate = useCallback(() => {
    if (!Array.isArray(data.products.edges) || data.products.edges.length === 0) return new Date();
    return data.products.edges.reduce((min, edge) => {
      const d = getCreatedAt(edge.node);
      return d < min ? d : min;
    }, new Date());
  }, [data.products.edges]);

  useEffect(() => {
    if (data.products.edges.length > 0) {
      const minDate = getEarliestProductDate();
      setSelectedDates({ start: minDate, end: new Date() });
    }
  }, [data.products.edges.length, getEarliestProductDate]);

  const filterProductsByDateRange = useCallback((start, end) => {
    if (!Array.isArray(data.products.edges)) return [];
    const startDate = new Date(start); startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end); endDate.setHours(23, 59, 59, 999);
    return data.products.edges.filter((edge) => {
      const createdAt = getCreatedAt(edge.node);
      return createdAt >= startDate && createdAt <= endDate;
    });
  }, [data.products.edges]);

  useEffect(() => {
    const filtered = filterProductsByDateRange(selectedDates.start, selectedDates.end);
    setFilteredProducts(filtered);
    setCurrentPage(1);

    let totalProducts = 0, totalInventory = 0, totalCost = 0, totalProfit = 0, totalMargin = 0, profitCount = 0;
    filtered.forEach(({ node }) => {
      totalProducts++;
      const inventory = node.totalInventory || 0;
      totalInventory += inventory;
      const variant = node.variants.edges[0]?.node;
      const sellingPrice = parseFloat(variant?.price || node.priceRangeV2.minVariantPrice.amount);
      const costPerItem = parseFloat(variant?.inventoryItem?.unitCost?.amount || 0);
      const profitPerItem = sellingPrice - costPerItem;
      const profit = profitPerItem * inventory;
      const margin = sellingPrice > 0 ? ((profitPerItem / sellingPrice) * 100) : 0;
      if (!isNaN(profit)) { totalProfit += profit; }
      if (!isNaN(costPerItem)) { totalCost += (costPerItem * inventory); }
      if (!isNaN(margin) && sellingPrice > 0) { totalMargin += margin; profitCount++; }
    });
    setStats({
      totalProducts,
      totalInventory,
      totalCost: Number(totalCost.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      avgProfit: totalProducts > 0 ? Number((totalProfit / totalProducts).toFixed(2)) : 0,
      avgMargin: profitCount > 0 ? Number((totalMargin / profitCount).toFixed(2)) : 0
    });
  }, [selectedDates, data.products.edges, filterProductsByDateRange]);

  const handleDatePresetClick = useCallback((preset) => {
    setSelectedDates(getPresetDates(preset));
    setDatePickerActive(false);
  }, [getPresetDates]);

  const handleDateChange = useCallback(({ start, end }) => {
    setSelectedDates({ start, end });
    setDatePickerActive(false);
  }, []);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / rowsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const currentPageData = filteredProducts.slice((safeCurrentPage - 1) * rowsPerPage, safeCurrentPage * rowsPerPage);
  // Use our date formatter for consistency
  const formatDate = (date) => date.toLocaleDateString('fr-CA');

  useEffect(() => {
    if (costUpdateFetcher.state === "idle" && costUpdateFetcher.data) {
      const result = costUpdateFetcher.data;
      setToastMessage(result.message || result.error || t('general.done'));
      setToastError(!result.success);
      setShowToast(true);

      if (result.success) {
        setData(currentData => {
          const newEdges = currentData.products.edges.map(edge => {
            const variant = edge.node.variants.edges[0]?.node;
            if (variant && variant.id === result.variantId) {
              const newEdge = JSON.parse(JSON.stringify(edge));
              newEdge.node.variants.edges[0].node.inventoryItem.unitCost = result.inventoryItem.unitCost;
              return newEdge;
            }
            return edge;
          });
          return { ...currentData, products: { ...currentData.products, edges: newEdges } };
        });
      }
    }
  }, [costUpdateFetcher.state, costUpdateFetcher.data, t]);
  
  // No-op for now
  // useEffect(() => {
  //   if (refreshFetcher.data && refreshFetcher.data.timestamp !== data.timestamp) {
  //     setData(refreshFetcher.data);
  //     setToastMessage(isArabic ? "تم تحديث البيانات" : "Data refreshed");
  //     setToastError(false);
  //     setShowToast(true);
  //   }
  // }, [refreshFetcher.data, data.timestamp, isArabic]);
  //
  // useEffect(() => {
  //   const intervalId = setInterval(() => {
  //     if (refreshFetcher.state === 'idle' && !isUpdating) {
  //       refreshFetcher.load(window.location.pathname);
  //     }
  //   }, 30000);
  //   return () => clearInterval(intervalId);
  // }, [refreshFetcher, isUpdating]);

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

  const handleCostUpdateClick = useCallback((productId) => {
    const product = data.products.edges.find(({ node }) => node.id === productId);
    if (product) {
      setSelectedProduct(product.node);
      const variant = product.node.variants.edges[0]?.node;
      setCostValue(variant?.inventoryItem?.unitCost?.amount || "");
      setShowModal(true);
    }
  }, [data.products]);

  const handleSaveCost = useCallback(() => {
    const variant = selectedProduct.variants.edges[0]?.node;
    if (!variant) {
      setToastMessage(t('products.errors.variantNotFound'));
      setToastError(true);
      setShowToast(true);
      return;
    }

    const cost = parseFloat(costValue);
    if (isNaN(cost) || cost < 0) {
      setToastMessage(t('products.errors.invalidCost'));
      setToastError(true);
      setShowToast(true);
      return;
    }

    setShowModal(false);

    const formData = new FormData();
    formData.append("productId", selectedProduct.id);
    formData.append("variantId", variant.id);
    formData.append("cost", cost.toString());

    costUpdateFetcher.submit(formData, { method: "post" });
  }, [selectedProduct, costValue, costUpdateFetcher, t]);

  if (data.error) {
    return (
      <Page title={t('products.title')}>
        <Layout>
          <Layout.Section>
            <Banner status="critical">
              <p>{t('products.errors.loading')}: {data.error}</p>
              <p>Shop: {data.shop}</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const toastMarkup = showToast ? (
    <Toast content={toastMessage} onDismiss={() => setShowToast(false)} error={toastError} duration={4000} />
  ) : null;

  return (
    <Frame>
      <Page
        fullWidth
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', direction: isRTL ? 'rtl' : 'ltr' }}>
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', padding: '8px', color: 'white', fontSize: '20px', fontWeight: 'bold' }}>🛒</div>
            <Text variant="headingXl" as="h1">{t('products.management')}</Text>
          </div>
        }
        secondaryActions={[
          { content: language === 'ar' ? '🌐 English' : '🌐 العربية', onAction: () => language === 'ar' ? changeLanguage('en') : changeLanguage('ar') }
        ]}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="400">
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center" wrap={false}>
                    <BlockStack gap="200">
                      <Text variant="headingLg" as="h2">{t('products.dashboard')}</Text>
                      <InlineStack gap="300" align="start">
                        {isUpdating && <Badge tone="warning" size="large">{t('products.updating')}</Badge>}
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
              <StatCard title={t('products.totalProducts')} value={formatNumber(stats.totalProducts)} icon="📦" color="success" />
              <StatCard title={t('products.totalInventory')} value={formatNumber(stats.totalInventory)} icon="🧺" color="info" />
              <StatCard title={t('products.totalCost')} value={formatCurrency(stats.totalCost)} icon="💸" color="warning" />
              <StatCard title={t('products.totalProfit')} value={formatCurrency(stats.totalProfit)} icon="💰" color="success" />
              <StatCard title={t('products.avgProfit')} value={formatCurrency(stats.avgProfit)} icon="💎" color="success" />
              <StatCard title={t('products.avgMargin')} value={formatPercentage(stats.avgMargin)} icon="📈" color="info" />
            </div>
          </Layout.Section>

          <Layout.Section>
            <Card>
              {isPageLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Spinner accessibilityLabel={t('products.loadingProducts')} size="large" />
                </div>
              ) : !currentPageData.length ? (
                <Box padding="400" style={{ textAlign: 'center' }}>
                  <Text variant="bodyMd" as="p">{t('products.noProductsInRange')}</Text>
                </Box>
              ) : (
                <>
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric']}
                    headings={[
                      `📅 ${t('products.table.date')}`, 
                      `🏷️ ${t('products.table.product')}`, 
                      `🗂️ ${t('products.table.category')}`, 
                      `📊 ${t('products.table.status')}`, 
                      `💵 ${t('products.table.price')}`, 
                      `💸 ${t('products.table.cost')}`, 
                      `💰 ${t('products.table.profit')}`, 
                      `📈 ${t('products.table.margin')}`, 
                      `📦 ${t('products.table.inventory')}`
                    ]}
                    rows={currentPageData.map((edge) => {
                      const { node } = edge;
                      const variant = node.variants.edges[0]?.node;
                      const sellingPrice = parseFloat(variant?.price || node.priceRangeV2.minVariantPrice.amount);
                      const costPerItem = parseFloat(variant?.inventoryItem?.unitCost?.amount || 0);
                      const profit = sellingPrice - costPerItem;
                      const margin = sellingPrice > 0 ? ((profit / sellingPrice) * 100) : 0;
                      const createdAt = getCreatedAt(node);
                      const currency = node.priceRangeV2.minVariantPrice.currencyCode;
                      return [
                        formatDate(createdAt),
                        node.title,
                        node.productType || t('products.table.uncategorized'),
                        <Badge tone={node.status === 'ACTIVE' ? 'success' : 'critical'}>{node.status}</Badge>,
                        formatCurrency(sellingPrice, false, currency),
                        costPerItem > 0
                          ? formatCurrency(costPerItem, false, currency)
                          : <Button size="slim" onClick={() => handleCostUpdateClick(node.id)} loading={isUpdating && selectedProduct?.id === node.id} disabled={isUpdating}>
                            {t('products.setCost')}
                          </Button>,
                        <Text color={profit >= 0 ? "success" : "critical"}>{formatCurrency(profit, false, currency)}</Text>,
                        <Text color={margin >= 0 ? "success" : "critical"}>{formatPercentage(margin)}</Text>,
                        node.totalInventory?.toString() || '0'
                      ];
                    })}
                    footerContent={
                      <div style={{ padding: '16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                        {`📊 ${t('products.pagination.totalProducts')}: ${filteredProducts.length} | ${t('products.pagination.page')} ${safeCurrentPage} ${t('products.pagination.of')} ${totalPages}`}
                      </div>
                    }
                  />
                  {totalPages > 1 && (
                    <Box padding="400">
                      <InlineStack gap="400" align="center">
                        <Button onClick={() => setCurrentPage(safeCurrentPage - 1)} disabled={safeCurrentPage <= 1}>
                          {t('products.pagination.previous')}
                        </Button>
                        <Text variant="bodyMd" as="span">{`${t('products.pagination.page')} ${safeCurrentPage} ${t('products.pagination.of')} ${totalPages}`}</Text>
                        <Button onClick={() => setCurrentPage(safeCurrentPage + 1)} disabled={safeCurrentPage >= totalPages}>
                          {t('products.pagination.next')}
                        </Button>
                      </InlineStack>
                    </Box>
                  )}
                </>
              )}
            </Card>
          </Layout.Section>
        </Layout>
        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title={t('products.updateCost')}
          primaryAction={{
            content: t('products.save'),
            onAction: handleSaveCost,
            loading: isUpdating,
          }}
          secondaryActions={[
            {
              content: t('products.cancel'),
              onAction: () => setShowModal(false),
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Text variant="bodyMd" as="p">
                {t('products.enterCostFor', { title: selectedProduct?.title })}
              </Text>
              <TextField
                label={t('products.cost')}
                type="number"
                value={costValue}
                onChange={setCostValue}
                autoComplete="off"
                prefix="DZD"
                placeholder="0.00"
              />
            </BlockStack>
          </Modal.Section>
        </Modal>
        {toastMarkup}
      </Page>
    </Frame>
  );
}
