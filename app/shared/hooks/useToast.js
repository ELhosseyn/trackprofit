/**
 * useToast Custom Hook
 * Provides toast notification functionality
 */
import { useState, useCallback } from "react";
import { Toast } from "@shopify/polaris";

/**
 * useToast hook
 * @param {Object} options - Hook options
 * @returns {Object} - Toast state and functions
 */
export function useToast({ duration = 4000 } = {}) {
  const [toast, setToast] = useState(null);

  // Show a toast notification
  const showToast = useCallback((content, error = false) => {
    setToast({ content, error });
  }, []);

  // Hide the toast notification
  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Toast component
  const ToastComponent = toast ? (
    <Toast
      content={toast.content}
      error={toast.error}
      onDismiss={hideToast}
      duration={duration}
    />
  ) : null;

  return {
    toast,
    showToast,
    hideToast,
    ToastComponent
  };
}

export default useToast;
