import { Link, Outlet, useLoaderData, useRouteError, useNavigation } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
// Do not import server-only modules at the top level
import { getSubscriptionStatus } from "../models/Subscription.server";
import { Suspense, lazy } from 'react';
import { Frame, Loading } from "@shopify/polaris";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useLanguage } from "../utils/i18n/LanguageContext.jsx";
import { redirect } from "@remix-run/node";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];


export const loader = async ({ request }) => {
  // Import server-only modules inside the loader to avoid client bundle issues
  const { authenticate } = await import("../shopify.server");
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  let subscriptionError = false;
  let hasActiveSubscription = false;

  try {
    // Get current subscription status
    const subscriptions = await getSubscriptionStatus(admin.graphql);
    const activeSubscriptions = subscriptions?.data?.app?.installation?.activeSubscriptions || [];
    hasActiveSubscription = activeSubscriptions.length > 0;
    // Managed Pricing: Do not require or create billing programmatically
    // Just check subscription status and show UI
  } catch (error) {
    if (error.status === 302) {
      // This is a redirect, let it through
      throw error;
    }
    console.error("Error checking subscription status:", error);
    // Continue without subscription check if there's an API error
    subscriptionError = true;
  }

  return { 
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shopName: shop,
    subscriptionError,
    hasActiveSubscription
  };
};

export default function App() {
  const { apiKey, shopName, subscriptionError, hasActiveSubscription } = useLoaderData();
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";
  const { t, isRTL } = useLanguage();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      {/* إشعار الاشتراك غير النشط */}
      {!hasActiveSubscription && (
        <div style={{
          backgroundColor: '#FFF4E5',
          color: '#D96800',
          padding: '14px',
          textAlign: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 1001,
          border: '1px solid #FFD79D',
          fontWeight: 600
        }}>
          لا يوجد لديك اشتراك نشط. يرجى الاشتراك عبر متجر التطبيقات.
          <a
            href="https://apps.shopify.com/trackprofit-2"
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: '12px', color: '#6B46C1', textDecoration: 'underline' }}
          >
            الذهاب إلى متجر التطبيقات
          </a>
        </div>
      )}

      {/* إشعار وضع التجربة محذوف بناءً على طلب المستخدم */}

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
        <Link to="/app/facebook">{t('navigation.facebook')}</Link>
        <Link to="/app/products">{t('navigation.products')}</Link>
        <Link to="/app/orders">{t('navigation.orders')}</Link>
        <Link to="/app/zrexpress">{t('navigation.zrExpress')}</Link>
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
