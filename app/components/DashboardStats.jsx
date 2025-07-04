import { Grid, Text } from "@shopify/polaris";
import DashboardCard from "./DashboardCard";

export default function DashboardStats({ stats, formatCurrency, formatNumber, facebook, exchangeRate }) {
  return (
    <Grid columns={{ xs: 1, sm: 2, md: 2, lg: 4, xl: 4 }}>
      <Grid.Cell>
        <DashboardCard 
          title="صافي الربح" 
          value={formatCurrency(stats?.totalProfit)}
          tone={stats?.totalProfit > 0 ? "success" : "critical"}
          subtitle={facebook?.selectedAccount && facebook.currency !== 'DZD' ? 
            `${formatCurrency(stats.totalProfit / parseFloat(exchangeRate), stats.totalProfit < 0, facebook.currency)} ${facebook.currency}` : 
            undefined}
        />
      </Grid.Cell>
      <Grid.Cell>
        <DashboardCard 
          title="إجمالي المبيعات" 
          value={formatCurrency(stats?.orderRevenue)}
          tone="success"
        />
      </Grid.Cell>
      <Grid.Cell>
        <DashboardCard 
          title="تكلفة الإعلانات" 
          value={formatCurrency(stats.adCosts, true)}
          tone="critical"
          subtitle={facebook?.selectedAccount && facebook.currency !== 'DZD' ? 
            `${formatCurrency(facebook.metrics.totalSpend, true, facebook.currency)} ${facebook.currency}` : 
            undefined}
        />
      </Grid.Cell>
      <Grid.Cell>
        <DashboardCard 
          title="رسوم الشحن والإلغاء" 
          value={formatCurrency(stats.shippingAndCancelFees)}
          tone="critical"
        />
      </Grid.Cell>
      <Grid.Cell>
        <DashboardCard 
          title="تكلفة البضاعة" 
          value={formatCurrency(stats.cogs)}
          tone="critical"
        />
      </Grid.Cell>
    </Grid>
  );
}
