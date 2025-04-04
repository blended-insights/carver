'use client';

import React, { useState, useEffect } from 'react';
import { Title, Card, Text, Group, Button, Stack, Alert, Paper, SimpleGrid, Loader } from '@mantine/core';
import { IconFolder, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { Layout } from '../../components/Layout';
import { fetchAvailableFolders, startWatcher, fetchWatcherStatus, Folder, WatcherProcess, StartWatcherResponse } from '../../utils/api';
import logger from '../../utils/logger';

export default function FoldersPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeWatchers, setActiveWatchers] = useState<WatcherProcess[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startingFolder, setStartingFolder] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Fetch available folders and active watchers
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch folders and watchers separately for better error handling
      try {
        const foldersData = await fetchAvailableFolders();
        setFolders(foldersData);
      } catch (folderErr) {
        logger.error('Error fetching folders:', folderErr);
        setFolders([]);
        setError('Failed to fetch available folders. Please try again.');
      }
      
      try {
        const watchersData = await fetchWatcherStatus();
        setActiveWatchers(watchersData);
      } catch (watcherErr) {
        logger.error('Error fetching watchers:', watcherErr);
        setActiveWatchers([]);
        // Don't set error if just the watchers fail but folders succeeded
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Start a watcher for a folder
  const handleStartWatcher = async (folderPath: string) => {
    try {
      setStartingFolder(folderPath);
      setError(null);
      setSuccess(null);
      
      const response = await startWatcher(folderPath);
      
      // Refresh the watchers list
      await fetchData();
      
      setSuccess(`Successfully started watcher for ${folderPath}`);
    } catch (error) {
      setError(`Failed to start watcher for ${folderPath}`);
      console.error('Error starting watcher:', error);
    } finally {
      setStartingFolder(null);
    }
  };
  
  // Check if a folder already has an active watcher
  const isFolderWatched = (folderPath: string) => {
    return activeWatchers.some(watcher => watcher && watcher.folderPath === folderPath);
  };
  
  // Get folder name from path
  const getFolderName = (folderPath: string): string => {
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
  };
  
  // Fetch data on initial load
  useEffect(() => {
    fetchData();
  }, []);
  
  return (
    <Layout>
      <Stack gap="lg">
        <Group justify="space-between" align="center" pt="md">
          <Title order={2} className="mono">Available Folders</Title>
          <Button 
            variant="light"
            onClick={fetchData}
            loading={isLoading && !startingFolder}
          >
            Refresh
          </Button>
        </Group>
        
        {error && (
          <Alert color="red" title="Error" icon={<IconAlertCircle />}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert color="green" title="Success" icon={<IconCheck />}>
            {success}
          </Alert>
        )}
        
        {isLoading && !startingFolder ? (
          <Paper p="xl" withBorder>
            <Stack align="center">
              <Loader />
              <Text size="sm">Loading folders...</Text>
            </Stack>
          </Paper>
        ) : folders.length > 0 ? (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {folders.map((folder, index) => {
              if (!folder || !folder.path) {
                return null; // Skip invalid folders
              }
              
              const isWatched = isFolderWatched(folder.path);
              const folderName = getFolderName(folder.path);
              
              return (
                <Card key={folder.path || index} withBorder shadow="sm" padding="lg">
                  <Card.Section withBorder inheritPadding py="xs">
                    <Group gap="xs">
                      <IconFolder size={20} />
                      <Text fw={500} className="mono">{folderName}</Text>
                    </Group>
                  </Card.Section>
                  
                  <Text size="sm" mt="md" mb="md">
                    {folder.path}
                  </Text>
                  
                  <Button 
                    fullWidth
                    variant={isWatched ? "light" : "filled"}
                    color={isWatched ? "gray" : "primary"}
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
