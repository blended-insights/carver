import React from 'react';
import { Timeline, Text, Badge, Group, Paper, ActionIcon, Stack, Title } from '@mantine/core';
import { IconFile, IconEdit, IconTrash, IconPlus, IconClock } from '@tabler/icons-react';
import { FileChangeNotification } from '../utils/redis';

interface FileChangesListProps {
  changes: FileChangeNotification[];
  maxItems?: number;
  processId?: string;
}

export function FileChangesList({ changes, maxItems = 50, processId }: FileChangesListProps) {
  const filteredChanges = processId 
    ? changes.filter(change => change.processId === processId) 
    : changes;
    
  // Get the most recent changes up to maxItems
  const recentChanges = [...filteredChanges]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, maxItems);
  
  if (recentChanges.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Text align="center" c="dimmed">No file changes recorded yet</Text>
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
        
        // Determine icon and color based on change type
        let icon;
        let color;
        
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
                <Badge color={color} size="sm" variant="light">
                  {change.eventType}
                </Badge>
              </Group>
            }
          >
            <Text size="xs" c="dimmed" mt={4}>
              <Group gap="xs">
                <IconClock size={12} />
                {timeString} on {dateString}
              </Group>
            </Text>
            
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
