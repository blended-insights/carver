# Text Replacement Fix Implementation Guide

## Summary of Issue

A critical bug was identified in the text replacement functionality of the API. The current implementation, which uses regex-based text replacement, fails when attempting to replace complex text patterns, particularly:

1. Template literals with backticks (`)
2. Multi-line text blocks
3. Text containing special regex characters
4. Nested escape sequences

This issue was most prominently observed when trying to update Neo4j queries in the `apps/api/src/constants/neo4j-queries.ts` file.

## Root Cause Analysis

The bug occurs in the `put.ts` file where the text replacement logic attempts to escape special regex characters with the following code:

```javascript
const escapedOldText = oldText.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
const oldTextRegex = new RegExp(escapedOldText, 'g');
```

The issue is twofold:
1. The escape pattern is incorrect, leading to double-escaping of backslashes
2. Using regex for exact string matching introduces complexity when dealing with text that contains characters with special meaning in regex

## Solution

The fix replaces the regex-based approach with native JavaScript string methods:

1. Use `String.prototype.includes()` to check if the exact text exists in the file
2. Use `String.prototype.split(oldText).join(newText)` for the replacement operation

This approach:
- Completely avoids regex escaping issues
- Treats the search text as a literal string
- Is reliable with any text pattern including template literals and backticks
- Still replaces all occurrences of the text

## Implementation Steps

1. Create a backup of the current `put.ts` file
2. Replace the current file with our updated implementation
3. Update the API documentation to reflect the changes
4. Test the fix with various text replacement scenarios

### Step 1: Backup the current implementation

```bash
cd apps/api/src/routes/projects/:projectId/files/:fileId
cp put.ts put.ts.backup
```

### Step 2: Replace with updated implementation

Replace the contents of `put.ts` with the contents of `put.updated.ts` that we've created.

```bash
cp put.updated.ts put.ts
```

### Step 3: Test the fix

Test the endpoint with a variety of complex text patterns:

1. Template literals with backticks
2. Multi-line text
3. Text with special regex characters
4. Nested escape sequences

Example test cases:

```bash
# Test case 1: Template literals with backticks
curl -X PUT \
  http://localhost:3000/projects/carver/files/apps%2Fapi%2Fsrc%2Fconstants%2Fneo4j-queries.ts \
  -H 'Content-Type: application/json' \
  -d '{
    "oldText": "  GET_DIRECTORIES_BY_PROJECT: `\n    MATCH (p:Project {name: $projectName})-[:CONTAINS*1..]->(d:Directory)\n    RETURN DISTINCT d.path AS path, d.name AS name\n    ORDER BY d.path\n  `,",
    "newText": "  GET_DIRECTORIES_BY_PROJECT: `\n    // Match the project\n    MATCH (p:Project {name: $projectName})\n    // Match directories that are within the project'\''s hierarchy\n    MATCH path = (p)-[:CONTAINS*1..]->(d:Directory)\n    // Ensure we only match directories that directly belong to this project\n    WHERE ALL(rel in relationships(path) WHERE startNode(rel):Project OR startNode(rel):Directory)\n    RETURN DISTINCT d.path AS path, d.name AS name\n    ORDER BY d.path\n  `,"
  }'

# Test case 2: Text with special regex characters
curl -X PUT \
  http://localhost:3000/projects/carver/files/apps%2Fapi%2Fsrc%2Futils%2Fregex-helper.ts \
  -H 'Content-Type: application/json' \
  -d '{
    "oldText": "export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;",
    "newText": "export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,63}$/;"
  }'

# Test case 3: Multi-line comments
curl -X PUT \
  http://localhost:3000/projects/carver/files/apps%2Fapi%2Fsrc%2Froutes%2Fprojects%2F%3AprojectId%2Ffiles%2F%3AfileId%2Fput.ts \
  -H 'Content-Type: application/json' \
  -d '{
    "oldText": "/**\n * Route handler for replacing text in a file\n * Attempts direct Redis update first, falls back to filesystem check\n */",
    "newText": "/**\n * Route handler for replacing text in a file\n * Uses exact string matching instead of regex for reliability\n * Especially improves handling of template literals, multi-line text,\n * and text with special characters.\n */"
  }'
```

## Key Changes

1. **String Matching Method**:
   - Before: `regex.test(content)` with escaped characters
   - After: `content.includes(oldText)` with direct string comparison

2. **String Replacement Method**:
   - Before: `content.replace(regex, newText)`
   - After: `content.split(oldText).join(newText)`

3. **Debug Information**:
   - Error response still includes the closest match functionality
   - Response includes the exact text that was searched for 

## Benefits

1. **Reliability**: Works with any text pattern without escaping issues
2. **Simplicity**: Uses straightforward string operations instead of complex regex
3. **Maintainability**: Code is easier to understand and maintain
4. **Improved Developer Experience**: More predictable behavior when making text replacements

## Documentation Updates

Documentation has been updated in:
1. `apps/api/README.md` - Updated endpoint description
2. `apps/api/docs/PUT_ENDPOINT_DOCS.md` - New detailed documentation
3. `apps/api/docs/FILE_EDIT_FIX.md` - Technical explanation of the bug and fix
4. `README.md` - Added to recent updates

## Conclusion

This fix addresses a critical bug in the text replacement functionality by using a more reliable approach based on exact string matching rather than regex-based matching. By eliminating the complexity of regex escaping, we've made the endpoint more robust when handling complex text patterns including template literals, backticks, and multi-line text.

The fix maintains all the existing functionality while improving reliability and predictability, especially for the complex Neo4j queries that prompted the bug report.
