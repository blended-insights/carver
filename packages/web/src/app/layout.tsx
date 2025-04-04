import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { theme } from '../theme';
import { RedisProvider } from '@/lib/context/RedisContext';

import '@mantine/core/styles.css';
import './globals.css';

export const metadata = {
  title: 'Carver Watcher Dashboard',
  description: 'Monitor and manage your code watcher processes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
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
        <MantineProvider theme={theme}>
          <RedisProvider>{children}</RedisProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
