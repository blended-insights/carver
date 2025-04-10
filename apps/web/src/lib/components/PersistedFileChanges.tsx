'use client';

import React from 'react';
import { FileChangesList } from './FileChangesList';
import { usePersistedEvents } from '@/lib/hooks/usePersistedEvents';
import { Alert, Box, Text } from '@mantine/core';
import { IconCloudOff } from '@tabler/icons-react';

interface PersistedFileChangesProps {
  processId?: string;
  maxItems?: number;
  showConnectionStatus?: boolean;
}

export function PersistedFileChanges({
  processId,
  maxItems = 50,
  showConnectionStatus = true
}: PersistedFileChangesProps) {
  // Get persisted file changes from Zustand store
  // This is safe because usePersistedEvents handles the selectors internally
  const { fileChanges, isConnected, error } = usePersistedEvents({
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
      
      <FileChangesList 
        changes={fileChanges} 
        maxItems={maxItems} 
        processId={processId}
        // We've already filtered in the hook if processId was provided
        filterInComponent={false}
      />
    </Box>
  );
}
