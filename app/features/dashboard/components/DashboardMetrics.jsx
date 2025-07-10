import { Grid } from "@shopify/polaris";
import { DashboardCard } from "../../../shared/components/DashboardCard";
import { useTranslation } from "../../../i18n";
import { formatCurrency, formatNumber } from "../../../utils/formatters";

/**
 * DashboardMetrics component displays key metrics in a grid of cards
 */
export function DashboardMetrics({ stats, facebook, exchangeRate }) {
  const { t } = useTranslation();
  
  // Handle undefined stats gracefully
  if (!stats) {
    return (
      <Grid columns={{ xs: 1, sm: 2, md: 2, lg: 4, xl: 4 }}>
        {[...Array(4)].map((_, index) => (
          <Grid.Cell key={index}>
            <DashboardCard 
              title={t('stats.insufficientData')}
              loading={true}
            />
          </Grid.Cell>
        ))}
      </Grid>
    );
  }

  return (
    <Grid columns={{ xs: 1, sm: 2, md: 2, lg: 4, xl: 4 }}>
      <Grid.Cell>
        <DashboardCard 
          title={t('stats.netProfit')}
          value={formatCurrency(stats?.totalProfit)}
          tone={stats?.totalProfit > 0 ? "success" : "critical"}
          subtitle={facebook?.selectedAccount && facebook.currency !== 'DZD' ? 
            `${formatCurrency(stats.totalProfit / parseFloat(exchangeRate), stats.totalProfit < 0, facebook.currency)} ${facebook.currency}` : 
            undefined}
        />
      </Grid.Cell>
      <Grid.Cell>
        <DashboardCard 
          title={t('stats.totalSales')}
          value={formatCurrency(stats?.orderRevenue)}
          tone="success"
        />
      </Grid.Cell>
      <Grid.Cell>
        <DashboardCard 
          title={t('stats.adCosts')}
          value={formatCurrency(stats.adCosts, true)}
          tone="critical"
          subtitle={facebook?.selectedAccount && facebook.currency !== 'DZD' ? 
            `${formatCurrency(facebook.metrics.totalSpend, true, facebook.currency)} ${facebook.currency}` : 
            undefined}
        />
      </Grid.Cell>
      <Grid.Cell>
        <DashboardCard 
          title={t('stats.shippingCancelFees')}
          value={formatCurrency(stats.shippingAndCancelFees, true)}
          tone="critical"
        />
      </Grid.Cell>
      <Grid.Cell columnSpan={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2 }}>
        <DashboardCard 
          title={t('stats.cogsCosts')}
          value={formatCurrency(stats.cogsCosts, true)}
          tone="critical"
        />
      </Grid.Cell>
      <Grid.Cell columnSpan={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2 }}>
        <DashboardCard 
          title={t('stats.totalShipments')}
          value={formatNumber(stats.totalShipments)}
          tone="info"
        />
      </Grid.Cell>
    </Grid>
  );
}
