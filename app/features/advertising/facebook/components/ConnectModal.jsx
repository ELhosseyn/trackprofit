/**
 * ConnectModal Component
 * Modal for connecting to Facebook Ads API
 */
import { useTranslation } from "react-i18next";
import { Modal, BlockStack, Banner, TextField } from "@shopify/polaris";

export function ConnectModal({
  open,
  onClose,
  accessToken,
  onAccessTokenChange,
  onSave,
  isConnected = false,
  isRTL = false,
  isLoading = false
}) {
  const { t } = useTranslation();
  
  return (
    <Modal
      open={open}
      onClose={() => isConnected && onClose()}
      title={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          flexDirection: isRTL ? 'row-reverse' : 'row' 
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #1877F2 0%, #3b5998 100%)', 
            borderRadius: '8px', 
            padding: '6px', 
            color: 'white' 
          }}>
            🔐
          </div>
          {t('facebookAds.connect.title')}
        </div>
      }
      primaryAction={{
        content: t('facebookAds.connect.saveAndConnect'),
        onAction: onSave,
        disabled: !accessToken.trim(),
        loading: isLoading
      }}
      secondaryActions={isConnected ? [{
        content: t('general.cancel'),
        onAction: onClose
      }] : []}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Banner status="info">{t('facebookAds.connect.instructions')}</Banner>
          <TextField
            label={t('facebookAds.connect.tokenLabel')}
            value={accessToken}
            onChange={onAccessTokenChange}
            type="password"
            autoComplete="off"
            placeholder={t('facebookAds.connect.tokenPlaceholder')}
            required
          />
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
