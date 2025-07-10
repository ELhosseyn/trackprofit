/**
 * CreateCampaignModal Component
 * Modal for creating new Facebook ad campaigns
 */
import { useTranslation } from "react-i18next";
import { 
  Modal, 
  Form, 
  FormLayout, 
  Card, 
  Box, 
  BlockStack, 
  Text, 
  TextField,
  Select
} from "@shopify/polaris";
import { useMemo } from "react";

export function CreateCampaignModal({
  open,
  onClose,
  formData,
  onFormDataChange,
  onSubmit,
  isRTL = false,
  isLoading = false
}) {
  const { t } = useTranslation();
  
  // Prepare campaign objective options
  const objectives = useMemo(() => [
    { label: t('facebookAds.campaign.objectives.linkClicks'), value: "LINK_CLICKS" },
    { label: t('facebookAds.campaign.objectives.conversions'), value: "CONVERSIONS" },
    { label: t('facebookAds.campaign.objectives.brandAwareness'), value: "BRAND_AWARENESS" }
  ], [t]);
  
  // Budget type options
  const budgetTypes = useMemo(() => [
    { label: t('facebookAds.campaign.budget.daily'), value: "false" },
    { label: t('facebookAds.campaign.budget.lifetime'), value: "true" }
  ], [t]);
  
  // Handle form field changes
  const handleChange = (field) => (value) => {
    onFormDataChange({
      ...formData,
      [field]: value
    });
  };
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          flexDirection: isRTL ? 'row-reverse' : 'row' 
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', 
            borderRadius: '8px', 
            padding: '6px', 
            color: 'white' 
          }}>
            ➕
          </div>
          {t('facebookAds.campaign.create.title')}
        </div>
      }
      primaryAction={{
        content: t('facebookAds.actions.createCampaign'),
        onAction: onSubmit,
        disabled: !formData.campaignName || !formData.budget || isLoading,
        loading: isLoading
      }}
      secondaryActions={[{
        content: t('general.cancel'),
        onAction: onClose
      }]}
      large
    >
      <Modal.Section>
        <Form onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}>
          <FormLayout>
            {/* Campaign Details */}
            <Card>
              <Box padding="400">
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h3">{t('facebookAds.campaign.create.details')}</Text>
                  <TextField
                    label={t('facebookAds.campaign.create.name')}
                    value={formData.campaignName}
                    onChange={handleChange('campaignName')}
                    required
                    error={!formData.campaignName && t('facebookAds.campaign.create.nameRequired')}
                  />
                  <Select
                    label={t('facebookAds.campaign.create.objective')}
                    options={objectives}
                    value={formData.objective}
                    onChange={handleChange('objective')}
                    required
                  />
                </BlockStack>
              </Box>
            </Card>
            
            {/* Budget Settings */}
            <Card>
              <Box padding="400">
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h3">{t('facebookAds.campaign.budget.title')}</Text>
                  <Select
                    label={t('facebookAds.campaign.budget.type')}
                    options={budgetTypes}
                    value={String(formData.isLifetimeBudget)}
                    onChange={(v) => handleChange('isLifetimeBudget')(v === 'true')}
                  />
                  <TextField
                    label={t(`facebookAds.campaign.budget.${formData.isLifetimeBudget ? 'lifetime' : 'daily'}`)}
                    type="number"
                    value={formData.budget}
                    onChange={handleChange('budget')}
                    prefix="$"
                    min="1"
                    required
                  />
                </BlockStack>
              </Box>
            </Card>
            
            {/* Ad Content */}
            <Card>
              <Box padding="400">
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h3">{t('facebookAds.campaign.content.title')}</Text>
                  <TextField
                    label={t('facebookAds.campaign.content.adSetName')}
                    value={formData.adsetName}
                    onChange={handleChange('adsetName')}
                    placeholder={t('facebookAds.campaign.content.adSetPlaceholder')}
                    required
                  />
                  <TextField
                    label={t('facebookAds.campaign.content.productId')}
                    value={formData.productId}
                    onChange={handleChange('productId')}
                    helpText={t('facebookAds.campaign.content.productIdHelp')}
                  />
                </BlockStack>
              </Box>
            </Card>
          </FormLayout>
        </Form>
      </Modal.Section>
    </Modal>
  );
}
