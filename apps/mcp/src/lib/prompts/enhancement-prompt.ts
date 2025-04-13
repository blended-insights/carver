import type {
  McpServer,
  PromptCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import z, { type ZodString } from 'zod';

const schema = {
  projectName: z.string().describe('The name of the project.'),
  enhancementName: z.string().describe('The name of the enhancement.'),
  description: z
    .string()
    .describe('A detailed description of the enhancement.'),
  affectedFiles: z
    .string()
    .describe('List of files affected by this enhancement.'),
  justification: z
    .string()
    .describe('Justification or business value for the enhancement.')
    .optional(),
};

type Schema = typeof schema;

const generatePrompt = ({
  description,
  affectedFiles,
  justification,
}: z.objectOutputType<Schema, ZodString>): string => {
  const sections = [
    `## ENHANCEMENT REQUEST\n`,
    `### DESCRIPTION`,
    description,
    `\n### AFFECTED FILES`,
    affectedFiles,
  ];

  if (justification) {
    sections.push('\n### JUSTIFICATION');
    sections.push(justification);
  }

  return sections.join('\n');
};

/**
 * Enhancement request prompt generator
 * @param projectName Name of the project
 * @param enhancementName Name of the enhancement
 * @param description Detailed description of the enhancement
 * @param affectedFiles List of files affected by this enhancement
 * @param justification Optional justification or business value for the enhancement
 * @returns A formatted message with a link to the enhancement request
 */
const enhancementPrompt: PromptCallback<Schema> = async (args) => {
  return {
    messages: [
      {
        role: 'assistant',
        content: {
          text: generatePrompt(args),
          resource: `enhancement://projects/${args.projectName}/enhancements/${args.enhancementName}`,
          type: 'text',
        },
      },
    ],
  };
};

/**
 * Register the enhancement request prompt with the MCP server
 * @param server MCP server instance
 */
export function registerEnhancementPrompt(server: McpServer) {
  server.prompt(
    'carver-enhancement-prompt',
    'A prompt generator for creating an enhancement request.',
    schema,
    enhancementPrompt
  );
}
