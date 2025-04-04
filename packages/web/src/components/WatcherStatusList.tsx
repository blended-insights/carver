import React from 'react';
import { Timeline, Text, Badge, Group, Paper } from '@mantine/core';
import { IconServer, IconClock } from '@tabler/icons-react';
import { WatcherStatusNotification } from '../utils/redis';

interface WatcherStatusListProps {
  notifications: WatcherStatusNotification[];
  maxItems?: number;
  processId?: string;
}

export function WatcherStatusList({ notifications, maxItems = 50, processId }: WatcherStatusListProps) {
  const filteredNotifications = processId 
    ? notifications.filter(notification => notification.processId === processId) 
    : notifications;
    
  // Get the most recent notifications up to maxItems
  const recentNotifications = [...filteredNotifications]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, maxItems);
  
  if (recentNotifications.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Text ta="center" c="dimmed">No status notifications yet</Text>
      </Paper>
    );
  }

  return (
    <Timeline bulletSize={24} lineWidth={2}>
      {recentNotifications.map((notification, index) => {
        const date = new Date(notification.timestamp);
        const timeString = date.toLocaleTimeString();
        const dateString = date.toLocaleDateString();
        
        // Determine color based on status
        let color;
        
        if (notification.status === 'started' || notification.status === 'running') {
          color = 'green';
        } else if (notification.status === 'error') {
          color = 'red';
        } else {
          color = 'gray';
        }
        
        return (
          <Timeline.Item 
            key={`${notification.processId}-${notification.timestamp}-${index}`}
            bullet={<IconServer size={14} />} 
            title={
              <Group gap="xs">
                <Text>Status Change</Text>
                <Badge color={color} size="sm" variant="light">
                  {notification.status}
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
            
            <Text size="sm" mt={4}>
              {notification.message}
            </Text>
            
            {!processId && (
              <Text size="xs" c="dimmed" mt={4} className="mono">
                Process ID: {notification.processId}
              </Text>
            )}
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}
