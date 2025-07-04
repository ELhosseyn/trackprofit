import { authenticate } from "../shopify.server";
import db from "../db.server";
import { createSubscriptionMetafield } from "../models/Subscription.server";
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
      case "orders/cancelled":
        // Handle order updates
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Order ${topic} webhook received from ${shop}`);
        }
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