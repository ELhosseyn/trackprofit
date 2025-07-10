/**
 * useFacebookAds Hook
 * Custom hook to manage Facebook Ads state and operations
 */
import { useState, useEffect, useCallback } from 'react';
import { useSubmit, useNavigate, useActionData, useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../../shared/hooks/useToast.jsx';

// Default states
const DEFAULT_STATS = {
  totalSpend: 0,
  totalRevenue: 0,
  totalPurchases: 0,
  totalImpressions: 0,
  roas: 0
};

const DEFAULT_FORM = {
  campaignName: '',
  objective: 'LINK_CLICKS',
  adsetName: '',
  budget: '',
  isLifetimeBudget: false,
  productId: ''
};

/**
 * useFacebookAds hook for managing Facebook advertising data and operations
 * @returns {Object} Facebook ads state and handlers
 */
export function useFacebookAds() {
  const { t } = useTranslation();
  const { show: showToast } = useToast();
  const navigate = useNavigate();
  const submit = useSubmit();
  
  // Get data from loader and action
  const loaderData = useLoaderData() || {};
  const actionData = useActionData();
  
  // Extract data from loader
  const {
    isConnected = false,
    adAccounts = [],
    stats = DEFAULT_STATS,
    campaigns = [],
    accountId: loadedAccountId,
    dateRange: initialDateRange = 'last_30_days',
    startDate: initialStartDate,
    endDate: initialEndDate,
    error: loaderError,
    redirect,
  } = loaderData;

  // State management
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(!isConnected);
  const [isCreateAdModalOpen, setIsCreateAdModalOpen] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(loadedAccountId || '');
  const [dateRange, setDateRange] = useState(initialDateRange);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    start: initialStartDate ? new Date(initialStartDate) : new Date(),
    end: initialEndDate ? new Date(initialEndDate) : new Date()
  });
  const [adForm, setAdForm] = useState(DEFAULT_FORM);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  
  // Calculate pagination values
  const totalItems = campaigns?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Handle redirect if needed
  useEffect(() => {
    if (redirect) {
      navigate(redirect, { replace: true });
    }
  }, [redirect, navigate]);

  // Sync state with loader data
  useEffect(() => {
    if (loadedAccountId && loadedAccountId !== selectedAccount) {
      setSelectedAccount(loadedAccountId);
    }
    if (initialDateRange && initialDateRange !== dateRange) {
      setDateRange(initialDateRange);
    }
    if (initialStartDate && initialEndDate) {
      setCustomDateRange({
        start: new Date(initialStartDate),
        end: new Date(initialEndDate)
      });
    }
  }, [loadedAccountId, initialDateRange, initialStartDate, initialEndDate, selectedAccount, dateRange]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAccount, dateRange, customDateRange.start, customDateRange.end]);

  // Handle action data (success/error messages)
  useEffect(() => {
    if (actionData?.success) {
      showToast({
        title: t('general.success'),
        content: actionData.message,
        tone: 'success'
      });
      
      // Reset UI state on success
      setIsConnectModalOpen(false);
      setIsCreateAdModalOpen(false);
      setAccessToken('');
      setAdForm(DEFAULT_FORM);
      
      // Navigate to remove action data from URL
      navigate('.', { replace: true });
    } else if (actionData?.error) {
      showToast({
        title: t('general.error'),
        content: actionData.error,
        tone: 'critical'
      });
    }
  }, [actionData, navigate, showToast, t]);

  // Show connect modal when there's a token error
  useEffect(() => {
    if (loaderError && (loaderError.includes('token') || loaderError.includes('reconnect'))) {
      setIsConnectModalOpen(true);
    }
  }, [loaderError]);

  // Get current page's data
  const getCurrentPageData = useCallback(() => {
    if (!campaigns || campaigns.length === 0) return [];
    const startIndex = (safeCurrentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, campaigns.length);
    return campaigns.slice(startIndex, endIndex);
  }, [campaigns, safeCurrentPage, rowsPerPage]);

  // Pagination handlers
  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  // Account change handler
  const handleAccountChange = useCallback((value) => {
    setSelectedAccount(value);
    const filters = { accountId: value, dateRange };
    if (dateRange === 'custom') {
      filters.startDate = customDateRange.start.toISOString().split('T')[0];
      filters.endDate = customDateRange.end.toISOString().split('T')[0];
    }
    submit(filters, { method: 'get', replace: true });
  }, [dateRange, customDateRange, submit]);

  // Date range handlers
  const handleDateRangeChange = useCallback((range) => {
    setDateRange(range);
    if (range !== 'custom') {
      submit({ accountId: selectedAccount, dateRange: range }, { method: 'get', replace: true });
    } else {
      setIsDatePickerOpen(true);
    }
  }, [selectedAccount, submit]);

  const handleCustomDateChange = useCallback(({ start, end }) => {
    setCustomDateRange({ start, end });
    setIsDatePickerOpen(false);
    submit({
      accountId: selectedAccount,
      dateRange: 'custom',
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }, { method: 'get', replace: true });
  }, [selectedAccount, submit]);

  // Modal action handlers
  const handleSaveCredentials = useCallback(() => {
    if (!accessToken.trim()) return;
    const formData = new FormData();
    formData.append('action', 'saveCredentials');
    formData.append('accessToken', accessToken);
    submit(formData, { method: 'post' });
  }, [accessToken, submit]);

  const handleCreateCampaign = useCallback(() => {
    if (!selectedAccount || !adForm.campaignName || !adForm.budget) {
      showToast({
        title: t('general.error'),
        content: t('facebookAds.errors.missingFields'),
        tone: 'critical'
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('action', 'createCampaign');
    formData.append('accountId', selectedAccount);
    
    // Append all form fields
    Object.entries(adForm).forEach(([key, value]) => {
      formData.append(key, value.toString());
    });
    
    submit(formData, { method: 'post' });
    setIsCreateAdModalOpen(false);
    setAdForm(DEFAULT_FORM);
  }, [selectedAccount, adForm, submit, showToast, t]);

  return {
    // State
    isConnected,
    adAccounts,
    stats,
    campaigns,
    loaderError,
    isConnectModalOpen,
    isCreateAdModalOpen,
    accessToken,
    selectedAccount,
    dateRange,
    isDatePickerOpen,
    customDateRange,
    adForm,
    currentPage: safeCurrentPage,
    totalPages,
    
    // Pagination
    getCurrentPageData,
    handlePreviousPage,
    handleNextPage,
    
    // Modal state setters
    setIsConnectModalOpen,
    setIsCreateAdModalOpen,
    setAccessToken,
    setAdForm,
    
    // Action handlers
    handleAccountChange,
    handleDateRangeChange,
    handleCustomDateChange,
    handleSaveCredentials,
    handleCreateCampaign
  };
}
