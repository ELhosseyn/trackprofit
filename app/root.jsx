import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { LanguageProvider } from "./utils/i18n/LanguageContext.jsx";
import { useEffect } from "react";
import ShopifyErrorBoundary from "./components/ShopifyErrorBoundary.jsx";

// Tawk.to implementation that avoids hydration issues by loading script only on client-side

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
  // Initialize Tawk.to chat widget after component mounts (client-side only)
  useEffect(() => {
    try {
      // Create and inject the Tawk.to script
      const s1 = document.createElement("script");
      s1.async = true;
      s1.src = 'https://embed.tawk.to/684d3ad3c2de78190f31825b/1itmqrio0';
      s1.charset = 'UTF-8';
      s1.setAttribute('crossorigin', '*');
      
      // Add error handling
      s1.onerror = (error) => {
        console.error('Error loading Tawk.to script:', error);
      };
      
      // Append the script to the document
      document.body.appendChild(s1);

      // Inject error and warning suppression scripts
      const suppressErrors = document.createElement("script");
      suppressErrors.src = "/js/suppress-sourcemap-errors.js";
      suppressErrors.async = true;
      document.body.appendChild(suppressErrors);

      const suppressWarnings = document.createElement("script");
      suppressWarnings.src = "/js/suppress-warnings.js";
      suppressWarnings.async = true;
      document.body.appendChild(suppressWarnings);
      
      // Cleanup function to remove the script if component unmounts
      return () => {
        if (document.body.contains(s1)) {
          document.body.removeChild(s1);
        }
        if (document.body.contains(suppressErrors)) {
          document.body.removeChild(suppressErrors);
        }
        if (document.body.contains(suppressWarnings)) {
          document.body.removeChild(suppressWarnings);
        }
      };
    } catch (error) {
      console.error('Failed to initialize Tawk.to chat widget:', error);
    }
  }, []); // Empty dependency array ensures this runs once after initial render

  return (
    <html lang="en">
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
        <base href="/" />
      </head>
      <body>
        <ShopifyErrorBoundary>
          <LanguageProvider>
            <Outlet />
          </LanguageProvider>
        </ShopifyErrorBoundary>
        <ScrollRestoration />
        <Scripts />
        {/* Scripts to suppress errors and warnings in console */}
        <script src="/js/suppress-sourcemap-errors.js"></script>
        <script src="/js/suppress-warnings.js"></script>
      </body>
    </html>
  );
}
