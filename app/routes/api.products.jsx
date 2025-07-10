/**
 * API route for products operations
 */
import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { 
  getAllProducts, 
  updateProductCost 
} from '../features/products/services/product.service';

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  
  try {
    const allProducts = await getAllProducts(admin);
    
    return json({
      products: { edges: allProducts },
      totalCount: allProducts.length,
      error: null,
      shop: session.shop,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Products Query Error:", error);
    return json({
      products: { edges: [] },
      error: error.message,
      shop: session.shop,
      timestamp: Date.now()
    }, { status: 500 });
  }
}

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const productId = formData.get("productId");
  const variantId = formData.get("variantId");
  const cost = formData.get("cost");

  if (!productId || !variantId || !cost) {
    return json({ 
      success: false, 
      error: "Missing required fields" 
    }, { status: 400 });
  }

  try {
    const result = await updateProductCost(admin, productId, variantId, cost);
    return json(result);
  } catch (error) {
    console.error("Update Cost Error:", error);
    return json({
      success: false,
      error: error.message || "Failed to update cost"
    }, { status: 500 });
  }
}
