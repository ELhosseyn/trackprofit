import { Card, Spinner, Text, BlockStack } from "@shopify/polaris";

export default function LoadingSpinner({ title = "جاري التحميل..." }) {
  return (
    <Card padding="500">
      <BlockStack gap="400" align="center">
        <Spinner size="large" />
        <Text variant="headingMd" as="h2">{title}</Text>
      </BlockStack>
    </Card>
  );
}
