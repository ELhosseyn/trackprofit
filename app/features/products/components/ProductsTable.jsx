/**
 * ProductsTable component
 * Displays a paginated table of products with price, cost, profit, and inventory data
 */
import { useCallback } from 'react';
import {
  Card,
  DataTable,
  Text,
  Badge,
  Button,
  Box,
  BlockStack,
  InlineStack,
  Pagination,
  Spinner,
} from '@shopify/polaris';
import { useTranslation } from '../../../i18n';
import { formatCurrency, formatNumber, formatPercentage } from '../../../utils/formatters';

export function ProductsTable({
  products,
  isLoading,
  isUpdating,
  currentPage,
  setCurrentPage,
  totalPages,
  handleCostUpdateClick,
  selectedProduct
}) {
  const { t, language } = useTranslation();
  const isArabic = language === 'ar';
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-CA'); // YYYY-MM-DD format
  };
  
  if (isLoading) {
    return (
      <Card>
        <Box padding="400" style={{ textAlign: 'center' }}>
          <BlockStack gap="400" align="center">
            <Spinner size="large" />
            <Text variant="bodyMd">{t('products.loadingProducts')}</Text>
          </BlockStack>
        </Box>
      </Card>
    );
  }
  
  if (!products || !products.length) {
    return (
      <Card>
        <Box padding="400" style={{ textAlign: 'center' }}>
          <Text variant="bodyMd" as="p">{t('products.noProductsInRange')}</Text>
        </Box>
      </Card>
    );
  }
  
  // Prepare data for the table
  const rows = products.map(({ node }) => {
    const variant = node.variants.edges[0]?.node;
    const sellingPrice = parseFloat(variant?.price || node.priceRangeV2.minVariantPrice.amount);
    const costPerItem = parseFloat(variant?.inventoryItem?.unitCost?.amount || 0);
    const profit = sellingPrice - costPerItem;
    const margin = sellingPrice > 0 ? ((profit / sellingPrice) * 100) : 0;
    const currency = node.priceRangeV2.minVariantPrice.currencyCode;
    
    return [
      formatDate(node.createdAt),
      node.title,
      node.productType || t('products.table.uncategorized'),
      <Badge tone={node.status === 'ACTIVE' ? 'success' : 'critical'}>{node.status}</Badge>,
      formatCurrency(sellingPrice, false, currency),
      costPerItem > 0
        ? formatCurrency(costPerItem, false, currency)
        : <Button 
            size="slim" 
            onClick={() => handleCostUpdateClick(node.id)} 
            loading={isUpdating && selectedProduct?.id === node.id} 
            disabled={isUpdating}
          >
            {t('products.setCost')}
          </Button>,
      <Text color={profit >= 0 ? "success" : "critical"}>{formatCurrency(profit, false, currency)}</Text>,
      <Text color={margin >= 0 ? "success" : "critical"}>{formatPercentage(margin)}</Text>,
      node.totalInventory?.toString() || '0'
    ];
  });
  
  return (
    <Card>
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
        rows={rows}
        footerContent={
          <div style={{ 
            padding: '16px', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white', 
            fontWeight: 'bold', 
            textAlign: 'center', 
            direction: isArabic ? 'rtl' : 'ltr' 
          }}>
            {`📊 ${t('products.pagination.totalProducts')}: ${products.length} | ${t('products.pagination.page')} ${currentPage} ${t('products.pagination.of')} ${totalPages}`}
          </div>
        }
      />
      
      {totalPages > 1 && (
        <Box padding="400">
          <InlineStack gap="400" align="center">
            <Button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
              disabled={currentPage <= 1}
            >
              {t('products.pagination.previous')}
            </Button>
            <Text variant="bodyMd" as="span">
              {`${t('products.pagination.page')} ${currentPage} ${t('products.pagination.of')} ${totalPages}`}
            </Text>
            <Button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
              disabled={currentPage >= totalPages}
            >
              {t('products.pagination.next')}
            </Button>
          </InlineStack>
        </Box>
      )}
    </Card>
  );
}
