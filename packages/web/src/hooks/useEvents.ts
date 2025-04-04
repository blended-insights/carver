import { useState, useEffect } from 'react';
import { WatcherStatusNotification, FileChangeNotification } from '../utils/redis';

interface UseEventsProps {
  processId?: string;
}

interface UseEventsResult {
  statusNotifications: WatcherStatusNotification[];
  fileChanges: FileChangeNotification[];
  isConnected: boolean;
  error: string | null;
}

export function useEvents({ processId }: UseEventsProps = {}): UseEventsResult {
  const [statusNotifications, setStatusNotifications] = useState<WatcherStatusNotification[]>([]);
  const [fileChanges, setFileChanges] = useState<FileChangeNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let eventSource: EventSource | null = null;
    
    const connectToEvents = () => {
      try {
        // Create a new EventSource connection
        eventSource = new EventSource('/api/events');
        
        // Connection opened
        eventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
          console.log('SSE connection established');
        };
        
        // Handle incoming messages
        eventSource.onmessage = (event) => {
          try {
            const { channel, data } = JSON.parse(event.data);
            
            if (channel === 'watcher.status') {
              const statusData = data as WatcherStatusNotification;
              
              // If processId is provided, only add notifications for that process
              if (!processId || statusData.processId === processId) {
                setStatusNotifications(prev => [statusData, ...prev]);
              }
            } else if (channel === 'file.change') {
              const fileData = data as FileChangeNotification;
              
              // If processId is provided, only add notifications for that process
              if (!processId || fileData.processId === processId) {
                setFileChanges(prev => [fileData, ...prev]);
              }
            }
          } catch (parseError) {
            console.error('Error parsing event data:', parseError);
          }
        };
        
        // Handle errors
        eventSource.onerror = (err) => {
          console.error('SSE connection error:', err);
          setError('Connection to event stream failed');
          setIsConnected(false);
          
          // Close the connection
          eventSource?.close();
          
          // Try to reconnect after 5 seconds
          setTimeout(connectToEvents, 5000);
        };
      } catch (err) {
        console.error('Failed to establish SSE connection:', err);
        setError('Failed to connect to event stream');
        setIsConnected(false);
      }
    };
    
    // Start the connection
    connectToEvents();
    
    // Clean up on unmount
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [processId]);
  
  return {
    statusNotifications,
    fileChanges,
    isConnected,
    error
  };
}
