/**
 * Facebook Ads feature index
 * Exports all components and hooks for the Facebook Ads feature
 */

// Components
export { FacebookAdsPage } from './components/FacebookAdsPage';
export { FacebookMetricsCard } from './components/FacebookMetricsCard';
export { CampaignsTable } from './components/CampaignsTable';
export { ControlPanel } from './components/ControlPanel';
export { ConnectModal } from './components/ConnectModal';
export { CreateCampaignModal } from './components/CreateCampaignModal';

// Hooks
export { useFacebookAds } from './hooks/useFacebookAds';

// Re-export the service for direct access
export { default as facebookService } from './services/facebook.service';
