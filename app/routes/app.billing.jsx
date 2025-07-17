
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getSubscriptionStatus } from "../models/Subscription.server";
import {
  Page,
  Layout,
  Card,
  Text,
  Banner,
  Badge,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";
import { useLanguage } from "../utils/i18n/LanguageContext";

// Action function to handle subscription requests
export const action = async () => {
  // Managed Pricing: No programmatic subscription actions allowed
  return json({ success: false, error: "Subscription must be activated via the Shopify App Store. Programmatic subscription is disabled for Managed Pricing." }, { status: 400 });
};

// Loader function to get current subscription status
export const loader = async ({ request }) => {
  // Import server-only modules inside the loader to avoid client bundle issues
  const { authenticate, MONTHLY_PLAN } = await import("../shopify.server");
  const { admin, session } = await authenticate.admin(request);
  const appStoreUrl = "https://apps.shopify.com/trackprofit"; // Update to your app's public App Store URL

  try {
    const subscriptions = await getSubscriptionStatus(admin.graphql);
    const activeSubscriptions = subscriptions?.data?.app?.installation?.activeSubscriptions || [];
    const hasActiveSubscription = activeSubscriptions.length > 0;
    if (!hasActiveSubscription) {
      // Redirect to App Store if no active subscription
      return redirect(appStoreUrl);
    }
    return json({
      shop: session.shop,
      subscriptions: activeSubscriptions,
      hasActiveSubscription,
      planName: MONTHLY_PLAN,
      planPrice: "$0.99",
      trialDays: 7,
    });
  } catch (error) {
    console.error("Error loading billing info:", error);
    return json({
      shop: session.shop,
      subscriptions: [],
      hasActiveSubscription: false,
      planName: "Monthly Subscription",
      planPrice: "$0.99",
      trialDays: 7,
      error: error.message,
    });
  }
};

export default function Billing() {
  const {
    shop,
    subscriptions,
    hasActiveSubscription,
    planName,
    planPrice,
    trialDays,
    error,
  } = useLoaderData();
  const { t } = useLanguage();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Page title="Subscription Management" backAction={{ url: "/app" }}>
      <Layout>
        <Layout.Section>
          {error && (
            <Banner tone="critical" title="Error">
              <p>{error}</p>
            </Banner>
          )}

          <Card>
            <BlockStack gap="400">
              <Text variant="headingLg" as="h2">
                Subscription Status
              </Text>

              {hasActiveSubscription ? (
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text variant="bodyLg" as="p">
                      Current Plan: <strong>{planName}</strong>
                    </Text>
                    <Badge tone="success">Active</Badge>
                  </InlineStack>
                  {subscriptions.map((subscription) => (
                    <Card key={subscription.id} background="bg-surface-secondary">
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                          <Text variant="bodyMd">Subscription ID:</Text>
                          <Text variant="bodyMd" tone="subdued">{subscription.id}</Text>
                        </InlineStack>
                        <InlineStack align="space-between">
                          <Text variant="bodyMd">Status:</Text>
                          <Badge tone={subscription.status === "ACTIVE" ? "success" : "warning"}>
                            {subscription.status}
                          </Badge>
                        </InlineStack>
                        <InlineStack align="space-between">
                          <Text variant="bodyMd">Created:</Text>
                          <Text variant="bodyMd" tone="subdued">{formatDate(subscription.createdAt)}</Text>
                        </InlineStack>
                        {subscription.currentPeriodEnd && (
                          <InlineStack align="space-between">
                            <Text variant="bodyMd">Current Period Ends:</Text>
                            <Text variant="bodyMd" tone="subdued">{formatDate(subscription.currentPeriodEnd)}</Text>
                          </InlineStack>
                        )}
                      </BlockStack>
                    </Card>
                  ))}
                </BlockStack>
              ) : (
                <BlockStack gap="400">
                  <Banner tone="warning" title="No Active Subscription">
                    <p>You need an active subscription to use all features of this app.</p>
                    <p>
                      Please subscribe to a plan via the <a href="https://apps.shopify.com/trackprofit" target="_blank" rel="noopener noreferrer">Shopify App Store</a>.
                    </p>
                  </Banner>
                  <Card>
                    <BlockStack gap="300">
                      <Text variant="headingMd" as="h3">{planName}</Text>
                      <Text variant="bodyLg" as="p">
                        <strong>{planPrice}/month</strong>
                      </Text>
                      <Text variant="bodyMd" as="p">
                        Start your {trialDays}-day free trial today!
                      </Text>
                    </BlockStack>
                  </Card>
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h3">Shop Information</Text>
              <Text variant="bodyMd">
                <strong>Shop:</strong> {shop}
              </Text>
              <Text variant="bodyMd">
                <strong>Plan:</strong> {planName} ({planPrice}/month)
              </Text>
              <Text variant="bodyMd">
                <strong>Trial Period:</strong> {trialDays} days
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

