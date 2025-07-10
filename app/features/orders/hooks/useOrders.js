/**
 * useOrders hook for managing orders data and state
 */
import { useState, useEffect, useCallback } from 'react';
import { useFetcher } from '@remix-run/react';
import { useToast } from '../../../shared/hooks/useToast.jsx';
import { useDateRange } from '../../../shared/hooks/useDateRange';
import { useTranslation } from '../../../i18n';

export function useOrders(initialData = {}) {
  const fetcher = useFetcher();
  const { showToast } = useToast();
  const { t } = useTranslation();
  
  // Orders state
  const [orders, setOrders] = useState(initialData.orders || []);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Stats state
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    avgOrderValue: 0,
    avgProfit: 0
  });
  
  // Date range state
  const { 
    dateRange, 
    setDateRange, 
    dateRangeOptions,
    isCustomRange,
    setCustomDateRange 
  } = useDateRange();
  
  // Shipment form state
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
    DeliveryPartner: "zrexpress",
    orderId: "",
    deliveryFee: "0",
    cancelFee: "0"
  });
  
  // Modal state
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  
  // Load or refresh orders data
  const refreshOrders = useCallback(() => {
    if (fetcher.state === 'submitting') return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      fetcher.submit(
        {
          startDate: dateRange.start,
          endDate: dateRange.end,
          _action: 'getOrders'
        },
        { method: 'post', action: '/api/orders' }
      );
    } catch (err) {
      setError(err.message || t('errors.ordersLoading'));
      showToast({
        content: t('errors.ordersLoading'),
        error: true
      });
      setIsLoading(false);
    }
  }, [fetcher, dateRange, t, showToast]);
  
  // Filter orders based on date range
  const filterOrdersByDateRange = useCallback(() => {
    if (!orders || !orders.edges) {
      setFilteredOrders([]);
      return;
    }
    
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);
    
    const filtered = orders.edges.filter(({ node }) => {
      const orderDate = new Date(node.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
    
    setFilteredOrders(filtered);
    setCurrentPage(1);
    
    // Calculate stats for filtered orders
    calculateStats(filtered);
  }, [orders, dateRange]);
  
  // Calculate stats for filtered orders
  const calculateStats = useCallback((filteredData) => {
    let totalOrders = 0, 
        totalRevenue = 0, 
        totalCost = 0, 
        totalProfit = 0;
    
    filteredData.forEach(({ node }) => {
      totalOrders++;
      
      // Calculate revenue
      const orderAmount = parseFloat(node.totalPriceSet?.shopMoney?.amount || 0);
      totalRevenue += orderAmount;
      
      // Calculate cost if available
      let orderCost = 0;
      node.lineItems?.edges.forEach(({ node: item }) => {
        const quantity = item.quantity || 1;
        const costPerItem = parseFloat(item.variant?.inventoryItem?.unitCost?.amount || 0);
        orderCost += costPerItem * quantity;
      });
      totalCost += orderCost;
      
      // Calculate profit
      totalProfit += (orderAmount - orderCost);
    });
    
    // Calculate averages
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgProfit = totalOrders > 0 ? totalProfit / totalOrders : 0;
    
    setStats({
      totalOrders,
      totalRevenue,
      totalCost,
      totalProfit,
      avgOrderValue,
      avgProfit
    });
  }, []);
  
  // Handle order selection for shipment creation
  const handleOrderSelect = useCallback((order) => {
    setSelectedOrder(order);
    
    // Extract data from the order to pre-populate the shipment form
    const shippingAddress = order.shippingAddress || {};
    const name = order.customer 
      ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() 
      : '';
    const phone = shippingAddress.phone || order.customer?.phone || '';
    const address = [shippingAddress.address1, shippingAddress.address2]
      .filter(Boolean)
      .join(', ');
    const city = shippingAddress.city || '';
    const province = shippingAddress.province || '';
    const total = order.totalPriceSet?.shopMoney?.amount || '0';
    
    // Get product description from line items
    let productDescription = "";
    if (order.lineItems?.edges?.length > 0) {
      const items = order.lineItems.edges.map(({ node }) => 
        `${node.name} (x${node.quantity})`
      );
      productDescription = items.join(", ");
    }
    
    // Update the shipment form
    setShipmentForm({
      ...shipmentForm,
      Client: name || 'N/A',
      MobileA: phone || 'N/A',
      Adresse: address || 'N/A',
      Commune: city || province || '',
      Total: total,
      TProduit: productDescription || order.name || 'N/A',
      orderId: order.id.split('/').pop()
    });
    
    setIsShipmentModalOpen(true);
  }, [shipmentForm]);
  
  // Create a shipment
  const createShipment = useCallback(() => {
    if (fetcher.state === 'submitting') return;
    
    try {
      const formData = new FormData();
      
      // Add all shipment form fields
      Object.entries(shipmentForm).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      // Add selected order ID and action
      formData.append('orderId', selectedOrder?.id.split('/').pop() || '');
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
  }, [fetcher, shipmentForm, selectedOrder, t, showToast]);
  
  // Handle fetcher state changes
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.orders) {
        setOrders(fetcher.data.orders);
        setIsLoading(false);
      } else if (fetcher.data.success && fetcher.data.shipmentId) {
        // Handle successful shipment creation
        showToast({
          content: `${t('toast.shipmentCreated')} Tracking: ${fetcher.data.shipmentId}`,
          error: false
        });
        
        setIsShipmentModalOpen(false);
        refreshOrders();
      } else if (fetcher.data.error) {
        // Handle error
        showToast({
          content: fetcher.data.error,
          error: true
        });
      }
    }
  }, [fetcher.state, fetcher.data, t, showToast, refreshOrders]);
  
  // Filter orders when date range or orders change
  useEffect(() => {
    filterOrdersByDateRange();
  }, [orders, dateRange, filterOrdersByDateRange]);
  
  // Calculate current page data
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / rowsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  
  const currentPageData = filteredOrders.slice(
    (safeCurrentPage - 1) * rowsPerPage, 
    safeCurrentPage * rowsPerPage
  );
  
  return {
    // Data
    orders,
    filteredOrders,
    currentPageData,
    selectedOrder,
    stats,
    isLoading,
    error,
    
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
    
    // Shipment
    shipmentForm,
    setShipmentForm,
    isShipmentModalOpen,
    setIsShipmentModalOpen,
    
    // Actions
    refreshOrders,
    handleOrderSelect,
    createShipment
  };
}
