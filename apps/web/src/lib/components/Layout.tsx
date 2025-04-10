import {
  AppShell,
  Burger,
  Group,
  Title,
  Container,
  Text,
  NavLink,
  Divider,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconDashboard, 
  IconFolder, 
  IconCode, 
  IconSettings,
} from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWatchers } from '@/lib/utils/api';
import { type ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();

  const mainLinks = [
    { icon: <IconDashboard size={20} />, label: 'Dashboard', href: '/' },
    { icon: <IconFolder size={20} />, label: 'All Folders', href: '/folders' },
  ];
  
  const adminLinks = [
    { icon: <IconSettings size={20} />, label: 'Admin', href: '/admin' },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { desktop: false, mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Group>
            <IconCode size={24} />
            <Title order={3} className="mono">
              Carver Watcher
            </Title>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Text
          size="xs"
          fw={500}
          c="dimmed"
          tt="uppercase"
          className="mono"
          mt="md"
          mb="xs"
        >
          Navigation
        </Text>

        {mainLinks.map((link) => (
          <NavLink
            key={link.href}
            leftSection={link.icon}
            label={link.label}
            active={pathname === link.href}
            component={Link}
            href={link.href}
          />
        ))}

        <Text
          size="xs"
          fw={500}
          c="dimmed"
          tt="uppercase"
          className="mono"
          mt="xl"
          mb="xs"
        >
          Active Watchers
        </Text>

        <WatcherNavLinks />
        
        <Divider my="md" />
        
        <Text
          size="xs"
          fw={500}
          c="dimmed"
          tt="uppercase"
          className="mono"
          mt="md"
          mb="xs"
        >
          System
        </Text>
        
        {adminLinks.map((link) => (
          <NavLink
            key={link.href}
            leftSection={link.icon}
            label={link.label}
            active={pathname === link.href}
            component={Link}
            href={link.href}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="xl">{children}</Container>
      </AppShell.Main>
    </AppShell>
  );
}

// This component will fetch and display active watchers in the sidebar
function WatcherNavLinks() {
  const { watchers, error } = useWatchers();
  const pathname = usePathname();

  return (
    <>
      {watchers.map((watcher) => {
        return (
          <NavLink
            key={watcher.processId}
            label={watcher.projectName || "Watcher"}
            description={`${watcher.processId.slice(0, 12)}...`}
            active={pathname === `/folders/${watcher.processId}`}
            component={Link}
            href={`/folders/${watcher.processId}`}
          />
        );
      })}

      {watchers.length === 0 && !error && (
        <Text size="sm" c="dimmed" ta="center" py="md">
          No active watchers
        </Text>
      )}
    </>
  );
}
