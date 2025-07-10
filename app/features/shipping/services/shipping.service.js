/**
 * Shipping Service module for TrackProfit
 * Handles all shipping-related operations and API interactions
 */
import { prisma as db } from '../../../lib/db.server';
import { zrexpress } from '../../../services/zrexpress.server';

/**
 * Create a new shipment from order data
 * @param {Object} shipmentData - Shipment data from form
 * @param {Object} session - User session
 * @param {Object} credentials - ZRExpress API credentials
 * @returns {Promise<Object>} - Shipment creation result
 */
export async function createShipment(shipmentData, session, credentials) {
  try {
    // Validate required fields
    const requiredFields = ['Client', 'MobileA', 'Adresse', 'IDWilaya', 'Wilaya', 'Commune', 'Total', 'TProduit'];
    for (const field of requiredFields) {
      if (!shipmentData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Create the shipment via ZRExpress API
    const result = await zrexpress.addColis(
      credentials.token,
      credentials.key,
      shipmentData,
      session
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create shipment');
    }
    
    // Update order status if order ID is provided
    if (shipmentData.orderId) {
      await db.orderShipment.create({
        data: {
          shop: session.shop,
          orderId: shipmentData.orderId,
          shipmentId: result.shipment.id,
          trackingNumber: result.shipment.tracking,
          status: 'created',
          createdAt: new Date()
        }
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error creating shipment:', error);
    throw error;
  }
}

/**
 * Get all shipments for a shop
 * @param {string} shop - Shop domain
 * @param {Object} filters - Filtering options
 * @returns {Promise<Array>} - List of shipments
 */
export async function getShipments(shop, filters = {}) {
  try {
    const { status, dateRange, limit, offset } = filters;
    
    const where = { shop };
    
    // Apply status filter if provided
    if (status) {
      where.status = status;
    }
    
    // Apply date range filter if provided
    if (dateRange?.start && dateRange?.end) {
      where.createdAt = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end)
      };
    }
    
    // Get total count for pagination
    const totalCount = await db.shipment.count({ where });
    
    // Get shipments with pagination
    const shipments = await db.shipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset || 0,
      take: limit || 100,
      include: {
        orderShipment: true
      }
    });
    
    return { 
      shipments, 
      totalCount,
      pageInfo: {
        hasNextPage: (offset || 0) + (limit || 100) < totalCount,
        hasPreviousPage: (offset || 0) > 0
      }
    };
  } catch (error) {
    console.error('Error getting shipments:', error);
    throw error;
  }
}

/**
 * Get shipment details by ID
 * @param {string} id - Shipment ID
 * @param {string} shop - Shop domain
 * @returns {Promise<Object>} - Shipment details
 */
export async function getShipmentById(id, shop) {
  try {
    const shipment = await db.shipment.findFirst({
      where: { id, shop },
      include: {
        orderShipment: true
      }
    });
    
    return shipment;
  } catch (error) {
    console.error('Error getting shipment by ID:', error);
    throw error;
  }
}

/**
 * Get shipment details by tracking number
 * @param {string} tracking - Tracking number
 * @param {string} shop - Shop domain
 * @returns {Promise<Object>} - Shipment details
 */
export async function getShipmentByTracking(tracking, shop) {
  try {
    const shipment = await db.shipment.findFirst({
      where: { tracking, shop },
      include: {
        orderShipment: true
      }
    });
    
    return shipment;
  } catch (error) {
    console.error('Error getting shipment by tracking:', error);
    throw error;
  }
}

/**
 * Get ZRExpress credentials for a shop
 * @param {string} shop - Shop domain
 * @returns {Promise<Object>} - ZRExpress credentials
 */
export async function getZRExpressCredentials(shop) {
  try {
    const credentials = await db.zRExpressCredential.findFirst({
      where: { shop }
    });
    
    return credentials;
  } catch (error) {
    console.error('Error getting ZRExpress credentials:', error);
    throw error;
  }
}

/**
 * Validate ZRExpress credentials
 * @param {string} token - User token
 * @param {string} key - API key
 * @returns {Promise<Object>} - Validation result
 */
export async function validateZRExpressCredentials(token, key) {
  try {
    return await zrexpress.validateCredentials(token, key);
  } catch (error) {
    console.error('Error validating ZRExpress credentials:', error);
    throw error;
  }
}

/**
 * Update ZRExpress credentials for a shop
 * @param {string} shop - Shop domain
 * @param {string} token - User token
 * @param {string} key - API key
 * @returns {Promise<Object>} - Updated credentials
 */
export async function updateZRExpressCredentials(shop, token, key) {
  try {
    // Validate the credentials first
    const validation = await validateZRExpressCredentials(token, key);
    if (!validation.success) {
      throw new Error(validation.error || 'Invalid credentials');
    }
    
    // Update or create credentials
    const credentials = await db.zRExpressCredential.upsert({
      where: { shop },
      update: { token, key },
      create: { shop, token, key }
    });
    
    return { success: true, credentials };
  } catch (error) {
    console.error('Error updating ZRExpress credentials:', error);
    throw error;
  }
}

/**
 * Get tarification data from ZRExpress
 * @param {Object} credentials - ZRExpress credentials
 * @returns {Promise<Array>} - List of wilayas with pricing
 */
export async function getZRExpressTarification(credentials) {
  try {
    return await zrexpress.getTarification(credentials.token, credentials.key);
  } catch (error) {
    console.error('Error getting ZRExpress tarification:', error);
    throw error;
  }
}

/**
 * Calculate shipping statistics
 * @param {Array} shipments - List of shipments
 * @returns {Object} - Calculated statistics
 */
export function calculateShippingStats(shipments) {
  try {
    const stats = {
      totalShipments: shipments.length,
      pendingShipments: 0,
      deliveredShipments: 0,
      returnedShipments: 0,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0
    };
    
    shipments.forEach(shipment => {
      // Count by status
      if (shipment.statusId === 5) { // Delivered
        stats.deliveredShipments++;
      } else if (shipment.statusId === 6) { // Returned
        stats.returnedShipments++;
      } else {
        stats.pendingShipments++;
      }
      
      // Sum financials
      stats.totalRevenue += shipment.totalRevenue || 0;
      stats.totalCost += shipment.totalCost || 0;
      stats.totalProfit += shipment.profit || 0;
    });
    
    return stats;
  } catch (error) {
    console.error('Error calculating shipping stats:', error);
    return {
      totalShipments: 0,
      pendingShipments: 0,
      deliveredShipments: 0,
      returnedShipments: 0,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0
    };
  }
}
