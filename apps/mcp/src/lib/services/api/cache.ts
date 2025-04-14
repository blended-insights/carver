/**
 * Cache configuration options
 */
export interface CacheOptions {
  /**
   * Time-to-live for cached data in milliseconds
   * Default: 60000 (1 minute)
   */
  ttl: number;

  /**
   * Enable/disable cache
   * Default: true
   */
  enabled: boolean;
}

/**
 * Default cache options
 */
export const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  ttl: 60000, // 1 minute default cache TTL
  enabled: true,
};

/**
 * Cache entry with timestamp for TTL checking
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Simple in-memory API response cache
 */
export class ApiCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private options: CacheOptions;

  /**
   * Create a new API cache
   * @param options Cache configuration options
   */
  constructor(options: Partial<CacheOptions> = {}) {
    this.options = { ...DEFAULT_CACHE_OPTIONS, ...options };
  }

  /**
   * Set cache configuration options
   * @param options Cache configuration options
   */
  configure(options: Partial<CacheOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get entry from cache if available and not expired
   * @param key Cache key
   * @returns Cached data or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    if (!this.options.enabled) {
      return undefined;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Check if entry is expired
    const now = Date.now();
    if (now - entry.timestamp > this.options.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  /**
   * Store data in cache
   * @param key Cache key
   * @param data Data to cache
   */
  set<T>(key: string, data: T): void {
    if (!this.options.enabled) {
      return;
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Delete a specific entry from the cache
   * @param key Cache key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current size of the cache (number of entries)
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * Project API cache keys
 */
export const ProjectCacheKeys = {
  /** Key for all projects list */
  PROJECTS_LIST: 'projects_list',

  /** Create a key for a specific project */
  projectDetail: (projectName: string) => `project_${projectName}`,
};

/**
 * File API cache keys
 */
export const FileCacheKeys = {
  /** Key for all files list */
  filesList: (
    projectName: string,
    searchTerm?: string,
    searchType?: string
  ) => {
    const base = `files_${projectName}`;
    if (!searchTerm) return base;

    const searchKey = searchType
      ? `_${searchTerm}_${searchType}`
      : `_${searchTerm}`;

    return base + searchKey;
  },

  /** Create a key for a specific file */
  fileDetail: (projectName: string, filePath: string) =>
    `file_${projectName}_${filePath}`,

  /** Create a key for a file's imports */
  fileImports: (projectName: string, filePath: string) =>
    `imports_${projectName}_${filePath}`,
};
