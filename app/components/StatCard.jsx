import { Card, BlockStack, InlineStack, Text } from "@shopify/polaris";

export default function StatCard({ title, value, icon, color = "subdued", subtitle }) {
  return (
    <Card padding="400">
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="start">
          <Text variant="bodyMd" tone={color}>{title}</Text>
          <div style={{ fontSize: '24px' }}>{icon}</div>
        </InlineStack>
        <Text variant="heading2xl" as="h3">{value}</Text>
        {subtitle && (
          <Text variant="bodySm" tone="subdued">{subtitle}</Text>
        )}
      </BlockStack>
    </Card>
  );
}
