/**
 * useShipping hook for managing shipping data and UI state
 */
import { useState, useEffect, useCallback } from 'react';
import { useFetcher } from '@remix-run/react';
import { useToast } from '../../../shared/hooks/useToast.jsx';
import { useDateRange } from '../../../shared/hooks/useDateRange';
import { useTranslation } from '../../../i18n';

export function useShipping(initialData = {}) {
  const fetcher = useFetcher();
  const { showToast } = useToast();
  const { t } = useTranslation();
  
  // Shipments state
  const [shipments, setShipments] = useState(initialData.shipments || []);
  const [filteredShipments, setFilteredShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Stats state
  const [stats, setStats] = useState({
    totalShipments: 0,
    pendingShipments: 0,
    deliveredShipments: 0,
    returnedShipments: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Credentials state
  const [credentials, setCredentials] = useState(initialData.credentials || null);
  const [isConfigured, setIsConfigured] = useState(!!credentials);
  
  // Wilaya data state
  const [wilayaData, setWilayaData] = useState(initialData.wilayaData || []);
  
  // New shipment form state
  const [shipmentForm, setShipmentForm] = useState({
    Client: "",
    MobileA: "",
    MobileB: "",
    Adresse: "",
    IDWilaya: "",
    Wilaya: "",
    Commune: "",
    Total: "0",
    Note: "",
    TProduit: "",
    TypeLivraison: "0",
    TypeColis: "0",
    Confrimee: "1",
    deliveryFee: "0",
    cancelFee: "0",
    orderId: ""
  });
  
  // Modal states
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  
  // Date range state from custom hook
  const { 
    dateRange, 
    setDateRange, 
    dateRangeOptions,
    isCustomRange,
    setCustomDateRange 
  } = useDateRange();
  
  // Credentials form state
  const [credentialsForm, setCredentialsForm] = useState({
    token: credentials?.token || "",
    key: credentials?.key || ""
  });
  
  // Load or refresh shipments data
  const refreshShipments = useCallback(() => {
    if (fetcher.state === 'submitting' || !isConfigured) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      fetcher.submit(
        {
          startDate: dateRange.start,
          endDate: dateRange.end,
          _action: 'getShipments'
        },
        { method: 'post', action: '/api/shipping' }
      );
    } catch (err) {
      setError(err.message || t('errors.shipmentsLoading'));
      showToast({
        content: t('errors.shipmentsLoading'),
        error: true
      });
      setIsLoading(false);
    }
  }, [fetcher, dateRange, t, showToast, isConfigured]);
  
  // Filter shipments based on date range
  const filterShipmentsByDateRange = useCallback(() => {
    if (!shipments || shipments.length === 0) {
      setFilteredShipments([]);
      return;
    }
    
    const startDate = new Date(dateRange.start);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);
    
    const filtered = shipments.filter(shipment => {
      const createdAt = new Date(shipment.createdAt);
      return createdAt >= startDate && createdAt <= endDate;
    });
    
    setFilteredShipments(filtered);
    setCurrentPage(1);
    
    // Calculate stats for filtered shipments
    calculateStats(filtered);
  }, [shipments, dateRange]);
  
  // Calculate stats for filtered shipments
  const calculateStats = useCallback((filteredData) => {
    const stats = {
      totalShipments: filteredData.length,
      pendingShipments: 0,
      deliveredShipments: 0,
      returnedShipments: 0,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0
    };
    
    filteredData.forEach(shipment => {
      // Count by status
      if (shipment.statusId === 5) { // Delivered
        stats.deliveredShipments++;
      } else if (shipment.statusId === 6) { // Returned
        stats.returnedShipments++;
      } else {
        stats.pendingShipments++;
      }
      
      // Sum financials
      stats.totalRevenue += parseFloat(shipment.totalRevenue || 0);
      stats.totalCost += parseFloat(shipment.totalCost || 0);
      stats.totalProfit += parseFloat(shipment.profit || 0);
    });
    
    setStats(stats);
  }, []);
  
  // Handle credentials submission
  const saveCredentials = useCallback(() => {
    if (fetcher.state === 'submitting') return;
    
    try {
      fetcher.submit(
        {
          token: credentialsForm.token,
          key: credentialsForm.key,
          _action: 'saveCredentials'
        },
        { method: 'post', action: '/api/shipping/credentials' }
      );
    } catch (err) {
      setError(err.message || t('errors.credentialsSaving'));
      showToast({
        content: t('errors.credentialsSaving'),
        error: true
      });
    }
  }, [fetcher, credentialsForm, t, showToast]);
  
  // Create a new shipment
  const createShipment = useCallback(() => {
    if (fetcher.state === 'submitting') return;
    
    try {
      const formData = new FormData();
      
      // Add all shipment form fields
      Object.entries(shipmentForm).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      // Add action
      formData.append('_action', 'createShipment');
      
      // Submit the form
      fetcher.submit(formData, { method: 'post', action: '/api/shipping' });
    } catch (err) {
      setError(err.message || t('errors.shipmentCreation'));
      showToast({
        content: t('errors.shipmentCreation'),
        error: true
      });
    }
  }, [fetcher, shipmentForm, t, showToast]);
  
  // Load wilaya data
  const loadWilayaData = useCallback(() => {
    if (fetcher.state === 'submitting' || !isConfigured) return;
    
    try {
      fetcher.submit(
        { _action: 'getWilayaData' },
        { method: 'post', action: '/api/shipping/wilaya' }
      );
    } catch (err) {
      setError(err.message || t('errors.wilayaDataLoading'));
      showToast({
        content: t('errors.wilayaDataLoading'),
        error: true
      });
    }
  }, [fetcher, t, showToast, isConfigured]);
  
  // Handle fetcher state changes
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      setIsLoading(false);
      
      if (fetcher.data.shipments) {
        // Shipments data loaded
        setShipments(fetcher.data.shipments);
        setError(null);
      } else if (fetcher.data.credentials) {
        // Credentials saved
        setCredentials(fetcher.data.credentials);
        setIsConfigured(true);
        setIsCredentialsModalOpen(false);
        showToast({
          content: t('toast.credentialsSaved'),
          error: false
        });
        
        // Load wilaya data after credentials are saved
        loadWilayaData();
      } else if (fetcher.data.wilayaData) {
        // Wilaya data loaded
        setWilayaData(fetcher.data.wilayaData);
      } else if (fetcher.data.success && fetcher.data.shipmentId) {
        // Shipment created
        showToast({
          content: `${t('toast.shipmentCreated')} Tracking: ${fetcher.data.shipmentId}`,
          error: false
        });
        
        setIsShipmentModalOpen(false);
        refreshShipments();
      } else if (fetcher.data.error) {
        // Error handling
        setError(fetcher.data.error);
        showToast({
          content: fetcher.data.error,
          error: true
        });
      }
    }
  }, [fetcher.state, fetcher.data, t, showToast, refreshShipments, loadWilayaData]);
  
  // Filter shipments when date range or shipments change
  useEffect(() => {
    filterShipmentsByDateRange();
  }, [shipments, dateRange, filterShipmentsByDateRange]);
  
  // Load data on initial mount if configured
  useEffect(() => {
    if (isConfigured && !wilayaData.length) {
      loadWilayaData();
    }
    
    if (isConfigured && !shipments.length) {
      refreshShipments();
    }
  }, [isConfigured, loadWilayaData, refreshShipments, wilayaData.length, shipments.length]);
  
  // Calculate pagination values
  const totalPages = Math.max(1, Math.ceil(filteredShipments.length / rowsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  
  const currentPageData = filteredShipments.slice(
    (safeCurrentPage - 1) * rowsPerPage, 
    safeCurrentPage * rowsPerPage
  );
  
  // Handle wilaya selection in shipment form
  const handleWilayaSelection = useCallback((wilayaId) => {
    const selectedWilaya = wilayaData.find(w => w.ID.toString() === wilayaId);
    if (selectedWilaya) {
      setShipmentForm(prev => ({
        ...prev,
        IDWilaya: selectedWilaya.ID.toString(),
        Wilaya: selectedWilaya.Name,
        deliveryFee: selectedWilaya.HomeDelivery.toString(),
        cancelFee: selectedWilaya.DamagePrice.toString()
      }));
    }
  }, [wilayaData]);
  
  return {
    // Data
    shipments,
    filteredShipments,
    currentPageData,
    selectedShipment,
    setSelectedShipment,
    stats,
    isLoading,
    error,
    credentials,
    isConfigured,
    wilayaData,
    
    // Pagination
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    
    // Date range
    dateRange,
    setDateRange,
    dateRangeOptions,
    isCustomRange,
    setCustomDateRange,
    
    // Forms
    shipmentForm,
    setShipmentForm,
    credentialsForm,
    setCredentialsForm,
    
    // Modals
    isShipmentModalOpen,
    setIsShipmentModalOpen,
    isCredentialsModalOpen,
    setIsCredentialsModalOpen,
    
    // Actions
    refreshShipments,
    saveCredentials,
    createShipment,
    loadWilayaData,
    handleWilayaSelection
  };
}
