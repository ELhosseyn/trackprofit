/**
 * useProducts hook for managing products data and UI state
 */
import { useState, useEffect, useCallback } from 'react';
import { useFetcher } from '@remix-run/react';
import { useToast } from '../../../shared/hooks/useToast.jsx';
import { useDateRange } from '../../../shared/hooks/useDateRange';
import { useTranslation } from '../../../i18n';
import { formatCurrency, formatNumber, formatPercentage } from '../../../utils/formatters';

export function useProducts(initialData = {}) {
  const fetcher = useFetcher();
  const { showToast } = useToast();
  const { t } = useTranslation();
  
  // Products state
  const [products, setProducts] = useState(initialData.products || { edges: [] });
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Cost update state
  const [showCostModal, setShowCostModal] = useState(false);
  const [costValue, setCostValue] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Stats state
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalInventory: 0,
    totalCost: 0,
    totalProfit: 0,
    avgProfit: 0,
    avgMargin: 0
  });
  
  // Date range state from custom hook
  const { 
    dateRange, 
    setDateRange, 
    dateRangeOptions,
    isCustomRange,
    setCustomDateRange 
  } = useDateRange();
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('fr-CA'); // YYYY-MM-DD format
  };
  
  // Get created date from product node
  const getCreatedAt = (node) => new Date(node.createdAt);
  
  // Get earliest product date
  const getEarliestProductDate = useCallback(() => {
    if (!Array.isArray(products.edges) || products.edges.length === 0) return new Date();
    return products.edges.reduce((min, edge) => {
      const d = getCreatedAt(edge.node);
      return d < min ? d : min;
    }, new Date());
  }, [products.edges]);
  
  // Set initial date range based on product data
  useEffect(() => {
    if (products.edges.length > 0) {
      const minDate = getEarliestProductDate();
      setDateRange({
        start: minDate,
        end: new Date()
      });
    }
  }, [products.edges.length, getEarliestProductDate, setDateRange]);
  
  // Refresh products data
  const refreshProducts = useCallback(() => {
    if (fetcher.state === 'submitting') return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      fetcher.load('/api/products');
    } catch (err) {
      setError(err.message || t('errors.productsLoading'));
      showToast({
        content: t('errors.productsLoading'),
        error: true
      });
      setIsLoading(false);
    }
  }, [fetcher, t, showToast]);
  
  // Filter products based on date range
  const filterProductsByDateRange = useCallback(() => {
    if (!Array.isArray(products.edges)) {
      setFilteredProducts([]);
      return;
    }
    
    const startDate = new Date(dateRange.start);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);
    
    const filtered = products.edges.filter(({ node }) => {
      const createdAt = getCreatedAt(node);
      return createdAt >= startDate && createdAt <= endDate;
    });
    
    setFilteredProducts(filtered);
    setCurrentPage(1);
    
    // Calculate stats for filtered products
    calculateStats(filtered);
  }, [products.edges, dateRange]);
  
  // Calculate product statistics
  const calculateStats = useCallback((filteredData) => {
    let totalProducts = 0, 
        totalInventory = 0, 
        totalCost = 0, 
        totalProfit = 0,
        totalMargin = 0,
        profitCount = 0;
    
    filteredData.forEach(({ node }) => {
      totalProducts++;
      const inventory = node.totalInventory || 0;
      totalInventory += inventory;
      
      const variant = node.variants.edges[0]?.node;
      const sellingPrice = parseFloat(variant?.price || node.priceRangeV2.minVariantPrice.amount);
      const costPerItem = parseFloat(variant?.inventoryItem?.unitCost?.amount || 0);
      const profitPerItem = sellingPrice - costPerItem;
      const profit = profitPerItem * inventory;
      const margin = sellingPrice > 0 ? ((profitPerItem / sellingPrice) * 100) : 0;
      
      if (!isNaN(profit)) { totalProfit += profit; }
      if (!isNaN(costPerItem)) { totalCost += (costPerItem * inventory); }
      if (!isNaN(margin) && sellingPrice > 0) { totalMargin += margin; profitCount++; }
    });
    
    setStats({
      totalProducts,
      totalInventory,
      totalCost: Number(totalCost.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      avgProfit: totalProducts > 0 ? Number((totalProfit / totalProducts).toFixed(2)) : 0,
      avgMargin: profitCount > 0 ? Number((totalMargin / profitCount).toFixed(2)) : 0
    });
  }, []);
  
  // Handle product selection for cost update
  const handleCostUpdateClick = useCallback((productId) => {
    const product = products.edges.find(({ node }) => node.id === productId);
    if (product) {
      setSelectedProduct(product.node);
      const variant = product.node.variants.edges[0]?.node;
      setCostValue(variant?.inventoryItem?.unitCost?.amount || '');
      setShowCostModal(true);
    }
  }, [products.edges]);
  
  // Update product cost
  const updateProductCost = useCallback(() => {
    if (fetcher.state === 'submitting') return;
    
    const variant = selectedProduct?.variants.edges[0]?.node;
    if (!variant) {
      showToast({
        content: t('errors.variantNotFound'),
        error: true
      });
      return;
    }
    
    const cost = parseFloat(costValue);
    if (isNaN(cost) || cost < 0) {
      showToast({
        content: t('errors.invalidCost'),
        error: true
      });
      return;
    }
    
    setShowCostModal(false);
    setIsUpdating(true);
    
    try {
      const formData = new FormData();
      formData.append('productId', selectedProduct.id);
      formData.append('variantId', variant.id);
      formData.append('cost', cost.toString());
      
      fetcher.submit(formData, { method: 'post', action: '/api/products/cost' });
    } catch (err) {
      setError(err.message || t('errors.costUpdate'));
      showToast({
        content: t('errors.costUpdate'),
        error: true
      });
      setIsUpdating(false);
    }
  }, [fetcher, selectedProduct, costValue, t, showToast]);
  
  // Handle fetcher state changes
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      setIsLoading(false);
      setIsUpdating(false);
      
      if (fetcher.data.products) {
        // Products data loaded
        setProducts(fetcher.data.products);
        setError(null);
      } else if (fetcher.data.success && fetcher.data.inventoryItem) {
        // Cost update successful
        showToast({
          content: fetcher.data.message || t('toast.costUpdated'),
          error: false
        });
        
        // Update local data with the updated cost
        setProducts(prevData => {
          const newEdges = prevData.edges.map(edge => {
            const variant = edge.node.variants.edges[0]?.node;
            if (variant && variant.id === fetcher.data.variantId) {
              const newEdge = JSON.parse(JSON.stringify(edge));
              newEdge.node.variants.edges[0].node.inventoryItem.unitCost = fetcher.data.inventoryItem.unitCost;
              return newEdge;
            }
            return edge;
          });
          
          return { ...prevData, edges: newEdges };
        });
      } else if (fetcher.data.error) {
        // Error handling
        setError(fetcher.data.error);
        showToast({
          content: fetcher.data.error,
          error: true
        });
      }
    }
  }, [fetcher.state, fetcher.data, t, showToast]);
  
  // Filter products when date range or products change
  useEffect(() => {
    filterProductsByDateRange();
  }, [products, dateRange, filterProductsByDateRange]);
  
  // Calculate pagination values
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / rowsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  
  const currentPageData = filteredProducts.slice(
    (safeCurrentPage - 1) * rowsPerPage, 
    safeCurrentPage * rowsPerPage
  );
  
  return {
    // Data
    products,
    filteredProducts,
    currentPageData,
    selectedProduct,
    stats,
    isLoading,
    isUpdating,
    error,
    
    // Cost modal
    showCostModal,
    setShowCostModal,
    costValue, 
    setCostValue,
    
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
    
    // Helpers
    formatDate,
    
    // Actions
    refreshProducts,
    handleCostUpdateClick,
    updateProductCost
  };
}
