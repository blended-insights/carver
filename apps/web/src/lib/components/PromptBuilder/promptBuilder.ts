// Form for prompt building
export type FormValues = {
  requestType: string;
  selectedFiles: string[];
  selectedDocs: string[];
  description: string;
  requirements: string[]; // Changed from string to string[]
  notes?: string;
  observedBehavior: string;
  desiredBehavior: string;
  customInstructions?: string[];
};

interface PromptBuilderProps extends FormValues {
  projectName: string;
  folderPath: string;
}

// Default instructions for the prompt
export const defaultInstructions: string[] = [
  'Use carver-read-multiple-files to read the applicable files and documentation.',
  'Update documentation to reflect your changes.',
];

const toolUseInstructions: {
  toolName: string;
  toolUse: string;
  toolParams?: Record<string, string>;
}[] = [
  {
    toolName: 'carver-read-file',
    toolUse: 'Read the content of a file.',
  },
  {
    toolName: 'carver-write-file',
    toolUse: 'Read the content of a file.',
  },
  // {
  //   toolName: 'carver-edit-file',
  //   toolUse: 'Edit the content of a file.',
  //   toolParams: { oldText: 'Old Text', newText: 'New Text' },
  // },
  {
    toolName: 'carver-read-multiple-files',
    toolUse:
      'Read the content of multiple files (preferred to use when you have multiple files to read).',
  },
  {
    toolName: 'carver-search-files',
    toolParams: { searchTerm: 'search param' },
    toolUse: 'Tool to search for file NAMES.',
  },
  {
    toolName: 'carver-search-files',
    toolParams: { searchTerm: 'search param', searchType: 'function' },
    toolUse:
      'Tool to search for files that contain the searchTerm in an FUNCTION name.',
  },
  {
    toolName: 'carver-search-files',
    toolParams: { searchTerm: 'search param', searchType: 'import' },
    toolUse:
      'Tool to search for files that contain the searchTerm in an IMPORT.',
  },
  {
    toolName: 'carver-search-files',
    toolParams: { searchTerm: 'search param', searchType: 'directory' },
    toolUse:
      'Tool to search for files present in a DIRECTORY that contains the searchTerm.',
  },
  {
    toolName: 'carver-update-file',
    toolParams: {
      operation: 'insert',
      startLine: 'line to start update',
      content: 'new content to insert',
    },
    toolUse:
      'Tool to insert next content into existing file by line number.',
  },
  {
    toolName: 'carver-update-file',
    toolParams: {
      operation: 'delete',
      startLine: 'line to start deleting',
      endLine: 'line to end deleting',
    },
    toolUse:
      'Tool to delete line(s) from a file.',
  },
  {
    toolName: 'carver-update-file',
    toolParams: {
      operation: 'replace',
      startLine: 'line to start update',
      endLine: 'line to end update',
      content: 'content to replace',
    },
    toolUse:
      'Tool to replace line(s) in a file.',
  },
];

export function promptBuilder({
  requestType,
  selectedFiles,
  description,
  requirements,
  notes,
  observedBehavior,
  desiredBehavior,
  projectName,
  folderPath,
  selectedDocs,
  customInstructions,
}: PromptBuilderProps) {
  let prompt = `# ${
    requestType.charAt(0).toUpperCase() + requestType.slice(1)
  } Request\n\n`;

  // Add description for all request types
  prompt += `## Description\n${description}\n\n`;

  // Add request-specific sections
  if (requestType === 'feature') {
    // Format requirements as a numbered list if it's an array
    const requirementsText = Array.isArray(requirements)
      ? requirements.map((req, i) => `${i + 1}. ${req}`).join('\n')
      : requirements;

    prompt += `## Requirements\n${requirementsText}\n\n`;
  } else if (requestType === 'enhancement' && notes) {
    prompt += `## Notes\n${notes}\n\n`;
  } else if (requestType === 'bug') {
    prompt += `## Observed Behavior\n${observedBehavior}\n\n`;
    prompt += `## Desired Behavior\n${desiredBehavior}\n\n`;
  }

  // Add files section
  prompt += `## Applicable Files\n${selectedFiles.join('\n')}\n\n`;

  // Add documents section if any docs are selected
  if (selectedDocs.length > 0) {
    prompt += `## Applicable Documentation\n${selectedDocs.join('\n')}\n\n`;
  }

  // Add instructions section - use custom instructions if provided, otherwise use defaults
  const instructionsToUse = customInstructions || defaultInstructions;
  prompt += `## Instructions\n${instructionsToUse
    .map((k, i) => `${i + 1}. ${k}`)
    .join('\n')}\n\n`;

  // Add tool use instructions
  prompt += `## Tool Use Instructions\n${toolUseInstructions
    .map((k, i) => {
      let str = `${i + 1}. ${k.toolName}`;
      if (k.toolParams) {
        str += `(${Object.entries(k.toolParams)
          .map(([paramName, paramValue]) => `${paramName}: ${paramValue}`)
          .join(', ')})`;
      }
      str += `: ${k.toolUse}`;
      return str;
    })
    .join('\n')}\n\n`;

  // Add detail information
  prompt += `## Details\nProject: ${projectName}\nProject Path: ${folderPath}`;

  return prompt;
}
