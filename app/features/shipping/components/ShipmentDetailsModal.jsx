/**
 * ShipmentDetailsModal component
 * Modal for viewing shipment details
 */
import {
  Modal,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Card,
  Divider,
  Link,
  Button
} from '@shopify/polaris';
import { useTranslation } from '../../../i18n';
import { formatCurrency, formatDate } from '../../../utils/formatters';

export function ShipmentDetailsModal({
  open,
  onClose,
  shipment
}) {
  const { t } = useTranslation();
  
  if (!shipment) return null;
  
  // Get status badge
  const getStatusBadge = (status, statusId) => {
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
  };
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('shipping.shipmentDetails.title')}
      secondaryActions={[
        {
          content: t('shipping.shipmentDetails.close'),
          onAction: onClose,
        },
      ]}
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h3">
                  {t('shipping.shipmentDetails.tracking')}: {shipment.tracking}
                </Text>
                {getStatusBadge(shipment.status, shipment.statusId)}
              </InlineStack>
              
              <Divider />
              
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">{t('shipping.shipmentDetails.clientInfo')}</Text>
                
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="span">{t('shipping.shipmentDetails.name')}</Text>
                  <Text variant="bodyMd" as="span" fontWeight="bold">{shipment.client}</Text>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="span">{t('shipping.shipmentDetails.phone')}</Text>
                  <Text variant="bodyMd" as="span" fontWeight="bold">
                    {shipment.mobileA} {shipment.mobileB ? `/ ${shipment.mobileB}` : ''}
                  </Text>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="span">{t('shipping.shipmentDetails.address')}</Text>
                  <Text variant="bodyMd" as="span" fontWeight="bold">{shipment.address}</Text>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="span">{t('shipping.shipmentDetails.location')}</Text>
                  <Text variant="bodyMd" as="span" fontWeight="bold">{shipment.commune}, {shipment.wilaya}</Text>
                </InlineStack>
              </BlockStack>
              
              <Divider />
              
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">{t('shipping.shipmentDetails.packageInfo')}</Text>
                
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="span">{t('shipping.shipmentDetails.description')}</Text>
                  <Text variant="bodyMd" as="span" fontWeight="bold">{shipment.productType}</Text>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="span">{t('shipping.shipmentDetails.deliveryType')}</Text>
                  <Text variant="bodyMd" as="span" fontWeight="bold">
                    {shipment.deliveryType === 0 
                      ? t('shipping.form.deliveryTypes.homeDelivery')
                      : t('shipping.form.deliveryTypes.storePickup')}
                  </Text>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="span">{t('shipping.shipmentDetails.packageType')}</Text>
                  <Text variant="bodyMd" as="span" fontWeight="bold">
                    {shipment.packageType === 0 
                      ? t('shipping.form.packageTypes.normal')
                      : shipment.packageType === 1
                        ? t('shipping.form.packageTypes.fragile')
                        : t('shipping.form.packageTypes.liquid')}
                  </Text>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="span">{t('shipping.shipmentDetails.amount')}</Text>
                  <Text variant="bodyMd" as="span" fontWeight="bold">{formatCurrency(shipment.total)}</Text>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="span">{t('shipping.shipmentDetails.deliveryFee')}</Text>
                  <Text variant="bodyMd" as="span" fontWeight="bold">{formatCurrency(shipment.deliveryFee)}</Text>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="span">{t('shipping.shipmentDetails.cancelFee')}</Text>
                  <Text variant="bodyMd" as="span" fontWeight="bold">{formatCurrency(shipment.cancelFee)}</Text>
                </InlineStack>
                
                {shipment.note && (
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="span">{t('shipping.shipmentDetails.notes')}</Text>
                    <Text variant="bodyMd" as="span" fontWeight="bold">{shipment.note}</Text>
                  </InlineStack>
                )}
              </BlockStack>
              
              <Divider />
              
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">{t('shipping.shipmentDetails.metadata')}</Text>
                
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="span">{t('shipping.shipmentDetails.created')}</Text>
                  <Text variant="bodyMd" as="span" fontWeight="bold">{formatDate(shipment.createdAt)}</Text>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="span">{t('shipping.shipmentDetails.externalId')}</Text>
                  <Text variant="bodyMd" as="span" fontWeight="bold">{shipment.externalId}</Text>
                </InlineStack>
                
                {shipment.orderId && (
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="span">{t('shipping.shipmentDetails.orderId')}</Text>
                    <Text variant="bodyMd" as="span" fontWeight="bold">{shipment.orderId}</Text>
                  </InlineStack>
                )}
              </BlockStack>
              
              <InlineStack gap="200" align="center">
                <Button 
                  url={`https://zrexpress.dz/colis/suivi/${shipment.tracking}`} 
                  external 
                  primary
                >
                  {t('shipping.shipmentDetails.trackOnline')}
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
