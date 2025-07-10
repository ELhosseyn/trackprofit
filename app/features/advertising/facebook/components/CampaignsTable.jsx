/**
 * CampaignsTable Component
 * Displays Facebook campaigns in a table with pagination
 */
import { useTranslation } from "react-i18next";
import { 
  DataTable, 
  Text, 
  Badge, 
  Box, 
  BlockStack, 
  InlineStack, 
  Button, 
  Spinner, 
  EmptyState 
} from "@shopify/polaris";
import { useCallback, useMemo } from "react";

export function CampaignsTable({
  campaigns = [],
  currentPage = 1,
  totalPages = 1,
  onPreviousPage,
  onNextPage,
  isLoading = false,
  isRTL = false
}) {
  const { t } = useTranslation();
  
  // Generate table headings with translations
  const headings = useMemo(() => [
    t('facebookAds.campaign.table.campaign'),
    t('facebookAds.campaign.table.status'),
    t('facebookAds.campaign.table.objective'),
    t('facebookAds.campaign.table.spend'),
    t('facebookAds.campaign.table.revenue'),
    t('facebookAds.campaign.table.roas'),
    t('facebookAds.campaign.table.impressions'),
    t('facebookAds.campaign.table.purchases'),
    t('facebookAds.campaign.table.costPerPurchase'),
    t('facebookAds.campaign.table.budget'),
    t('facebookAds.campaign.table.start'),
    t('facebookAds.campaign.table.end')
  ], [t]);
  
  // Column content types for proper alignment
  const columnContentTypes = [
    'text', 'text', 'text', 
    'numeric', 'numeric', 'numeric', 
    'numeric', 'numeric', 'numeric', 
    'text', 'text', 'text'
  ];
  
  // Process the campaign data into table rows
  const rows = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return [];
    
    return campaigns.map(campaign => [
      campaign.name,
      <Badge 
        key={`status-${campaign.id}`} 
        tone={
          campaign.status === 'ACTIVE' ? 'success' : 
          campaign.status === 'PAUSED' ? 'warning' : 'critical'
        }
      >
        {t(`facebookAds.campaign.status.${campaign.status.toLowerCase()}`)}
      </Badge>,
      t(`facebookAds.campaign.objectives.${campaign.objective.toLowerCase()}`),
      `$${(campaign.spend || 0).toFixed(2)}`,
      `$${(campaign.revenue || 0).toFixed(2)}`,
      <Text 
        key={`roas-${campaign.id}`} 
        tone={
          campaign.roas >= 2 ? 'success' : 
          campaign.roas >= 1 ? 'warning' : 'critical'
        }
      >
        {(campaign.roas || 0).toFixed(2)}
      </Text>,
      (campaign.impressions || 0).toLocaleString(),
      campaign.purchases,
      (campaign.costPerPurchase || 0) > 0 ? 
        `$${campaign.costPerPurchase.toFixed(2)}` : 
        t('general.noData'),
      `${campaign.budgetType === 'LIFETIME' ? 
        t('facebookAds.campaign.budget.lifetime') : 
        t('facebookAds.campaign.budget.daily')}: $${((campaign.budget || 0) / 100).toFixed(2)}`,
      new Date(campaign.startTime).toLocaleDateString(),
      campaign.endTime ? 
        new Date(campaign.endTime).toLocaleDateString() : 
        t('general.ongoing')
    ]);
  }, [campaigns, t]);

  // Loading state
  if (isLoading) {
    return (
      <Box padding="800">
        <InlineStack align="center" gap="200">
          <Spinner size="large" />
          <Text>{t('general.loading')}</Text>
        </InlineStack>
      </Box>
    );
  }
  
  // Empty state
  if (campaigns.length === 0) {
    return (
      <EmptyState
        heading={t('general.noData')}
        image="/images/empty-state.svg"
      >
        <p>{t('facebookAds.campaign.noData')}</p>
      </EmptyState>
    );
  }
  
  return (
    <BlockStack gap="400">
      <DataTable
        columnContentTypes={columnContentTypes}
        headings={headings}
        rows={rows}
        truncate
      />
      
      <Box padding="400">
        <BlockStack gap="400">
          <div style={{ 
            padding: '16px', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white', 
            fontWeight: 'bold', 
            textAlign: 'center',
            borderRadius: '8px',
            direction: isRTL ? 'rtl' : 'ltr'
          }}>
            {t('facebookAds.campaign.table.total', { count: campaigns.length })} | {t('general.page')} {currentPage} {t('general.of')} {totalPages}
          </div>

          <InlineStack align="center" gap="400">
            <Button
              onClick={onPreviousPage}
              disabled={currentPage === 1 || isLoading}
              icon={isRTL ? "chevronRight" : "chevronLeft"}
            >
              {t('general.previous')}
            </Button>
            
            <Text variant="bodyMd" as="span" alignment={isRTL ? "end" : "start"}>
              {t('general.page')} {currentPage} {t('general.of')} {totalPages}
            </Text>
            
            <Button
              onClick={onNextPage}
              disabled={currentPage >= totalPages || isLoading}
              icon={isRTL ? "chevronLeft" : "chevronRight"}
            >
              {t('general.next')}
            </Button>
          </InlineStack>
        </BlockStack>
      </Box>
    </BlockStack>
  );
}
