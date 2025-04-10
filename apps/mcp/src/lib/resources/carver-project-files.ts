import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  ListResourcesCallback,
  McpServer,
  ReadResourceTemplateCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { getApiClient } from '../services';

const listResources: ListResourcesCallback = async () => {
  const apiClient = getApiClient();
  const projects = await apiClient.getProjects();
  return {
    resources: projects.map((project) => ({
      uri: `project://${project.id}/files`,
      name: `project ${project.id}`,
      text: `project files for user ${project.id}`,
    })),
  };
};

const readResources: ReadResourceTemplateCallback = async (
  uri,
  { projectId }
) => {
  const apiClient = getApiClient();
  const files = await apiClient.getProjectFiles(projectId.toString());

  return {
    contents: files.map((file) => ({
      uri: uri.toString(),
      text: file.name,
      mimeType: file.extension,
    })),
  };
};

export function registerCarverProjectFilesResource(server: McpServer) {
  server.resource(
    'carver-project-files',
    new ResourceTemplate('project://{projectId}/files', {
      list: listResources,
    }),
    readResources
  );
}
