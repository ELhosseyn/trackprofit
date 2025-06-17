import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    const credentials = await prisma.FacebookCredential.findUnique({
      where: { shop: session.shop }
    });

    if (!credentials) {
      return json({ error: 'No Facebook credentials found' }, { status: 404 });
    }

    return json({
      accessToken: credentials.accessToken
    });
  } catch (error) {
    console.error('Error fetching Facebook credentials:', error);
    return json({ error: 'Failed to fetch credentials' }, { status: 500 });
  }
}; 