/**
 * LoadingSpinner Component
 * Provides a consistent loading indicator throughout the application
 */
import { Spinner, Text, BlockStack, InlineStack } from "@shopify/polaris";
import { useLanguage } from "../providers/LanguageProvider";

/**
 * LoadingSpinner component
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Component
 */
export default function LoadingSpinner({ 
  title = "", 
  subtitle = "", 
  size = "large", 
  fullScreen = false,
  delay = 0
}) {
  const { t } = useLanguage();
  
  // Default loading text if not provided
  const loadingTitle = title || t("general.loading");
  
  // Container styles for fullScreen mode
  const containerStyle = fullScreen ? {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    zIndex: 9999
  } : {};

  return (
    <div style={containerStyle}>
      <BlockStack gap="400" align="center">
        <InlineStack gap="400" align="center">
          <Spinner accessibilityLabel={loadingTitle} size={size} />
          {loadingTitle && <Text variant="headingMd" as="h2">{loadingTitle}</Text>}
        </InlineStack>
        {subtitle && <Text variant="bodyMd" tone="subdued">{subtitle}</Text>}
      </BlockStack>
    </div>
  );
}
