import {  Text, Grid, Banner, SkeletonBodyText } from "@shopify/polaris";
import DashboardCard from "./DashboardCard";
import { useEffect, useState } from "react";

export default function FacebookMetrics({ 
  facebook, 
  stats, 
  formatCurrency, 
  formatNumber, 
  scrollToFacebookDropdown 
}) {
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
        title="قم باختيار حساب فيسبوك للإعلانات"
        tone="info"
        action={{ content: 'اختر حساب', onAction: scrollToFacebookDropdown }}
      >
        <Text as="p">اختر حساب فيسبوك للإعلانات من القائمة المنسدلة أعلاه لعرض بيانات الأداء</Text>
      </Banner>
    );
  }

  // Ensure metrics exists and has valid values
  const metrics = facebook.metrics || { 
    roas: 0, 
    totalSpend: 0, 
    totalRevenue: 0, 
    totalPurchases: 0, 
    totalImpressions: 0 
  };

  // Default to 0 for any undefined metric values
  const roas = metrics.roas || 0;
  const totalSpend = metrics.totalSpend || 0;
  const totalRevenue = metrics.totalRevenue || 0;
  const totalPurchases = metrics.totalPurchases || 0;
  const totalImpressions = metrics.totalImpressions || 0;
  
  // Ensure stats exists and has valid values
  const safeStats = stats || { effectiveROAS: 0, mer: 0 };
  const effectiveROAS = safeStats.effectiveROAS || 0;
  const mer = safeStats.mer || 0;

  return (
    <>
      <Text variant="bodyMd" tone="subdued">
        العملة: {facebook.currency || 'USD'}
      </Text>
      <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 5, xl: 5 }}>
        <Grid.Cell>
          <DashboardCard 
            title="عائد الإعلان (ROAS)" 
            value={`${roas.toFixed(2)}x`}
            tone={roas >= 2 ? 'success' : 'critical'}
          />
        </Grid.Cell>
        <Grid.Cell>
          <DashboardCard 
            title="العائد الصافي (Net ROAS)" 
            value={`${effectiveROAS.toFixed(2)}x`}
            tone={effectiveROAS >= 1 ? 'success' : 'critical'}
            subtitle="بعد خصم تكلفة البضاعة"
          />
        </Grid.Cell>
        <Grid.Cell>
          <DashboardCard 
            title="كفاءة التسويق (MER)" 
            value={`${mer.toFixed(2)}x`}
            tone={mer >= 2 ? 'success' : 'critical'}
          />
        </Grid.Cell>
        <Grid.Cell>
          <DashboardCard 
            title="مصروف الإعلانات" 
            value={formatCurrency(totalSpend, true, facebook.currency)}
            tone="critical"
          />
        </Grid.Cell>
        <Grid.Cell>
          <DashboardCard 
            title="إيراد الإعلانات" 
            value={formatCurrency(totalRevenue, true, facebook.currency)}
            tone="success"
          />
        </Grid.Cell>
      </Grid>
      <div style={{ marginTop: '20px' }}>
        <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 5, xl: 5 }}>
          <Grid.Cell>
            <DashboardCard 
              title="عدد المشتريات" 
              value={formatNumber(totalPurchases)}
              tone="info"
            />
          </Grid.Cell>
          <Grid.Cell>
            <DashboardCard 
              title="عدد المشاهدات" 
              value={formatNumber(totalImpressions)}
              tone="info"
            />
          </Grid.Cell>
          <Grid.Cell>
            <DashboardCard 
              title="تكلفة الشراء" 
              value={totalPurchases > 0 
                ? formatCurrency(totalSpend / totalPurchases, true, facebook.currency)
                : formatCurrency(0, true, facebook.currency)
              }
              tone={totalPurchases > 0 && (totalSpend / totalPurchases) < 30 ? 'success' : 'critical'}
              subtitle="متوسط تكلفة الشراء الواحد"
            />
          </Grid.Cell>
          <Grid.Cell>
            <DashboardCard 
              title="تكلفة المشاهدة" 
              value={totalImpressions > 0 
                ? formatCurrency((totalSpend / totalImpressions) * 1000, true, facebook.currency)
                : formatCurrency(0, true, facebook.currency)
              }
              tone="info"
              subtitle="تكلفة الألف ظهور (CPM)"
            />
          </Grid.Cell>
          <Grid.Cell>
            <DashboardCard 
              title="نسبة التحويل" 
              value={totalImpressions > 0 
                ? `${((totalPurchases / totalImpressions) * 100).toFixed(2)}%`
                : '0.00%'
              }
              tone={totalImpressions > 0 && ((totalPurchases / totalImpressions) * 100) > 1 ? 'success' : 'info'}
              subtitle="من المشاهدات إلى الشراء"
            />
          </Grid.Cell>
        </Grid>
      </div>
    </>
  );
}
