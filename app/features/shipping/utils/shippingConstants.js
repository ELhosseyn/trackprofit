/**
 * Shipping status constants
 * Contains mapping of status codes to labels and colors
 */

/**
 * Shipping status codes
 */
export const SHIPPING_STATUS = {
  PREPARING: 1,
  SHIPPED: 2,
  IN_TRANSIT: 3,
  ARRIVED: 4,
  DELIVERED: 5,
  RETURNED: 6,
  WAITING: 7
};

/**
 * Shipping status labels
 */
export const SHIPPING_STATUS_LABELS = {
  1: 'En Préparation',
  2: 'Expédiée',
  3: 'En Route',
  4: 'Arrivée à Wilaya',
  5: 'Livrée',
  6: 'Retournée',
  7: 'En Attente'
};

/**
 * Shipping status colors/tones for UI components
 */
export const SHIPPING_STATUS_COLORS = {
  1: 'info',      // En Préparation - Blue
  2: 'attention', // Expédiée - Yellow
  3: 'attention', // En Route - Yellow
  4: 'warning',   // Arrivée à Wilaya - Orange
  5: 'success',   // Livrée - Green
  6: 'critical',  // Retournée - Red
  7: 'warning'    // En Attente - Orange
};

/**
 * Delivery type options
 */
export const DELIVERY_TYPES = {
  HOME_DELIVERY: 0,
  STORE_PICKUP: 1
};

/**
 * Package type options
 */
export const PACKAGE_TYPES = {
  NORMAL: 0,
  FRAGILE: 1,
  LIQUID: 2
};
