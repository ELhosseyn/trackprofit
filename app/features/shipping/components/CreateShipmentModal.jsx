/**
 * CreateShipmentModal component
 * Modal for creating a new shipment
 */
import { useCallback } from 'react';
import {
  Modal,
  TextField,
  Select,
  Text,
  BlockStack,
  InlineStack,
  FormLayout,
  Divider
} from '@shopify/polaris';
import { useTranslation } from '../../../i18n';

export function CreateShipmentModal({
  open,
  onClose,
  shipmentForm,
  setShipmentForm,
  onSave,
  isLoading,
  wilayaData
}) {
  const { t } = useTranslation();
  
  // Handle form field changes
  const handleChange = useCallback((field) => (value) => {
    setShipmentForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, [setShipmentForm]);
  
  // Handle wilaya selection
  const handleWilayaChange = useCallback((value) => {
    // Update shipment form with selected wilaya
    const selectedWilaya = wilayaData.find(w => w.ID.toString() === value);
    if (selectedWilaya) {
      setShipmentForm(prev => ({
        ...prev,
        IDWilaya: selectedWilaya.ID.toString(),
        Wilaya: selectedWilaya.Name,
        deliveryFee: selectedWilaya.HomeDelivery.toString(),
        cancelFee: selectedWilaya.DamagePrice.toString()
      }));
    }
  }, [wilayaData, setShipmentForm]);
  
  // Prepare wilaya options for select
  const wilayaOptions = wilayaData.map(wilaya => ({
    label: `${wilaya.Name} (${wilaya.HomeDelivery} DZD)`,
    value: wilaya.ID.toString()
  }));
  
  // Delivery type options
  const deliveryTypeOptions = [
    { label: t('shipping.form.deliveryTypes.homeDelivery'), value: '0' },
    { label: t('shipping.form.deliveryTypes.storePickup'), value: '1' }
  ];
  
  // Package type options
  const packageTypeOptions = [
    { label: t('shipping.form.packageTypes.normal'), value: '0' },
    { label: t('shipping.form.packageTypes.fragile'), value: '1' },
    { label: t('shipping.form.packageTypes.liquid'), value: '2' }
  ];
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('shipping.createShipment')}
      primaryAction={{
        content: t('shipping.save'),
        onAction: onSave,
        loading: isLoading,
      }}
      secondaryActions={[
        {
          content: t('shipping.cancel'),
          onAction: onClose,
        },
      ]}
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="400">
          <FormLayout>
            <FormLayout.Group>
              <TextField
                label={t('shipping.form.clientName')}
                value={shipmentForm.Client}
                onChange={handleChange('Client')}
                autoComplete="off"
                required
              />
              <TextField
                label={t('shipping.form.primaryPhone')}
                value={shipmentForm.MobileA}
                onChange={handleChange('MobileA')}
                autoComplete="off"
                required
                type="tel"
              />
            </FormLayout.Group>
            
            <FormLayout.Group>
              <TextField
                label={t('shipping.form.secondaryPhone')}
                value={shipmentForm.MobileB}
                onChange={handleChange('MobileB')}
                autoComplete="off"
                type="tel"
              />
              <TextField
                label={t('shipping.form.address')}
                value={shipmentForm.Adresse}
                onChange={handleChange('Adresse')}
                autoComplete="off"
                required
                multiline={2}
              />
            </FormLayout.Group>
            
            <Divider />
            
            <FormLayout.Group>
              <Select
                label={t('shipping.form.wilaya')}
                options={wilayaOptions}
                value={shipmentForm.IDWilaya}
                onChange={handleWilayaChange}
                required
              />
              <TextField
                label={t('shipping.form.commune')}
                value={shipmentForm.Commune}
                onChange={handleChange('Commune')}
                autoComplete="off"
                required
              />
            </FormLayout.Group>
            
            <FormLayout.Group>
              <TextField
                label={t('shipping.form.amount')}
                value={shipmentForm.Total}
                onChange={handleChange('Total')}
                autoComplete="off"
                required
                type="number"
                prefix="DZD"
              />
              <TextField
                label={t('shipping.form.productDescription')}
                value={shipmentForm.TProduit}
                onChange={handleChange('TProduit')}
                autoComplete="off"
                required
              />
            </FormLayout.Group>
            
            <FormLayout.Group>
              <Select
                label={t('shipping.form.deliveryType')}
                options={deliveryTypeOptions}
                value={shipmentForm.TypeLivraison}
                onChange={handleChange('TypeLivraison')}
              />
              <Select
                label={t('shipping.form.packageType')}
                options={packageTypeOptions}
                value={shipmentForm.TypeColis}
                onChange={handleChange('TypeColis')}
              />
            </FormLayout.Group>
            
            <TextField
              label={t('shipping.form.notes')}
              value={shipmentForm.Note}
              onChange={handleChange('Note')}
              autoComplete="off"
              multiline={3}
            />
            
            <Divider />
            
            <FormLayout.Group>
              <TextField
                label={t('shipping.form.deliveryFee')}
                value={shipmentForm.deliveryFee}
                onChange={handleChange('deliveryFee')}
                disabled
                type="number"
                prefix="DZD"
              />
              <TextField
                label={t('shipping.form.cancelFee')}
                value={shipmentForm.cancelFee}
                onChange={handleChange('cancelFee')}
                disabled
                type="number"
                prefix="DZD"
              />
            </FormLayout.Group>
            
            <TextField
              label={t('shipping.form.orderId')}
              value={shipmentForm.orderId}
              onChange={handleChange('orderId')}
              helpText={t('shipping.form.orderIdHelp')}
            />
          </FormLayout>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
