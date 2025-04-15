import { getNeo4jClient } from '../client';
import {
  ADMIN_QUERIES,
  CONSTRAINTS_AND_INDEXES,
} from '@/constants/neo4j-queries';
import logger from '@/utils/logger';

/**
 * Operations for database administration tasks in Neo4j
 */
export class AdminOperations {
  /**
   * Create constraints and indexes for Neo4j database
   */
  async createConstraintsAndIndexes(): Promise<void> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        await session.run(CONSTRAINTS_AND_INDEXES.FILE_PATH_CONSTRAINT);
        await session.run(CONSTRAINTS_AND_INDEXES.DIRECTORY_PATH_CONSTRAINT);
        await session.run(CONSTRAINTS_AND_INDEXES.PROJECT_NAME_CONSTRAINT);
        await session.run(CONSTRAINTS_AND_INDEXES.FUNCTION_INDEX);
        await session.run(CONSTRAINTS_AND_INDEXES.CLASS_INDEX);

        logger.info('Created constraints and indexes');
      } catch (error) {
        logger.error('Error creating constraints and indexes:', error);
        throw error;
      }
    });
  }

  /**
   * Clear the entire Neo4j database
   */
  async clearDatabase(): Promise<void> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        // Execute a Cypher query to delete all nodes and relationships
        await session.run(ADMIN_QUERIES.CLEAR_DATABASE);
        logger.info('Neo4j database has been cleared');
      } catch (error) {
        logger.error('Error clearing Neo4j database:', error);
        throw error;
      }
    });
  }

  /**
   * Execute a custom Cypher query with parameters
   * @param query Cypher query string
   * @param params Query parameters
   * @returns Array of records from the query result
   */
  async executeQuery<T = Record<string, any>>(
    query: string,
    params: Record<string, any> = {}
  ): Promise<T[]> {
    const client = getNeo4jClient();
    return client.executeInSession(async (session) => {
      try {
        const result = await session.run(query, params);

        return result.records.map((record) => {
          const resultObj: Record<string, any> = {};

          // Convert each record to a plain object with its keys and values
          record.keys.forEach((key) => {
            resultObj[key as string] = record.get(key);
          });

          return resultObj as T;
        });
      } catch (error) {
        logger.error(`Error executing custom query:`, error);
        throw error;
      }
    });
  }
}

// Export singleton instance
export const adminOperations = new AdminOperations();
