'use client';

import React, { useState, useEffect } from 'react';
import { Title, Grid, Card, Text, Group, Button, Stack, Tabs, Alert } from '@mantine/core';
import { IconFolder, IconRefresh, IconHistory, IconAlertCircle } from '@tabler/icons-react';
import { Layout } from '../components/Layout';
import { WatcherCard } from '../components/WatcherCard';
import { FileChangesList } from '../components/FileChangesList';
import { WatcherStatusList } from '../components/WatcherStatusList';
import { fetchWatcherStatus } from '../utils/api';
import { useEvents } from '../hooks/useEvents';

export default function Dashboard() {
  const [activeWatchers, setActiveWatchers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use the events hook to get real-time updates
  const { 
    statusNotifications, 
    fileChanges, 
    error: connectionError 
  } = useEvents();
  
  // Fetch active watchers
  const fetchWatchers = async () => {
    try {
      setIsLoading(true);
      const watchers = await fetchWatcherStatus();
      setActiveWatchers(watchers);
    } catch (error) {
      console.error('Error fetching watchers:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update watchers when status notifications show shutdown or started
  useEffect(() => {
    if (statusNotifications.length > 0) {
      const latestStatus = statusNotifications[0];
      if (latestStatus.status === 'shutdown' || latestStatus.status === 'started') {
        fetchWatchers();
      }
    }
  }, [statusNotifications]);
  
  // Fetch watchers on initial load
  useEffect(() => {
    fetchWatchers();
  }, []);
  
  return (
    <Layout>
      <Stack gap="lg">
        <Group justify="space-between" align="center" pt="md">
          <Title order={2} className="mono">Dashboard</Title>
          <Button 
            leftSection={<IconRefresh size={16} />}
            variant="light"
            onClick={fetchWatchers}
            loading={isLoading}
          >
            Refresh
          </Button>
        </Group>
        
        {connectionError && (
          <Alert title="Connection Error" color="red" icon={<IconAlertCircle size={16} />}>
            {connectionError}. Real-time updates are not available.
          </Alert>
        )}
        
        {activeWatchers.length > 0 ? (
          <Grid>
            {activeWatchers.map((watcher) => (
              <Grid.Col span={{ base: 12, sm: 6, lg: 4 }} key={watcher.processId}>
                <WatcherCard 
                  processId={watcher.processId}
                  folderPath={watcher.folderPath}
                  onAction={fetchWatchers}
                />
              </Grid.Col>
            ))}
          </Grid>
        ) : (
          <Card withBorder shadow="sm" padding="lg">
            <Stack align="center" gap="md">
              <IconFolder size={48} style={{ opacity: 0.5 }} />
              <Text ta="center">No active watchers</Text>
              <Text size="sm" c="dimmed" ta="center">
                Start monitoring a folder by going to the All Folders page.
              </Text>
              <Button 
                component="a" 
                href="/folders" 
                variant="light"
              >
                View Folders
              </Button>
            </Stack>
          </Card>
        )}
        
        <Tabs defaultValue="file-changes">
          <Tabs.List>
            <Tabs.Tab value="file-changes" leftSection={<IconRefresh size={16} />}>
              Recent File Changes
            </Tabs.Tab>
            <Tabs.Tab value="status-history" leftSection={<IconHistory size={16} />}>
              Watcher Status History
            </Tabs.Tab>
          </Tabs.List>
          
          <Tabs.Panel value="file-changes" pt="md">
            <FileChangesList changes={fileChanges} maxItems={10} />
          </Tabs.Panel>
          
          <Tabs.Panel value="status-history" pt="md">
            <WatcherStatusList notifications={statusNotifications} maxItems={10} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Layout>
  );
}
