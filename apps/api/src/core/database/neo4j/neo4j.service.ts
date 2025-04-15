import { INeo4jService } from '@/interfaces/services.interface';
import { getNeo4jClient } from './client';
import {
  projectOperations,
  fileOperations,
  directoryOperations,
  entityOperations,
  adminOperations
} from './operations';

/**
 * Neo4j service that provides access to all Neo4j operations
 * Acts as a facade for the various specialized operation classes
 */
export class Neo4jService implements INeo4jService {
  // Expose operations from specialized classes
  
  // Project operations
  readonly createOrGetProject = projectOperations.createOrGetProject.bind(projectOperations);
  readonly getProjectByName = projectOperations.getProjectByName.bind(projectOperations);
  readonly getAllProjects = projectOperations.getAllProjects.bind(projectOperations);
  
  // File operations
  readonly markFileAsDeleted = fileOperations.markFileAsDeleted.bind(fileOperations);
  readonly createFileNode = fileOperations.createFileNode.bind(fileOperations);
  readonly getAllFiles = fileOperations.getAllFiles.bind(fileOperations);
  readonly searchFilesByProject = fileOperations.searchFilesByProject.bind(fileOperations);
  readonly searchFilesByFunction = fileOperations.searchFilesByFunction.bind(fileOperations);
  readonly searchFilesByImport = fileOperations.searchFilesByImport.bind(fileOperations);
  readonly searchFilesByDirectory = fileOperations.searchFilesByDirectory.bind(fileOperations);
  readonly getFilesByProject = fileOperations.getFilesByProject.bind(fileOperations);
  
  // Directory operations
  readonly createDirectoryNode = directoryOperations.createDirectoryNode.bind(directoryOperations);
  readonly createDirectoryRelationship = directoryOperations.createDirectoryRelationship.bind(directoryOperations);
  readonly getDirectoriesByProject = directoryOperations.getDirectoriesByProject.bind(directoryOperations);
  readonly searchDirectoriesByProject = directoryOperations.searchDirectoriesByProject.bind(directoryOperations);
  readonly getDirectoryByPath = directoryOperations.getDirectoryByPath.bind(directoryOperations);
  readonly getFilesByDirectory = directoryOperations.getFilesByDirectory.bind(directoryOperations);
  readonly getItemsByDirectory = directoryOperations.getItemsByDirectory.bind(directoryOperations);
  readonly getRootItemsByProject = directoryOperations.getRootItemsByProject.bind(directoryOperations);
  readonly getDirectoryTreeByPath = directoryOperations.getDirectoryTreeByPath.bind(directoryOperations);
  
  // Entity operations
  readonly handleDeletedEntities = entityOperations.handleDeletedEntities.bind(entityOperations);
  readonly processEntityMovements = entityOperations.processEntityMovements.bind(entityOperations);
  readonly createFunctionNode = entityOperations.createFunctionNode.bind(entityOperations);
  readonly createClassNode = entityOperations.createClassNode.bind(entityOperations);
  readonly createVariableNode = entityOperations.createVariableNode.bind(entityOperations);
  readonly createImportNode = entityOperations.createImportNode.bind(entityOperations);
  readonly createExportNode = entityOperations.createExportNode.bind(entityOperations);
  readonly createFunctionCallRelationships = entityOperations.createFunctionCallRelationships.bind(entityOperations);
  
  // Admin operations
  readonly createConstraintsAndIndexes = adminOperations.createConstraintsAndIndexes.bind(adminOperations);
  readonly clearDatabase = adminOperations.clearDatabase.bind(adminOperations);
  readonly executeQuery = adminOperations.executeQuery.bind(adminOperations);

  /**
   * Close the Neo4j connection
   */
  async close(): Promise<void> {
    const client = getNeo4jClient();
    await client.close();
  }
}

// Export singleton instance
const neo4jService = new Neo4jService();
export default neo4jService;
