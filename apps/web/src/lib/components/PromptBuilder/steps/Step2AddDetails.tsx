'use client';

import { useEffect, useMemo } from 'react';
import {
  Textarea,
  Stack,
  MultiSelect,
  Loader,
  Alert,
  type ComboboxItem,
  Text,
  Button,
  Group,
  TextInput,
  ActionIcon,
  Paper,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconSearch,
  IconTrash,
  IconPlus,
} from '@tabler/icons-react';
import { UseFormReturnType } from '@mantine/form';
import { FormValues } from '../promptBuilder';
import { useProjectFiles } from '@/lib/hooks/use-project-files';

interface Step2AddDetailsProps {
  form: UseFormReturnType<FormValues>;
  projectName: string;
  opened: boolean;
}

export function Step2AddDetails({
  form,
  projectName,
  opened,
}: Step2AddDetailsProps) {
  const requestType = form.values.requestType;

  // Only use search hook - we won't fetch all files at all
  const {
    files: fileResults,
    isLoading: isLoadingFileResults,
    error: fileResultsError,
  } = useProjectFiles(opened && projectName ? projectName : null, {
    // Don't revalidate on focus to reduce API calls
    revalidateOnFocus: false,
  });

  // For debugging
  useEffect(() => {
    console.log('FileResults:', fileResults);
    console.log('IsLoading:', isLoadingFileResults);
  }, [fileResults, isLoadingFileResults]);

  // Generate file options grouped by extension for the Select component
  const fileOptions = useMemo(() => {
    if (!fileResults) return [];
    if (!Array.isArray(fileResults)) return [];

    // Filter valid file objects
    const validFiles = fileResults.filter(
      (result) => result && typeof result === 'object' && 'path' in result
    );

    // Group files by extension
    const groupedFiles = validFiles.reduce((acc, file) => {
      const ext = file.extension || 'Other';
      const group = ext ? `Files (${ext})` : 'Directories';

      if (!acc[group]) {
        acc[group] = [];
      }

      acc[group].push({
        value: file.path,
        label: file.path,
        disabled: false, // Add this property to match the required format
      });

      return acc;
    }, {} as Record<string, ComboboxItem[]>);

    // Convert to the required format: { group: string; items: {value: string; label: string; disabled?: boolean}[] }[]
    return Object.entries(groupedFiles).map(([group, items]) => ({
      group,
      items: items.sort((a, b) => a.value.localeCompare(b.value)),
    }));
  }, [fileResults]);

  // Handle adding a new requirement
  const handleAddRequirement = () => {
    const currentReqs = Array.isArray(form.values.requirements)
      ? [...form.values.requirements]
      : [];

    form.setFieldValue('requirements', [...currentReqs, '']);
  };

  // Handle updating a requirement
  const handleUpdateRequirement = (index: number, value: string) => {
    if (!Array.isArray(form.values.requirements)) return;

    const newItems = [...form.values.requirements];
    newItems[index] = value;
    form.setFieldValue('requirements', newItems);
  };

  // Handle removing a requirement
  const handleRemoveRequirement = (index: number) => {
    if (!Array.isArray(form.values.requirements)) return;

    const newItems = form.values.requirements.filter((_, i) => i !== index);
    form.setFieldValue('requirements', newItems);
  };

  return (
    <Stack>
      {/* Show message in the dropdown instead of disabling the input */}
      <MultiSelect
        label="Applicable Files"
        placeholder="Search for files or directories"
        data={fileOptions}
        leftSection={<IconSearch size={16} />}
        rightSection={isLoadingFileResults && <Loader size="xs" />}
        searchable
        clearable
        checkIconPosition="left"
        maxValues={8}
        {...form.getInputProps('selectedFiles')}
      />

      {fileResultsError && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mt="sm">
          {fileResultsError instanceof Error
            ? fileResultsError.message
            : 'Failed to search project files'}
        </Alert>
      )}

      <Textarea
        label="Description"
        placeholder="Provide a clear description of what you need"
        autosize
        minRows={3}
        {...form.getInputProps('description')}
      />

      {requestType === 'feature' && (
        <Stack>
          <Text size="sm" fw={500}>
            Requirements
          </Text>
          <Text size="xs" c="dimmed">
            Add, edit, or remove specific requirements for this feature
          </Text>

          {Array.isArray(form.values.requirements) &&
            form.values.requirements.map((requirement, index) => (
              <Paper key={`requirement-${index}`} p="xs" withBorder>
                <Group gap="xs" wrap="nowrap">
                  <TextInput
                    value={requirement}
                    onChange={(e) =>
                      handleUpdateRequirement(index, e.target.value)
                    }
                    placeholder="Enter requirement"
                    style={{ flex: 1 }}
                  />

                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => handleRemoveRequirement(index)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}

          <Button
            leftSection={<IconPlus size={14} />}
            variant="outline"
            onClick={handleAddRequirement}
          >
            Add Requirement
          </Button>
        </Stack>
      )}

      {requestType === 'enhancement' && (
        <Textarea
          label="Notes"
          placeholder="Provide any additional notes or context"
          autosize
          minRows={3}
          {...form.getInputProps('notes')}
        />
      )}

      {requestType === 'bug' && (
        <>
          <Textarea
            label="Observed Behavior"
            placeholder="Describe what currently happens"
            autosize
            minRows={3}
            {...form.getInputProps('observedBehavior')}
          />

          <Textarea
            label="Desired Behavior"
            placeholder="Describe what should happen instead"
            autosize
            minRows={3}
            {...form.getInputProps('desiredBehavior')}
          />
        </>
      )}

      {/* {requestType === 'refactor' && (
        <Textarea
          label="Description"
          placeholder="Describe what needs to be refactored and why"
          autosize
          minRows={3}
          {...form.getInputProps('description')}
        />
      )} */}
    </Stack>
  );
}
