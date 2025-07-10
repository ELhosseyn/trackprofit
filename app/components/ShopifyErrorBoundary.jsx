import { Component } from "react";

class ShopifyErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Shopify connection error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: "20px", 
          textAlign: "center",
          fontFamily: "Inter, Arial, sans-serif"
        }}>
          <h2>Connection Issue</h2>
          <p>There was an issue connecting to Shopify. Some features may be limited.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: "#008060",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ShopifyErrorBoundary;
