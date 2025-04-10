import * as path from 'path';
import * as fs from 'fs';

/**
 * Helper function to resolve paths for autoloaded directories
 * that works in both bundled and non-bundled modes
 * 
 * @param dirName The __dirname of the calling file
 * @param relativePath The relative path to resolve
 * @returns The resolved path
 */
export function resolvePath(dirName: string, relativePath: string): string {
  // First try the standard path (assuming non-bundled)
  const standardPath = path.join(dirName, relativePath);
  
  // If that directory exists, use it
  if (fs.existsSync(standardPath) && fs.statSync(standardPath).isDirectory()) {
    return standardPath;
  }
  
  // Otherwise, try one level up (assuming bundled)
  const bundledPath = path.join(dirName, '..', relativePath);
  
  // If that exists, use it
  if (fs.existsSync(bundledPath) && fs.statSync(bundledPath).isDirectory()) {
    return bundledPath;
  }
  
  // If neither exists, default to standard path and let the application handle any errors
  return standardPath;
}
