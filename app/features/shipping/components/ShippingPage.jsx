/**
 * ShippingPage component
 * Main component for the shipping page, integrating all sub-components
 */
import { useCallback } from 'react';
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
  Banner,
  Button,
  EmptyState
} from '@shopify/polaris';
import { useTranslation } from '../../../i18n';
import { useShipping } from '../hooks/useShipping';
import { ShippingDashboard } from './ShippingDashboard';
import { ShipmentsTable } from './ShipmentsTable';
import { CreateShipmentModal } from './CreateShipmentModal';
import { CredentialsModal } from './CredentialsModal';
import { ShipmentDetailsModal } from './ShipmentDetailsModal';
import { DateRangeSelector } from '../../products/components/DateRangeSelector';

export function ShippingPage({ initialData = {} }) {
  const { t, language, isRTL } = useTranslation();
  
  const {
    // Data
    shipments,
    filteredShipments,
    currentPageData,
    selectedShipment,
    setSelectedShipment,
    stats,
    isLoading,
    error,
    credentials,
    isConfigured,
    wilayaData,
    
    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    
    // Date range
    dateRange,
    setDateRange,
    dateRangeOptions,
    
    // Forms
    shipmentForm,
    setShipmentForm,
    credentialsForm,
    setCredentialsForm,
    
    // Modals
    isShipmentModalOpen,
    setIsShipmentModalOpen,
    isCredentialsModalOpen,
    setIsCredentialsModalOpen,
    
    // Actions
    refreshShipments,
    saveCredentials,
    createShipment,
    handleWilayaSelection
  } = useShipping(initialData);
  
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
  
  // Select a shipment for viewing details
  const handleShipmentSelect = useCallback((shipment) => {
    setSelectedShipment(shipment);
  }, [setSelectedShipment]);
  
  if (error) {
    return (
      <Page title={t('shipping.title')}>
        <Layout>
          <Layout.Section>
            <Banner status="critical">
              <p>{t('shipping.errors.loading')}: {error}</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }
  
  if (!isConfigured) {
    return (
      <Page title={t('shipping.title')}>
        <Layout>
          <Layout.Section>
            <Card>
              <EmptyState
                heading={t('shipping.notConfigured.title')}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                action={{
                  content: t('shipping.notConfigured.configure'),
                  onAction: () => setIsCredentialsModalOpen(true)
                }}
              >
                <p>{t('shipping.notConfigured.description')}</p>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
        
        <CredentialsModal
          open={isCredentialsModalOpen}
          onClose={() => setIsCredentialsModalOpen(false)}
          credentialsForm={credentialsForm}
          setCredentialsForm={setCredentialsForm}
          onSave={saveCredentials}
          isLoading={isLoading}
        />
      </Page>
    );
  }
  
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
            }}>🚚</div>
            <Text variant="headingXl" as="h1">{t('shipping.management')}</Text>
          </div>
        }
        primaryAction={{
          content: t('shipping.createNew'),
          onAction: () => setIsShipmentModalOpen(true)
        }}
        secondaryActions={[
          {
            content: t('shipping.refreshData'),
            onAction: refreshShipments,
            loading: isLoading
          },
          {
            content: t('shipping.configureCredentials'),
            onAction: () => setIsCredentialsModalOpen(true)
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
                      <Text variant="headingLg" as="h2">{t('shipping.dashboard')}</Text>
                      <InlineStack gap="300" align="start">
                        {isLoading && (
                          <Badge tone="warning" size="large">
                            {t('shipping.loading')}
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
            <ShippingDashboard stats={stats} />
          </Layout.Section>

          <Layout.Section>
            <ShipmentsTable
              shipments={currentPageData}
              isLoading={isLoading}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              onShipmentSelect={handleShipmentSelect}
            />
          </Layout.Section>
        </Layout>
        
        <CreateShipmentModal
          open={isShipmentModalOpen}
          onClose={() => setIsShipmentModalOpen(false)}
          shipmentForm={shipmentForm}
          setShipmentForm={setShipmentForm}
          onSave={createShipment}
          isLoading={isLoading}
          wilayaData={wilayaData}
        />
        
        <CredentialsModal
          open={isCredentialsModalOpen}
          onClose={() => setIsCredentialsModalOpen(false)}
          credentialsForm={credentialsForm}
          setCredentialsForm={setCredentialsForm}
          onSave={saveCredentials}
          isLoading={isLoading}
        />
        
        <ShipmentDetailsModal
          open={!!selectedShipment}
          onClose={() => setSelectedShipment(null)}
          shipment={selectedShipment}
        />
      </Page>
    </Frame>
  );
}
