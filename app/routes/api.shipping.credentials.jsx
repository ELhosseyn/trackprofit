/**
 * API route for managing ZRExpress credentials
 */
import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { 
  updateZRExpressCredentials,
  getZRExpressCredentials
} from '../features/shipping/services/shipping.service';

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  
  try {
    // Get current credentials
    const credentials = await getZRExpressCredentials(session.shop);
    
    return json({
      credentials,
      isConfigured: !!credentials
    });
  } catch (error) {
    console.error('Error loading credentials:', error);
    return json({
      success: false,
      error: error.message || 'An error occurred loading credentials'
    }, { status: 500 });
  }
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get('_action');
  
  try {
    switch (action) {
      case 'saveCredentials': {
        const token = formData.get('token');
        const key = formData.get('key');
        
        if (!token || !key) {
          return json({
            success: false,
            error: 'Token and key are required'
          }, { status: 400 });
        }
        
        // Update credentials
        const result = await updateZRExpressCredentials(session.shop, token, key);
        
        return json({
          success: true,
          credentials: result.credentials
        });
      }
      
      default:
        return json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Credentials API error:', error);
    return json({
      success: false,
      error: error.message || 'An error occurred processing your request'
    }, { status: 500 });
  }
}
