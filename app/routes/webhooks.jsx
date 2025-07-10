import { authenticate } from "../shopify.server";
import db from "../db.server";
import { createSubscriptionMetafield } from "../models/Subscription.server";
import { OrderCOGSService } from "../models/OrderCOGS.server";
import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  const { topic, shop, session, admin, payload } =
    await authenticate.webhook(request);

  if (!admin) {
    // The admin context isn't returned if the webhook fired after a shop was uninstalled.
    throw new Response();
  }

  try {
    switch (topic) {
      case "products/create":
      case "products/update":
      case "products/delete":
        // Handle product updates
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Product ${topic} webhook received from ${shop}`);
        }
        break;

      case "orders/create":
      case "orders/updated":
        // Handle order updates and calculate COGS
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Order ${topic} webhook received from ${shop}`);
        }
        
        try {
          // Calculate and store COGS for the order
          const orderCOGSService = new OrderCOGSService();
          
          if (payload && payload.id && payload.line_items) {
            const orderId = payload.id.toString();
            const orderName = payload.name || `#${payload.order_number || orderId}`;
            const totalRevenue = parseFloat(payload.total_price || 0);
            
            // Extract line items with required data
            const lineItems = payload.line_items.map(item => ({
              productId: item.product_id?.toString() || '',
              variantId: item.variant_id?.toString() || '',
              title: item.title || '',
              quantity: parseInt(item.quantity || 0),
              price: parseFloat(item.price || 0),
              unitCost: 0 // Default to 0, will be fetched from Shopify if available
            }));
            
            // Try to get cost data from Shopify for each variant
            for (const item of lineItems) {
              if (item.variantId && admin) {
                try {
                  const variantQuery = await admin.graphql(
                    `#graphql
                    query getVariantCost($id: ID!) {
                      productVariant(id: $id) {
                        id
                        inventoryItem {
                          id
                          unitCost {
                            amount
                          }
                        }
                      }
                    }`,
                    { variables: { id: `gid://shopify/ProductVariant/${item.variantId}` } }
                  );
                  
                  const variantResponse = await variantQuery.json();
                  const unitCost = variantResponse.data?.productVariant?.inventoryItem?.unitCost?.amount;
                  if (unitCost) {
                    item.unitCost = parseFloat(unitCost);
                  }
                } catch (costError) {
                  console.error(`Failed to get cost for variant ${item.variantId}:`, costError);
                }
              }
            }
            
            await orderCOGSService.calculateAndStoreCOGS(
              shop,
              orderId,
              orderName,
              lineItems,
              totalRevenue
            );
            
            console.log(`✅ COGS calculated for order ${orderName}`);
          }
        } catch (cogsError) {
          console.error(`Error calculating COGS for order:`, cogsError);
        }
        break;

      case "orders/cancelled":
        // Handle order cancellation
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Order ${topic} webhook received from ${shop}`);
        }
        // You can add logic to handle cancelled orders here
        break;

      case "inventory_items/update":
      case "inventory_levels/update":
        // Handle inventory updates
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Inventory ${topic} webhook received from ${shop}`);
        }
        break;

      case "APP_UNINSTALLED":
        if (session) {
          await db.session.deleteMany({ where: { shop } });
        }
        break;

      case "APP_SUBSCRIPTIONS_UPDATE":
        if (payload.app_subscription.status == "ACTIVE") {
          createSubscriptionMetafield(admin.graphql, "true");
        } else {
          createSubscriptionMetafield(admin.graphql, "false");
        }
        break;

      case "CUSTOMERS_DATA_REQUEST":
      case "CUSTOMERS_REDACT":
      case "SHOP_REDACT":
      default:
        throw new Response("Unhandled webhook topic", { status: 404 });
    }

    return json({ success: true });
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}; 