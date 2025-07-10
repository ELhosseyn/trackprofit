/**
 * FacebookMetricsCard Component
 * Displays key metrics for Facebook advertising
 */
import { BlockStack, Text, Grid, Banner, SkeletonBodyText } from "@shopify/polaris";
import { StatCard } from "../../../../shared/components/StatCard";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";

export function FacebookMetricsCard({ metrics, currency = 'USD' }) {
  const { t } = useTranslation();
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // Simulate loading to ensure the component renders properly
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Show loading skeleton
  if (!isLoaded) {
    return <SkeletonBodyText lines={4} />;
  }

  // Show call to action if no metrics available
  if (!metrics) {
    return (
      <Banner
        title={t('facebookAds.metrics.noData.title')}
        tone="info"
      >
        <Text as="p">{t('facebookAds.metrics.noData.description')}</Text>
      </Banner>
    );
  }

  // Extract and validate metrics
  const {
    totalSpend = 0,
    totalRevenue = 0,
    totalPurchases = 0,
    totalImpressions = 0,
    roas = 0
  } = metrics;

  // Calculate derived metrics
  const costPerPurchase = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
  const costPerThousandImpressions = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const conversionRate = totalImpressions > 0 ? (totalPurchases / totalImpressions) * 100 : 0;

  return (
    <BlockStack gap="400">
      <Text variant="bodyMd" tone="subdued">
        {t('facebookAds.metrics.currency', { currency })}
      </Text>
      
      {/* Primary metrics */}
      <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 5, xl: 5 }}>
        <Grid.Cell>
          <StatCard 
            title={t('facebookAds.metrics.adSpend')} 
            value={`$${totalSpend.toFixed(2)}`} 
            icon="💸" 
            tone="critical" 
          />
        </Grid.Cell>
        <Grid.Cell>
          <StatCard 
            title={t('facebookAds.metrics.revenue')} 
            value={`$${totalRevenue.toFixed(2)}`} 
            icon="💰" 
            tone="success" 
          />
        </Grid.Cell>
        <Grid.Cell>
          <StatCard 
            title={t('facebookAds.metrics.roas')} 
            value={roas.toFixed(2)}
            icon="📈" 
            tone={roas >= 2 ? "success" : roas >= 1 ? "warning" : "critical"} 
          />
        </Grid.Cell>
        <Grid.Cell>
          <StatCard 
            title={t('facebookAds.metrics.purchases')} 
            value={totalPurchases.toLocaleString()} 
            icon="🛒" 
            tone="success" 
          />
        </Grid.Cell>
        <Grid.Cell>
          <StatCard 
            title={t('facebookAds.metrics.impressions')} 
            value={totalImpressions.toLocaleString()} 
            icon="👁️" 
            tone="info" 
          />
        </Grid.Cell>
      </Grid>
      
      {/* Secondary metrics */}
      <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 3, xl: 3 }}>
        <Grid.Cell>
          <StatCard 
            title={t('facebookAds.metrics.costPerPurchase')} 
            value={`$${costPerPurchase.toFixed(2)}`}
            icon="💳" 
            tone={costPerPurchase > 0 && costPerPurchase < 30 ? "success" : "critical"}
            subtitle={t('facebookAds.metrics.costPerPurchaseSubtitle')}
          />
        </Grid.Cell>
        <Grid.Cell>
          <StatCard 
            title={t('facebookAds.metrics.cpm')} 
            value={`$${costPerThousandImpressions.toFixed(2)}`}
            icon="📊" 
            tone="info"
            subtitle={t('facebookAds.metrics.cpmSubtitle')}
          />
        </Grid.Cell>
        <Grid.Cell>
          <StatCard 
            title={t('facebookAds.metrics.conversionRate')} 
            value={`${conversionRate.toFixed(2)}%`}
            icon="🎯" 
            tone={conversionRate > 1 ? "success" : "info"}
            subtitle={t('facebookAds.metrics.conversionRateSubtitle')}
          />
        </Grid.Cell>
      </Grid>
    </BlockStack>
  );
}
