/**
 * ControlPanel Component
 * Control panel for Facebook Ads with account selection and date filters
 */
import { useTranslation } from "react-i18next";
import { 
  Card, 
  Box, 
  BlockStack, 
  InlineStack, 
  Text, 
  Badge, 
  Select, 
  Button, 
  Popover, 
  Icon, 
  DatePicker 
} from "@shopify/polaris";
import { useState, useMemo } from "react";

export function ControlPanel({
  isConnected = false,
  accountOptions = [],
  selectedAccount = '',
  onAccountChange,
  dateRange = 'last_30_days',
  onDateRangeChange,
  customDateRange = { start: new Date(), end: new Date() },
  onCustomDateChange,
  isRTL = false,
  onConnectClick,
  onCreateCampaignClick,
  isLoading = false
}) {
  const { t } = useTranslation();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  // Prepare date range options with translations
  const dateRangeOptions = useMemo(() => [
    { label: t('facebookAds.dateRanges.today'), value: "today" },
    { label: t('facebookAds.dateRanges.yesterday'), value: "yesterday" },
    { label: t('facebookAds.dateRanges.last7days'), value: "last_7_days" },
    { label: t('facebookAds.dateRanges.last30days'), value: "last_30_days" },
    { label: t('facebookAds.dateRanges.thisMonth'), value: "this_month" },
    { label: t('facebookAds.dateRanges.lastMonth'), value: "last_month" },
    { label: t('facebookAds.dateRanges.lifetime'), value: "lifetime" },
    { label: t('facebookAds.dateRanges.custom'), value: "custom" }
  ], [t]);
  
  // Format date range for display
  const formattedDateRange = `${customDateRange.start.toLocaleDateString()} - ${customDateRange.end.toLocaleDateString()}`;
  
  return (
    <Card>
      <Box padding="500">
        <BlockStack gap="400">
          <InlineStack align="space-between" wrap={false} blockAlign="center">
            <BlockStack gap="200">
              <Text as="h2" variant="headingLg">{t('facebookAds.dashboard.controls')}</Text>
              <Badge
                tone={isConnected ? "success" : "critical"}
                size="large"
                progress={isConnected ? "complete" : "incomplete"}
              >
                {t(`facebookAds.connectionStatus.${isConnected ? 'connected' : 'notConnected'}`)}
              </Badge>
            </BlockStack>
            <div style={{
              background: isConnected
                ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
              borderRadius: '50%',
              width: '60px',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              {isConnected ? '📡' : '❌'}
            </div>
          </InlineStack>
          
          {isConnected && (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px',
                alignItems: 'end'
              }}>
                <Select
                  label={t('facebookAds.filters.adAccount')}
                  options={accountOptions}
                  value={selectedAccount}
                  onChange={onAccountChange}
                  disabled={isLoading}
                />
                <Select
                  label={t('facebookAds.filters.dateRange')}
                  options={dateRangeOptions}
                  value={dateRange}
                  onChange={onDateRangeChange}
                  disabled={isLoading}
                />
                {dateRange === 'custom' && (
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      {t('facebookAds.filters.customDateRange')}
                    </Text>
                    <Popover
                      active={isDatePickerOpen}
                      activator={
                        <Button
                          onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                          disclosure
                          icon={<Icon source="calendar" />}
                          loading={isLoading}
                        >
                          {formattedDateRange}
                        </Button>
                      }
                      onClose={() => setIsDatePickerOpen(false)}
                    >
                      <Popover.Pane>
                        <DatePicker
                          month={customDateRange.start.getMonth()}
                          year={customDateRange.start.getFullYear()}
                          selected={{
                            start: customDateRange.start,
                            end: customDateRange.end,
                          }}
                          onChange={onCustomDateChange}
                          allowRange
                          disableDatesAfter={new Date()}
                        />
                      </Popover.Pane>
                    </Popover>
                  </BlockStack>
                )}
              </div>
              
              <InlineStack gap="200">
                <Button 
                  primary 
                  onClick={onCreateCampaignClick}
                  disabled={!selectedAccount}
                >
                  {t('facebookAds.actions.createCampaign')}
                </Button>
                <Button onClick={onConnectClick}>
                  {t('facebookAds.actions.connectionSettings')}
                </Button>
              </InlineStack>
            </>
          )}
          
          {!isConnected && (
            <Button primary onClick={onConnectClick}>
              {t('facebookAds.actions.reconnectAccount')}
            </Button>
          )}
        </BlockStack>
      </Box>
    </Card>
  );
}
