/**
 * useDateRange Custom Hook
 * Provides date range selection functionality
 */
import { useState, useCallback, useMemo } from "react";
// import { DATE_PRESETS } from "../../core/constants";
// Use local definition until a shared constants file is available
const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "custom", label: "Custom Range" }
];

/**
 * useDateRange hook
 * @param {Object} options - Hook options
 * @returns {Object} - Date range state and functions
 */
export default function useDateRange({ 
  initialPreset = "monthly",
  onChange = null
} = {}) {
  const [datePreset, setDatePreset] = useState(initialPreset);
  const [customRange, setCustomRange] = useState({ start: null, end: null });

  // Get date range based on preset
  const dateRange = useMemo(() => {
    const today = new Date();
    const end = new Date(today);
    let start = new Date(today);
    
    switch (datePreset) {
      case "daily":
        // Today only
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        break;
      case "weekly":
        // Last 7 days
        start = new Date(today);
        start.setDate(start.getDate() - 6);
        start = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        break;
      case "monthly":
        // Last 30 days
        start = new Date(today);
        start.setDate(start.getDate() - 29);
        start = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        break;
      case "this_month":
        // This month
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
        break;
      case "last_month":
        // Last month
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
        break;
      case "custom":
        // Custom range
        if (customRange.start && customRange.end) {
          start = new Date(customRange.start);
          end = new Date(customRange.end);
          end.setHours(23, 59, 59);
        }
        break;
      default:
        // Default to last 30 days
        start = new Date(today);
        start.setDate(start.getDate() - 29);
        start = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    }
    
    return { start, end };
  }, [datePreset, customRange]);

  // Handle preset change
  const handlePresetChange = useCallback((value) => {
    setDatePreset(value);
    
    if (onChange) {
      const today = new Date();
      const end = new Date(today);
      let start = new Date(today);
      
      switch (value) {
        case "daily":
          start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
          break;
        case "weekly":
          start = new Date(today);
          start.setDate(start.getDate() - 6);
          start = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
          break;
        case "monthly":
          start = new Date(today);
          start.setDate(start.getDate() - 29);
          start = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
          break;
        case "this_month":
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
          break;
        case "last_month":
          start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
          break;
        case "custom":
          if (customRange.start && customRange.end) {
            start = new Date(customRange.start);
            end = new Date(customRange.end);
            end.setHours(23, 59, 59);
          }
          break;
        default:
          start = new Date(today);
          start.setDate(start.getDate() - 29);
          start = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      }
      
      onChange({ start, end, preset: value });
    }
  }, [onChange, customRange]);

  // Handle custom date change
  const handleCustomDateChange = useCallback((range) => {
    setCustomRange(range);
    
    if (datePreset === "custom" && onChange) {
      const start = new Date(range.start);
      const end = new Date(range.end);
      end.setHours(23, 59, 59);
      
      onChange({ start, end, preset: "custom" });
    }
  }, [datePreset, onChange]);

  // Format date range for display
  const formattedDateRange = useMemo(() => {
    const { start, end } = dateRange;
    const formatDate = (date) => {
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    };
    
    return `${formatDate(start)} - ${formatDate(end)}`;
  }, [dateRange]);

  return {
    datePreset,
    dateRange,
    customRange,
    formattedDateRange,
    setDatePreset: handlePresetChange,
    setCustomRange: handleCustomDateChange,
    presets: DATE_PRESETS
  };
}
