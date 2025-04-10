import { SWRConfiguration } from 'swr';

/**
 * Default SWR configuration for the application
 * These settings are applied globally through the SWRPersistenceProvider
 * and can be overridden per-hook as needed
 */
export const SWR_DEFAULT_CONFIG: SWRConfiguration = {
  // Caching behavior
  // revalidateOnFocus: true,
  // revalidateOnReconnect: true,
  revalidateIfStale: true,
  // revalidateOnMount: true, // Always revalidate on mount to ensure fresh data
  keepPreviousData: true, // Keep showing previous data while revalidating

  // Performance settings
  dedupingInterval: 2000, // Dedupe requests within 2 seconds to avoid excessive revalidation
  focusThrottleInterval: 5000,
  loadingTimeout: 4000,

  // Error handling
  shouldRetryOnError: true,
  errorRetryCount: 3,

  // Suspense settings
  suspense: false, // Off by default, enable in specific components

  // Other settings
  refreshInterval: 0, // Default to no polling

  // Custom comparison function for determining when data has changed
  compare: (a, b) => {
    // If the data has a timestamp, use it for comparison
    if (a && b && 'timestamp' in a && 'timestamp' in b) {
      return a.timestamp === b.timestamp;
    }
    // Otherwise, do a deep equality check
    return JSON.stringify(a) === JSON.stringify(b);
  },
};
