import { Link, Outlet, useLoaderData, useRouteError, useNavigation } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate, MONTHLY_PLAN } from "../shopify.server";
import { getSubscriptionStatus } from "../models/Subscription.server";
import { Suspense, lazy } from 'react';
import { Frame, Loading, TopBar } from "@shopify/polaris";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useLanguage } from "../utils/i18n/LanguageContext.jsx";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const { shop } = session;
  let subscriptionError = false;

  try {
    // Get current subscription status
    const subscriptions = await getSubscriptionStatus(admin.graphql);
    const activeSubscriptions = subscriptions?.data?.app?.installation?.activeSubscriptions || [];

    // If no active subscription, require billing
    if (activeSubscriptions.length < 1) {
      await billing.require({
        plans: [MONTHLY_PLAN],
        isTest: false, // false in production
        onFailure: async () =>
          billing.request({
            plan: MONTHLY_PLAN,
            isTest: false,
            returnUrl: `https://${shop}/admin/apps/trackprofit-1/app`,
          }),
      });
    }
  } catch (error) {
    console.error("Error checking subscription status:", error);
    // Continue without subscription check if there's an API error
    subscriptionError = true;
  }

  return { 
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shopName: shop,
    subscriptionError
  };
};

export default function App() {
  const { apiKey, shopName, subscriptionError } = useLoaderData();
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";
  const { t, isRTL } = useLanguage();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      {isLoading && (
        <Frame>
          <Loading />
        </Frame>
      )}
      {subscriptionError && (
        <div style={{ 
          backgroundColor: '#FFF4E5', 
          color: '#D96800', 
          padding: '12px', 
          textAlign: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 1001,
          border: '1px solid #FFD79D'
        }}>
          {t('errors.subscriptionAPIError', { fallback: 'There was an issue connecting to the Shopify API. Some features may be limited.' })}
        </div>
      )}
      <div style={{ 
        position: 'fixed', 
        top: '0', 
        right: '0', 
        padding: '10px', 
        zIndex: 1000,
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        <LanguageSwitcher />
      </div>
      <NavMenu>
        <Link to="/app" rel="home">
          {t('navigation.home')}
        </Link>
        <Link to="/app/products">{t('navigation.products')}</Link>
        <Link to="/app/orders">{t('navigation.orders')}</Link>
        <Link to="/app/zrexpress">{t('navigation.zrExpress')}</Link>
        <Link to="/app/facebook">{t('navigation.facebook')}</Link>
        <Link to="/app/billing">{t('navigation.billing')}</Link>
        <Link to="/app/additional">{t('navigation.additional')}</Link>
      </NavMenu>
      <Suspense fallback={
        <Frame>
          <Loading />
        </Frame>
      }>
        <Outlet />
      </Suspense>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
