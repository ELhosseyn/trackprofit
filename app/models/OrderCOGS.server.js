import prisma from "../db.server";

export class OrderCOGSService {
  constructor() {
    this.prisma = prisma;
  }

  /**
   * Calculate and store COGS for an order
   * @param {string} shop - The shop identifier
   * @param {string} orderId - The Shopify order ID
   * @param {string} orderName - The Shopify order name (#1001, etc.)
   * @param {Array} lineItems - Array of line items with product/variant information
   * @param {number} totalRevenue - Total revenue from the order
   * @returns {Promise<Object>} The created OrderCOGS record
   */
  async calculateAndStoreCOGS(shop, orderId, orderName, lineItems, totalRevenue) {
    try {
      // Check if this order already has COGS calculated
      const existingCOGS = await this.prisma.orderCOGS.findUnique({
        where: {
          shop_orderId: {
            shop,
            orderId
          }
        }
      });

      if (existingCOGS) {
        return existingCOGS;
      }

      // Calculate COGS for each line item
      let totalCost = 0;
      const itemsWithCost = [];

      for (const item of lineItems) {
        const { productId, variantId, title, quantity, price } = item;
        let unitCost = 0;

        // Try to find inventory item's cost from the Shopify admin API
        try {
          // This would typically be handled by your Shopify GraphQL query
          // Here we're assuming the cost is being passed in or set to 0
          unitCost = item.unitCost || 0;
        } catch (error) {
          console.error(`Failed to get cost for variant ${variantId}:`, error);
        }

        const itemTotalCost = unitCost * quantity;
        const itemTotalRevenue = price * quantity;
        const itemProfit = itemTotalRevenue - itemTotalCost;

        totalCost += itemTotalCost;

        itemsWithCost.push({
          productId,
          variantId,
          title,
          quantity,
          unitCost,
          price,
          totalCost: itemTotalCost,
          totalRevenue: itemTotalRevenue,
          profit: itemProfit
        });
      }

      const profit = totalRevenue - totalCost;

      // Create the OrderCOGS record with items
      const orderCOGS = await this.prisma.orderCOGS.create({
        data: {
          shop,
          orderId,
          orderName,
          totalCost,
          totalRevenue,
          profit,
          items: {
            create: itemsWithCost
          }
        },
        include: {
          items: true
        }
      });

      return orderCOGS;
    } catch (error) {
      console.error("Error calculating COGS:", error);
      throw error;
    }
  }

  /**
   * Get COGS for a specific order
   */
  async getOrderCOGS(shop, orderId) {
    return this.prisma.orderCOGS.findUnique({
      where: {
        shop_orderId: {
          shop,
          orderId
        }
      },
      include: {
        items: true
      }
    });
  }

  /**
   * Get COGS summary for all orders in a date range
   */
  async getCOGSSummary(shop, startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    const orders = await this.prisma.orderCOGS.findMany({
      where: {
        shop,
        createdAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate summary stats
    const summary = {
      totalOrders: orders.length,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      averageProfit: 0,
      profitMargin: 0
    };

    if (orders.length > 0) {
      summary.totalRevenue = orders.reduce((sum, order) => sum + order.totalRevenue, 0);
      summary.totalCost = orders.reduce((sum, order) => sum + order.totalCost, 0);
      summary.totalProfit = orders.reduce((sum, order) => sum + order.profit, 0);
      summary.averageProfit = summary.totalProfit / orders.length;
      summary.profitMargin = (summary.totalProfit / summary.totalRevenue) * 100;
    }

    return {
      orders,
      summary
    };
  }
}
