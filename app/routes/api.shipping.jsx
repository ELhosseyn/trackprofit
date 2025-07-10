/**
 * API route for shipping operations
 */
import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { 
  createShipment,
  getShipments,
  getZRExpressCredentials
} from '../features/shipping/services/shipping.service';

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get('_action');
  
  try {
    // Get ZRExpress credentials for the shop
    const credentials = await getZRExpressCredentials(session.shop);
    if (!credentials) {
      return json({
        success: false,
        error: 'ZRExpress credentials not configured'
      }, { status: 400 });
    }
    
    switch (action) {
      case 'getShipments': {
        // Get date range from form data
        const startDate = formData.get('startDate');
        const endDate = formData.get('endDate');
        
        // Get shipments with filters
        const filters = {};
        if (startDate && endDate) {
          filters.dateRange = { start: startDate, end: endDate };
        }
        
        const { shipments, totalCount, pageInfo } = await getShipments(session.shop, filters);
        
        return json({
          shipments,
          totalCount,
          pageInfo
        });
      }
      
      case 'createShipment': {
        // Extract shipment data from form data
        const shipmentData = {};
        for (const [key, value] of formData.entries()) {
          if (key !== '_action') {
            shipmentData[key] = value;
          }
        }
        
        // Create shipment
        const result = await createShipment(shipmentData, session, credentials);
        
        return json(result);
      }
      
      default:
        return json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Shipping API error:', error);
    return json({
      success: false,
      error: error.message || 'An error occurred processing your request'
    }, { status: 500 });
  }
}
