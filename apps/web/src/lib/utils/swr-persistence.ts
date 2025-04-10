import logger from './logger';

// Define a unique key for storing SWR cache in localStorage
const SWR_CACHE_KEY = 'carver-swr-cache';

/**
 * Simple localStorage cache provider for SWR
 * This implementation follows SWR's recommended pattern for localStorage cache providers
 */
export function createLocalStorageCacheProvider() {
  // Skip if not in browser
  if (typeof window === 'undefined') {
    return new Map();
  }
  
  // Try to restore data from localStorage
  let map: Map<string, any>;
  try {
    const cached = localStorage.getItem(SWR_CACHE_KEY);
    map = new Map(JSON.parse(cached || '[]'));
    logger.debug(`Loaded ${map.size} items from SWR cache`);
  } catch (error) {
    logger.error('Failed to load SWR cache from localStorage:', error);
    map = new Map();
  }
  
  // Save to localStorage before unloading
  window.addEventListener('beforeunload', () => {
    try {
      const entries = Array.from(map.entries());
      localStorage.setItem(SWR_CACHE_KEY, JSON.stringify(entries));
      logger.debug(`Saved ${entries.length} items to SWR cache`);
    } catch (error) {
      logger.error('Failed to save SWR cache to localStorage:', error);
    }
  });
  
  return map;
}
