/**
 * Dashboard service for handling dashboard data and calculations
 */
import { prisma } from "../../../core/db.server.js";
import { facebookService } from "../../../core/services/facebook.service.js";
import { zrExpressService } from "../../../core/services/zrexpress.service.js";
import { orderCOGSService } from "../../../core/services/order-cogs.service.js";

export const dashboardService = {
  /**
   * Fetches all data needed for the dashboard
   * @param {Object} options - Options for fetching data
   * @param {string} options.shop - The shop domain
   * @param {Date} options.startDate - Start date for data range
   * @param {Date} options.endDate - End date for data range
   * @param {string} options.facebookAdAccountId - Facebook ad account ID
   */
  async getDashboardData({ shop, startDate, endDate, facebookAdAccountId }) {
    // Convert string dates to Date objects if needed
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    // Run queries in parallel for better performance
    const [
      ordersData,
      shipmentsData,
      cogsData,
      facebookData
    ] = await Promise.all([
      this.getOrdersData({ shop, startDate: start, endDate: end }),
      this.getShipmentsData({ shop, startDate: start, endDate: end }),
      this.getCOGSData({ shop, startDate: start, endDate: end }),
      facebookAdAccountId ? 
        facebookService.getAdsPerformance({ 
          shop, 
          adAccountId: facebookAdAccountId, 
          startDate: start, 
          endDate: end 
        }) : null
    ]);
    
    // Calculate the dashboard stats
    const stats = this.calculateDashboardStats({
      orders: ordersData,
      shipments: shipmentsData,
      cogs: cogsData,
      facebook: facebookData
    });
    
    return {
      stats,
      orders: ordersData,
      shipments: shipmentsData,
      cogs: cogsData,
      facebook: facebookData
    };
  },
  
  /**
   * Fetches orders data for the dashboard
   */
  async getOrdersData({ shop, startDate, endDate }) {
    const orders = await prisma.order.findMany({
      where: {
        shop,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        lineItems: true
      }
    });
    
    return orders;
  },
  
  /**
   * Fetches shipments data for the dashboard
   */
  async getShipmentsData({ shop, startDate, endDate }) {
    const shipments = await prisma.shipment.findMany({
      where: {
        shop,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        shipmentItems: true
      }
    });
    
    return shipments;
  },
  
  /**
   * Fetches COGS data for the dashboard
   */
  async getCOGSData({ shop, startDate, endDate }) {
    const cogsData = await orderCOGSService.getOrderCOGSForDateRange({
      shop,
      startDate,
      endDate
    });
    
    return cogsData;
  },
  
  /**
   * Calculates dashboard statistics based on orders, shipments, and ad data
   */
  calculateDashboardStats({ orders, shipments, cogs, facebook }) {
    // Calculate order revenue
    const orderRevenue = orders.reduce((total, order) => {
      return total + parseFloat(order.totalPrice || 0);
    }, 0);
    
    // Calculate shipping and cancel fees
    const shippingAndCancelFees = shipments.reduce((total, shipment) => {
      return total + parseFloat(shipment.shippingCost || 0) + parseFloat(shipment.cancelFees || 0);
    }, 0);
    
    // Calculate COGS total
    const cogsCosts = cogs.reduce((total, item) => {
      return total + parseFloat(item.totalCost || 0);
    }, 0);
    
    // Calculate ad costs
    const adCosts = facebook?.metrics?.totalSpend || 0;
    
    // Calculate total profit
    const totalProfit = orderRevenue - shippingAndCancelFees - cogsCosts - adCosts;
    
    return {
      orderRevenue,
      shippingAndCancelFees,
      cogsCosts,
      adCosts,
      totalProfit,
      totalOrders: orders.length,
      totalShipments: shipments.length
    };
  },
  
  /**
   * Get Facebook ad accounts for the shop
   */
  async getFacebookAdAccounts(shop) {
    return facebookService.getAdAccounts(shop);
  }
};
