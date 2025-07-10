/**
 * Products feature index file
 * Exports all components, hooks, and services for the products feature
 */

// Components
export { ProductsPage } from './components/ProductsPage';
export { ProductsTable } from './components/ProductsTable';
export { ProductDashboard } from './components/ProductDashboard';
export { CostUpdateModal } from './components/CostUpdateModal';
export { DateRangeSelector } from './components/DateRangeSelector';

// Hooks
export { useProducts } from './hooks/useProducts';

// Note: Services are not exported here as they are server-side only
