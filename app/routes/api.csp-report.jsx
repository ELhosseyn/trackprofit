import { json } from "@remix-run/node";

/**
 * CSP Report API Endpoint
 * 
 * This endpoint receives Content Security Policy violation reports
 * from browsers. The reports are logged for analysis.
 * 
 * @param {Request} request The incoming request with CSP violation data
 * @returns {Response} A response indicating the report was received
 */
export async function action({ request }) {
  // Only accept POST requests
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Parse the CSP report from the request body
    const report = await request.json();
    
    // In production, you might want to send this to a logging service
    // For now, we'll just log it to the console in development
    if (process.env.NODE_ENV !== "production") {
      console.log("CSP Violation Report:", JSON.stringify(report, null, 2));
    } else {
      // In production, you might log this to a file or external service
      // For example, using a logging service like Sentry, LogRocket, etc.
    }

    // Return a success response
    return json({ success: true });
  } catch (error) {
    console.error("Error processing CSP report:", error);
    return json({ error: "Invalid report format" }, { status: 400 });
  }
}

/**
 * Loader function - not used for this endpoint
 */
export async function loader() {
  return json({ error: "Method not allowed" }, { status: 405 });
}
