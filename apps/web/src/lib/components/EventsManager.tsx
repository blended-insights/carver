'use client';

import { useEffect } from 'react';
import { useRedisStore } from '@/lib/store/redis-store';
import logger from '@/lib/utils/logger';
import type { FileChangeNotification, WatcherStatusNotification } from '@/types/redis';

// Union type for Redis messages
type RedisMessage =
  | { channel: 'watcher.status'; data: WatcherStatusNotification }
  | { channel: 'file.change'; data: FileChangeNotification };

// This component handles the SSE connection and updates the Zustand store
// It doesn't render anything - it just manages the connection
export function EventsManager({ processId, filterByProcessId = false }: { 
  processId?: string;
  filterByProcessId?: boolean;
}) {
  const {
    addFileChange,
    addStatus,
    setConnectionStatus,
    setError
  } = useRedisStore();

  // Setup SSE connection
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const baseReconnectDelay = 2000; // Start with 2 seconds
    
    const connectToEvents = () => {
      try {
        // Close any existing connection
        if (eventSource) {
          eventSource.close();
        }

        logger.info('Establishing SSE connection to /api/events');
        eventSource = new EventSource('/api/events');
        
        // Connection opened
        eventSource.onopen = () => {
          logger.info('SSE connection established');
          setConnectionStatus(true);
          setError(null);
          reconnectAttempts = 0; // Reset reconnect counter on successful connection
        };
        
        // Handle incoming messages
        eventSource.onmessage = (event) => {
          if (!event.data || event.data.startsWith(':')) return;
          
          try {
            const message = JSON.parse(event.data) as RedisMessage;
            
            if (message.channel === 'watcher.status') {
              const statusData = message.data;
              
              // If filtering is enabled and processId is provided, only add notifications for that process
              if (!filterByProcessId || !processId || statusData.processId === processId) {
                addStatus(statusData);
              }
            } else if (message.channel === 'file.change') {
              const fileData = message.data;
              
              // If filtering is enabled and processId is provided, only add notifications for that process
              if (!filterByProcessId || !processId || fileData.processId === processId) {
                addFileChange(fileData);
              }
            }
          } catch (parseError) {
            logger.error('Error parsing event data:', parseError);
          }
        };
        
        // Handle errors with exponential backoff
        eventSource.onerror = (err) => {
          logger.error('SSE connection error:', err);
          setConnectionStatus(false);
          setError('Connection to event stream failed');
          
          // Close the connection
          eventSource?.close();
          
          // Exponential backoff for reconnection
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
            logger.info(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
            
            reconnectTimeout = setTimeout(() => {
              reconnectAttempts++;
              connectToEvents();
            }, delay);
          } else {
            logger.error(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
            setError(`Failed to reconnect after ${maxReconnectAttempts} attempts. Please reload the page.`);
          }
        };
      } catch (err) {
        logger.error('Failed to establish SSE connection:', err);
        setConnectionStatus(false);
        setError('Failed to connect to event stream');
      }
    };
    
    // Start the connection
    connectToEvents();
    
    // Clean up on unmount
    return () => {
      if (eventSource) {
        logger.info('Closing SSE connection');
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [processId, filterByProcessId, addFileChange, addStatus, setConnectionStatus, setError]);
  
  // This component doesn't render anything
  return null;
}
