import { Component } from 'react';
import { Card, Page, Text, Button, BlockStack } from '@shopify/polaris';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // If a fallback is provided, use it, otherwise use the default fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default fallback UI
      return (
        <Page>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingLg" as="h2">Something went wrong</Text>
              <Text>We're sorry, but there was an error loading this component.</Text>
              <Button 
                primary 
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.reload();
                }}
              >
                Try again
              </Button>
            </BlockStack>
          </Card>
        </Page>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
