'use client';

import { SWRConfig, type SWRConfiguration } from 'swr';
import { SWR_DEFAULT_CONFIG } from '@/lib/config/swr-config';
import { createLocalStorageCacheProvider } from '@/lib/utils/swr-persistence';
import logger from '@/lib/utils/logger';
import { type ReactNode, useEffect, useState } from 'react';

interface SWRPersistenceProviderProps {
  children: ReactNode;
}

/**
 * Provider component that configures SWR with localStorage persistence
 * Using the simplified implementation based on SWR's documentation
 */
export function SWRPersistenceProvider({
  children,
}: SWRPersistenceProviderProps) {
  // Create the cache provider
  const [provider, setProvider] = useState<Map<string, any> | null>(null);

  // Initialize the provider once on the client-side
  useEffect(() => {
    try {
      const cacheProvider = createLocalStorageCacheProvider();
      setProvider(cacheProvider);
      logger.info('SWR persistence provider initialized');
    } catch (error) {
      logger.error('Failed to initialize SWR persistence provider:', error);
    }
  }, []);

  // SWR configuration - combine default config with provider and callbacks
  const swrConfig: SWRConfiguration = {
    ...SWR_DEFAULT_CONFIG,
    provider: provider ? () => provider : undefined,
    onError: (error, key: string) => {
      logger.error(`SWR error for ${key}:`, error);
    },
    onSuccess: (_data, key: string) => {
      logger.debug(`SWR data fetched successfully for ${key}`);
    },
  };

  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
