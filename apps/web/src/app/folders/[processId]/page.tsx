'use client';

import { useState, useCallback, useMemo, Suspense } from 'react';
import {
  Title,
  Group,
  Button,
  Stack,
  Paper,
  Tabs,
  Badge,
  Text,
  ActionIcon,
  Transition,
} from '@mantine/core';
import {
  IconFolder,
  IconAlertCircle,
  IconRefresh,
  IconX,
  IconHistory,
  IconFileText,
} from '@tabler/icons-react';
import { PromptBuilderModal } from '@/lib/components/PromptBuilder';
import { Layout } from '@/lib/components/Layout';
import { PersistedFileChanges } from '@/lib/components/PersistedFileChanges';
import { PersistedWatcherStatus } from '@/lib/components/PersistedWatcherStatus';
import { usePersistedEvents } from '@/lib/hooks/usePersistedEvents';
import { useTransitionVisibility } from '@/lib/hooks/useTransitionVisibility';
import { useParams, useRouter } from 'next/navigation';
import { EventsManager } from '@/lib/components/EventsManager';
import { ProcessPageSkeleton } from '@/lib/components/ProcessPageSkeleton';
import { ErrorBoundary } from '@/lib/components/ErrorBoundary';
import { useWatcherById } from '@/lib/hooks/use-watcher-by-id';

// Process details UI component that consumes the fetched watcher data
function ProcessDetails({ processId }: { processId: string }) {
  const [isActionLoading, setIsActionLoading] = useState(false);
  // Use our custom hook with a longer delay for smoother transition
  const { isVisible } = useTransitionVisibility({ delay: 150 });

  // Get watcher data from API - this will now use Suspense
  const { watcher, killWatcher, restartWatcher, mutate } = useWatcherById(
    processId,
    {
      suspense: true,
    }
  );

  // Create a memoized config object for usePersistedEvents
  const eventsConfig = useMemo(
    () => ({
      processId,
      filterByProcessId: true,
    }),
    [processId]
  );

  // Get persisted events from Zustand store with a stable config
  const { statusNotifications } = usePersistedEvents(eventsConfig);

  // Get the most recent status - memoized to avoid recreating on every render
  const mostRecentStatus = useMemo(() => {
    if (statusNotifications.length === 0) return null;
    return [...statusNotifications].sort(
      (a, b) => b.timestamp - a.timestamp
    )[0];
  }, [statusNotifications]);

  // Kill watcher - wrapped in useCallback to maintain stable reference
  const router = useRouter();
  const handleKillWatcher = useCallback(async () => {
    try {
      setIsActionLoading(true);

      // The killWatcher function will automatically invalidate the SWR cache
      await killWatcher();

      // Refresh the watcher data
      mutate();

      // Redirect to folders page
      router.push('/folders');
    } catch (error) {
      console.error('Error killing watcher:', error);
    } finally {
      setIsActionLoading(false);
    }
  }, [killWatcher, mutate, router]);

  // Restart watcher - wrapped in useCallback to maintain stable reference
  const handleRestartWatcher = useCallback(async () => {
    try {
      setIsActionLoading(true);

      // The restartWatcher function will automatically invalidate the SWR cache
      await restartWatcher();

      // Refresh the watcher data
      mutate();
    } catch (error) {
      console.error('Error restarting watcher:', error);
    } finally {
      setIsActionLoading(false);
    }
  }, [restartWatcher, mutate]);

  // If watcher is null, show the "not found" UI
  if (!watcher) {
    return (
      <Transition
        mounted={isVisible}
        transition="fade"
        duration={400}
        timingFunction="ease"
      >
        {(styles) => (
          <Paper withBorder p="xl" style={styles}>
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
      </Transition>
    );
  }

  return (
    <Transition
      mounted={isVisible}
      transition="fade"
      duration={400}
      timingFunction="ease"
    >
      {(styles) => (
        <Stack gap="lg" style={{ ...styles, width: '100%' }}>
          <Group justify="space-between" align="center" pt="md">
            <Group>
              <IconFolder size={24} />
              <Title order={2} className="mono">
                {watcher?.projectName || 'Watcher Process'}
              </Title>
              {mostRecentStatus && (
                <Badge
                  color={
                    mostRecentStatus.status === 'running' ? 'green' : 'gray'
                  }
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
                    disabled={mostRecentStatus.status === 'running'}
                  >
                    <IconX size={20} />
                  </ActionIcon>

                  {/* Add Prompt Builder Modal */}
                  <PromptBuilderModal
                    folderPath={watcher?.folderPath || ''}
                    projectName={watcher?.projectName || ''}
                  />
                </>
              )}
            </Group>
          </Group>

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
              {/* Use our persisted components */}
              <PersistedFileChanges processId={processId} maxItems={50} />
            </Tabs.Panel>

            <Tabs.Panel value="status-history" pt="md">
              {/* Use our persisted components */}
              <PersistedWatcherStatus processId={processId} maxItems={50} />
            </Tabs.Panel>
          </Tabs>
        </Stack>
      )}
    </Transition>
  );
}

// Error fallback component with transition effect
function ErrorFallback({ processId }: { processId: string }) {
  const { isVisible } = useTransitionVisibility({ delay: 100 });

  return (
    <Transition
      mounted={isVisible}
      transition="fade"
      duration={400}
      timingFunction="ease"
    >
      {(styles) => (
        <Paper withBorder p="xl" style={styles}>
          <Stack align="center" gap="md">
            <IconAlertCircle size={48} color="red" />
            <Title order={3}>Error Loading Watcher</Title>
            <Text ta="center">
              There was a problem loading information for watcher process{' '}
              {processId}.
            </Text>
            <Button component="a" href="/" variant="light">
              Return to Dashboard
            </Button>
          </Stack>
        </Paper>
      )}
    </Transition>
  );
}

// The main page component that sets up Suspense and ErrorBoundary
export default function ProcessPage() {
  const { processId } = useParams<{ processId: string }>();

  return (
    <Layout>
      {/* Add a process-specific EventsManager to ensure we capture events
          for this particular process even if the page is loaded directly */}
      <EventsManager processId={processId} filterByProcessId={true} />

      <ErrorBoundary fallback={<ErrorFallback processId={processId} />}>
        <Suspense fallback={<ProcessPageSkeleton />}>
          <ProcessDetails processId={processId} />
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
