'use client';

import {
  Stack,
  Text,
  Button,
  Group,
  TextInput,
  ActionIcon,
  Paper,
} from '@mantine/core';
import { IconTrash, IconGripVertical, IconPlus } from '@tabler/icons-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { UseFormReturnType } from '@mantine/form';
import { FormValues } from '../promptBuilder';

interface Step3EditInstructionsProps {
  form: UseFormReturnType<FormValues>;
}

export function Step3EditInstructions({ form }: Step3EditInstructionsProps) {
  const { customInstructions } = form.values;

  // Handle adding a new instruction
  const handleAddInstruction = () => {
    const newItems = [...(customInstructions ?? []), ''];
    form.setFieldValue('customInstructions', newItems);
  };

  // Handle updating an instruction
  const handleUpdateInstruction = (index: number, value: string) => {
    const newItems = [...(customInstructions ?? [])];
    newItems[index] = value;
    form.setFieldValue('customInstructions', newItems);
  };

  // Handle removing an instruction
  const handleRemoveInstruction = (index: number) => {
    const newItems = (customInstructions ?? []).filter((_, i) => i !== index);
    form.setFieldValue('customInstructions', newItems);
  };

  // Handle drag and drop reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const reorderedItems: string[] = form.values.customInstructions ?? [];
    const [removed] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, removed);

    form.setFieldValue('customInstructions', reorderedItems);
  };

  return (
    <Stack gap="md">
      <Text size="sm" fw={500}>
        Edit Instructions
      </Text>
      <Text size="xs" c="dimmed">
        Add, edit, remove, or reorder instructions that will be included in your
        prompt.
      </Text>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="instructions">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {customInstructions?.map((instruction, index) => (
                <Draggable
                  key={`instruction-${index}`}
                  draggableId={`instruction-${index}`}
                  index={index}
                >
                  {(provided) => (
                    <Paper
                      p="xs"
                      mb="sm"
                      withBorder
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                    >
                      <Group gap="xs" wrap="nowrap">
                        <ActionIcon
                          variant="subtle"
                          {...provided.dragHandleProps}
                        >
                          <IconGripVertical size={16} />
                        </ActionIcon>

                        <TextInput
                          value={instruction}
                          onChange={(e) =>
                            handleUpdateInstruction(index, e.target.value)
                          }
                          placeholder="Enter instruction"
                          style={{ flex: 1 }}
                        />

                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => handleRemoveInstruction(index)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Paper>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Button
        leftSection={<IconPlus size={14} />}
        variant="outline"
        onClick={handleAddInstruction}
      >
        Add Instruction
      </Button>
    </Stack>
  );
}
