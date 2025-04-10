import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import logger from '@/lib/utils/logger';
import type { FileChangeNotification, WatcherStatusNotification } from '@/types/redis';

// Define the store state interface
interface RedisState {
  fileChanges: FileChangeNotification[];
  statuses: WatcherStatusNotification[];
  isConnected: boolean;
  error: string | null;
}

// Define the store actions interface
interface RedisActions {
  addFileChange: (notification: FileChangeNotification) => void;
  addStatus: (status: WatcherStatusNotification) => void;
  clearFileChanges: () => void;
  setConnectionStatus: (isConnected: boolean) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
}

// Set the maximum number of events to keep in memory to prevent excessive storage usage
const MAX_EVENTS = 100;

// Create the store with persistence
export const useRedisStore = create<RedisState & RedisActions>()(
  persist(
    (set) => ({
      // Initial state
      fileChanges: [],
      statuses: [],
      isConnected: false,
      error: null,

      // Actions
      addFileChange: (notification) => {
        logger.debug('Adding file change:', notification);
        set((state) => ({
          fileChanges: [notification, ...state.fileChanges.slice(0, MAX_EVENTS - 1)]
        }));
      },
      
      addStatus: (status) => {
        logger.debug('Adding status:', status);
        set((state) => ({
          statuses: [status, ...state.statuses.slice(0, MAX_EVENTS - 1)]
        }));
      },
      
      clearFileChanges: () => {
        logger.debug('Clearing file changes');
        set({ fileChanges: [] });
      },
      
      setConnectionStatus: (isConnected) => {
        logger.debug('Setting connection status:', isConnected);
        set({ isConnected });
      },
      
      setError: (error) => {
        if (error) {
          logger.error('Redis connection error:', error);
        }
        set({ error });
      },
      
      resetState: () => {
        logger.debug('Resetting state');
        set({
          fileChanges: [],
          statuses: [],
          isConnected: false,
          error: null
        });
      }
    }),
    {
      name: 'carver-redis-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist event data, not connection status
      partialize: (state) => ({
        fileChanges: state.fileChanges,
        statuses: state.statuses
      }),
      version: 1, // For future migrations if needed
      onRehydrateStorage: () => (state) => {
        if (state) {
          logger.info('Redis state rehydrated from storage');
        } else {
          logger.warn('Failed to rehydrate Redis state');
        }
      }
    }
  )
);

// Create specific atomic selectors for better performance and to avoid infinite loops
export const useFileChanges = () => useRedisStore((state) => state.fileChanges);
export const useStatuses = () => useRedisStore((state) => state.statuses);

// Individual selectors for connection status (to prevent object creation on each render)
export const useIsConnected = () => useRedisStore((state) => state.isConnected);
export const useConnectionError = () => useRedisStore((state) => state.error);
