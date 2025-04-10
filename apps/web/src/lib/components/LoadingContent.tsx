'use client';

import React from 'react';
import { Paper, Stack, Loader, Text } from '@mantine/core';

interface LoadingContentProps {
  message?: string;
}

/**
 * A reusable loading component to use with Suspense
 */
export function LoadingContent({ message = 'Loading...' }: LoadingContentProps) {
  return (
    <Paper p="xl" withBorder>
      <Stack align="center">
        <Loader />
        <Text size="sm">{message}</Text>
      </Stack>
    </Paper>
  );
}
