'use client';

import { useMemo } from 'react';
import {
  Select,
  Stack,
  Checkbox,
  Text,
  Loader,
  Alert,
  CheckboxGroup,
} from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useProjectFiles } from '@/lib/hooks/use-project-files';
import { ProjectFile } from '@/types/api';

// Request types for prompt building
export const REQUEST_TYPES = [
  { value: 'feature', label: 'Feature' },
  { value: 'enhancement', label: 'Enhancement' },
  { value: 'bug', label: 'Bug' },
  { value: 'refactor', label: 'Refactor' },
];

interface Step1SelectTypeProps<T extends { selectedDocs: string[] }> {
  form: UseFormReturnType<T>;
  projectName: string;
  opened: boolean;
}

export function Step1SelectType<T extends { selectedDocs: string[] }>({
  form,
  projectName,
  opened,
}: Step1SelectTypeProps<T>) {
  // Fetch project files with MD extension using the useProjectFiles hook
  const {
    files: projectFiles,
    isLoading: isLoadingFiles,
    error: filesError,
  } = useProjectFiles(opened && projectName ? projectName : null, {
    revalidateOnFocus: false,
  });

  // Define a type for enhanced project files with additional properties
  type EnhancedProjectFile = ProjectFile & {
    dirPath: string;
    fileName: string;
  };

  // Define the type for grouped markdown files
  type GroupedMarkdownFiles = Record<string, EnhancedProjectFile[]>;

  // Filter markdown files, group by directory path, and sort by filename
  const groupedMarkdownFiles = useMemo<GroupedMarkdownFiles>(() => {
    if (!projectFiles) return {};

    // Filter markdown files
    const mdFiles = projectFiles.filter((file) => file.extension === '.md');

    // Remove duplicates based on path
    const uniquePaths = new Set<string>();
    const uniqueFiles = mdFiles.filter((file) => {
      if (uniquePaths.has(file.path)) {
        return false;
      }
      uniquePaths.add(file.path);
      return true;
    });

    // Group by directory path
    const grouped = uniqueFiles.reduce<GroupedMarkdownFiles>((acc, file) => {
      // Extract directory path (everything before the last slash)
      const lastSlashIndex = file.path.lastIndexOf('/');
      const dirPath =
        lastSlashIndex > 0 ? file.path.substring(0, lastSlashIndex) : '/';
      const fileName =
        lastSlashIndex > 0
          ? file.path.substring(lastSlashIndex + 1)
          : file.path;

      // Create file object with separated path components
      const fileObj: EnhancedProjectFile = {
        ...file,
        dirPath,
        fileName,
      };

      if (!acc[dirPath]) {
        acc[dirPath] = [];
      }
      acc[dirPath].push(fileObj);
      return acc;
    }, {});

    // Sort files within each directory by filename
    Object.keys(grouped).forEach((dirPath) => {
      grouped[dirPath].sort((a, b) => a.fileName.localeCompare(b.fileName));
    });

    // Sort directory paths alphabetically
    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .reduce<GroupedMarkdownFiles>((acc, dirPath) => {
        acc[dirPath] = grouped[dirPath];
        return acc;
      }, {});
  }, [projectFiles]);

  return (
    <Stack>
      <Select
        label="Request Type"
        placeholder="Select request type"
        data={REQUEST_TYPES}
        {...form.getInputProps('requestType')}
      />

      <Text fw={500} size="sm" mt="md">
        Documentation Files
      </Text>
      <Text size="xs" c="dimmed">
        Select documentation files to include in your prompt
      </Text>

      {isLoadingFiles ? (
        <Loader size="sm" />
      ) : filesError ? (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {filesError instanceof Error
            ? filesError.message
            : 'Failed to load documentation files'}
        </Alert>
      ) : Object.keys(groupedMarkdownFiles).length === 0 ? (
        <Text size="sm" c="dimmed">
          No markdown files found in this project
        </Text>
      ) : (
        <CheckboxGroup {...form.getInputProps('selectedDocs')}>
          <Stack gap="md">
            {Object.entries(groupedMarkdownFiles).map(([dirPath, files]) => (
              <div key={dirPath}>
                <Text fw={500} size="xs" c="dimmed" mb="xs">
                  {dirPath || 'Root'}
                </Text>
                <Stack gap="xs" ml="md">
                  {files.map((file) => (
                    <Checkbox
                      key={file.path}
                      value={file.path}
                      label={file.fileName}
                    />
                  ))}
                </Stack>
              </div>
            ))}
          </Stack>
        </CheckboxGroup>
      )}
    </Stack>
  );
}
