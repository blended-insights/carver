'use client';

import {
  createContext,
  FC,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import logger from '@/lib/utils/logger';
import type {
  FileChangeNotification,
  WatcherStatusNotification,
} from '@/types/redis';

// Union type for Redis messages.
type RedisMessage =
  | { channel: 'watcher.status'; data: WatcherStatusNotification }
  | { channel: 'file.change'; data: FileChangeNotification };

// Define the overall state shape.
interface RedisState {
  fileChanges: FileChangeNotification[];
  statuses: WatcherStatusNotification[];
}

// Define the actions for the reducer.
type RedisAction =
  | { type: 'ADD_FILE_CHANGE'; notification: FileChangeNotification }
  | { type: 'CLEAR_FILE_CHANGES' }
  | { type: 'ADD_STATUS'; status: WatcherStatusNotification };

const initialState: RedisState = {
  fileChanges: [],
  statuses: [],
};

function redisReducer(state: RedisState, action: RedisAction): RedisState {
  switch (action.type) {
    case 'ADD_FILE_CHANGE':
      return {
        ...state,
        fileChanges: [...state.fileChanges, action.notification],
      };
    case 'CLEAR_FILE_CHANGES':
      return { ...state, fileChanges: [] };
    case 'ADD_STATUS':
      return { ...state, statuses: [...state.statuses, action.status] };
    default:
      return state;
  }
}

// Create the context with default values.
const RedisContext = createContext<{
  state: RedisState;
  clearFileChanges: () => void;
}>({
  state: initialState,
  clearFileChanges: () => {
    logger.warn('clearFileChanges called without a provider.');
  },
});

// Provider component that seeds statuses from /status and listens for SSE events.
export const RedisProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(redisReducer, initialState);

  // Setup SSE connection to the /api/events endpoint.
  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      if (!event.data || event.data.startsWith(':')) return;
      try {
        const message: RedisMessage = JSON.parse(event.data);
        if (message.channel === 'watcher.status') {
          dispatch({ type: 'ADD_STATUS', status: message.data });
        } else if (message.channel === 'file.change') {
          dispatch({ type: 'ADD_FILE_CHANGE', notification: message.data });
        }
      } catch (error) {
        logger.error('Failed to parse event data:', error);
      }
    };

    eventSource.onerror = (error) => {
      logger.error('EventSource error:', error);
      // Optionally add reconnection logic here.
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const clearFileChanges = () => {
    dispatch({ type: 'CLEAR_FILE_CHANGES' });
  };

  return (
    <RedisContext.Provider value={{ state, clearFileChanges }}>
      {children}
    </RedisContext.Provider>
  );
};

// Custom hook for accessing the Redis context.
export const useRedis = () => useContext(RedisContext);
