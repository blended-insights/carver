import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { ensureFileInRedis, updateFileAndQueueWrite } from './shared-utils';

const router = Router({ mergeParams: true });

/**
 * Route handler for replacing lines in a file
 * Attempts direct Redis update first, falls back to filesystem check
 */
router.patch('/', async (req: Request, res: Response) => {
  logger.debug('Line-based patch for file in project', req.params);
  try {
    const { projectId, fileId } = req.params;
    const { startLine, endLine, content, operation = 'replace' } = req.body;

    // Validate request body
    if (
      startLine === undefined ||
      (operation !== 'insert' && endLine === undefined)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'startLine and operation are required. endLine is required for replace/delete operations',
      });
    }

    // Validate operation
    if (!['replace', 'insert', 'delete'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: 'operation must be one of: replace, insert, delete',
      });
    }

    // For insert operations, content is required
    if ((operation === 'replace' || operation === 'insert') && !content) {
      return res.status(400).json({
        success: false,
        message: 'content is required for replace and insert operations',
      });
    }

    // Validate line numbers
    if (!Number.isInteger(startLine) || startLine < 1) {
      return res.status(400).json({
        success: false,
        message: 'startLine must be a positive integer',
      });
    }

    // For operations other than insert, validate endLine
    if (operation !== 'insert') {
      if (!Number.isInteger(endLine) || endLine < startLine) {
        return res.status(400).json({
          success: false,
          message:
            'endLine must be an integer greater than or equal to startLine',
        });
      }
    }

    // Ensure file is available in Redis
    const fileResult = await ensureFileInRedis(projectId, fileId);
    if (!fileResult.success || !fileResult.content) {
      return res.status(404).json({
        success: false,
        message: fileResult.message,
      });
    }

    const currentContent = fileResult.content;

    // Split the content into lines
    const lines = currentContent.split('\n');

    // Validate line numbers against actual file content
    // For insert, startLine can be lines.length + 1 (insert at the end)
    if (
      (operation === 'insert' && startLine > lines.length + 1) ||
      (operation !== 'insert' && startLine > lines.length)
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid start line: ${startLine}. File has ${lines.length} lines.`,
        debug: {
          lineCount: lines.length,
        },
      });
    }

    if (operation !== 'insert' && endLine > lines.length) {
      return res.status(400).json({
        success: false,
        message: `Invalid end line: ${endLine}. File has ${lines.length} lines.`,
        debug: {
          lineCount: lines.length,
        },
      });
    }

    // JavaScript arrays are 0-indexed, but line numbers are 1-indexed
    const adjustedStartLine = startLine - 1;
    // For insert operations, we don't really need endLine, but we'll use startLine as a default
    const adjustedEndLine =
      operation === 'insert' ? adjustedStartLine : endLine - 1;

    // Create new content based on the operation
    let updatedContent: string;

    switch (operation) {
      case 'replace':
        updatedContent = [
          ...lines.slice(0, adjustedStartLine),
          content,
          ...lines.slice(adjustedEndLine + 1),
        ].join('\n');
        break;

      case 'insert':
        updatedContent = [
          ...lines.slice(0, adjustedStartLine),
          content,
          ...lines.slice(adjustedStartLine),
        ].join('\n');
        break;

      case 'delete':
        updatedContent = [
          ...lines.slice(0, adjustedStartLine),
          ...lines.slice(adjustedEndLine + 1),
        ].join('\n');
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `Unsupported operation: ${operation}`,
        });
    }

    // Update file in Redis and queue disk write
    return updateFileAndQueueWrite(
      res,
      projectId,
      fileId,
      updatedContent,
      `line-based ${operation}`,
      {
        operation,
        linesAffected: operation === 'insert' ? 1 : endLine - startLine + 1,
      }
    );
  } catch (error) {
    logger.error(`Error processing line-based operation:`, error);
    return res.status(500).json({
      success: false,
      message: `Error processing line-based operation: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
});

export default router;