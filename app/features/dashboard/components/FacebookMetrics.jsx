import { BlockStack, Text, Grid, Banner, SkeletonBodyText, Button } from "@shopify/polaris";
import { DashboardCard } from "../../../shared/components/DashboardCard";
import { useEffect, useState } from "react";
import { useTranslation } from "../../../i18n";
import { formatCurrency, formatNumber, formatPercentage } from "../../../utils/formatters";

/**
 * FacebookMetrics component displays Facebook ad performance metrics
 */
export function FacebookMetrics({ 
  facebook, 
  stats, 
  scrollToFacebookDropdown 
}) {
  const { t } = useTranslation();
  const [isLoaded, setIsLoaded] = useState(false);
  
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

  if (!facebook || !facebook.selectedAccount) {
    return (
      <Banner
        title={t('facebook.selectAccount')}
        tone="info"
        action={{ content: t('facebook.selectAccountAction'), onAction: scrollToFacebookDropdown }}
      >
        <Text as="p">{t('facebook.selectAccountDesc')}</Text>
      </Banner>
    );
  }

  // Ensure metrics exists and has valid values
  const metrics = facebook.metrics || { 
    totalSpend: 0,
    totalRevenue: 0,
    purchases: 0,
    impressions: 0,
    roas: 0,
    costPerPurchase: 0
  };
  
  const effectiveROAS = stats.effectiveROAS || 0;
  const isPositiveROAS = metrics.roas > 0;
  const isPositiveNetROAS = effectiveROAS > 0;
  
  return (
    <BlockStack gap="400">
      <Grid columns={{ xs: 1, sm: 3 }}>
        <Grid.Cell columnSpan={{ xs: 1, sm: 1 }}>
          <DashboardCard
            title={t('facebook.metrics.roas')}
            value={metrics.roas.toFixed(2) + 'x'}
            tone={isPositiveROAS ? "success" : "critical"}
          />
        </Grid.Cell>
        <Grid.Cell columnSpan={{ xs: 1, sm: 1 }}>
          <DashboardCard
            title={t('facebook.metrics.netRoas')}
            value={effectiveROAS.toFixed(2) + 'x'}
            subtitle={t('facebook.metrics.netRoasSubtitle')}
            tone={isPositiveNetROAS ? "success" : "critical"}
          />
        </Grid.Cell>
        <Grid.Cell columnSpan={{ xs: 1, sm: 1 }}>
          <DashboardCard
            title={t('facebook.metrics.mer')}
            value={(metrics.mer || 0).toFixed(2) + 'x'}
            tone={metrics.mer > 1 ? "success" : "critical"}
          />
        </Grid.Cell>
      </Grid>

      <Grid columns={{ xs: 1, sm: 2, md: 3 }}>
        <Grid.Cell>
          <DashboardCard
            title={t('facebook.metrics.adSpend')}
            value={formatCurrency(metrics.totalSpend, facebook.currency)}
            tone="critical"
          />
        </Grid.Cell>
        <Grid.Cell>
          <DashboardCard
            title={t('facebook.metrics.adRevenue')}
            value={formatCurrency(metrics.totalRevenue, facebook.currency)}
            tone="success"
          />
        </Grid.Cell>
        <Grid.Cell>
          <DashboardCard
            title={t('facebook.metrics.purchases')}
            value={formatNumber(metrics.purchases)}
            tone="info"
          />
        </Grid.Cell>
        <Grid.Cell>
          <DashboardCard
            title={t('facebook.metrics.impressions')}
            value={formatNumber(metrics.impressions)}
            tone="info"
          />
        </Grid.Cell>
        <Grid.Cell>
          <DashboardCard
            title={t('facebook.metrics.costPerPurchase')}
            value={formatCurrency(metrics.costPerPurchase, facebook.currency)}
            subtitle={t('facebook.metrics.costPerPurchaseSubtitle')}
            tone="critical"
          />
        </Grid.Cell>
        <Grid.Cell>
          <DashboardCard
            title={t('facebook.metrics.cpm')}
            value={formatCurrency(metrics.cpm, facebook.currency)}
            subtitle={t('facebook.metrics.cpmSubtitle')}
            tone="critical"
          />
        </Grid.Cell>
      </Grid>
    </BlockStack>
  );
}
