/**
 * Format currency values with proper localization
 * @param {number} amount - The amount to format
 * @param {boolean} [isNegative=false] - Whether to show as negative amount
 * @param {string} [currency='DZD'] - The currency code
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, isNegative = false, currency = 'DZD') => {
  if (amount == null || isNaN(amount)) return '0.00';
  
  const value = Math.abs(Number(amount));
  const sign = isNegative ? '-' : '';

  return `${sign}${value.toLocaleString('fr-DZ', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Format numbers with proper localization
 * @param {number} value - The number to format
 * @param {number} [decimals=0] - Number of decimal places
 * @returns {string} Formatted number string
 */
export const formatNumber = (value, decimals = 0) => {
  if (value == null || isNaN(value)) return '0';
  
  return Number(value).toLocaleString('fr-DZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Format percentage values
 * @param {number} value - The value to format as percentage
 * @param {number} [decimals=1] - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value == null || isNaN(value)) return '0%';
  
  return `${Number(value).toLocaleString('fr-DZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}%`;
};

/**
 * Format date values with proper localization
 * @param {string|Date} date - The date to format
 * @param {Object} [options] - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return '-';
    
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };
    
    return dateObj.toLocaleDateString('fr-DZ', defaultOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};
