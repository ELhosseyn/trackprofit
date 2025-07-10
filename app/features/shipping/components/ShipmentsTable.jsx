/**
 * ShipmentsTable component
 * Displays a table of shipments with status and tracking information
 */
import { useCallback } from 'react';
import {
  Card,
  DataTable,
  Text,
  Badge,
  Button,
  Box,
  InlineStack,
  Spinner,
  Link
} from '@shopify/polaris';
import { useTranslation } from '../../../i18n';
import { formatCurrency, formatDate } from '../../../utils/formatters';

export function ShipmentsTable({
  shipments,
  isLoading,
  currentPage,
  setCurrentPage,
  totalPages,
  onShipmentSelect
}) {
  const { t, language } = useTranslation();
  const isArabic = language === 'ar';
  
  // Get status badge for shipment
  const getStatusBadge = useCallback((status, statusId) => {
    const statusMap = {
      1: 'info', // En Préparation
      2: 'attention', // Expédiée
      3: 'attention', // En Route
      4: 'warning', // Arrivée à Wilaya
      5: 'success', // Livrée
      6: 'critical', // Retournée
      7: 'warning' // En Attente
    };
    
    const tone = statusMap[statusId] || 'info';
    
    return <Badge tone={tone}>{status}</Badge>;
  }, []);
  
  if (isLoading) {
    return (
      <Card>
        <Box padding="400" style={{ textAlign: 'center' }}>
          <Spinner size="large" />
          <Text variant="bodyMd">{t('shipping.loadingShipments')}</Text>
        </Box>
      </Card>
    );
  }
  
  if (!shipments || !shipments.length) {
    return (
      <Card>
        <Box padding="400" style={{ textAlign: 'center' }}>
          <Text variant="bodyMd" as="p">{t('shipping.noShipmentsInRange')}</Text>
        </Box>
      </Card>
    );
  }
  
  // Prepare data for the table
  const rows = shipments.map(shipment => {
    return [
      formatDate(shipment.createdAt),
      <Link url={`https://zrexpress.dz/colis/suivi/${shipment.tracking}`} external monochrome removeUnderline>
        {shipment.tracking}
      </Link>,
      shipment.client,
      shipment.mobileA,
      getStatusBadge(shipment.status, shipment.statusId),
      shipment.wilaya,
      formatCurrency(shipment.total),
      <Button 
        size="slim" 
        onClick={() => onShipmentSelect(shipment)}
      >
        {t('shipping.details')}
      </Button>
    ];
  });
  
  return (
    <Card>
      <DataTable
        columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'numeric', 'text']}
        headings={[
          `📅 ${t('shipping.table.date')}`, 
          `🔍 ${t('shipping.table.tracking')}`, 
          `👤 ${t('shipping.table.client')}`, 
          `📱 ${t('shipping.table.phone')}`, 
          `📊 ${t('shipping.table.status')}`, 
          `📍 ${t('shipping.table.wilaya')}`, 
          `💰 ${t('shipping.table.amount')}`, 
          `⚙️ ${t('shipping.table.actions')}`
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
            {`📊 ${t('shipping.pagination.totalShipments')}: ${shipments.length} | ${t('shipping.pagination.page')} ${currentPage} ${t('shipping.pagination.of')} ${totalPages}`}
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
              {t('shipping.pagination.previous')}
            </Button>
            <Text variant="bodyMd" as="span">
              {`${t('shipping.pagination.page')} ${currentPage} ${t('shipping.pagination.of')} ${totalPages}`}
            </Text>
            <Button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
              disabled={currentPage >= totalPages}
            >
              {t('shipping.pagination.next')}
            </Button>
          </InlineStack>
        </Box>
      )}
    </Card>
  );
}
