'use client';

import React from 'react';
import {
  Title,
  Grid,
  Card,
  Text,
  Group,
  Button,
  Stack,
  Alert,
  Paper,
  Divider,
} from '@mantine/core';
import {
  IconFolder,
  IconRefresh,
  IconAlertCircle,
  IconFileText,
  IconServer,
} from '@tabler/icons-react';
import { Layout } from '@/lib/components/Layout';
import { WatcherCard } from '@/lib/components/WatcherCard';
import { PersistedFileChanges } from '@/lib/components/PersistedFileChanges';
import { PersistedWatcherStatus } from '@/lib/components/PersistedWatcherStatus';
import { useIsConnected, useConnectionError } from '@/lib/store/redis-store';
import { useWatchers } from '@/lib/hooks/use-watchers';

export default function Dashboard() {
  // Use SWR with a specific configuration to minimize fetches
  const { watchers, isLoading, error, mutate } = useWatchers({
    revalidateOnFocus: false, // Disable revalidation on focus to reduce API calls
    dedupingInterval: 5000, // Increase deduping interval for this specific component
  });

  // Use atomic selectors from the store to prevent infinite loop
  const isConnected = useIsConnected();
  const connectionError = useConnectionError();

  return (
    <Layout>
      <Stack gap="lg">
        <Group justify="space-between" align="center" pt="md">
          <Title order={2} className="mono">
            Dashboard
          </Title>
          <Group>
            {!isConnected && (
              <Alert
                color="yellow"
                title="Connection Status"
                icon={<IconAlertCircle size={16} />}
                withCloseButton={false}
                styles={{
                  root: {
                    padding: '5px 10px',
                    maxWidth: '300px',
                  },
                }}
              >
                <Text size="xs">
                  {connectionError || 'Not connected to event stream'}
                </Text>
              </Alert>
            )}
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="light"
              onClick={() => mutate()}
              loading={isLoading}
            >
              Refresh
            </Button>
          </Group>
        </Group>

        {error && (
          <Alert
            title="API Error"
            color="red"
            icon={<IconAlertCircle size={16} />}
          >
            Failed to fetch watcher information. Please try refreshing.
          </Alert>
        )}

        {watchers.length > 0 ? (
          <Grid>
            {watchers.map((watcher) => (
              <Grid.Col
                span={{ base: 12, md: 6, lg: 4 }}
                key={watcher.processId}
              >
                <WatcherCard
                  processId={watcher.processId}
                  folderPath={watcher.folderPath}
                  status={watcher.status}
                  onAction={() => mutate()}
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
              <Button component="a" href="/folders" variant="light">
                View Folders
              </Button>
            </Stack>
          </Card>
        )}

        {/* Add Recent Events Section */}
        {watchers.length > 0 && (
          <Grid>
            <Grid.Col span={{ base: 12, lg: 6 }}>
              <Paper withBorder p="md">
                <Stack gap="md">
                  <Group>
                    <IconFileText size={20} />
                    <Title order={4}>Recent File Changes</Title>
                  </Group>
                  <Divider />
                  <PersistedFileChanges
                    maxItems={10}
                    showConnectionStatus={false}
                  />
                </Stack>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, lg: 6 }}>
              <Paper withBorder p="md">
                <Stack gap="md">
                  <Group>
                    <IconServer size={20} />
                    <Title order={4}>Watcher Status Updates</Title>
                  </Group>
                  <Divider />
                  <PersistedWatcherStatus
                    maxItems={10}
                    showConnectionStatus={false}
                  />
                </Stack>
              </Paper>
            </Grid.Col>
          </Grid>
        )}
      </Stack>
    </Layout>
  );
}
