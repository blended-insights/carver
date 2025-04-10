'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Title,
  Stack,
  Group,
  Tabs,
  Paper,
  Text,
  Divider,
  Switch,
  Code,
  Table,
  Button,
  Alert,
  Modal,
  TextInput,
  Flex,
} from '@mantine/core';
import { 
IconSettings, 
IconDatabase, 
IconAccessPoint,
IconTrash,
IconAlertCircle,
IconFlame,
IconSql,
IconServer,
IconAlertTriangle,
IconCheck,
IconX,
} from '@tabler/icons-react';
import { Layout } from '@/lib/components/Layout';
import { SWRCacheStatus } from '@/lib/components/SWRCacheStatus';
import {
  useRedisStore,
  useFileChanges,
  useStatuses,
} from '@/lib/store/redis-store';
import { useDisclosure } from '@mantine/hooks';
import axios from 'axios';

// Helper to safely check if we're in the browser
const isBrowser = typeof window !== 'undefined';

export default function AdminPage() {
  const fileChanges = useFileChanges();
  const statuses = useStatuses();
  const resetRedisState = useRedisStore((state) => state.resetState);
  const [showLocalStorage, setShowLocalStorage] = useState(false);
  const [storageData, setStorageData] = useState<Record<string, string>>({});
  const [storageStats, setStorageStats] = useState({ count: 0, size: '0' });

  // Danger zone state
  const [opened, { open, close }] = useDisclosure(false);
  const [dangerAction, setDangerAction] = useState<
    'flush-redis' | 'clear-neo4j' | 'clear-all' | null
  >(null);
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionResult, setActionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Memoize the updateStorageStats function
  const updateStorageStats = useCallback(() => {
    if (!isBrowser) return;

    try {
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          totalSize += (localStorage.getItem(key) || '').length;
        }
      }
      setStorageStats({
        count: localStorage.length,
        size: (totalSize / 1024).toFixed(2),
      });
    } catch (error) {
      console.error('Error calculating localStorage size:', error);
      setStorageStats({ count: 0, size: '0' });
    }
  }, []);

  // Initialize storage stats
  useEffect(() => {
    if (isBrowser) {
      updateStorageStats();
    }
  }, [updateStorageStats]);

  // Get all localStorage keys and values
  useEffect(() => {
    if (isBrowser && showLocalStorage) {
      const data: Record<string, string> = {};
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            try {
              const value = localStorage.getItem(key) || '';
              // Truncate very long values
              data[key] =
                value.length > 100 ? `${value.substring(0, 100)}...` : value;
            } catch (error) {
              data[key] = `[Error reading value: ${error}]`;
            }
          }
        }
        setStorageData(data);
      } catch (error) {
        console.error('Error accessing localStorage:', error);
      }
    }
  }, [showLocalStorage]);

  // Clear all localStorage
  const clearAllStorage = useCallback(() => {
    if (!isBrowser) return;

    if (
      window.confirm(
        'Are you sure you want to clear all localStorage data? This cannot be undone.'
      )
    ) {
      try {
        localStorage.clear();
        setStorageData({});
        updateStorageStats();
        window.location.reload(); // Reload to reset the application state
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  }, [updateStorageStats]);

  // Clear Redis store events
  const clearRedisEvents = useCallback(() => {
    if (
      window.confirm(
        'Are you sure you want to clear all Redis events? This cannot be undone.'
      )
    ) {
      resetRedisState();
    }
  }, [resetRedisState]);

  // Danger zone actions
  const openDangerModal = useCallback(
    (action: 'flush-redis' | 'clear-neo4j' | 'clear-all') => {
      setDangerAction(action);
      setConfirmText('');
      setActionResult(null);
      open();
    },
    [open]
  );

  const getDangerActionDetails = useCallback(() => {
    switch (dangerAction) {
      case 'flush-redis':
        return {
          title: 'Flush Redis',
          description:
            'This will delete all data in Redis, including cached files, watcher status, and event history.',
          confirmText: 'flush redis',
          icon: <IconServer size={20} />,
        };
      case 'clear-neo4j':
        return {
          title: 'Clear Neo4j Database',
          description:
            'This will delete all nodes and relationships in the Neo4j database, including all code entities, files, directories, and their relationships.',
          confirmText: 'clear neo4j',
          icon: <IconSql size={20} />,
        };
      case 'clear-all':
        return {
          title: 'Clear All Databases',
          description:
            'This will delete all data in both Redis and Neo4j, effectively resetting the entire system to a clean state.',
          confirmText: 'clear all databases',
          icon: <IconTrash size={20} />,
        };
      default:
        return {
          title: '',
          description: '',
          confirmText: '',
          icon: null,
        };
    }
  }, [dangerAction]);

  const executeDangerAction = useCallback(async () => {
    if (!dangerAction) return;

    const actionDetails = getDangerActionDetails();

    // Check if confirmation text matches
    if (confirmText.toLowerCase() !== actionDetails.confirmText) {
      setActionResult({
        success: false,
        message: `Please type "${actionDetails.confirmText}" to confirm this action.`,
      });
      return;
    }

    setIsLoading(true);
    setActionResult(null);

    try {
      const response = await axios.post('/api/admin/danger', {
        action: dangerAction,
      });
      setActionResult({
        success: true,
        message: response.data.message || 'Operation completed successfully.',
      });

      // Reset local storage for Redis events if flushing Redis
      if (dangerAction === 'flush-redis' || dangerAction === 'clear-all') {
        resetRedisState();
      }
    } catch (error) {
      console.error(`Error executing ${dangerAction}:`, error);
      setActionResult({
        success: false,
        message:
          axios.isAxiosError(error) && error.response?.data?.message
            ? error.response.data.message
            : 'An error occurred while performing the operation.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [dangerAction, confirmText, getDangerActionDetails, resetRedisState]);

  return (
    <Layout>
      <Stack gap="lg">
        <Group justify="space-between" align="center" pt="md">
          <Group>
            <IconSettings size={24} />
            <Title order={2} className="mono">
              Admin
            </Title>
          </Group>
        </Group>

        <Tabs defaultValue="storage">
          <Tabs.List>
            <Tabs.Tab value="storage" leftSection={<IconDatabase size={16} />}>
              Cache & Storage
            </Tabs.Tab>
            <Tabs.Tab value="redis" leftSection={<IconAccessPoint size={16} />}>
              Redis Events
            </Tabs.Tab>
            <Tabs.Tab value="danger" leftSection={<IconFlame size={16} />}>
              Danger Zone
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="storage" pt="md">
            <Stack gap="lg">
              <Alert
                title="Data Management"
                color="yellow"
                icon={<IconAlertCircle size={16} />}
              >
                <Text size="sm">
                  This page allows you to manage the application&apos;s cached
                  data. Clearing caches may affect the application&apos;s
                  performance temporarily.
                </Text>
              </Alert>

              <SWRCacheStatus title="API Cache" showDetails={true} />

              <Paper withBorder p="md">
                <Stack gap="md">
                  <Group>
                    <IconDatabase size={20} />
                    <Title order={4}>Local Storage</Title>
                    <Text size="xs" c="dimmed">
                      {storageStats.count} items (approximately{' '}
                      {storageStats.size} KB)
                    </Text>
                  </Group>

                  <Group p="apart">
                    <Switch
                      label="Show localStorage contents"
                      checked={showLocalStorage}
                      onChange={(event) =>
                        setShowLocalStorage(event.currentTarget.checked)
                      }
                      disabled={!isBrowser}
                    />
                    <Button
                      variant="light"
                      color="red"
                      size="xs"
                      leftSection={<IconTrash size={14} />}
                      onClick={clearAllStorage}
                      disabled={!isBrowser}
                    >
                      Clear All Storage
                    </Button>
                  </Group>

                  {showLocalStorage && isBrowser && (
                    <>
                      <Divider />
                      <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                        <Table>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Key</Table.Th>
                              <Table.Th>Value (truncated)</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {Object.entries(storageData).map(([key, value]) => (
                              <Table.Tr key={key}>
                                <Table.Td>
                                  <Code>{key}</Code>
                                </Table.Td>
                                <Table.Td>
                                  <div
                                    style={{
                                      maxWidth: '500px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    <Code>{value}</Code>
                                  </div>
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </div>
                    </>
                  )}

                  {!isBrowser && (
                    <Alert color="blue" title="Browser Only Feature">
                      <Text size="sm">
                        Local storage information is only available in the
                        browser. This content will be displayed when the page
                        loads in your browser.
                      </Text>
                    </Alert>
                  )}
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="danger" pt="md">
            <Stack gap="lg">
              <Alert
                title="System Reset Operations"
                color="red"
                icon={<IconAlertTriangle size={16} />}
              >
                <Text size="sm">
                  This section contains dangerous operations that can clear
                  database contents. These actions cannot be undone and should
                  only be used in development environments or when you want to
                  completely reset the system.
                </Text>
              </Alert>

              <Paper withBorder p="md">
                <Stack gap="md">
                  <Group>
                    <IconFlame size={20} color="red" />
                    <Title order={4}>Danger Zone</Title>
                  </Group>

                  <Divider />

                  <Group grow>
                    <Paper withBorder p="md">
                      <Stack gap="md">
                        <Group>
                          <IconServer size={20} />
                          <Title order={5}>Redis Operations</Title>
                        </Group>
                        <Text size="sm">
                          Redis stores file content, hashes, watcher status and
                          event history. Clearing it will not affect Neo4j
                          database but will remove all cached file contents.
                        </Text>
                        <Button
                          color="red"
                          variant="light"
                          onClick={() => openDangerModal('flush-redis')}
                        >
                          Flush Redis
                        </Button>
                      </Stack>
                    </Paper>

                    <Paper withBorder p="md">
                      <Stack gap="md">
                        <Group>
                          <IconSql size={20} />
                          <Title order={5}>Neo4j Operations</Title>
                        </Group>
                        <Text size="sm">
                          Neo4j stores all code entities, files, directories,
                          and their relationships. Clearing it will delete all
                          nodes and relationships in the graph database.
                        </Text>
                        <Button
                          color="red"
                          variant="light"
                          onClick={() => openDangerModal('clear-neo4j')}
                        >
                          Clear Neo4j Database
                        </Button>
                      </Stack>
                    </Paper>
                  </Group>

                  <Divider />

                  <Paper withBorder p="md" bg="rgba(255, 0, 0, 0.03)">
                    <Stack gap="md">
                      <Group>
                        <IconTrash size={20} color="red" />
                        <Title order={5}>Reset Everything</Title>
                      </Group>
                      <Text size="sm">
                        This will clear both Redis and Neo4j databases,
                        effectively resetting the entire system to a clean
                        state. Use this when you need a complete system reset.
                      </Text>
                      <Button
                        color="red"
                        onClick={() => openDangerModal('clear-all')}
                      >
                        Clear All Databases
                      </Button>
                    </Stack>
                  </Paper>
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          {/* Confirmation Modal */}
          <Modal
            opened={opened}
            onClose={close}
            title={
              <Group>
                {getDangerActionDetails().icon}
                <Text fw={600}>{getDangerActionDetails().title}</Text>
              </Group>
            }
            size="md"
            centered
          >
            <Stack gap="md">
              <Alert
                color="red"
                title="Warning"
                icon={<IconAlertTriangle size={16} />}
              >
                <Text size="sm">{getDangerActionDetails().description}</Text>
                <Text size="sm" mt="xs" fw={600}>
                  This action cannot be undone!
                </Text>
              </Alert>

              {actionResult && (
                <Alert
                  color={actionResult.success ? 'green' : 'red'}
                  title={actionResult.success ? 'Success' : 'Error'}
                  icon={
                    actionResult.success ? (
                      <IconCheck size={16} />
                    ) : (
                      <IconX size={16} />
                    )
                  }
                >
                  <Text size="sm">{actionResult.message}</Text>
                </Alert>
              )}

              <TextInput
                label={`Type "${
                  getDangerActionDetails().confirmText
                }" to confirm`}
                placeholder={getDangerActionDetails().confirmText}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isLoading}
              />

              <Flex justify="flex-end" gap="md">
                <Button variant="default" onClick={close} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  color="red"
                  onClick={executeDangerAction}
                  loading={isLoading}
                  disabled={!confirmText}
                >
                  Execute Action
                </Button>
              </Flex>
            </Stack>
          </Modal>

          <Tabs.Panel value="redis" pt="md">
            <Stack gap="lg">
              <Paper withBorder p="md">
                <Stack gap="md">
                  <Group p="apart">
                    <Group>
                      <IconAccessPoint size={20} />
                      <Title order={4}>Redis Event Store</Title>
                    </Group>
                    <Button
                      variant="light"
                      color="red"
                      size="xs"
                      leftSection={<IconTrash size={14} />}
                      onClick={clearRedisEvents}
                    >
                      Clear All Events
                    </Button>
                  </Group>

                  <Divider />

                  <Group grow>
                    <Paper withBorder p="md">
                      <Stack gap="xs">
                        <Title order={5}>File Changes</Title>
                        <Text size="sm">Count: {fileChanges.length}</Text>
                        {fileChanges.length > 0 && (
                          <>
                            <Text size="xs" c="dimmed">
                              Latest:{' '}
                              {new Date(
                                fileChanges[0].timestamp
                              ).toLocaleString()}
                            </Text>
                            <div
                              style={{ maxHeight: '150px', overflow: 'auto' }}
                            >
                              <Table>
                                <Table.Thead>
                                  <Table.Tr>
                                    <Table.Th>Time</Table.Th>
                                    <Table.Th>File</Table.Th>
                                    <Table.Th>Event</Table.Th>
                                  </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                  {fileChanges
                                    .slice(0, 10)
                                    .map((change, idx) => (
                                      <Table.Tr key={idx}>
                                        <Table.Td>
                                          {new Date(
                                            change.timestamp
                                          ).toLocaleTimeString()}
                                        </Table.Td>
                                        <Table.Td>
                                          <div
                                            style={{
                                              maxWidth: '200px',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                            }}
                                          >
                                            {change.filePath.split('/').pop()}
                                          </div>
                                        </Table.Td>
                                        <Table.Td>{change.eventType}</Table.Td>
                                      </Table.Tr>
                                    ))}
                                </Table.Tbody>
                              </Table>
                            </div>
                          </>
                        )}
                      </Stack>
                    </Paper>

                    <Paper withBorder p="md">
                      <Stack gap="xs">
                        <Title order={5}>Watcher Status Events</Title>
                        <Text size="sm">Count: {statuses.length}</Text>
                        {statuses.length > 0 && (
                          <>
                            <Text size="xs" c="dimmed">
                              Latest:{' '}
                              {new Date(statuses[0].timestamp).toLocaleString()}
                            </Text>
                            <div
                              style={{ maxHeight: '150px', overflow: 'auto' }}
                            >
                              <Table>
                                <Table.Thead>
                                  <Table.Tr>
                                    <Table.Th>Time</Table.Th>
                                    <Table.Th>Process</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                  </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                  {statuses.slice(0, 10).map((status, idx) => (
                                    <Table.Tr key={idx}>
                                      <Table.Td>
                                        {new Date(
                                          status.timestamp
                                        ).toLocaleTimeString()}
                                      </Table.Td>
                                      <Table.Td>
                                        <div
                                          style={{
                                            maxWidth: '150px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                          }}
                                        >
                                          {status.processId}
                                        </div>
                                      </Table.Td>
                                      <Table.Td>{status.status}</Table.Td>
                                    </Table.Tr>
                                  ))}
                                </Table.Tbody>
                              </Table>
                            </div>
                          </>
                        )}
                      </Stack>
                    </Paper>
                  </Group>

                  <Alert title="About Redis Events" color="blue">
                    <Text size="sm">
                      Redis events are stored in the browser&apos;s localStorage
                      via Zustand and persist between page refreshes. The
                      maximum number of events stored is limited to prevent
                      excessive memory usage.
                    </Text>
                  </Alert>
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Layout>
  );
}
