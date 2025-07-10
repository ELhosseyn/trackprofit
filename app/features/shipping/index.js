/**
 * Shipping feature index file
 * Exports all components, hooks, and services for the shipping feature
 */

// Components
export { ShippingPage } from './components/ShippingPage';
export { ShippingDashboard } from './components/ShippingDashboard';
export { ShipmentsTable } from './components/ShipmentsTable';
export { CreateShipmentModal } from './components/CreateShipmentModal';
export { CredentialsModal } from './components/CredentialsModal';
export { ShipmentDetailsModal } from './components/ShipmentDetailsModal';

// Hooks
export { useShipping } from './hooks/useShipping';

// Note: Services are not exported here as they are server-side only
