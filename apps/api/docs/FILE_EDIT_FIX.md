# File Text Replacement Fix

## Issue Summary

A bug was discovered in the text replacement functionality (`PUT /projects/:projectId/files/:fileId`) where valid text replacements were failing with the error:

```
"Failed to update file apps/api/src/constants/neo4j-queries.ts (Status: 400): Text to replace not found in file apps/api/src/constants/neo4j-queries.ts"
```

This issue was particularly problematic when trying to replace text containing template literals with backticks and complex query strings, such as those found in the Neo4j query files.

## Root Cause

The issue was in the regex escaping logic used in `put.ts`. The current implementation attempts to escape special regex characters in the search text, but has problems with complex escape sequences, especially when the text involves:

1. Template literals with backticks (`)
2. Multiple lines of text
3. Nested escape sequences
4. Special regex characters that need proper escaping

The problematic code was:

```javascript
// Use regex for more robust matching
const escapedOldText = oldText.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
const oldTextRegex = new RegExp(escapedOldText, 'g');

// Check if the text to replace exists in the content using regex
if (!oldTextRegex.test(content)) {
  // Error handling...
}

// Perform the replacement
const updatedContent = content.replace(oldTextRegex, newText);
```

The regex pattern for escaping special characters was incorrectly handling backslashes, leading to doubled escapes that didn't match the actual file content.

## Solution

The fix simplifies the approach by using native JavaScript string methods instead of regular expressions for the initial text matching and replacement:

1. Replace regex-based search with `String.prototype.includes()`
2. Replace regex-based replacement with `String.prototype.split().join()`

New code:

```javascript
// Use direct string matching instead of regex for exact matches
// This avoids issues with special regex characters and complex escape sequences
if (!content.includes(oldText)) {
  // Error handling...
}

// Perform the replacement (using string split/join to ensure all occurrences are replaced)
// This avoids regex escaping issues entirely
const updatedContent = content.split(oldText).join(newText);
```

This approach:
- Ensures exact string matching without regex interpretation
- Avoids all issues with escaping special characters
- Correctly handles multi-line text, template literals, and nested escape sequences
- Still replaces all occurrences of the search text

## Implementation

The fix has been implemented in `put-fixed.ts` and should be reviewed and merged to replace the current implementation in `put.ts`.

## Testing

The fix was tested with the following scenarios:

1. Replacing text in the Neo4j queries file that contains template literals with backticks
2. Replacing multi-line text with special regex characters
3. Replacing strings with nested escape sequences
4. Standard single-line text replacements

All test cases succeeded with the new implementation.

## Impact and Documentation Updates

This fix improves the reliability of the text replacement feature, especially for complex files with template literals and special characters. The API documentation should be updated to reflect that the text replacement endpoint now uses exact string matching rather than regex-based matching.

Corresponding documentation has been updated in the API README to clarify the behavior of the text replacement endpoint.
