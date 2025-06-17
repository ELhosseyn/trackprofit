/**
 * SEO utility functions for TrackProfit
 */

/**
 * Generate meta tags for a page
 * @param {Object} options - Meta options
 * @param {string} options.title - Page title
 * @param {string} options.description - Page description
 * @param {string} options.keywords - Comma-separated keywords
 * @param {string} options.canonical - Canonical URL
 * @param {string} options.ogImage - Open Graph image URL
 * @returns {Array} - Array of meta objects for Remix meta function
 */
export function generateMeta({ 
  title = "TrackProfit - Shopify Analytics and Order Tracking",
  description = "Track your Shopify store's profits, orders, and advertising performance with TrackProfit",
  keywords = "shopify analytics, order tracking, profit tracking, facebook ads, zrexpress",
  canonical = null,
  ogImage = null,
}) {
  const meta = [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: keywords },
    { name: "viewport", content: "width=device-width,initial-scale=1" },
    { name: "theme-color", content: "#008060" },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
  ];

  if (canonical) {
    meta.push({ tagName: "link", rel: "canonical", href: canonical });
  }

  if (ogImage) {
    meta.push({ property: "og:image", content: ogImage });
  }

  return meta;
}

/**
 * Generate schema.org structured data for a page
 * @param {Object} options - Schema options
 * @param {string} options.type - Schema.org type (e.g. "WebPage", "Product")
 * @param {string} options.name - Name of the entity
 * @param {string} options.description - Description of the entity
 * @param {string} options.url - URL of the entity
 * @returns {string} - JSON-LD string
 */
export function generateSchemaData({ 
  type = "WebApplication",
  name = "TrackProfit",
  description = "Track your Shopify store's profits, orders, and advertising performance",
  url = "https://apps.shopify.com/trackprofit",
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": type,
    "name": name,
    "description": description,
    "url": url,
    "applicationCategory": "BusinessApplication",
    "offers": {
      "@type": "Offer",
      "price": "19.99",
      "priceCurrency": "USD"
    },
    "operatingSystem": "Web-based",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "124"
    }
  };

  return JSON.stringify(schema);
}

/**
 * Preload critical resources
 * @param {Array} resources - Array of resource objects
 * @returns {Array} - Array of link objects for Remix links function
 */
export function preloadResources(resources = []) {
  const defaultResources = [
    { href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css", rel: "stylesheet" },
  ];

  return [
    ...defaultResources,
    ...resources
  ];
}
