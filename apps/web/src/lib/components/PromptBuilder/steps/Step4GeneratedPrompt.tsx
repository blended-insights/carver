'use client';

import { Stack, Text, Box, Code, Button } from '@mantine/core';

interface Step4GeneratedPromptProps {
  generatedPrompt: string;
}

export function Step4GeneratedPrompt({
  generatedPrompt,
}: Step4GeneratedPromptProps) {
  return (
    <Stack>
      <Text size="sm">Your generated prompt:</Text>
      <Box>
        <Code block>{generatedPrompt}</Code>
      </Box>
      <Button
        onClick={() => {
          navigator.clipboard.writeText(generatedPrompt);
        }}
      >
        Copy to Clipboard
      </Button>
    </Stack>
  );
}
