import { Text, Grid, Banner, SkeletonBodyText } from "@shopify/polaris";
import DashboardCard from "./DashboardCard";
import { useEffect, useState } from "react";
import { useLanguage } from "../utils/i18n/LanguageContext.jsx";

export default function FacebookMetrics({ 
  facebook, 
  stats, 
  formatCurrency, 
  formatNumber, 
  scrollToFacebookDropdown 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    // Simulate loading to ensure the component renders properly
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) {
    return <SkeletonBodyText lines={4} />;
  }

  const fbCurrency = facebook?.selectedAccount?.currency || facebook?.currency || 'USD';
  if (!facebook || !facebook.selectedAccount) {
    return (
      <Banner
        title={t('facebook.metricsBanner.title')}
        tone="info"
        action={{ content: t('facebook.metricsBanner.action'), onAction: scrollToFacebookDropdown }}
      >
        <Text as="p">{t('facebook.metricsBanner.description')}</Text>
      </Banner>
    );
  }

  // Use stats for all main metrics, fallback to facebook.metrics if missing
  const safeStats = stats || {};
  const roas = typeof safeStats.fbROAS === 'number' ? safeStats.fbROAS : (facebook.metrics?.roas || 0);
  const totalSpend = typeof safeStats.adCosts === 'number' ? safeStats.adCosts : (facebook.metrics?.totalSpend || 0);
  const totalRevenue = typeof safeStats.adRevenue === 'number' ? safeStats.adRevenue : (facebook.metrics?.totalRevenue || 0);
  const totalPurchases = typeof safeStats.adPurchases === 'number' ? safeStats.adPurchases : (facebook.metrics?.totalPurchases || 0);
  const totalImpressions = typeof safeStats.adImpressions === 'number' ? safeStats.adImpressions : (facebook.metrics?.totalImpressions || 0);
  const effectiveROAS = typeof safeStats.effectiveROAS === 'number' ? safeStats.effectiveROAS : 0;
  const mer = typeof safeStats.mer === 'number' ? safeStats.mer : 0;

  return (
    <>
      <Text variant="bodyMd" tone="subdued">
        {t('facebook.currency')}: {fbCurrency}
      </Text>
      <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 5, xl: 5 }}>
        <Grid.Cell>
          <DashboardCard 
            title={t('facebook.metrics.dashboard.roas')} 
            value={`${roas.toFixed(2)}x`}
            tone={roas >= 2 ? 'success' : 'critical'}
          />
        </Grid.Cell>
        <Grid.Cell>
          <DashboardCard 
            title={t('facebook.metrics.dashboard.netRoas')} 
            value={`${effectiveROAS.toFixed(2)}x`}
            tone={effectiveROAS >= 1 ? 'success' : 'critical'}
            subtitle={t('facebook.metrics.dashboard.netRoasSubtitle')}
          />
        </Grid.Cell>
        <Grid.Cell>
          <DashboardCard 
            title={t('facebook.metrics.dashboard.mer')} 
            value={`${mer.toFixed(2)}x`}
            tone={mer >= 2 ? 'success' : 'critical'}
          />
        </Grid.Cell>
        <Grid.Cell>
          <DashboardCard 
            title={t('facebook.metrics.dashboard.adSpend')} 
            value={formatCurrency(totalSpend, true, fbCurrency)}
            tone="critical"
          />
        </Grid.Cell>
        <Grid.Cell>
          <DashboardCard 
            title={t('facebook.metrics.dashboard.adRevenue')} 
            value={formatCurrency(totalRevenue, true, fbCurrency)}
            tone="success"
          />
        </Grid.Cell>
      </Grid>
      <div style={{ marginTop: '20px' }}>
        <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 5, xl: 5 }}>
          <Grid.Cell>
            <DashboardCard 
              title={t('facebook.metrics.dashboard.purchases')} 
              value={formatNumber(totalPurchases)}
              tone="info"
            />
          </Grid.Cell>
          <Grid.Cell>
            <DashboardCard 
              title={t('facebook.metrics.dashboard.impressions')} 
              value={formatNumber(totalImpressions)}
              tone="info"
            />
          </Grid.Cell>
          <Grid.Cell>
            <DashboardCard 
              title={t('facebook.metrics.dashboard.costPerPurchase')} 
              value={totalPurchases > 0 
                ? formatCurrency(totalSpend / totalPurchases, true, fbCurrency)
                : formatCurrency(0, true, fbCurrency)
              }
              tone={totalPurchases > 0 && (totalSpend / totalPurchases) < 30 ? 'success' : 'critical'}
              subtitle={t('facebook.metrics.dashboard.costPerPurchaseSubtitle')}
            />
          </Grid.Cell>
          <Grid.Cell>
            <DashboardCard 
              title={t('facebook.metrics.dashboard.cpm')} 
              value={totalImpressions > 0 
                ? formatCurrency((totalSpend / totalImpressions) * 1000, true, fbCurrency)
                : formatCurrency(0, true, fbCurrency)
              }
              tone="info"
              subtitle={t('facebook.metrics.dashboard.cpmSubtitle')}
            />
          </Grid.Cell>
          <Grid.Cell>
            <DashboardCard 
              title={t('facebook.metrics.dashboard.conversionRate')} 
              value={totalImpressions > 0 
                ? `${((totalPurchases / totalImpressions) * 100).toFixed(2)}%`
                : '0.00%'
              }
              tone={totalImpressions > 0 && ((totalPurchases / totalImpressions) * 100) > 1 ? 'success' : 'info'}
              subtitle={t('facebook.metrics.dashboard.conversionRateSubtitle')}
            />
          </Grid.Cell>
        </Grid>
      </div>
    </>
  );
}
