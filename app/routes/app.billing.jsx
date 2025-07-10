import { redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { authenticate, MONTHLY_PLAN } from "../shopify.server";
import { getSubscriptionStatus } from "../models/Subscription.server";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  Banner,
  Badge,
  BlockStack,
  InlineStack,
  Spinner,
} from "@shopify/polaris";
import { useLanguage } from "../utils/i18n/LanguageContext";

// Action function to handle subscription requests
export const action = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "subscribe") {
    try {
      const billingCheck = await billing.require({
        plans: [MONTHLY_PLAN],
        isTest: true, // Change to false in production
        onFailure: async () => {
          const billing_url = await billing.request({
            plan: MONTHLY_PLAN,
            isTest: true, // Change to false in production
            returnUrl: `https://${session.shop}/admin/apps/trackprofit-2/app/billing`,
          });
          return redirect(billing_url);
        },
      });

      if (billingCheck.success) {
        return json({ success: true, message: "Subscription activated successfully!" });
      } else {
        return json({ success: false, error: "Failed to activate subscription" }, { status: 400 });
      }
    } catch (error) {
      console.error("Billing action error:", error);
      return json({ success: false, error: error.message }, { status: 500 });
    }
  }

  return json({ success: false, error: "Invalid action" }, { status: 400 });
};

// Loader function to get current subscription status
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    const subscriptions = await getSubscriptionStatus(admin.graphql);
    const activeSubscriptions = subscriptions?.data?.app?.installation?.activeSubscriptions || [];
    
    return json({
      shop: session.shop,
      subscriptions: activeSubscriptions,
      hasActiveSubscription: activeSubscriptions.length > 0,
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
      planName: MONTHLY_PLAN,
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
    error 
  } = useLoaderData();
  const fetcher = useFetcher();
  const { t } = useLanguage();

  const isLoading = fetcher.state === "submitting";

  const handleSubscribe = () => {
    const formData = new FormData();
    formData.append("action", "subscribe");
    fetcher.submit(formData, { method: "post" });
  };

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

          {fetcher.data?.success === false && (
            <Banner tone="critical" title="Subscription Error">
              <p>{fetcher.data.error}</p>
            </Banner>
          )}

          {fetcher.data?.success === true && (
            <Banner tone="success" title="Success">
              <p>{fetcher.data.message}</p>
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
                      <InlineStack>
                        <Button
                          variant="primary"
                          onClick={handleSubscribe}
                          loading={isLoading}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <InlineStack gap="200">
                              <Spinner size="small" />
                              <Text>Starting subscription...</Text>
                            </InlineStack>
                          ) : (
                            "Start Free Trial"
                          )}
                        </Button>
                      </InlineStack>
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

