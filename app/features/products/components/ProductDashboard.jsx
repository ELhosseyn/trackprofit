/**
 * ProductDashboard component
 * Displays key product metrics in a dashboard layout
 */
import { Card, Text, BlockStack, InlineStack } from '@shopify/polaris';
import { useTranslation } from '../../../i18n';
import { formatCurrency, formatNumber, formatPercentage } from '../../../utils/formatters';
import { StatCard } from '../../../shared/components/StatCard';

export function ProductDashboard({ stats }) {
  const { t } = useTranslation();
  
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
      gap: '16px', 
      marginBottom: '24px' 
    }}>
      <StatCard 
        title={t('products.totalProducts')} 
        value={formatNumber(stats.totalProducts)} 
        icon="📦" 
        color="success" 
      />
      
      <StatCard 
        title={t('products.totalInventory')} 
        value={formatNumber(stats.totalInventory)} 
        icon="🧺" 
        color="info" 
      />
      
      <StatCard 
        title={t('products.totalCost')} 
        value={formatCurrency(stats.totalCost)} 
        icon="💸" 
        color="warning" 
      />
      
      <StatCard 
        title={t('products.totalProfit')} 
        value={formatCurrency(stats.totalProfit)} 
        icon="💰" 
        color="success" 
      />
      
      <StatCard 
        title={t('products.avgProfit')} 
        value={formatCurrency(stats.avgProfit)} 
        icon="💎" 
        color="success" 
      />
      
      <StatCard 
        title={t('products.avgMargin')} 
        value={formatPercentage(stats.avgMargin)} 
        icon="📈" 
        color="info" 
      />
    </div>
  );
}
