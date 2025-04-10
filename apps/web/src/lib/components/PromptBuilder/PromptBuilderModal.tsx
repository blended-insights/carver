'use client';

import { useState } from 'react';
import { Modal, Stepper, Button, Group } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconBuildingBroadcastTower } from '@tabler/icons-react';

// Import step components
import {
  Step1SelectType,
  Step2AddDetails,
  Step3EditInstructions,
  Step4GeneratedPrompt,
} from './steps';
import {
  type FormValues,
  promptBuilder,
  defaultInstructions,
} from './promptBuilder';

// Props for the PromptBuilder component
interface PromptBuilderProps {
  folderPath: string;
  projectName: string;
}

export function PromptBuilderModal({
  folderPath,
  projectName,
}: PromptBuilderProps) {
  // State for modal
  const [opened, { open, close }] = useDisclosure(false);

  // State for stepper
  const [active, setActive] = useState(0);

  // State for generated prompt
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  const form = useForm<FormValues>({
    initialValues: {
      requestType: 'feature',
      selectedFiles: [],
      selectedDocs: ['README.md'],
      description: '',
      requirements: [''], // Initialize as an array with one empty string
      notes: '',
      observedBehavior: '',
      desiredBehavior: '',
      customInstructions: [...defaultInstructions],
    },
    validate: (values) => {
      if (active === 0) {
        return {
          requestType: values.requestType
            ? null
            : 'Please select a request type',
        };
      }

      if (active === 1) {
        const errors: Record<string, string | null> = {
          selectedFiles:
            values.selectedFiles.length > 0
              ? null
              : 'Please select at least one file',
          description: values.description
            ? null
            : 'Please provide a description',
        };

        // Add validations based on request type
        if (values.requestType === 'feature') {
          // Check if requirements array has at least one non-empty item
          const hasRequirements =
            Array.isArray(values.requirements) &&
            values.requirements.some((req) => req.trim() !== '');

          errors.requirements = hasRequirements
            ? null
            : 'Please provide at least one requirement';
        } else if (values.requestType === 'enhancement') {
          errors.notes = values.notes
            ? null
            : 'Please provide enhancement notes';
        } else if (values.requestType === 'bug') {
          errors.observedBehavior = values.observedBehavior
            ? null
            : 'Please describe observed behavior';
          errors.desiredBehavior = values.desiredBehavior
            ? null
            : 'Please describe desired behavior';
        }

        return errors;
      }

      return {};
    },
  });

  // Handle next step in the stepper
  const nextStep = () => {
    const hasErrors = Object.values(form.validate().errors).some(
      (error) => error
    );
    if (hasErrors) return;

    if (active < 3) {
      setActive(active + 1);
    }
  };

  // Handle previous step in the stepper
  const prevStep = () => {
    if (active > 0) {
      setActive(active - 1);
    }
  };

  // Generate prompt based on form inputs
  const generatePrompt = () => {
    // Validate form before generating prompt
    const hasErrors = Object.values(form.validate().errors).some(
      (error) => error
    );
    if (hasErrors) return;

    // Clean up requirements by removing empty entries before generating the prompt
    if (Array.isArray(form.values.requirements)) {
      const cleanedRequirements = form.values.requirements.filter(
        (req) => req.trim() !== ''
      );
      form.setFieldValue('requirements', cleanedRequirements);
    }

    const prompt = promptBuilder({ ...form.values, projectName, folderPath });

    setGeneratedPrompt(prompt);
    nextStep();
  };

  // Handle modal close and reset form
  const handleClose = () => {
    form.reset();
    setActive(0);
    setGeneratedPrompt('');
    close();
  };

  return (
    <>
      <Button
        onClick={open}
        leftSection={<IconBuildingBroadcastTower size={14} />}
        variant="light"
      >
        Build Prompt
      </Button>

      <Modal
        opened={opened}
        onClose={handleClose}
        title="Prompt Builder"
        size="xxl"
        centered
      >
        <Stepper active={active} onStepClick={setActive}>
          <Stepper.Step label="Select Type" description="Choose request type">
            <Step1SelectType<FormValues>
              form={form}
              projectName={projectName}
              opened={opened}
            />
          </Stepper.Step>

          <Stepper.Step
            label="Add Details"
            description="Select files and provide details"
          >
            <Step2AddDetails
              form={form}
              projectName={projectName}
              opened={opened}
            />
          </Stepper.Step>

          <Stepper.Step
            label="Edit Instructions"
            description="Customize instructions"
          >
            <Step3EditInstructions form={form} />
          </Stepper.Step>

          <Stepper.Step
            label="Generated Prompt"
            description="Review and copy prompt"
          >
            <Step4GeneratedPrompt generatedPrompt={generatedPrompt} />
          </Stepper.Step>
          {/* 
          <Stepper.Completed>
            <Step4GeneratedPrompt generatedPrompt={generatedPrompt} />
          </Stepper.Completed> */}
        </Stepper>

        <Group justify="flex-end" mt="xl">
          {active !== 0 && (
            <Button variant="default" onClick={prevStep}>
              Back
            </Button>
          )}

          {active === 0 && <Button onClick={nextStep}>Next</Button>}

          {active === 1 && <Button onClick={nextStep}>Next</Button>}

          {active === 2 && <Button onClick={generatePrompt}>Generate</Button>}

          {active === 3 && (
            <Button color="green" onClick={handleClose}>
              Done
            </Button>
          )}
        </Group>
      </Modal>
    </>
  );
}
