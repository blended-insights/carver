import * as neo4j from 'neo4j-driver';
import logger from '@/utils/logger';

/**
 * Neo4j client manager
 * Handles the connection to the Neo4j database
 */
export class Neo4jClient {
  private driver: neo4j.Driver;
  private static instance: Neo4jClient;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    // Create Neo4j driver
    this.driver = neo4j.driver(
      process.env.NEO4J_URI ||
        (() => {
          throw new Error(
            'NEO4J_URI is not defined in the environment variables'
          );
        })(),
      neo4j.auth.basic(
        process.env.NEO4J_USERNAME ||
          (() => {
            throw new Error(
              'NEO4J_USERNAME is not defined in the environment variables'
            );
          })(),
        process.env.NEO4J_PASSWORD ||
          (() => {
            throw new Error(
              'NEO4J_PASSWORD is not defined in the environment variables'
            );
          })()
      )
    );

    logger.info('Neo4j client initialized');
  }

  /**
   * Get the singleton instance
   * @returns Neo4jClient instance
   */
  public static getInstance(): Neo4jClient {
    if (!Neo4jClient.instance) {
      Neo4jClient.instance = new Neo4jClient();
    }
    return Neo4jClient.instance;
  }

  /**
   * Get a new Neo4j session
   * @returns Neo4j session
   */
  public getSession(): neo4j.Session {
    return this.driver.session();
  }

  /**
   * Close the Neo4j driver
   */
  public async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      logger.info('Neo4j connection closed');
    }
  }

  /**
   * Execute a Neo4j query in a managed session
   * @param callback Function that takes a session and returns a promise
   */
  public async executeInSession<T>(
    callback: (session: neo4j.Session) => Promise<T>
  ): Promise<T> {
    const session = this.getSession();
    try {
      return await callback(session);
    } finally {
      await session.close();
    }
  }
}

// Export the singleton getter
export const getNeo4jClient = Neo4jClient.getInstance;
