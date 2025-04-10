'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Title,
  Text,
  Group,
  Badge,
  Stack,
  Accordion,
  ActionIcon,
  Tooltip,
  Alert,
} from '@mantine/core';
import {
  IconRefresh,
  IconTrash,
  IconDatabase,
  IconClock,
  IconEye,
  IconEyeOff,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useSWRCache } from '@/lib/hooks/useSWRCache';

// Helper to safely check if we're in the browser
const isBrowser = typeof window !== 'undefined';

interface SWRCacheStatusProps {
  title?: string;
  showDetails?: boolean;
}

export function SWRCacheStatus({
  title = 'SWR Cache Status',
  showDetails = false,
}: SWRCacheStatusProps) {
  const { cache, clearCache, refreshCache, getCacheKeys } = useSWRCache();
  const [keys, setKeys] = useState<string[]>([]);
  const [visible, setVisible] = useState(showDetails);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isClient, setIsClient] = useState(false);

  // Use useEffect to check if we're on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Use useCallback to memoize the updateKeys function
  const updateKeys = useCallback(() => {
    if (!isBrowser) return;

    try {
      setKeys(getCacheKeys());
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error updating cache keys:', error);
      setKeys([]);
    }
  }, [getCacheKeys]);

  // Update the keys whenever the cache changes
  useEffect(() => {
    if (!isBrowser) return;

    // Initial update
    updateKeys();

    // Set up an interval to refresh periodically
    const intervalId = setInterval(updateKeys, 5000);

    return () => clearInterval(intervalId);
  }, [updateKeys]); // Now depends on the memoized function

  // Format times in a human-readable way
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString();
  };

  // Format the time elapsed since a timestamp
  const formatElapsed = (timestamp: number) => {
    const now = Date.now();
    const elapsed = now - timestamp;

    if (elapsed < 1000) {
      return 'just now';
    } else if (elapsed < 60000) {
      return `${Math.floor(elapsed / 1000)}s ago`;
    } else if (elapsed < 3600000) {
      return `${Math.floor(elapsed / 60000)}m ago`;
    } else {
      return `${Math.floor(elapsed / 3600000)}h ago`;
    }
  };

  const handleClearCache = () => {
    if (!isBrowser) return;

    clearCache();
    updateKeys(); // Use the memoized function here
  };

  const handleRefreshCache = () => {
    if (!isBrowser) return;

    refreshCache();
    updateKeys(); // Use the memoized function here
  };

  // If we're server-side, show a simple placeholder
  if (!isClient) {
    return (
      <Paper withBorder p="md" radius="md">
        <Stack gap="xs">
          <Group justify="space-between">
            <Group>
              <IconDatabase size={20} />
              <Title order={4}>{title}</Title>
            </Group>
          </Group>
          <Alert color="blue" icon={<IconAlertCircle size={16} />}>
            <Text size="sm">
              Cache information will be displayed when the page loads in your
              browser.
            </Text>
          </Alert>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="xs">
        <Group justify="space-between">
          <Group>
            <IconDatabase size={20} />
            <Title order={4}>{title}</Title>
            <Badge color="blue">{keys.length} items</Badge>
          </Group>
          <Group>
            <Text size="xs" c="dimmed">
              <IconClock
                size={14}
                style={{
                  display: 'inline-block',
                  verticalAlign: 'middle',
                  marginRight: 4,
                }}
              />
              Updated: {formatTime(lastUpdated)}
            </Text>
            <Tooltip label={visible ? 'Hide details' : 'Show details'}>
              <ActionIcon
                variant="subtle"
                onClick={() => setVisible(!visible)}
                aria-label={visible ? 'Hide details' : 'Show details'}
              >
                {visible ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Refresh cache">
              <ActionIcon
                color="blue"
                variant="subtle"
                onClick={handleRefreshCache}
                aria-label="Refresh cache"
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Clear cache">
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={handleClearCache}
                aria-label="Clear cache"
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {visible && keys.length > 0 && (
          <Accordion variant="separated" mt="sm">
            {keys
              .map((key) => {
                try {
                  const entry = cache.get(key);
                  const data = entry?.data;
                  const timestamp = data?.timestamp;

                  return (
                    <Accordion.Item key={key} value={key}>
                      <Accordion.Control>
                        <Group>
                          <Text
                            size="sm"
                            style={{ flex: 1, fontFamily: 'monospace' }}
                          >
                            {key.length > 40
                              ? `${key.substring(0, 40)}...`
                              : key}
                          </Text>
                          {timestamp && (
                            <Badge size="sm" variant="light">
                              {formatElapsed(timestamp)}
                            </Badge>
                          )}
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Text
                          size="xs"
                          style={{
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {JSON.stringify(data, null, 2)}
                        </Text>
                      </Accordion.Panel>
                    </Accordion.Item>
                  );
                } catch (error) {
                  console.error(
                    `Error rendering cache entry for key ${key}:`,
                    error
                  );
                  return null;
                }
              })
              .filter(Boolean)}
          </Accordion>
        )}

        {visible && keys.length === 0 && (
          <Text size="sm" c="dimmed" ta="center" py="md">
            No cached items found
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
