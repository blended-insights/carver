import React from 'react';
import { Timeline, Text, Badge, Group, Paper } from '@mantine/core';
import {
  IconFile,
  IconEdit,
  IconTrash,
  IconPlus,
  IconClock,
} from '@tabler/icons-react';
import type { FileChangeNotification } from '@/types/redis';

interface FileChangesListProps {
  // Accept passed changes or use usePersistedEvents inside
  changes?: FileChangeNotification[];
  maxItems?: number;
  processId?: string;
  // New flag to determine if we should filter within component or expect filtered data
  filterInComponent?: boolean;
}

export function FileChangesList({
  changes = [],
  maxItems = 50,
  processId,
  filterInComponent = true,
}: FileChangesListProps) {
  // Only filter if we need to and have a processId
  const filteredChanges =
    filterInComponent && processId
      ? changes.filter((change) => change.processId === processId)
      : changes;

  // Get the most recent changes up to maxItems
  const recentChanges = [...filteredChanges]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, maxItems);

  if (recentChanges.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Text ta="center" c="dimmed">
          No file changes recorded yet
        </Text>
      </Paper>
    );
  }

  return (
    <Timeline bulletSize={24} lineWidth={2}>
      {recentChanges.map((change, index) => {
        const date = new Date(change.timestamp);
        const timeString = date.toLocaleTimeString();
        const dateString = date.toLocaleDateString();

        // Get the file name from the full path
        const fileName = change.filePath.split('/').pop() || change.filePath;

        // Determine color based on change type
        let color;
        let icon;

        if (change.eventType === 'add') {
          icon = <IconPlus size={14} />;
          color = 'green';
        } else if (change.eventType === 'change') {
          icon = <IconEdit size={14} />;
          color = 'blue';
        } else {
          icon = <IconTrash size={14} />;
          color = 'red';
        }

        return (
          <Timeline.Item
            key={`${change.processId}-${change.filePath}-${change.timestamp}-${index}`}
            bullet={<IconFile size={14} />}
            title={
              <Group gap="xs">
                <Text className="code-filename">{fileName}</Text>
                <Badge
                  color={color}
                  size="sm"
                  variant="light"
                  leftSection={icon}
                >
                  {change.eventType}
                </Badge>
              </Group>
            }
          >
            <Group gap="xs">
              <IconClock size={12} />
              <Text size="xs" c="dimmed" mt={4}>
                {timeString} on {dateString}
              </Text>
            </Group>

            <Text size="sm" mt={4} className="mono">
              {change.filePath}
            </Text>

            {!processId && (
              <Text size="xs" c="dimmed" mt={4}>
                Process ID: {change.processId}
              </Text>
            )}
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}
