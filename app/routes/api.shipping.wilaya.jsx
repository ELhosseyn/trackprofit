/**
 * API route for getting wilaya tarification data
 */
import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { 
  getZRExpressCredentials,
  getZRExpressTarification
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
      case 'getWilayaData': {
        // Get tarification data
        const wilayaData = await getZRExpressTarification(credentials);
        
        return json({
          success: true,
          wilayaData
        });
      }
      
      default:
        return json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Wilaya API error:', error);
    return json({
      success: false,
      error: error.message || 'An error occurred processing your request'
    }, { status: 500 });
  }
}
