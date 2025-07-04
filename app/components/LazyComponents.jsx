import { lazy } from 'react';

// Lazy load Chart components
export const LazyChartComponents = lazy(() => 
  import('./ChartComponents').then(module => ({
    default: module.default || module
  }))
);

// Lazy load DashboardPanel
export const LazyDashboardPanel = lazy(() => 
  import('./DashboardPanel').then(module => ({
    default: module.default || module
  }))
);

// Lazy load Facebook Metrics
export const LazyFacebookMetrics = lazy(() => 
  import('./FacebookMetrics').then(module => ({
    default: module.default || module
  }))
);

// Lazy load StatCard
export const LazyStatCard = lazy(() => 
  import('./StatCard').then(module => ({
    default: module.default || module
  }))
);

// Lazy load DashboardStats
export const LazyDashboardStats = lazy(() => 
  import('./DashboardStats').then(module => ({
    default: module.default || module
  }))
);

// Import SimpleDataTable directly instead of lazy loading to fix hydration issues
import SimpleDataTable from './SimpleDataTable';
export const LazySimpleDataTable = SimpleDataTable;

// Loading fallback component
export const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '200px',
    width: '100%'
  }}>
    <div className="loading-spinner" aria-label="Loading content">
      <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" stroke="#008060">
        <g fill="none" fillRule="evenodd" strokeWidth="2">
          <circle cx="22" cy="22" r="1">
            <animate attributeName="r" begin="0s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" begin="0s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite" />
          </circle>
          <circle cx="22" cy="22" r="1">
            <animate attributeName="r" begin="-0.9s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" begin="-0.9s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>
    </div>
  </div>
);
