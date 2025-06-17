import { Card, Text, BlockStack } from "@shopify/polaris";

export default function DashboardCard({ title, value, subtitle, tone, children }) {
  return (
    <Card padding="300">
      <BlockStack gap="200">
        {title && <Text as="h3" variant="headingMd">{title}</Text>}
        {value && (
          <Text variant="heading2xl" as="p" tone={tone}>
            {value}
          </Text>
        )}
        {subtitle && (
          <Text variant="bodySm" tone="subdued">
            {subtitle}
          </Text>
        )}
        {children}
      </BlockStack>
    </Card>
  );
}
