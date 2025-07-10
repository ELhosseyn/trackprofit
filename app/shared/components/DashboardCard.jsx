/**
 * DashboardCard Component
 * A standard card layout for dashboard metrics
 */
import { Card, Text, BlockStack, InlineStack, SkeletonBodyText } from "@shopify/polaris";

/**
 * DashboardCard component
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Component
 */
export default function DashboardCard({ 
  title, 
  subtitle,
  icon,
  children,
  actions = [],
  isLoading = false,
  padding = "400"
}) {
  return (
    <Card>
      {(title || icon) && (
        <div style={{ padding: padding, paddingBottom: 0 }}>
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <Text variant="headingMd" as="h3">{title}</Text>
              {subtitle && <Text variant="bodyMd" tone="subdued">{subtitle}</Text>}
            </BlockStack>
            {icon && <Text variant="headingLg">{icon}</Text>}
          </InlineStack>
        </div>
      )}
      
      <div style={{ padding: padding }}>
        {isLoading ? (
          <BlockStack gap="400">
            <SkeletonBodyText lines={4} />
          </BlockStack>
        ) : (
          <>{children}</>
        )}
      </div>
      
      {actions.length > 0 && (
        <div style={{ 
          padding: padding, 
          paddingTop: "0", 
          borderTop: "1px solid var(--p-divider)" 
        }}>
          <InlineStack align="end" gap="200">
            {actions}
          </InlineStack>
        </div>
      )}
    </Card>
  );
}
