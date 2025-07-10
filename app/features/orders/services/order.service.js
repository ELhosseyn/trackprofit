/**
 * Order Service - Handles orders data retrieval and manipulation
 */
import prisma from "../../../core/db.server";

export class OrderService {
  constructor() {
    this.prisma = prisma;
  }

  /**
   * Fetches orders from Shopify GraphQL API
   * @param {Object} admin - Shopify Admin API client
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Orders data with pagination info
   */
  async getOrders(admin, params = {}) {
    const { 
      startDate, 
      endDate, 
      cursor, 
      pageSize = 20, 
      status = "any",
      query = ""
    } = params;

    try {
      // Build query parts
      let queryString = "";
      
      // Add date range if provided
      if (startDate && endDate) {
        queryString += `created_at:>=${startDate} created_at:<=${endDate}`;
      }
      
      // Add status if it's not 'any'
      if (status && status !== "any") {
        queryString += queryString ? ` AND status:${status}` : `status:${status}`;
      }
      
      // Add custom query if provided
      if (query) {
        queryString += queryString ? ` AND ${query}` : query;
      }
      
      // Build the graphql query with proper pagination
      const response = await admin.graphql(`
        query getOrders($numOrders: Int!, $cursor: String, $query: String) {
          orders(first: $numOrders, after: $cursor, query: $query, sortKey: CREATED_AT, reverse: true) {
            edges {
              node {
                id
                name
                createdAt
                displayFinancialStatus
                displayFulfillmentStatus
                totalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                subtotalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                customer {
                  id
                  firstName
                  lastName
                  email
                  phone
                  defaultAddress {
                    address1
                    address2
                    city
                    province
                    country
                    zip
                    phone
                  }
                }
                shippingAddress {
                  address1
                  address2
                  city
                  province
                  country
                  zip
                  phone
                }
                lineItems(first: 50) {
                  edges {
                    node {
                      id
                      name
                      quantity
                      variant {
                        id
                        price
                        inventoryItem {
                          id
                          cost
                        }
                        product {
                          id
                          title
                        }
                      }
                    }
                  }
                }
              }
              cursor
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      `, {
        variables: {
          numOrders: pageSize,
          cursor: cursor || null,
          query: queryString || null
        }
      });

      const responseJson = await response.json();
      return responseJson.data.orders;
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw error;
    }
  }

  /**
   * Get order COGS (Cost of Goods Sold) for an order
   * @param {string} shop - The shop identifier
   * @param {string} orderId - The Shopify order ID
   * @returns {Promise<Object>} The OrderCOGS record
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
   * Calculate and store COGS for all orders in a batch
   * @param {string} shop - The shop identifier
   * @param {Array} orders - Array of orders from Shopify API
   * @returns {Promise<Array>} Array of created or updated OrderCOGS records
   */
  async batchCalculateAndStoreCOGS(shop, orders) {
    const results = [];
    
    for (const order of orders) {
      try {
        const orderId = order.id.split('/').pop();
        const orderName = order.name;
        const totalRevenue = parseFloat(order.totalPriceSet.shopMoney.amount);
        
        // Format line items for COGS calculation
        const lineItems = order.lineItems.edges.map(edge => {
          const item = edge.node;
          const variant = item.variant;
          const product = variant?.product;
          const cost = variant?.inventoryItem?.cost || 0;
          
          return {
            productId: product?.id.split('/').pop() || '',
            variantId: variant?.id.split('/').pop() || '',
            title: item.name,
            quantity: item.quantity,
            price: parseFloat(variant?.price || 0),
            unitCost: parseFloat(cost)
          };
        });
        
        // Check if order COGS already exists
        const existingCOGS = await this.getOrderCOGS(shop, orderId);
        
        if (existingCOGS) {
          results.push(existingCOGS);
          continue;
        }
        
        // Calculate COGS
        const cogsResult = await this.calculateCOGS(shop, orderId, orderName, lineItems, totalRevenue);
        results.push(cogsResult);
      } catch (error) {
        console.error(`Error calculating COGS for order ${order.name}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Calculate and store COGS for a single order
   */
  async calculateCOGS(shop, orderId, orderName, lineItems, totalRevenue) {
    try {
      // Calculate COGS for each line item
      let totalCost = 0;
      const itemsWithCost = [];

      for (const item of lineItems) {
        const { productId, variantId, title, quantity, price, unitCost } = item;
        
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
      profitMargin: 0,
      averageOrderValue: 0
    };

    if (orders.length > 0) {
      summary.totalRevenue = orders.reduce((sum, order) => sum + order.totalRevenue, 0);
      summary.totalCost = orders.reduce((sum, order) => sum + order.totalCost, 0);
      summary.totalProfit = orders.reduce((sum, order) => sum + order.profit, 0);
      summary.averageProfit = summary.totalProfit / orders.length;
      summary.averageOrderValue = summary.totalRevenue / orders.length;
      summary.profitMargin = (summary.totalProfit / summary.totalRevenue) * 100;
    }

    return {
      orders,
      summary
    };
  }
}

export default new OrderService();
