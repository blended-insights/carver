'use client';

import React from 'react';
import {
  Skeleton,
  Group,
  Stack,
  Paper,
  Tabs,
  Box,
  Card,
  Timeline,
} from '@mantine/core';
import { IconFolder, IconHistory, IconFileText } from '@tabler/icons-react';

/**
 * A skeleton loading UI that mirrors the structure of the ProcessDetails component
 * This creates a more natural transition when content loads
 */
export function ProcessPageSkeleton() {
  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* Header skeleton */}
      <Group justify="space-between" align="center" pt="md">
        <Group>
          <IconFolder size={24} opacity={0.5} />
          <Skeleton height={30} width={180} radius="sm" />
          <Skeleton height={26} width={80} radius="xl" />
        </Group>

        <Group>
          <Skeleton height={36} width={36} radius="md" />
          <Skeleton height={36} width={36} radius="md" />
        </Group>
      </Group>

      {/* Details panel skeleton */}
      <Paper withBorder p="md">
        <Stack gap="xs">
          <Skeleton height={22} width={80} radius="sm" />
          <Skeleton height={18} width={200} radius="sm" />
          <Skeleton height={18} width={240} radius="sm" />
          <Skeleton height={18} width={180} radius="sm" />
        </Stack>
      </Paper>

      {/* Tabs skeleton */}
      <Box>
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
            <Stack gap="md">
              {/* Timeline skeleton items */}
              <Timeline active={-1} bulletSize={24} lineWidth={2}>
                {[...Array(5)].map((_, i) => (
                  <Timeline.Item
                    key={i}
                    bullet={<Skeleton height={16} width={16} radius="xl" />}
                  >
                    <Card withBorder shadow="sm" p="sm" radius="md">
                      <Stack gap="xs">
                        <Group>
                          <Skeleton height={16} width={120} radius="sm" />
                          <Skeleton height={16} width={80} radius="sm" />
                        </Group>
                        <Skeleton height={16} width="70%" radius="sm" />
                      </Stack>
                    </Card>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Box>
    </Stack>
  );
}
