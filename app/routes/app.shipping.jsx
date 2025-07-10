/**
 * Shipping route
 * Renders the shipping management page
 */
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { authenticate } from '../shopify.server';
import { ShippingPage } from '../features/shipping';
import { 
  getShipments, 
  getZRExpressCredentials,
  getZRExpressTarification
} from '../features/shipping/services/shipping.service';

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  
  try {
    // Get credentials
    const credentials = await getZRExpressCredentials(session.shop);
    const isConfigured = !!credentials;
    
    let shipments = [];
    let wilayaData = [];
    
    // If configured, get shipments and wilaya data
    if (isConfigured) {
      // Get shipments for the last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const shipmentsResult = await getShipments(session.shop, {
        dateRange: { start: startDate, end: endDate }
      });
      
      shipments = shipmentsResult.shipments || [];
      
      // Get wilaya data
      wilayaData = await getZRExpressTarification(credentials);
    }
    
    return json({
      credentials,
      isConfigured,
      shipments,
      wilayaData,
      error: null,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Shipping loader error:", error);
    return json({
      credentials: null,
      isConfigured: false,
      shipments: [],
      wilayaData: [],
      error: error.message,
      timestamp: Date.now()
    }, { status: 500 });
  }
}

export default function Shipping() {
  const data = useLoaderData();
  
  return <ShippingPage initialData={data} />;
}
