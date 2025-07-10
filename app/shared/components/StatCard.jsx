/**
 * StatCard Component
 * Displays a metric card with icon and value
 */
import { Card, Text, BlockStack, InlineStack } from "@shopify/polaris";

/**
 * StatCard component
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Component
 */
export function StatCard({ 
  title, 
  value, 
  icon, 
  color = "subdued",
  onClick = null,
  isLoading = false
}) {
  const cardStyle = {
    cursor: onClick ? "pointer" : "default",
    height: "100%",
    transition: "all 0.2s ease-in-out"
  };

  // Add hover effect for clickable cards
  if (onClick) {
    cardStyle.boxShadow = "0 0 0 1px rgba(63, 63, 68, 0.05), 0 1px 3px 0 rgba(63, 63, 68, 0.15)";
    cardStyle.hoverBoxShadow = "0 0 0 1px rgba(63, 63, 68, 0.05), 0 2px 8px 0 rgba(63, 63, 68, 0.25)";
  }

  return (
    <Card padding="400" onClick={onClick}>
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="start">
          <Text variant="bodyMd" tone={color}>{title}</Text>
          <div style={{ fontSize: '24px' }}>{icon}</div>
        </InlineStack>
        <Text variant="heading2xl" as="h3">
          {isLoading ? <div style={{ width: "80%", height: "1.5em", background: "#f5f5f5", borderRadius: "4px" }}></div> : value}
        </Text>
      </BlockStack>
    </Card>
  );
}

export default StatCard;
