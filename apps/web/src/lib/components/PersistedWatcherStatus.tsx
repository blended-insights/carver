'use client';

import React from 'react';
import { WatcherStatusList } from './WatcherStatusList';
import { usePersistedEvents } from '@/lib/hooks/usePersistedEvents';
import { Alert, Box, Text } from '@mantine/core';
import { IconCloudOff } from '@tabler/icons-react';

interface PersistedWatcherStatusProps {
  processId?: string;
  maxItems?: number;
  showConnectionStatus?: boolean;
}

export function PersistedWatcherStatus({
  processId,
  maxItems = 50,
  showConnectionStatus = true
}: PersistedWatcherStatusProps) {
  // Get persisted status notifications from Zustand store
  // This is safe because usePersistedEvents handles the selectors internally
  const { statusNotifications, isConnected, error } = usePersistedEvents({
    processId,
    filterByProcessId: !!processId
  });

  return (
    <Box>
      {showConnectionStatus && !isConnected && (
        <Alert 
          color="yellow" 
          title="Connection Status" 
          mb="md"
          icon={<IconCloudOff size={16} />}
        >
          <Text size="sm">
            {error || 'Not connected to event stream. Some updates may be missed.'}
          </Text>
        </Alert>
      )}
      
      <WatcherStatusList 
        notifications={statusNotifications} 
        maxItems={maxItems} 
        processId={processId}
        // We've already filtered in the hook if processId was provided
        filterInComponent={false}
      />
    </Box>
  );
}
