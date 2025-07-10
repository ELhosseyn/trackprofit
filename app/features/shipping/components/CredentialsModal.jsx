/**
 * CredentialsModal component
 * Modal for setting up ZRExpress API credentials
 */
import { useCallback } from 'react';
import {
  Modal,
  TextField,
  Text,
  BlockStack,
  Link
} from '@shopify/polaris';
import { useTranslation } from '../../../i18n';

export function CredentialsModal({
  open,
  onClose,
  credentialsForm,
  setCredentialsForm,
  onSave,
  isLoading
}) {
  const { t } = useTranslation();
  
  // Handle form field changes
  const handleChange = useCallback((field) => (value) => {
    setCredentialsForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, [setCredentialsForm]);
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('shipping.credentials.title')}
      primaryAction={{
        content: t('shipping.credentials.save'),
        onAction: onSave,
        loading: isLoading,
      }}
      secondaryActions={[
        {
          content: t('shipping.credentials.cancel'),
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Text variant="bodyMd" as="p">
            {t('shipping.credentials.description')}
          </Text>
          
          <Text variant="bodyMd" as="p">
            {t('shipping.credentials.getCredentials')} <Link url="https://zrexpress.dz/account/settings" external>{t('shipping.credentials.here')}</Link>
          </Text>
          
          <TextField
            label={t('shipping.credentials.token')}
            value={credentialsForm.token}
            onChange={handleChange('token')}
            autoComplete="off"
            required
          />
          
          <TextField
            label={t('shipping.credentials.key')}
            value={credentialsForm.key}
            onChange={handleChange('key')}
            autoComplete="off"
            required
          />
          
          <Text variant="bodyMd" as="p" color="critical">
            {t('shipping.credentials.warning')}
          </Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
