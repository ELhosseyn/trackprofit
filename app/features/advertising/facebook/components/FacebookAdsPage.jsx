/**
 * FacebookAdsPage Component
 * Main component for the Facebook Ads feature
 */
import { useTranslation } from "react-i18next";
import { 
  Page, 
  Layout, 
  Frame, 
  Banner, 
  BlockStack, 
  Text, 
  Spinner, 
  InlineStack
} from "@shopify/polaris";
import { Suspense } from "react";
import { useFacebookAds } from "../hooks/useFacebookAds";
import { FacebookMetricsCard } from "./FacebookMetricsCard";
import { ControlPanel } from "./ControlPanel";
import { CampaignsTable } from "./CampaignsTable";
import { ConnectModal } from "./ConnectModal";
import { CreateCampaignModal } from "./CreateCampaignModal";
import { useCallback, useMemo } from "react";
import { useNavigation } from "@remix-run/react";

export function FacebookAdsPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading" || navigation.state === "submitting";
  
  // Use the custom hook to manage Facebook Ads state and operations
  const {
    // State
    isConnected,
    adAccounts,
    stats,
    campaigns,
    loaderError,
    isConnectModalOpen,
    isCreateAdModalOpen,
    accessToken,
    selectedAccount,
    dateRange,
    customDateRange,
    adForm,
    currentPage,
    totalPages,
    
    // Pagination
    getCurrentPageData,
    handlePreviousPage,
    handleNextPage,
    
    // Modal state setters
    setIsConnectModalOpen,
    setIsCreateAdModalOpen,
    setAccessToken,
    setAdForm,
    
    // Action handlers
    handleAccountChange,
    handleDateRangeChange,
    handleCustomDateChange,
    handleSaveCredentials,
    handleCreateCampaign
  } = useFacebookAds();
  
  // Prepare account options for select dropdown
  const accountOptions = useMemo(() => [
    { label: t('facebookAds.filters.selectAccount'), value: '' },
    ...(adAccounts || []).map(a => ({
      label: `${a.name} (${a.account_id || a.id})`,
      value: a.id
    }))
  ], [adAccounts, t]);
  
  // Container style for RTL support
  const containerStyle = useMemo(() => ({
    direction: isRTL ? 'rtl' : 'ltr',
    fontFamily: isRTL ? 'var(--p-font-family-arabic)' : 'var(--p-font-family)',
  }), [isRTL]);
  
  return (
    <Frame>
      <div style={containerStyle}>
        <Page
          fullWidth
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              <div style={{ background: 'linear-gradient(135deg, #1877F2 0%, #3b5998 100%)', borderRadius: '12px', padding: '8px', color: 'white', fontSize: '20px', fontWeight: 'bold' }}>f</div>
              <Text variant="headingXl" as="h1">{t('facebookAds.title')}</Text>
            </div>
          }
          primaryAction={isConnected ? {
            content: t('facebookAds.actions.createCampaign'),
            onAction: () => setIsCreateAdModalOpen(true),
            variant: "primary",
            size: "large",
            disabled: !selectedAccount
          } : null}
          secondaryActions={isConnected ? [{
            content: t('facebookAds.actions.connectionSettings'),
            onAction: () => setIsConnectModalOpen(true)
          }] : []}
        >
          <Layout>
            <Layout.Section>
              <Suspense fallback={<BlockStack><Spinner size="large" /></BlockStack>}>
                {loaderError && (
                  <Banner status="critical" title={t('facebookAds.errors.dataLoading')}>
                    <p>{loaderError}</p>
                    {(loaderError.includes('token') || loaderError.includes('reconnect')) && (
                      <Button onClick={() => setIsConnectModalOpen(true)} variant="primary">
                        {t('facebookAds.actions.reconnectAccount')}
                      </Button>
                    )}
                  </Banner>
                )}
              </Suspense>
            </Layout.Section>
            
            <Layout.Section>
              <ControlPanel 
                isConnected={isConnected}
                accountOptions={accountOptions}
                selectedAccount={selectedAccount}
                onAccountChange={handleAccountChange}
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
                customDateRange={customDateRange}
                onCustomDateChange={handleCustomDateChange}
                isRTL={isRTL}
                onConnectClick={() => setIsConnectModalOpen(true)}
                onCreateCampaignClick={() => setIsCreateAdModalOpen(true)}
                isLoading={isLoading}
              />
            </Layout.Section>

            {selectedAccount && isConnected && (
              <>
                <Layout.Section>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">{t('facebookAds.dashboard.performance')}</Text>
                    <Suspense fallback={<InlineStack align="center"><Spinner size="small" /><Text>{t('general.loading')}</Text></InlineStack>}>
                      <FacebookMetricsCard 
                        metrics={stats} 
                        currency={adAccounts.find(a => a.id === selectedAccount)?.currency || 'USD'} 
                      />
                    </Suspense>
                  </BlockStack>
                </Layout.Section>

                <Layout.Section>
                  <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '12px', padding: '2px' }}>
                    <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden' }}>
                      <Suspense fallback={<InlineStack align="center"><Spinner size="small" /><Text>{t('general.loading')}</Text></InlineStack>}>
                        <CampaignsTable
                          campaigns={getCurrentPageData()}
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPreviousPage={handlePreviousPage}
                          onNextPage={handleNextPage}
                          isLoading={isLoading}
                          isRTL={isRTL}
                        />
                      </Suspense>
                    </div>
                  </div>
                </Layout.Section>
              </>
            )}
          </Layout>
          
          {/* Modals */}
          <ConnectModal
            open={isConnectModalOpen}
            onClose={() => setIsConnectModalOpen(false)}
            accessToken={accessToken}
            onAccessTokenChange={setAccessToken}
            onSave={handleSaveCredentials}
            isConnected={isConnected}
            isRTL={isRTL}
            isLoading={isLoading}
          />
          
          <CreateCampaignModal
            open={isCreateAdModalOpen}
            onClose={() => setIsCreateAdModalOpen(false)}
            formData={adForm}
            onFormDataChange={setAdForm}
            onSubmit={handleCreateCampaign}
            isRTL={isRTL}
            isLoading={isLoading}
          />
        </Page>
      </div>
    </Frame>
  );
}
