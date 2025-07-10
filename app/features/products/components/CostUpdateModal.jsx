/**
 * CostUpdateModal component
 * Modal for updating product cost
 */
import { Modal, TextField, Text, BlockStack } from '@shopify/polaris';
import { useTranslation } from '../../../i18n';

export function CostUpdateModal({
  open,
  onClose,
  product,
  costValue,
  setCostValue,
  onSave,
  isLoading
}) {
  const { t } = useTranslation();
  
  if (!product) return null;
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('products.updateCost')}
      primaryAction={{
        content: t('products.save'),
        onAction: onSave,
        loading: isLoading,
      }}
      secondaryActions={[
        {
          content: t('products.cancel'),
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Text variant="bodyMd" as="p">
            {t('products.enterCostFor', { title: product.title || '' })}
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
  );
}
