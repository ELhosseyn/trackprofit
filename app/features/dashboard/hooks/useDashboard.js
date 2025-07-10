/**
 * Custom hook for managing dashboard data and state
 */
import { useState, useEffect } from 'react';
import { useFetcher } from '@remix-run/react';
import { useToast } from '../../../shared/hooks/useToast.jsx';
import { useDateRange } from '../../../shared/hooks/useDateRange';
import { useTranslation } from '../../../i18n';

export const useDashboard = (initialData) => {
  const fetcher = useFetcher();
  const { showToast } = useToast();
  const { t } = useTranslation();
  
  // State for dashboard data
  const [dashboardData, setDashboardData] = useState(initialData || {});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Date range state
  const { 
    dateRange, 
    setDateRange, 
    dateRangeOptions,
    isCustomRange,
    setCustomDateRange 
  } = useDateRange();
  
  // Facebook ad account state
  const [facebookAdAccount, setFacebookAdAccount] = useState(
    initialData?.facebook?.selectedAccount || ''
  );
  
  // Exchange rate state
  const [exchangeRate, setExchangeRate] = useState(
    initialData?.exchangeRate || 139
  );
  
  // Load or refresh dashboard data
  const refreshDashboardData = async () => {
    if (fetcher.state === 'submitting') return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      fetcher.submit(
        {
          startDate: dateRange.start,
          endDate: dateRange.end,
          facebookAdAccount,
          exchangeRate
        },
        { method: 'post', action: '/api/dashboard' }
      );
    } catch (err) {
      setError(err.message || t('dashboard.refreshError'));
      showToast({
        content: t('dashboard.refreshError'),
        error: true
      });
    }
  };
  
  // Handle fetcher state changes
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      setDashboardData(fetcher.data);
      setIsLoading(false);
    }
  }, [fetcher.state, fetcher.data]);
  
  return {
    dashboardData,
    isLoading,
    error,
    dateRange,
    setDateRange,
    dateRangeOptions,
    isCustomRange,
    setCustomDateRange,
    facebookAdAccount,
    setFacebookAdAccount,
    exchangeRate,
    setExchangeRate,
    refreshDashboardData
  };
};
