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
        <script
          type="text/javascript"
          defer
          dangerouslySetInnerHTML={{
            __html: `
              var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
              (function(){
                var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
                s1.async=true;
                s1.src='https://embed.tawk.to/684d648aa3ad3e1910ba0e14/1itn51fep';
                s1.charset='UTF-8';
                s1.setAttribute('crossorigin','*');
                s0.parentNode.insertBefore(s1,s0);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
