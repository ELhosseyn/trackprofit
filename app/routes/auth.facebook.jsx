import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const shop = url.searchParams.get("shop");

  if (!code) {
    // Redirect to Facebook OAuth
    const fbAppId = process.env.FACEBOOK_APP_ID;
    const redirectUri = `${process.env.APP_URL}/auth/facebook/callback`;
    const scope = "ads_management,ads_read,business_management";
    
    const fbAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${shop}`;
    return redirect(fbAuthUrl);
  }

  return redirect("/app/facebook");
} 