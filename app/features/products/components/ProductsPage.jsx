/**
 * ProductsPage component
 * Main component for the products page, integrating all sub-components
 */
import { useCallback, useState } from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Box,
  BlockStack,
  InlineStack,
  Frame,
  Toast,
  Banner
} from '@shopify/polaris';
import { useTranslation } from '../../../i18n/index';
import { useProducts } from '../hooks/useProducts';
import { ProductsTable } from './ProductsTable';
import { ProductDashboard } from './ProductDashboard';
import { CostUpdateModal } from './CostUpdateModal';
import { DateRangeSelector } from './DateRangeSelector';

export function ProductsPage({ initialData = {} }) {
  const { t, language, isRTL } = useTranslation();
  
  const {
    // Data
    products,
    filteredProducts,
    currentPageData,
    selectedProduct,
    stats,
    isLoading,
    isUpdating,
    error,
    
    // Cost modal
    showCostModal,
    setShowCostModal,
    costValue, 
    setCostValue,
    
    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    
    // Date range
    dateRange,
    setDateRange,
    dateRangeOptions,
    
    // Actions
    refreshProducts,
    handleCostUpdateClick,
    updateProductCost
  } = useProducts(initialData);
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);
  
  // Handle date preset selection
  const handleDatePresetClick = useCallback((preset) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let start, end = now;
    
    switch (preset) {
      case 'daily':
        start = today;
        break;
      case '7-day':
        start = new Date(today);
        start.setDate(today.getDate() - 6);
        break;
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case '3-month':
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '6-month':
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case 'yearly':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = today;
    }
    
    setDateRange({ start, end });
  }, [setDateRange]);
  
  if (error) {
    return (
      <Page title={t('products.title')}>
        <Layout>
          <Layout.Section>
            <Banner status="critical">
              <p>{t('products.errors.loading')}: {error}</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }
  
  const toastMarkup = showToast ? (
    <Toast 
      content={toastMessage} 
      onDismiss={() => setShowToast(false)} 
      error={toastError} 
      duration={4000} 
    />
  ) : null;
  
  return (
    <Frame>
      <Page
        fullWidth
        title={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            direction: isRTL ? 'rtl' : 'ltr' 
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              borderRadius: '12px', 
              padding: '8px', 
              color: 'white', 
              fontSize: '20px', 
              fontWeight: 'bold' 
            }}>🛒</div>
            <Text variant="headingXl" as="h1">{t('products.management')}</Text>
          </div>
        }
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
                        {isUpdating && (
                          <Badge tone="warning" size="large">
                            {t('products.updating')}
                          </Badge>
                        )}
                      </InlineStack>
                    </BlockStack>
                    
                    <DateRangeSelector
                      dateRange={dateRange}
                      onDateChange={setDateRange}
                      dateRangeOptions={dateRangeOptions}
                      onPresetClick={handleDatePresetClick}
                    />
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <ProductDashboard stats={stats} />
          </Layout.Section>

          <Layout.Section>
            <ProductsTable
              products={currentPageData}
              isLoading={isLoading}
              isUpdating={isUpdating}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              handleCostUpdateClick={handleCostUpdateClick}
              selectedProduct={selectedProduct}
            />
          </Layout.Section>
        </Layout>
        
        <CostUpdateModal
          open={showCostModal}
          onClose={() => setShowCostModal(false)}
          product={selectedProduct}
          costValue={costValue}
          setCostValue={setCostValue}
          onSave={updateProductCost}
          isLoading={isUpdating}
        />
        
        {toastMarkup}
      </Page>
    </Frame>
  );
}
