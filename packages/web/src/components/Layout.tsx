import React from 'react';
import { AppShell, Burger, Group, Title, Container, Text, NavLink } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconDashboard, IconFolder, IconCode } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import logger from '../utils/logger';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();
  
  const links = [
    { icon: <IconDashboard size={20} />, label: 'Dashboard', href: '/' },
    { icon: <IconFolder size={20} />, label: 'All Folders', href: '/folders' },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { desktop: false, mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Group>
            <IconCode size={24} />
            <Title order={3} className="mono">Carver Watcher</Title>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Text size="xs" fw={500} c="dimmed" tt="uppercase" className="mono" mt="md" mb="xs">
          Navigation
        </Text>
        
        {links.map((link) => (
          <NavLink
            key={link.href}
            leftSection={link.icon}
            label={link.label}
            active={pathname === link.href}
            component={Link}
            href={link.href}
          />
        ))}
        
        <Text size="xs" fw={500} c="dimmed" tt="uppercase" className="mono" mt="xl" mb="xs">
          Active Watchers
        </Text>
        
        <WatcherNavLinks />
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="xl">
          {children}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

// This component will fetch and display active watchers in the sidebar
function WatcherNavLinks() {
  const [activeWatchers, setActiveWatchers] = React.useState<{ processId: string; folderPath: string }[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const pathname = usePathname();

  // Get folder name from path safely
  const getFolderName = (path: string): string => {
    if (!path || typeof path !== 'string') {
      logger.error('Invalid folder path in WatcherNavLinks:', path);
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

  React.useEffect(() => {
    // Fetch active watchers
    const fetchWatchers = async () => {
      try {
        const response = await fetch('http://localhost:4000/status');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.activeWatchers)) {
          // Filter out any invalid watchers
          const validWatchers = data.activeWatchers.filter(
            (w: any) => w && typeof w === 'object' && w.processId && w.folderPath
          );
          
          setActiveWatchers(validWatchers);
          setError(null);
        } else {
          logger.error('Invalid watcher data:', data);
          setActiveWatchers([]);
          setError('Failed to fetch watchers');
        }
      } catch (error) {
        console.error('Error fetching watchers:', error);
        setError('Connection error');
      }
    };
    
    fetchWatchers();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchWatchers, 10000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">
        {error}
      </Text>
    );
  }

  return (
    <>
      {activeWatchers.map((watcher) => {
        const folderName = getFolderName(watcher.folderPath);
        return (
          <NavLink
            key={watcher.processId}
            label={folderName}
            description={watcher.processId.slice(0, 12) + '...'}
            active={pathname === `/folders/${watcher.processId}`}
            component={Link}
            href={`/folders/${watcher.processId}`}
          />
        );
      })}
      
      {activeWatchers.length === 0 && !error && (
        <Text size="sm" c="dimmed" ta="center" py="md">
          No active watchers
        </Text>
      )}
    </>
  );
}
