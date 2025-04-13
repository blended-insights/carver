# Summary of Refactoring

This PR introduces a comprehensive refactoring of the API client structure to improve maintainability and organization:

## Changes

1. Split the monolithic `api.ts` into:
   - `api/client.ts` - Core API client with improved error handling
   - `api/file.ts` - File operations
   - `api/folder.ts` - Folder operations
   - `api/git.ts` - Git operations
   - `api/project.ts` - Project operations
   - `api/index.ts` - Exports and unified API client
   - `api/types.ts` - Shared type definitions

2. Enhanced error handling:
   - Created custom `ApiError` class for better error details
   - Added standardized error handling utility for tools
   - Improved error messages with context

3. Updated all tool files to:
   - Use the new API client structure
   - Implement consistent error handling
   - Provide better formatted responses

## Benefits

- Improved separation of concerns
- Better code maintainability
- Enhanced error reporting for debugging
- Consistent interface and response structure
- Namespaced API operations for better discovery

## Breaking Changes

None - The refactoring maintains backward compatibility through re-exports in the original `api.ts` file.
