import { useSWRConfig } from 'swr';
import { useCallback, useMemo } from 'react';
import logger from '@/lib/utils/logger';

/**
 * Helper to safely check if we're in the browser
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Cache maintenance settings
 * These determine how we cleanup stale cache entries
 */
const CACHE_SETTINGS = {
    // Max age of cache entries before they're considered stale (1 hour)
    MAX_AGE: 60 * 60 * 1000,
    // How often to run cache cleanup (15 minutes)
    CLEANUP_INTERVAL: 15 * 60 * 1000,
  };

/**
 * Hook to get access to the SWR cache and configuration
 * This can be used to inspect or manipulate the cache directly
 */
export function useSWRCache() {
  const { cache, mutate: globalMutate } = useSWRConfig();

  // Function to clear all cache entries - memoized to prevent re-renders
  const clearCache = useCallback(() => {
    if (!isBrowser) return;

    try {
      if (typeof cache.keys === 'function') {
        const keys = Array.from(cache.keys());
        keys.forEach((key) => cache.delete(key));
        logger.info(`SWR cache cleared (${keys.length} items)`);
      }
    } catch (error) {
      logger.error('Error clearing SWR cache:', error);
    }
  }, [cache]);

  // Function to refresh all cache entries - memoized to prevent re-renders
  const refreshCache = useCallback(async () => {
    if (!isBrowser) return;

    try {
      if (typeof cache.keys === 'function') {
        const keys = Array.from(cache.keys());
        logger.info(`Refreshing SWR cache (${keys.length} items)`);
        await globalMutate(null);
      } else {
        logger.warn('Unable to refresh SWR cache - no keys method available');
      }
    } catch (error) {
      logger.error('Error refreshing SWR cache:', error);
    }
  }, [cache, globalMutate]);

  // Function to get all cache keys - memoized to prevent re-renders
  const getCacheKeys = useCallback(() => {
    if (!isBrowser) return [];

    try {
      if (typeof cache.keys === 'function') {
        return Array.from(cache.keys());
      }
    } catch (error) {
      logger.error('Error getting SWR cache keys:', error);
    }
    return [];
  }, [cache]);

  // Memoize the return value to prevent reference changes
  return useMemo(
    () => ({
      cache,
      clearCache,
      refreshCache,
      getCacheKeys,
      globalMutate,
    }),
    [cache, clearCache, refreshCache, getCacheKeys, globalMutate]
  );
}

// Set up a cleanup job for the cache to prevent it from growing too large
if (typeof window !== 'undefined') {
  // Run cache cleanup periodically
  const cleanupCacheInterval = setInterval(() => {
    try {
      const { cache } = useSWRConfig();
      if (typeof cache.keys === 'function') {
        const now = Date.now();
        const keys = Array.from(cache.keys());

        let cleaned = 0;
        keys.forEach((key) => {
          const entry = cache.get(key);
          if (entry && entry.data && entry.data.timestamp) {
            const age = now - entry.data.timestamp;
            if (age > CACHE_SETTINGS.MAX_AGE) {
              cache.delete(key);
              cleaned++;
            }
          }
        });

        if (cleaned > 0) {
          logger.debug(`SWR cache cleanup: removed ${cleaned} stale items`);
        }
      }
    } catch (error) {
      logger.error('Error during SWR cache cleanup:', error);
    }
  }, CACHE_SETTINGS.CLEANUP_INTERVAL);

  // Clean up the interval when the window is unloaded
  window.addEventListener('beforeunload', () => {
    clearInterval(cleanupCacheInterval);
  });
}

