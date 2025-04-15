'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Layout } from '@/lib/components/Layout';
import logger from '@/lib/utils/logger';
import { usePersistedEvents } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useFolders } from '@/lib/hooks/use-folders';
import { useWatchers } from '@/lib/hooks/use-watchers';

export default function FoldersPage() {
  const router = useRouter();
  const [startingFolder, setStartingFolder] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Use SWR hooks for data fetching
  const {
    folders,
    isLoading: isFoldersLoading,
    isValidating,
    error: foldersError,
    mutate: refreshFolders,
  } = useFolders();

  const {
    watchers,
    startWatcher,
    isLoading: isWatchersLoading,
    error: watchersError,
    mutate: refreshWatchers,
  } = useWatchers();

  // Use the events hook to get real-time updates for watchers
  const { statusNotifications, error: eventsError } = usePersistedEvents();

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

      const response = await startWatcher(folderPath);
      console.log('Start watcher response:', response); // Debug log

      // startWatcher will automatically invalidate the status cache
      // and we'll also get updates via Redis events

      if (response && response.success !== false) {
        setSuccess(`Successfully started watcher for ${folderPath}`);
        
        // Navigate to the process detail page
        if (response.processId) {
          // Allow a small delay for the UI to update before navigation
          setTimeout(() => {
            router.push(`/folders/${response.processId}`);
          }, 500);
        } else {
          console.error('No processId in response:', response);
        }
      } else {
        setSuccess(null);
        console.error('Error in API response:', response);
      }
    } catch (error) {
      console.error('Error starting watcher:', error);
    } finally {
      setStartingFolder(null);
    }
  };

  // Check if a folder already has an active watcher
  const isFolderWatched = useCallback(
    (folderPath: string) =>
      watchers.some((watcher) => watcher && watcher.folderPath === folderPath),
    [watchers]
  );

  // Get folder name from path
  const getFolderName = useCallback((folderPath: string): string => {
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
  }, []);

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
          <Group>
            <Button
              variant="light"
              onClick={fetchData}
              loading={
                (isFoldersLoading || isWatchersLoading) && !startingFolder
              }
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              color="gray"
              onClick={() => {
                // Clear the cache manually
                try {
                  localStorage.removeItem('carver-swr-cache');
                  console.log('Manually cleared SWR cache');
                  // Force refresh
                  window.location.reload();
                } catch (e) {
                  console.error('Error clearing cache:', e);
                }
              }}
              size="sm"
            >
              Clear Cache
            </Button>
          </Group>
        </Group>

        {process.env.NODE_ENV === 'development' && (
          <Paper p="xs" withBorder shadow="xs" bg="gray.8">
            <Text size="xs">
              Debug: isLoading={String(isFoldersLoading)}, isValidating=
              {String(isValidating)}, hasFolders={String(folders.length > 0)}
            </Text>
          </Paper>
        )}

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

        {folders.length > 0 ? (
          // If we have folders, show them even if we're still loading more
          <>
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
            {isValidating && !startingFolder && (
              <Paper p="md" withBorder mt="md">
                <Group justify="center">
                  <Loader size="sm" />
                  <Text size="sm">Refreshing folders...</Text>
                </Group>
              </Paper>
            )}
          </>
        ) : isFoldersLoading ? (
          <Paper p="xl" withBorder>
            <Stack align="center">
              <Loader />
              <Text size="sm">Loading folders...</Text>
            </Stack>
          </Paper>
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
