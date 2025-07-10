/**
 * ShippingDashboard component
 * Displays key shipping metrics in a dashboard layout
 */
import { StatCard } from '../../../shared/components/StatCard';
import { useTranslation } from '../../../i18n';
import { formatCurrency, formatNumber } from '../../../utils/formatters';

export function ShippingDashboard({ stats }) {
  const { t } = useTranslation();
  
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
      gap: '16px', 
      marginBottom: '24px' 
    }}>
      <StatCard 
        title={t('shipping.totalShipments')} 
        value={formatNumber(stats.totalShipments)} 
        icon="📦" 
        color="success" 
      />
      
      <StatCard 
        title={t('shipping.pendingShipments')} 
        value={formatNumber(stats.pendingShipments)} 
        icon="⏳" 
        color="warning" 
      />
      
      <StatCard 
        title={t('shipping.deliveredShipments')} 
        value={formatNumber(stats.deliveredShipments)} 
        icon="✅" 
        color="success" 
      />
      
      <StatCard 
        title={t('shipping.returnedShipments')} 
        value={formatNumber(stats.returnedShipments)} 
        icon="↩️" 
        color="critical" 
      />
      
      <StatCard 
        title={t('shipping.totalRevenue')} 
        value={formatCurrency(stats.totalRevenue)} 
        icon="💰" 
        color="success" 
      />
      
      <StatCard 
        title={t('shipping.totalProfit')} 
        value={formatCurrency(stats.totalProfit)} 
        icon="💎" 
        color="info" 
      />
    </div>
  );
}
