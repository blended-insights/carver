import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { ensureFileInRedis, updateFileAndQueueWrite } from './shared-utils';

const router = Router({ mergeParams: true });

/**
 * Route handler for replacing text in a file
 * Attempts direct Redis update first, falls back to filesystem check
 */
router.put('/', async (req: Request, res: Response) => {
  logger.debug('Text replacement for file in project', req.params);
  try {
    const { projectId, fileId } = req.params;
    const { oldText, newText } = req.body;

    // Validate request body
    if (!oldText || !newText) {
      return res.status(400).json({
        success: false,
        message: 'Both oldText and newText are required',
      });
    }

    // Ensure file is available in Redis
    const fileResult = await ensureFileInRedis(projectId, fileId);
    if (!fileResult.success || !fileResult.content) {
      return res.status(404).json({
        success: false,
        message: fileResult.message,
      });
    }

    const content = fileResult.content;

    // Use regex for more robust matching
    const escapedOldText = oldText.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    const oldTextRegex = new RegExp(escapedOldText, 'g');

    // Check if the text to replace exists in the content using regex
    if (!oldTextRegex.test(content)) {
      logger.warn(`Text to replace not found in file ${fileId}`);

      // Find closest match for debugging purposes
      const closestMatch = findClosestMatch(content, oldText);

      return res.status(400).json({
        success: false,
        message: `Text to replace not found in file ${fileId}`,
        debug: {
          searchedFor: oldText,
          content,
          closestMatch: closestMatch
            ? {
                text: closestMatch.text,
                similarity: Math.round(closestMatch.similarity * 100) + '%',
              }
            : null,
        },
      });
    }

    // Perform the replacement
    const updatedContent = content.replace(oldTextRegex, newText);

    // Update file in Redis and queue disk write
    return updateFileAndQueueWrite(
      res,
      projectId,
      fileId,
      updatedContent,
      'text replacement'
    );
  } catch (error) {
    logger.error(`Error processing text replacement:`, error);
    return res.status(500).json({
      success: false,
      message: `Error processing text replacement: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

/**
 * Helper function to find the closest matching text in content
 * Uses simple Levenshtein distance for string similarity
 */
function findClosestMatch(
  content: string,
  searchText: string
): { text: string; similarity: number } | null {
  if (
    !content ||
    content.length === 0 ||
    !searchText ||
    searchText.length === 0
  ) {
    return null;
  }

  // For very large files, limit the search to manageable chunks
  const MAX_SEARCH_LENGTH = 10000;
  const searchableContent =
    content.length > MAX_SEARCH_LENGTH
      ? content.substring(0, MAX_SEARCH_LENGTH)
      : content;

  // Create chunks of content that are approximately the same length as the search text
  // with some overlap for better matching
  const chunkSize = searchText.length * 1.5;
  const chunks: string[] = [];

  // Create overlapping chunks from the content
  for (
    let i = 0;
    i < searchableContent.length;
    i += Math.floor(chunkSize / 2)
  ) {
    const end = Math.min(i + chunkSize, searchableContent.length);
    chunks.push(searchableContent.substring(i, end));
    if (end === searchableContent.length) break;
  }

  // Find the most similar chunk
  let bestMatch = '';
  let bestSimilarity = 0;

  for (const chunk of chunks) {
    const similarity = calculateStringSimilarity(chunk, searchText);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = chunk;
    }
  }

  // Only return matches with reasonable similarity
  return bestSimilarity > 0.5
    ? { text: bestMatch, similarity: bestSimilarity }
    : null;
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function calculateStringSimilarity(s1: string, s2: string): number {
  // Simple implementation of Levenshtein distance
  const track = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i++) {
    track[0][i] = i;
  }

  for (let j = 0; j <= s2.length; j++) {
    track[j][0] = j;
  }

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  const distance = track[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);

  // Convert distance to similarity score (1 - normalized distance)
  return maxLength > 0 ? 1 - distance / maxLength : 1;
}

export default router;
