'use client';

import React, { useState, useEffect } from 'react';
import {
  Title,
  Card,
  Text,
  Group,
  Button,
  Stack,
  Alert,
  Paper,
  SimpleGrid,
  Loader,
} from '@mantine/core';
import { IconFolder, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { Layout } from '../../lib/components/Layout';
import { useFolders, startWatcher, useWatchers } from '../../lib/utils/api';
import { useEvents } from '../../lib/hooks/useEvents';
import logger from '../../lib/utils/logger';

export default function FoldersPage() {
  const [startingFolder, setStartingFolder] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Use SWR hooks for data fetching
  const {
    folders,
    isLoading: isFoldersLoading,
    error: foldersError,
    mutate: refreshFolders,
  } = useFolders();

  const {
    watchers,
    isLoading: isWatchersLoading,
    error: watchersError,
    mutate: refreshWatchers,
  } = useWatchers();

  // Use the events hook to get real-time updates for watchers
  const { statusNotifications, error: eventsError } = useEvents();

  // Refresh all data
  const fetchData = () => {
    refreshFolders();
    refreshWatchers();
  };

  // Start a watcher for a folder
  const handleStartWatcher = async (folderPath: string) => {
    try {
      setStartingFolder(folderPath);
      setSuccess(null);

      await startWatcher(folderPath);

      // startWatcher will automatically invalidate the status cache
      // and we'll also get updates via Redis events

      setSuccess(`Successfully started watcher for ${folderPath}`);
    } catch (error) {
      console.error('Error starting watcher:', error);
    } finally {
      setStartingFolder(null);
    }
  };

  // Check if a folder already has an active watcher
  const isFolderWatched = (folderPath: string) => {
    return watchers.some(
      (watcher) => watcher && watcher.folderPath === folderPath
    );
  };

  // Get folder name from path
  const getFolderName = (folderPath: string): string => {
    // Make sure folderPath is a string
    if (typeof folderPath !== 'string') {
      logger.error('Invalid folder path:', folderPath);
      return 'Unknown folder';
    }

    try {
      // Get the last part of the path
      const parts = folderPath.split('/');
      return parts[parts.length - 1] || folderPath;
    } catch (err) {
      logger.error('Error extracting folder name:', err);
      return 'Unknown folder';
    }
  };

  // Update active watchers based on status notifications
  useEffect(() => {
    if (statusNotifications.length > 0) {
      // When we get new status notifications, refresh the watcher list
      refreshWatchers();
    }
  }, [statusNotifications, refreshWatchers]);

  return (
    <Layout>
      <Stack gap="lg">
        <Group justify="space-between" align="center" pt="md">
          <Title order={2} className="mono">
            Available Folders
          </Title>
          <Button
            variant="light"
            onClick={fetchData}
            loading={(isFoldersLoading || isWatchersLoading) && !startingFolder}
          >
            Refresh
          </Button>
        </Group>

        {(foldersError || watchersError || eventsError) && (
          <Alert color="red" title="Error" icon={<IconAlertCircle />}>
            {foldersError
              ? 'Failed to fetch folders. '
              : watchersError
              ? 'Failed to fetch watcher status. '
              : eventsError}
            {eventsError && ' Real-time updates are not available.'}
          </Alert>
        )}

        {success && (
          <Alert color="green" title="Success" icon={<IconCheck />}>
            {success}
          </Alert>
        )}

        {isFoldersLoading && !startingFolder ? (
          <Paper p="xl" withBorder>
            <Stack align="center">
              <Loader />
              <Text size="sm">Loading folders...</Text>
            </Stack>
          </Paper>
        ) : folders.length > 0 ? (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {folders.map((folder, index) => {
              if (!folder || !folder.path) {
                return null; // Skip invalid folders
              }

              const isWatched = isFolderWatched(folder.path);
              const folderName = getFolderName(folder.path);

              return (
                <Card
                  key={folder.path || index}
                  withBorder
                  shadow="sm"
                  padding="lg"
                >
                  <Card.Section withBorder inheritPadding py="xs">
                    <Group gap="xs">
                      <IconFolder size={20} />
                      <Text fw={500} className="mono">
                        {folderName}
                      </Text>
                    </Group>
                  </Card.Section>

                  <Text size="sm" mt="md" mb="md">
                    {folder.path}
                  </Text>

                  <Button
                    fullWidth
                    variant={isWatched ? 'light' : 'filled'}
                    color={isWatched ? 'gray' : 'primary'}
                    onClick={() => handleStartWatcher(folder.path)}
                    loading={startingFolder === folder.path}
                    disabled={isWatched}
                  >
                    {isWatched ? 'Already Watching' : 'Start Watching'}
                  </Button>
                </Card>
              );
            })}
          </SimpleGrid>
        ) : (
          <Card withBorder shadow="sm" padding="lg">
            <Stack align="center" gap="md">
              <IconFolder size={48} style={{ opacity: 0.5 }} />
              <Text ta="center">No folders available</Text>
              <Text size="sm" c="dimmed" ta="center">
                Make sure your USER_MOUNT environment variable is set correctly.
              </Text>
            </Stack>
          </Card>
        )}
      </Stack>
    </Layout>
  );
}
