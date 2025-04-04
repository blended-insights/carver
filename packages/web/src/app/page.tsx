'use client';

import React, { useEffect } from 'react';
import {
  Title,
  Grid,
  Card,
  Text,
  Group,
  Button,
  Stack,
  Alert,
} from '@mantine/core';
import { IconFolder, IconRefresh, IconAlertCircle } from '@tabler/icons-react';
import { Layout } from '@/lib/components/Layout';
import { WatcherCard } from '@/lib/components/WatcherCard';
import { useWatchers } from '@/lib/utils/api';

export default function Dashboard() {
  const { watchers, isLoading, error, mutate } = useWatchers();

  return (
    <Layout>
      <Stack gap="lg">
        <Group justify="space-between" align="center" pt="md">
          <Title order={2} className="mono">
            Dashboard
          </Title>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            onClick={() => mutate()}
            loading={isLoading}
          >
            Refresh
          </Button>
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
                span={{ base: 12, sm: 6, lg: 4 }}
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
        {/* Events section removed from dashboard */}
      </Stack>
    </Layout>
  );
}
