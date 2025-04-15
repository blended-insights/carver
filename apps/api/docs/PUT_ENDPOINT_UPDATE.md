# PUT Endpoint Documentation Update

The PUT endpoint for file text replacement has been updated to improve reliability when dealing with complex text patterns. This document provides detailed information about the changes and how to use the updated endpoint.

## Endpoint Details

```
PUT /projects/:projectId/files/:fileId
```

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

Both `oldText` and `newText` are required fields.

## Key Improvements

1. **Exact string matching** - The endpoint now uses `String.prototype.includes()` instead of regex-based matching to check if the text exists
2. **Reliable replacements** - Uses `String.prototype.split().join()` instead of regex-based replacement to avoid escaping issues
3. **Better support for complex patterns** - Reliably handles:
   - Template literals with backticks (`)
   - Multi-line text blocks
   - Text containing special regex characters
   - Nested escape sequences
4. **Improved error messages** - If text is not found, includes detailed debugging information including closest match found

## Example Usage

### Simple text replacement

```bash
curl -X PUT \
  http://localhost:3000/projects/myproject/files/src%2Fmain.ts \
  -H 'Content-Type: application/json' \
  -d '{
    "oldText": "console.log(\"Hello\");",
    "newText": "console.log(\"Hello, World!\");"
  }'
```

### Template literal replacement

```bash
curl -X PUT \
  http://localhost:3000/projects/myproject/files/src%2Fqueries.ts \
  -H 'Content-Type: application/json' \
  -d '{
    "oldText": "const QUERY = `\n  SELECT * FROM users\n  WHERE id = $1\n`;",
    "newText": "const QUERY = `\n  SELECT name, email FROM users\n  WHERE id = $1\n  LIMIT 1\n`;"
  }'
```

### Multi-line text replacement

```bash
curl -X PUT \
  http://localhost:3000/projects/myproject/files/src%2Fcontroller.ts \
  -H 'Content-Type: application/json' \
  -d '{
    "oldText": "/**\n * Old documentation\n * @param id User ID\n */",
    "newText": "/**\n * Updated documentation with more details\n * @param id User ID (numeric)\n * @returns User object or null\n */"
  }'
```

## Response Formats

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "File successfully updated",
  "data": {
    "path": "src/main.ts",
    "hash": "new-file-hash"
  }
}
```

### Error Response (400 Bad Request)

```json
{
  "success": false,
  "message": "Text to replace not found in file src/main.ts",
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

## Implementation Notes

For more information about the implementation details and technical background of this fix, please see:

- `apps/api/docs/FILE_EDIT_FIX.md` - Technical explanation of the bug and fix
- `apps/api/docs/IMPLEMENTATION_GUIDE.md` - Step-by-step implementation guide
