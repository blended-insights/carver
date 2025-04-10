import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { theme } from '../theme';
import { EventsManager } from '@/lib/components/EventsManager';
// import { SWRPersistenceProvider } from '@/lib/components/SWRPersistenceProvider';

import '@mantine/core/styles.css';
import './globals.css';
import { type ReactNode } from 'react';

export const metadata = {
  title: 'Carver Dashboard',
  description: 'Monitor and manage your code watcher processes',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width"
        />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          {/* Add SWRPersistenceProvider to enable cache persistence */}
          {/* <SWRPersistenceProvider> */}
          {children}
          {/* 
              EventsManager maintains a single SSE connection
              This is a client component that doesn't render anything
            */}
          <EventsManager />
          {/* </SWRPersistenceProvider> */}
        </MantineProvider>
      </body>
    </html>
  );
}
