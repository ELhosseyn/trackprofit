import React, { useState, useCallback, useEffect } from "react";
import {
  Layout,
  Card,
  Button,
  Text,
  TextContainer,
  ButtonGroup,
  Spinner,
  Banner
} from "@shopify/polaris";

function StatCard({ title, value, color }) {
  const formattedValue = React.useMemo(() => {
    if (typeof value !== 'number' || isNaN(value)) {
      return '0';
    }
    const needsCurrency = title.includes('إجمالي') || 
                         title.includes('متوسط') || 
                         title.includes('صافي');
    const needsPercent = title.includes('هامش');
    
    return `${value.toLocaleString()}${needsPercent ? '%' : (needsCurrency ? ' دج' : '')}`;
  }, [value, title]);

  return (
    <TextContainer>
      <div style={{ textAlign: 'center', padding: '16px' }}>
        <Text variant="headingMd" color={color}>{title}</Text>
        <Text variant="heading2xl">{formattedValue}</Text>
      </div>
    </TextContainer>
  );
}

export default function DashboardPanel({ isConnected, onTabChange }) {
  const [statistics, setStatistics] = useState({
    total_revenue: 0,
    total_profit: 0,
    average_profit: 0,
    profit_margin: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    total_shipments: 0,
    average_shipping_cost: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateShipment, setShowCreateShipment] = useState(false);

  const fetchStatistics = useCallback(async () => {
    if (!isConnected) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('action', 'getStatistics');
      
      const response = await fetch('/api/zrexpress', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'فشل في جلب الإحصائيات');
      }
      
      setStatistics(data.statistics);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const syncShipments = useCallback(async () => {
    if (!isConnected) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('action', 'syncShipments');
      
      const response = await fetch('/api/zrexpress', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'فشل في مزامنة الشحنات');
      }
      
      await fetchStatistics();
    } catch (err) {
      console.error('Error syncing shipments:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, fetchStatistics]);

  return (
    <Layout>
      {error && (
        <Layout.Section>
          <Banner status="critical" onDismiss={() => setError(null)}>
            <p>{error}</p>
          </Banner>
        </Layout.Section>
      )}

      {/* Revenue Statistics */}
      <Layout.Section>
        <Card title="الإحصائيات المالية">
          <Card.Section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <StatCard 
                title="إجمالي الإيرادات"
                value={statistics.total_revenue}
                color="success"
              />
              <StatCard 
                title="صافي الربح"
                value={statistics.total_profit}
                color="success"
              />
              <StatCard 
                title="متوسط الربح"
                value={statistics.average_profit}
                color="success"
              />
              <StatCard 
                title="هامش الربح"
                value={statistics.profit_margin}
                color="success"
              />
            </div>
          </Card.Section>
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
              <Spinner accessibilityLabel="جاري التحميل" size="large" />
            </div>
          )}
        </Card>
      </Layout.Section>

      {/* Shipping Statistics */}
      <Layout.Section>
        <Card title="إحصائيات الشحنات">
          <Card.Section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <StatCard 
                title="قيد الشحن"
                value={statistics.shipped}
                color="warning"
              />
              <StatCard 
                title="تم التوصيل"
                value={statistics.delivered}
                color="success"
              />
              <StatCard 
                title="ملغية"
                value={statistics.cancelled}
                color="critical"
              />
              <StatCard 
                title="متوسط التكلفة"
                value={statistics.average_shipping_cost}
                color="default"
              />
            </div>
          </Card.Section>
        </Card>
      </Layout.Section>

      {/* Quick Actions */}
      <Layout.Section>
        <Card title="إجراءات سريعة">
          <Card.Section>
            <ButtonGroup>
              <Button
                primary
                disabled={!isConnected || isLoading}
                onClick={() => setShowCreateShipment(true)}
              >
                إنشاء شحنة
              </Button>
              <Button
                onClick={syncShipments}
                disabled={!isConnected || isLoading}
                loading={isLoading}
              >
                تحديث البيانات
              </Button>
              <Button
                onClick={() => onTabChange(1)}
                disabled={!isConnected || isLoading}
              >
                عرض التفاصيل
              </Button>
            </ButtonGroup>
          </Card.Section>
        </Card>
      </Layout.Section>
    </Layout>
  );
} 