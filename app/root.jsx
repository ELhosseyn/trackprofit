import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useMatches,
} from "@remix-run/react";
import { LanguageProvider } from "./utils/i18n/LanguageContext.jsx";
import { useEffect } from "react";

// TawkToScript component to safely load chat script client-side only
function TawkToScript() {
  useEffect(() => {
    // Only run on client side
    const Tawk_API = (window.Tawk_API = window.Tawk_API || {});
    const Tawk_LoadStart = new Date();

    const s1 = document.createElement("script");
    const s0 = document.getElementsByTagName("script")[0];

    s1.async = true;
    s1.src = "https://embed.tawk.to/684d648aa3ad3e1910ba0e14/1itn51fep";
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    s0.parentNode.insertBefore(s1, s0);
  }, []);

  return null;
}

export const meta = () => {
  return [
    { title: "TrackProfit - Shopify Analytics and Order Tracking" },
    {
      name: "description",
      content:
        "Track your Shopify store's profits, orders, and advertising performance with TrackProfit",
    },
    { name: "viewport", content: "width=device-width,initial-scale=1" },
    { name: "theme-color", content: "#008060" },
    { property: "og:type", content: "website" },
    {
      property: "og:title",
      content: "TrackProfit - Shopify Analytics and Order Tracking",
    },
    {
      property: "og:description",
      content:
        "Track your Shopify store's profits, orders, and advertising performance with TrackProfit",
    },
  ];
};

export default function App() {
  const matches = useMatches();

  return <AppContent matches={matches} />;
}

function AppContent({ matches }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link
          rel="preconnect"
          href="https://cdn.shopify.com/"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <LanguageProvider>
          <Outlet />
        </LanguageProvider>
        <ScrollRestoration />
        <Scripts />
        {/* Tawk.to Chat Widget Script - Lazy load with defer */}
        {/* Tawk.to Chat Widget Script - Added with useEffect to avoid hydration mismatch */}
        <TawkToScript />
      </body>
    </html>
  );
}
