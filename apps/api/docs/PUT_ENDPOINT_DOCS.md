# PUT Text Replacement Endpoint

## Endpoint: `PUT /projects/:projectId/files/:fileId`

This endpoint replaces specified text in a file with new text using exact string matching for reliable replacements.

## Request

### Path Parameters

- `projectId` - Project identifier (name)
- `fileId` - File path within the project (URL-encoded)

### Request Body

```json
{
  "oldText": "Text to be replaced",
  "newText": "Replacement text"
}
```

Both `oldText` and `newText` are required.

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "File successfully updated",
  "data": {
    "path": "path/to/file.ts",
    "hash": "new-file-hash"
  }
}
```

### Error Response (400 Bad Request)

If the text to replace is not found in the file:

```json
{
  "success": false,
  "message": "Text to replace not found in file path/to/file.ts",
  "debug": {
    "searchedFor": "Text that wasn't found",
    "closestMatch": {
      "text": "Closest matching text found in the file",
      "similarity": "85%"
    }
  }
}
```

### Delayed Response (202 Accepted)

If the file isn't in Redis and needs to be loaded from disk:

```json
{
  "success": true,
  "message": "File update queued",
  "data": {
    "jobId": "job-id",
    "status": "queued"
  }
}
```

## Process Flow

1. The endpoint first checks if the file exists in Redis cache
2. If found in Redis:
   - Uses exact string matching to find the text to replace (`String.prototype.includes()`)
   - If text is found, performs replacement using `String.prototype.split().join()` method
   - Validates the resulting script to ensure it's still valid
   - Updates Redis cache and queues a disk write
3. If not found in Redis:
   - Queues a job to load the file, make the replacement, and write it back
   - Returns a job ID for tracking the status

## Implementation Details

The implementation uses native JavaScript string methods instead of regular expressions for both checking if the text exists and for replacing it. This approach:

1. Avoids all regex escaping issues
2. Works reliably with template literals, backticks, and multi-line text
3. Correctly handles special characters
4. Still replaces all occurrences of the text

## Example Usage

### Replace a simple string

```bash
curl -X PUT \
  http://localhost:3000/projects/myproject/files/src%2Fmain.ts \
  -H 'Content-Type: application/json' \
  -d '{
    "oldText": "console.log(\"Hello\");",
    "newText": "console.log(\"Hello, World!\");"
  }'
```

### Replace a template literal with backticks

```bash
curl -X PUT \
  http://localhost:3000/projects/myproject/files/src%2Fqueries.ts \
  -H 'Content-Type: application/json' \
  -d '{
    "oldText": "const QUERY = `\n  SELECT * FROM users\n  WHERE id = $1\n`;",
    "newText": "const QUERY = `\n  SELECT name, email FROM users\n  WHERE id = $1\n  LIMIT 1\n`;"
  }'
```

### Replace a multi-line comment

```bash
curl -X PUT \
  http://localhost:3000/projects/myproject/files/src%2Fcontroller.ts \
  -H 'Content-Type: application/json' \
  -d '{
    "oldText": "/**\n * Old documentation\n * @param id User ID\n */",
    "newText": "/**\n * Updated documentation with more details\n * @param id User ID (numeric)\n * @returns User object or null\n */"
  }'
```