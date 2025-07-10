/**
 * Product Service module for TrackProfit
 * Handles all product-related API interactions and data transformations
 */
import { db } from '../../../lib/db.server';
import { formatCurrency, formatNumber, formatPercentage } from '../../../utils/formatters';

/**
 * Fetch all products from Shopify API
 * @param {Object} admin - Shopify admin API client
 * @returns {Promise<Array>} - Products data
 */
export async function getAllProducts(admin) {
  let allProducts = [];
  let hasNextPage = true;
  let cursor = null;

  try {
    while (hasNextPage) {
      const query = `#graphql
        query getProducts($first: Int!, $after: String) {
          products(first: $first, after: $after) {
            edges {
              node {
                id
                title
                status
                totalInventory
                productType
                createdAt
                variants(first: 1) {
                  edges {
                    node {
                      id
                      price
                      inventoryQuantity
                      inventoryItem {
                        id
                        unitCost {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                }
                priceRangeV2 {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                }
              }
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const response = await admin.graphql(query, {
        variables: {
          first: 50,
          after: cursor
        }
      });

      const responseJson = await response.json();

      if (responseJson.errors) {
        throw new Error(responseJson.errors[0].message);
      }

      const products = responseJson.data.products;
      allProducts = [...allProducts, ...products.edges];

      hasNextPage = products.pageInfo.hasNextPage;
      cursor = products.pageInfo.endCursor;

      // Add a small delay to avoid rate limiting
      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }

    return allProducts;
  } catch (error) {
    console.error("Products Query Error:", error);
    throw error;
  }
}

/**
 * Update product cost in Shopify
 * @param {Object} admin - Shopify admin API client
 * @param {string} productId - Product ID
 * @param {string} variantId - Variant ID
 * @param {number} cost - Cost value to set
 * @returns {Promise<Object>} - Updated inventory item data
 */
export async function updateProductCost(admin, productId, variantId, cost) {
  if (!productId || !variantId || cost === undefined) {
    throw new Error("Missing required fields for updating product cost");
  }

  try {
    // First get the inventory item ID for the variant
    const variantQuery = await admin.graphql(
      `#graphql
      query getVariant($id: ID!) {
        productVariant(id: $id) {
          id
          inventoryItem {
            id
          }
        }
      }`,
      { variables: { id: variantId } }
    );

    const variantResponse = await variantQuery.json();
    if (!variantResponse.data?.productVariant?.inventoryItem?.id) {
      throw new Error("Could not find inventory item for variant");
    }
    
    const inventoryItemId = variantResponse.data.productVariant.inventoryItem.id;

    // Update the inventory item with the new cost
    const updateResponse = await admin.graphql(
      `#graphql
      mutation inventoryItemUpdate($inventoryItemId: ID!, $cost: Decimal) {
        inventoryItemUpdate(id: $inventoryItemId, input: {cost: $cost}) {
          inventoryItem {
            id
            unitCost {
              amount
              currencyCode
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          inventoryItemId: inventoryItemId,
          cost: parseFloat(cost) || 0
        }
      }
    );

    const responseJson = await updateResponse.json();

    if (responseJson.data?.inventoryItemUpdate?.userErrors?.length > 0) {
      const error = responseJson.data.inventoryItemUpdate.userErrors[0];
      throw new Error(error.message);
    }

    const inventoryItem = responseJson.data?.inventoryItemUpdate?.inventoryItem;
    if (!inventoryItem) {
      const topLevelErrors = responseJson.errors;
      if (topLevelErrors && topLevelErrors.length > 0) {
        throw new Error(topLevelErrors[0].message);
      }
      throw new Error("Failed to update inventory item and no specific error was returned.");
    }

    return {
      success: true,
      inventoryItem,
      variantId,
      message: "Cost updated successfully"
    };
  } catch (error) {
    console.error("Update Cost Error:", error);
    throw error;
  }
}

/**
 * Calculate product statistics for dashboard and reporting
 * @param {Array} products - Array of product edges 
 * @returns {Object} - Calculated statistics object
 */
export function calculateProductStats(products) {
  let totalProducts = 0;
  let totalInventory = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let totalMargin = 0;
  let profitCount = 0;
  
  products.forEach(({ node }) => {
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
  
  return {
    totalProducts,
    totalInventory,
    totalCost: Number(totalCost.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    avgProfit: totalProducts > 0 ? Number((totalProfit / totalProducts).toFixed(2)) : 0,
    avgMargin: profitCount > 0 ? Number((totalMargin / profitCount).toFixed(2)) : 0
  };
}

/**
 * Filter products by date range
 * @param {Array} products - Array of product edges
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} - Filtered products
 */
export function filterProductsByDateRange(products, startDate, endDate) {
  if (!Array.isArray(products)) return [];
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  return products.filter(({ node }) => {
    const createdAt = new Date(node.createdAt);
    return createdAt >= start && createdAt <= end;
  });
}

/**
 * Get the earliest product creation date from a list of products
 * @param {Array} products - Array of product edges
 * @returns {Date} - Earliest product creation date
 */
export function getEarliestProductDate(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return new Date();
  }
  
  return products.reduce((min, edge) => {
    const d = new Date(edge.node.createdAt);
    return d < min ? d : min;
  }, new Date());
}
