import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { zrexpress } from "../services/zrexpress.server";

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  
  try {
    const formData = await request.formData();
    const action = formData.get('action');

    console.log('API action:', action);
    console.log('Shop:', session.shop);

    switch (action) {
      case 'saveCredentials': {
        const token = formData.get('token');
        const key = formData.get('key');

        console.log('Saving credentials for shop:', session.shop);
        console.log('Token length:', token?.length);
        console.log('Key length:', key?.length);

        if (!token || !key) {
          console.error('Missing token or key');
          return json({ 
            success: false, 
            error: 'Token and key are required' 
          }, { status: 400 });
        }

        // First validate the credentials with ZRExpress
        try {
          console.log('Validating credentials with ZRExpress...');
          await zrexpress.validateCredentials(token, key);
          console.log('Credentials validated successfully');
        } catch (error) {
          console.error('Validation error:', error);
          return json({ 
            success: false, 
            error: 'Invalid credentials: ' + error.message 
          }, { status: 400 });
        }

        // If validation successful, save to database
        try {
          console.log('Saving credentials to database...');
          const result = await prisma.zrexpressCredential.upsert({
            where: { 
              shop: session.shop 
            },
            update: {
              token: token.trim(),
              key: key.trim(),
              updatedAt: new Date()
            },
            create: {
              shop: session.shop,
              token: token.trim(),
              key: key.trim(),
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          console.log('Credentials saved successfully:', result.id);
          return json({ success: true });
        } catch (error) {
          console.error('Database error:', error);
          return json({ 
            success: false, 
            error: 'Failed to save credentials: ' + error.message 
          }, { status: 500 });
        }
      }

      case 'testConnection': {
        const credentials = await prisma.zrexpressCredential.findUnique({
          where: { shop: session.shop }
        });

        if (!credentials) {
          return json({ 
            success: false, 
            error: 'No credentials found' 
          }, { status: 404 });
        }

        try {
          await zrexpress.validateCredentials(credentials.token, credentials.key);
          return json({ success: true });
        } catch (error) {
          return json({ 
            success: false, 
            error: 'Connection test failed: ' + error.message 
          }, { status: 400 });
        }
      }

      case 'createShipment':
        const shipmentData = Object.fromEntries(formData);
        // Here you would create a new shipment with ZRExpress
        return json({ success: true });

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('ZRExpress API Error:', error);
    return json({ error: error.message }, { status: 500 });
  }
}

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'getStatus':
        // Here you would check the ZRExpress connection status
        return json({ isConnected: false });

      case 'getShipments':
        // Here you would fetch shipments from ZRExpress
        return json({ shipments: [] });

      case 'getPricing':
        // Here you would fetch pricing from ZRExpress
        return json({ pricing: [] });

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('ZRExpress API Error:', error);
    return json({ error: error.message }, { status: 500 });
  }
} 