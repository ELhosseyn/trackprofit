import { redirect } from "@remix-run/node";
import prisma from "../db.server";

export async function loader({ request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // This contains the shop domain
  
  if (!code || !state) {
    return redirect(`/app/facebook?error=${encodeURIComponent("Authentication failed")}`);
  }

  try {
    // Exchange code for access token
    const fbAppId = process.env.FACEBOOK_APP_ID;
    const fbAppSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${process.env.APP_URL}/auth/facebook/callback`;
    
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${fbAppSecret}&code=${code}`
    );

    if (!tokenResponse.ok) {
      throw new Error("Failed to get access token");
    }

    const tokenData = await tokenResponse.json();

    // Get long-lived access token
    const longLivedTokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${fbAppId}&client_secret=${fbAppSecret}&fb_exchange_token=${tokenData.access_token}`
    );

    if (!longLivedTokenResponse.ok) {
      throw new Error("Failed to get long-lived access token");
    }

    const longLivedTokenData = await longLivedTokenResponse.json();

    // Store the credentials
    await prisma.facebookCredential.upsert({
      where: { shop: state },
      update: {
        accessToken: longLivedTokenData.access_token,
        expiresAt: new Date(Date.now() + longLivedTokenData.expires_in * 1000)
      },
      create: {
        shop: state,
        accessToken: longLivedTokenData.access_token,
        expiresAt: new Date(Date.now() + longLivedTokenData.expires_in * 1000)
      }
    });

    return redirect("/app/facebook?success=true");
  } catch (error) {
    console.error("Facebook Authentication Error:", error);
    return redirect(`/app/facebook?error=${encodeURIComponent(error.message)}`);
  }
} 