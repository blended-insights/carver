'use client';

import React, { useState } from 'react';
import {
  Title,
  Group,
  Button,
  Stack,
  Paper,
  Tabs,
  Badge,
  Text,
  Loader,
  ActionIcon,
} from '@mantine/core';
import {
  IconFolder,
  IconAlertCircle,
  IconRefresh,
  IconX,
  IconHistory,
  IconFileText,
} from '@tabler/icons-react';
import { Layout } from '@/lib/components/Layout';
import { FileChangesList } from '@/lib/components/FileChangesList';
import { WatcherStatusList } from '@/lib/components/WatcherStatusList';
import {
  killWatcher,
  restartWatcher,
  useWatcherByProcessId,
} from '@/lib/utils/api';
import { useProcessNotifications } from '@/lib/hooks/useProcessNotifications';
import { useParams } from 'next/navigation';

export default function ProcessPage() {
  const { processId } = useParams<{ processId: string }>();

  const [isActionLoading, setIsActionLoading] = useState(false);

  const { watcher, isLoading } = useWatcherByProcessId(processId);
  const { statuses, fileChanges, mostRecentStatus } =
    useProcessNotifications(processId);
console.log('watcher', watcher);
  // Kill watcher
  const handleKillWatcher = async () => {
    if (!statuses) return;

    try {
      setIsActionLoading(true);

      // The killWatcher function will automatically invalidate the SWR cache
      await killWatcher(processId);

      // We'll rely on the status notifications to update the UI
      // and SWR will automatically revalidate
    } catch (error) {
      console.error('Error killing watcher:', error);
      setIsActionLoading(false);
    }
  };

  // Restart watcher
  const handleRestartWatcher = async () => {
    if (!statuses) return;

    try {
      setIsActionLoading(true);

      // The restartWatcher function will automatically invalidate the SWR cache
      await restartWatcher(processId);

      // We'll rely on the status notifications to update the UI
      // and SWR will automatically revalidate
    } catch (error) {
      console.error('Error restarting watcher:', error);
      setIsActionLoading(false);
    }
  };

  return (
    <Layout>
      <Stack gap="lg">
        <Group justify="space-between" align="center" pt="md">
          <Group>
            <IconFolder size={24} />
            <Title order={2} className="mono">
              {watcher?.projectName || 'Watcher Process'}
            </Title>
            {mostRecentStatus && (
              <Badge
                color={mostRecentStatus.status === 'running' ? 'green' : 'gray'}
                variant="light"
                size="lg"
              >
                {mostRecentStatus.status || 'unknown'}
              </Badge>
            )}
          </Group>

          <Group>
            {mostRecentStatus && (
              <>
                <ActionIcon
                  variant="light"
                  color="blue"
                  size="lg"
                  onClick={handleRestartWatcher}
                  loading={isActionLoading}
                  disabled={mostRecentStatus.status === 'running'}
                >
                  <IconRefresh size={20} />
                </ActionIcon>

                <ActionIcon
                  variant="light"
                  color="red"
                  size="lg"
                  onClick={handleKillWatcher}
                  loading={isActionLoading}
                  disabled={mostRecentStatus.status !== 'running'}
                >
                  <IconX size={20} />
                </ActionIcon>
              </>
            )}
          </Group>
        </Group>

        {isLoading ? (
          <Paper p="xl" withBorder>
            <Stack align="center">
              <Loader />
              <Text size="sm">Loading watcher information...</Text>
            </Stack>
          </Paper>
        ) : statuses ? (
          <>
            <Paper withBorder p="md">
              <Stack gap="xs">
                <Text fw={500} className="mono">
                  Details
                </Text>
                <Text size="sm">Process ID: {processId}</Text>
                <Text size="sm">Folder Path: {watcher?.folderPath}</Text>
                <Text size="sm">Project: {watcher?.projectName}</Text>
              </Stack>
            </Paper>

            <Tabs defaultValue="file-changes">
              <Tabs.List>
                <Tabs.Tab
                  value="file-changes"
                  leftSection={<IconFileText size={16} />}
                >
                  File Changes
                </Tabs.Tab>
                <Tabs.Tab
                  value="status-history"
                  leftSection={<IconHistory size={16} />}
                >
                  Status History
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="file-changes" pt="md">
                <FileChangesList changes={fileChanges} processId={processId} />
              </Tabs.Panel>

              <Tabs.Panel value="status-history" pt="md">
                <WatcherStatusList
                  notifications={statuses}
                  processId={processId}
                />
              </Tabs.Panel>
            </Tabs>
          </>
        ) : (
          <Paper withBorder p="xl">
            <Stack align="center" gap="md">
              <IconAlertCircle size={48} color="red" />
              <Title order={3}>Watcher Not Found</Title>
              <Text ta="center">
                The watcher process with ID {processId} was not found or is no
                longer active.
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
