import type {
  McpServer,
  PromptCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import z, { type ZodString } from 'zod';

const schema = {
  projectName: z.string().describe('The name of the project.'),
  bugName: z.string().describe('The name of the bug.'),
  description: z.string().describe('A description of the bug.'),
  expectedResult: z.string().describe('The expected result of the bug.'),
  actualResult: z.string().describe('The actual result of the bug.'),
};

type Schema = typeof schema;

const generatePrompt = ({
  description,
  expectedResult,
  actualResult,
}: z.objectOutputType<Schema, ZodString>): string =>
  [
    `## BUG REPORT\n`,
    `### DESCRIPTION`,
    description,
    `\n### EXPECTED RESULTS`,
    expectedResult,
    `\n### ACTUAL RESULTS`,
    actualResult,
  ].join('\n');

/**
 * Bug report prompt generator
 * @param projectName Name of the project
 * @param bugName Name of the bug
 * @param description Description of the bug
 * @param expectedResult Expected result of the bug
 * @param actualResult Actual result of the bug
 * @returns A formatted message with a link to the bug report
 */
const bugReportPrompt: PromptCallback<Schema> = async (args) => {
  return {
    messages: [
      {
        role: 'assistant',
        content: {
          text: generatePrompt(args),
          resource: `bug://projects/${args.projectName}/bugs/${args.bugName}`,
          type: 'text',
        },
      },
    ],
  };
};

/**
 * Register the bug report prompt with the MCP server
 * @param server MCP server instance
 */
export function registerBugReportPrompt(server: McpServer) {
  server.prompt(
    'carver-bug-report-prompt',
    'A prompt generator for creating a bug report.',
    schema,
    bugReportPrompt
  );
}
