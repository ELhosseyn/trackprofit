import { redirect } from "@remix-run/node";
import prisma from "../db.server";
import { facebook } from "../services/facebook.server.js";

// Export an ErrorBoundary for better error handling
export function ErrorBoundary({ error }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Authentication Error</h1>
      <p>There was an error during the Facebook authentication process.</p>
      <p style={{ color: 'red' }}>{error?.message || 'Unknown error occurred'}</p>
      <a href="/app/facebook" style={{ color: '#008060' }}>
        Return to Facebook Settings
      </a>
    </div>
  );
}

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // This contains the shop domain
    
    if (!code || !state) {
      return redirect(`/app/facebook?error=${encodeURIComponent("Authentication failed: Missing code or state parameter")}`);
    }

    // Validate environment variables
    const fbAppId = process.env.FACEBOOK_APP_ID;
    const fbAppSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${process.env.APP_URL || process.env.SHOPIFY_APP_URL}/auth/facebook/callback`;
    
    if (!fbAppId || !fbAppSecret) {
      throw new Error("Facebook app credentials not configured");
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Facebook OAuth callback - received code and state');
    }
    
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${fbAppSecret}&code=${code}`
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(errorData?.error?.message || "Failed to get access token");
    }

    const tokenData = await tokenResponse.json();

    // Get long-lived access token
    const longLivedTokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${fbAppId}&client_secret=${fbAppSecret}&fb_exchange_token=${tokenData.access_token}`
    );

    if (!longLivedTokenResponse.ok) {
      const errorData = await longLivedTokenResponse.json();
      throw new Error(errorData?.error?.message || "Failed to get long-lived access token");
    }

    const longLivedTokenData = await longLivedTokenResponse.json();

    // Store the credentials
    if (!prisma) {
      throw new Error("Database connection not available");
    }

    await prisma.FacebookCredential.upsert({
      where: { shop: state },
      update: {
        accessToken: longLivedTokenData.access_token,
        expiresAt: new Date(Date.now() + longLivedTokenData.expires_in * 1000),
        lastUpdated: new Date()
      },
      create: {
        shop: state,
        accessToken: longLivedTokenData.access_token,
        expiresAt: new Date(Date.now() + longLivedTokenData.expires_in * 1000),
        lastUpdated: new Date()
      }
    });

    // Try to fetch ad accounts immediately for better user experience
    try {
      const adAccounts = await facebook.getAdAccounts(longLivedTokenData.access_token);
      if (adAccounts && adAccounts.length > 0) {
        await prisma.FacebookCredential.update({
          where: { shop: state },
          data: { 
            adAccounts: JSON.stringify(adAccounts),
            lastUpdated: new Date()
          }
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Failed to fetch ad accounts during OAuth callback:", error);
      }
      // We'll continue even if this fails, as the user can refresh accounts later
    }

    return redirect("/app/facebook?success=true");
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error("Facebook Authentication Error:", error);
    }
    
    // Return more detailed error information
    const errorMessage = error.message || "Unknown authentication error";
    return redirect(`/app/facebook?error=${encodeURIComponent(errorMessage)}`);
  }
}