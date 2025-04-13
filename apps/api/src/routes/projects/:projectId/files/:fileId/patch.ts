import { Router, Request, Response } from 'express';
import logger from '@/utils/logger';
import { ensureFileInRedis, updateFileAndQueueWrite } from './shared-utils';

const router = Router({ mergeParams: true });

interface PatchFileRequestParams {
  projectId: string;
  fileId: string;
}

interface PatchFileRequestBodyBase {
  operation: 'replace' | 'insert' | 'delete';
}

interface PatchFileRequestBodyInsert extends PatchFileRequestBodyBase {
  operation: 'insert';
  startLine: number;
  newContent: string;
}

interface PatchFileRequestBodyReplace extends PatchFileRequestBodyBase {
  operation: 'replace';
  startLine: number;
  endLine: number;
  newContent: string;
}

interface PatchFileRequestBodyDelete extends PatchFileRequestBodyBase {
  operation: 'delete';
  startLine: number;
  endLine: number;
}

type PatchFileRequestBody =
  | PatchFileRequestBodyInsert
  | PatchFileRequestBodyReplace
  | PatchFileRequestBodyDelete;

/**
 * Route handler for replacing lines in a file
 * Attempts direct Redis update first, falls back to filesystem check
 */
router.patch(
  '/',
  async (
    req: Request<PatchFileRequestParams, unknown, PatchFileRequestBody>,
    res: Response
  ) => {
    logger.debug('Line-based patch for file in project', req.params);
    try {
      const { projectId, fileId } = req.params;

      // Decode fileId to handle URL encoding
      const decodedFileId = decodeURIComponent(fileId);

      // Validate request body
      if (
        req.body.startLine === undefined ||
        (req.body.operation !== 'insert' && req.body.endLine === undefined)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'startLine and operation are required. endLine is required for replace/delete operations',
        });
      }

      // Validate operation
      if (!['replace', 'insert', 'delete'].includes(req.body.operation)) {
        return res.status(400).json({
          success: false,
          message: 'operation must be one of: replace, insert, delete',
        });
      }

      // For insert operations, content is required
      if (
        (req.body.operation === 'replace' || req.body.operation === 'insert') &&
        !req.body.newContent
      ) {
        return res.status(400).json({
          success: false,
          message: 'newContent is required for replace and insert operations',
        });
      }

      // Validate line numbers
      if (!Number.isInteger(req.body.startLine) || req.body.startLine < 1) {
        return res.status(400).json({
          success: false,
          message: 'startLine must be a positive integer',
        });
      }

      // For operations other than insert, validate endLine
      if (req.body.operation !== 'insert') {
        if (
          !Number.isInteger(req.body.endLine) ||
          req.body.endLine < req.body.startLine
        ) {
          return res.status(400).json({
            success: false,
            message:
              'endLine must be an integer greater than or equal to startLine',
          });
        }
      }

      // Ensure file is available in Redis
      const fileResult = await ensureFileInRedis(projectId, decodedFileId);
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
        (req.body.operation === 'insert' &&
          req.body.startLine > lines.length + 1) ||
        (req.body.operation !== 'insert' && req.body.startLine > lines.length)
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid start line: ${req.body.startLine}. File has ${lines.length} lines.`,
          debug: {
            lineCount: lines.length,
          },
        });
      }

      if (req.body.operation !== 'insert' && req.body.endLine > lines.length) {
        return res.status(400).json({
          success: false,
          message: `Invalid end line: ${req.body.endLine}. File has ${lines.length} lines.`,
          debug: {
            lineCount: lines.length,
          },
        });
      }

      // JavaScript arrays are 0-indexed, but line numbers are 1-indexed
      const adjustedStartLine = req.body.startLine - 1;

      // Create new content based on the operation
      let updatedContent: string;

      switch (req.body.operation) {
        case 'replace':
          updatedContent = [
            ...lines.slice(0, adjustedStartLine),
            req.body.newContent,
            ...lines.slice(req.body.endLine),
          ].join('\n');
          break;

        case 'insert':
          updatedContent = [
            ...lines.slice(0, adjustedStartLine),
            req.body.newContent,
            ...lines.slice(adjustedStartLine),
          ].join('\n');
          break;

        case 'delete':
          updatedContent = [
            ...lines.slice(0, adjustedStartLine),
            ...lines.slice(req.body.endLine),
          ].join('\n');
          break;
      }

      // Update file in Redis and queue disk write
      return updateFileAndQueueWrite(
        res,
        projectId,
        decodedFileId,
        updatedContent,
        `line-based ${req.body.operation}`,
        {
          operation: req.body.operation,
          linesAffected:
            req.body.operation === 'insert'
              ? req.body.newContent.split('\n').length
              : req.body.endLine - req.body.startLine + 1,
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
  }
);

export default router;
