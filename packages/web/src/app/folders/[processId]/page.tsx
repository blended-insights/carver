'use client';

import React, { useState, useEffect } from 'react';
import { Title, Group, Button, Stack, Alert, Paper, Tabs, Badge, Text, Loader, ActionIcon } from '@mantine/core';
import { IconFolder, IconAlertCircle, IconRefresh, IconX, IconHistory, IconFileText } from '@tabler/icons-react';
import { Layout } from '../../../components/Layout';
import { FileChangesList } from '../../../components/FileChangesList';
import { WatcherStatusList } from '../../../components/WatcherStatusList';
import { fetchWatcherStatus, killWatcher, restartWatcher, WatcherProcess } from '../../../utils/api';
import { useEvents } from '../../../hooks/useEvents';
import logger from '../../../utils/logger';

export default function ProcessPage({ params }: { params: { processId: string } }) {
  const { processId } = params;
  
  const [watcher, setWatcher] = useState<WatcherProcess | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use the events hook to get real-time updates for this specific process
  const { 
    statusNotifications, 
    fileChanges, 
    error: connectionError 
  } = useEvents({ processId });
  
  // Get folder name from path safely
  const getFolderName = (path: string): string => {
    if (!path || typeof path !== 'string') {
      logger.error('Invalid folder path in ProcessPage:', path);
      return 'Unknown folder';
    }
    
    try {
      const parts = path.split('/');
      return parts[parts.length - 1] || path;
    } catch (err) {
      logger.error('Error extracting folder name:', err);
      return 'Unknown folder';
    }
  };
  
  // Fetch watcher info - only needed on initial load
  const fetchWatcherInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const watchers = await fetchWatcherStatus();
      const found = watchers.find((w) => w.processId === processId);
      
      if (found) {
        setWatcher(found);
      } else {
        setError(`Watcher process ${processId} not found or no longer active`);
      }
    } catch (error) {
      setError('Failed to fetch watcher information');
      console.error('Error fetching watcher:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Kill watcher
  const handleKillWatcher = async () => {
    if (!watcher) return;
    
    try {
      setIsActionLoading(true);
      setError(null);
      
      await killWatcher(processId);
      
      // We'll rely on the status notifications to update the UI
      // No need to fetch watcher status again
    } catch (error) {
      setError('Failed to kill watcher process');
      console.error('Error killing watcher:', error);
      setIsActionLoading(false);
    }
  };
  
  // Restart watcher
  const handleRestartWatcher = async () => {
    if (!watcher) return;
    
    try {
      setIsActionLoading(true);
      setError(null);
      
      await restartWatcher(processId);
      
      // We'll rely on the status notifications to update the UI
      // No need to fetch watcher status again
    } catch (error) {
      setError('Failed to restart watcher process');
      console.error('Error restarting watcher:', error);
      setIsActionLoading(false);
    }
  };
  
  // Update watcher state based on status notifications
  useEffect(() => {
    if (statusNotifications.length > 0) {
      const latestStatus = statusNotifications[0];
      
      if (latestStatus.processId === processId) {
        // Update watcher state based on notifications
        if (latestStatus.status === 'shutdown') {
          setWatcher(prev => prev ? { ...prev, status: 'shutdown' } : null);
          setIsActionLoading(false);
        } else if (latestStatus.status === 'started' || latestStatus.status === 'running') {
          setWatcher(prev => prev ? { ...prev, status: 'running' } : null);
          setIsActionLoading(false);
        }
      }
    }
  }, [statusNotifications, processId]);
  
  // Fetch watcher on initial load
  useEffect(() => {
    fetchWatcherInfo();
  }, [processId]);
  
  // Get folder name from full path
  const folderName = watcher?.folderPath ? getFolderName(watcher.folderPath) : '';
  
  return (
    <Layout>
      <Stack gap="lg">
        <Group justify="space-between" align="center" pt="md">
          <Group>
            <IconFolder size={24} />
            <Title order={2} className="mono">{folderName || 'Watcher Process'}</Title>
            {watcher && (
              <Badge 
                color={watcher.status === 'running' ? 'green' : 'gray'} 
                variant="light"
                size="lg"
              >
                {watcher.status || 'unknown'}
              </Badge>
            )}
          </Group>
          
          <Group>
            {watcher && (
              <>
                <ActionIcon
                  variant="light"
                  color="blue"
                  size="lg"
                  onClick={handleRestartWatcher}
                  loading={isActionLoading}
                  disabled={watcher.status === 'running'}
                >
                  <IconRefresh size={20} />
                </ActionIcon>
                
                <ActionIcon
                  variant="light"
                  color="red"
                  size="lg"
                  onClick={handleKillWatcher}
                  loading={isActionLoading}
                  disabled={watcher.status !== 'running'}
                >
                  <IconX size={20} />
                </ActionIcon>
              </>
            )}
            
            <Button 
              leftSection={<IconRefresh size={16} />}
              variant="light"
              onClick={fetchWatcherInfo}
              loading={isLoading}
            >
              Refresh
            </Button>
          </Group>
        </Group>
        
        {(error || connectionError) && (
          <Alert color="red" title="Error" icon={<IconAlertCircle />}>
            {error || connectionError}
            {connectionError && ' Real-time updates are not available.'}
          </Alert>
        )}
        
        {isLoading ? (
          <Paper p="xl" withBorder>
            <Stack align="center">
              <Loader />
              <Text size="sm">Loading watcher information...</Text>
            </Stack>
          </Paper>
        ) : watcher ? (
          <>
            <Paper withBorder p="md">
              <Stack gap="xs">
                <Text fw={500} className="mono">Details</Text>
                <Text size="sm">Process ID: {processId}</Text>
                <Text size="sm">Folder Path: {watcher.folderPath}</Text>
                {watcher.projectName && (
                  <Text size="sm">Project: {watcher.projectName}</Text>
                )}
              </Stack>
            </Paper>
            
            <Tabs defaultValue="file-changes">
              <Tabs.List>
                <Tabs.Tab value="file-changes" leftSection={<IconFileText size={16} />}>
                  File Changes
                </Tabs.Tab>
                <Tabs.Tab value="status-history" leftSection={<IconHistory size={16} />}>
                  Status History
                </Tabs.Tab>
              </Tabs.List>
              
              <Tabs.Panel value="file-changes" pt="md">
                <FileChangesList changes={fileChanges} processId={processId} />
              </Tabs.Panel>
              
              <Tabs.Panel value="status-history" pt="md">
                <WatcherStatusList notifications={statusNotifications} processId={processId} />
              </Tabs.Panel>
            </Tabs>
          </>
        ) : (
          <Paper withBorder p="xl">
            <Stack align="center" gap="md">
              <IconAlertCircle size={48} color="red" />
              <Title order={3}>Watcher Not Found</Title>
              <Text align="center">
                The watcher process with ID {processId} was not found or is no longer active.
              </Text>
              <Button component="a" href="/" variant="light">
                Return to Dashboard
              </Button>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Layout>
  );
}
