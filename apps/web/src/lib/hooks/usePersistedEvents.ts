'use client';

import { useMemo } from 'react';
import { useRedisStore, useIsConnected, useConnectionError } from '@/lib/store/redis-store';
import type { WatcherStatusNotification, FileChangeNotification } from '@/types/redis';

interface UsePersistedEventsProps {
  processId?: string;
  filterByProcessId?: boolean;
}

interface UsePersistedEventsResult {
  statusNotifications: WatcherStatusNotification[];
  fileChanges: FileChangeNotification[];
  isConnected: boolean;
  error: string | null;
}

/**
 * Hook to access persisted events from the Zustand store
 * This replaces the old useEvents hook with persistent storage
 */
export function usePersistedEvents({ 
  processId, 
  filterByProcessId = true 
}: UsePersistedEventsProps = {}): UsePersistedEventsResult {
  // Use atomic selectors to prevent object creation on each render
  const allFileChanges = useRedisStore(state => state.fileChanges);
  const allStatuses = useRedisStore(state => state.statuses);
  const isConnected = useIsConnected();
  const error = useConnectionError();
  
  // Filter notifications if needed - memoized to avoid recreating on every render
  const statusNotifications = useMemo(() => {
    if (!filterByProcessId || !processId) {
      return allStatuses;
    }
    return allStatuses.filter(status => status.processId === processId);
  }, [allStatuses, processId, filterByProcessId]);
  
  const fileChanges = useMemo(() => {
    if (!filterByProcessId || !processId) {
      return allFileChanges;
    }
    return allFileChanges.filter(change => change.processId === processId);
  }, [allFileChanges, processId, filterByProcessId]);
  
  return {
    statusNotifications,
    fileChanges,
    isConnected,
    error
  };
}
