import { useEffect, useState } from 'react';
import { Card, Group, Badge, Text, Button, ActionIcon, Stack, Title } from '@mantine/core';
import { IconFolder, IconRefresh, IconX, IconEye } from '@tabler/icons-react';
import Link from 'next/link';
import logger from '../utils/logger';
import { useWatcherById } from '../hooks/use-watcher-by-id';

interface WatcherCardProps {
  processId: string;
  folderPath: string;
  status?: string;
  onAction?: () => void;
}

export function WatcherCard({ processId, folderPath, status = 'running', onAction }: WatcherCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);

  const { killWatcher, restartWatcher } = useWatcherById(
    processId,
  );
  
  // Update local status when prop changes
  useEffect(() => {
    setCurrentStatus(status);
  }, [status]);
  
  // Get folder name from path safely
  const getFolderName = (path: string): string => {
    if (!path || typeof path !== 'string') {
      logger.error('Invalid folder path in WatcherCard:', path);
      return 'Unknown folder';
    }
    
    try {
      const parts = path.split('/');
      return parts[parts.length - 1] || path;
    } catch (err) {
      logger.error('Error extracting folder name:', err);
      return 'Unknown folder';
    }
  };
  
  const folderName = getFolderName(folderPath);
  
  const handleKill = async () => {
    try {
      setIsLoading(true);
      await killWatcher();
      setCurrentStatus('shutdown');
      if (onAction) onAction();
    } catch (error) {
      console.error('Error killing watcher:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRestart = async () => {
    try {
      setIsLoading(true);
      await restartWatcher();
      setCurrentStatus('running');
      if (onAction) onAction();
    } catch (error) {
      console.error('Error restarting watcher:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const statusColor = currentStatus === 'running' 
    ? 'green' 
    : currentStatus === 'error' 
      ? 'red' 
      : 'gray';

  return (
    <Card withBorder shadow="sm" padding="md" radius="md">
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Group>
            <IconFolder size={20} />
            <Title order={5} fw={500} className="mono">{folderName}</Title>
          </Group>
          <Badge color={statusColor} variant="light">
            {currentStatus}
          </Badge>
        </Group>
      </Card.Section>
      
      <Stack gap="xs" mt="md">
        <Text size="sm" c="dimmed" className="mono">
          Process ID: {processId}
        </Text>
        <Text size="sm" c="dimmed">
          Path: {folderPath}
        </Text>
      </Stack>
      
      <Group mt="md" gap="xs">
        <Button 
          component={Link} 
          href={`/folders/${processId}`} 
          variant="light" 
          leftSection={<IconEye size={16} />}
        >
          View
        </Button>
        
        <ActionIcon 
          variant="light" 
          color="blue" 
          onClick={handleRestart} 
          loading={isLoading && currentStatus !== 'running'}
          disabled={currentStatus === 'running'}
        >
          <IconRefresh size={16} />
        </ActionIcon>
        
        <ActionIcon 
          variant="light" 
          color="red" 
          onClick={handleKill} 
          loading={isLoading && currentStatus === 'running'}
          disabled={currentStatus !== 'running'}
        >
          <IconX size={16} />
        </ActionIcon>
      </Group>
    </Card>
  );
}
