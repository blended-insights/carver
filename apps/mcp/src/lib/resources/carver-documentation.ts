import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  ListResourcesCallback,
  McpServer,
  ReadResourceTemplateCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { getApi } from '@/lib/services';
import { lookup } from 'mime-types';
import z from 'zod';
import { logger } from '../logger';
import { Project } from '../services/api';

const api = getApi();

let projects: Project[];

const createResourceURI = (projectName: string, fileName: string) => {
  const encodedFileName = encodeURIComponent(fileName);
  return `file://${projectName}/${encodedFileName}`;
};

const listResources: ListResourcesCallback = async () => {
  if (!projects) {
    projects = await api.projects.getProjects();
  }

  const resourceList = await Promise.all(
    projects.map(async (project) => {
      const files = await api.files.getProjectFiles({
        projectName: project.name,
        searchTerm: '.md',
      });

      return files.map((file) => ({
        projectName: project.name,
        id: project.name,
        name: file.path,
        extension: file.extension,
      }));
    })
  );

  return {
    resources: resourceList.flat().map((resource) => ({
      uri: createResourceURI(resource.projectName, resource.name),
      name: `${resource.id}: ${resource.name}`,
      mimeType: lookup(resource.extension) || 'text/plain',
    })),
  };
};

const readResources: ReadResourceTemplateCallback = async (uri) => {
  const projectName = uri.hostname;
  const filePath = decodeURIComponent(uri.pathname.slice(1));

  logger.info(
    `Reading file from project: ${projectName}, filePath: ${filePath}, uri: ${uri}`
  );
  const file = await api.files.getProjectFile({
    projectName,
    filePath,
    fields: ['content'],
  });

  if (!file) {
    throw new Error(`File not found: ${filePath}`);
  }

  const extenstion = filePath.split('.').pop();

  return {
    contents: [
      {
        uri: uri.toString(),
        text: file.content ?? '',
        mimeType: extenstion
          ? lookup(extenstion) || 'text/plain'
          : 'text/plain',
      },
    ],
  };
};

export function registerDocumentation(server: McpServer) {
  server.resource(
    'carver-project-files',
    new ResourceTemplate('file://{projectName}/{fileName}', {
      list: listResources,
      complete: {
        projectName: (srch) =>
          projects.filter((p) => p.name.includes(srch)).map((p) => p.name),
      },
    }),
    {
      projectName: z.string().describe('The name of the project.'),
      fileName: z.string().describe('The name of the file.'),
    },
    readResources
  );
}
