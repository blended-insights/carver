# Git REST API Documentation

This document outlines the Git REST API endpoints implemented in the Carver API.

## Overview

The Git API provides RESTful endpoints for interacting with git repositories under the `/projects/{projectId}/git` path. These endpoints allow clients to perform common git operations like viewing repository status, adding files to staging, viewing diffs, creating and switching branches, committing changes, and viewing commit logs.

## Base Path

All Git API endpoints are under:

```
/projects/{projectId}/git
```

Where `{projectId}` is the identifier for the project.

## Environment Variables

- `USER_MOUNT`: Base directory where project repositories are stored. The full path to a repository is constructed as `USER_MOUNT/{projectId}`.

## Endpoints

### Status

- **GET** `/projects/{projectId}/git/status`
  - Returns the current git status of the repository
  - Response: Object containing status information (current branch, modified files, etc.)

### Add

- **POST** `/projects/{projectId}/git/add`
  - Stages files for commit
  - Request Body:
    ```json
    {
      "files": ["file1.txt", "file2.js", "src/*.ts"]
    }
    ```
  - Response: Result of the add operation

### Diff

- **GET** `/projects/{projectId}/git/diff`
  - Shows unstaged changes (working directory vs index)
  - Response: Changes in diff format

- **GET** `/projects/{projectId}/git/diff/staged`
  - Shows staged changes (index vs HEAD)
  - Response: Changes in diff format

### Commits

- **POST** `/projects/{projectId}/git/commits`
  - Creates a new commit
  - Request Body:
    ```json
    {
      "message": "Commit message here"
    }
    ```
  - Response: Information about the created commit

- **GET** `/projects/{projectId}/git/commits/{revision}`
  - Gets information about a specific commit
  - Path Parameters:
    - `revision`: Commit hash or reference
  - Response: Detailed commit information

### Logs

- **GET** `/projects/{projectId}/git/logs`
  - Returns commit logs
  - Query Parameters:
    - `maxCount`: Maximum number of commits to return (default: 10)
  - Response: Commit history information

### Branches

- **POST** `/projects/{projectId}/git/branches`
  - Creates a new branch
  - Request Body:
    ```json
    {
      "name": "feature-branch",
      "baseBranch": "main" // Optional
    }
    ```
  - Response: Information about the branch creation

- **POST** `/projects/{projectId}/git/branches/{branchName}`
  - Checks out the specified branch
  - Path Parameters:
    - `branchName`: Name of the branch to check out
  - Response: Information about the checkout operation

### Reset

- **POST** `/projects/{projectId}/git/reset`
  - Unstages all changes (git reset HEAD)
  - Response: Information about the reset operation

## Response Format

All endpoints return responses in the following format:

```json
{
  "success": true,
  "data": {
    // Operation-specific response data
  }
}
```

Or in case of an error:

```json
{
  "success": false,
  "message": "Error message"
}
```

## Examples

### Getting Repository Status

Request:
```
GET /projects/my-project/git/status
```

Response:
```json
{
  "success": true,
  "data": {
    "current": "main",
    "tracking": "origin/main",
    "files": [
      {
        "path": "src/main.ts",
        "working_dir": "modified"
      }
    ],
    "not_added": [
      "new-file.txt"
    ],
    "modified": [
      "src/main.ts"
    ]
  }
}
```

### Creating a Commit

Request:
```
POST /projects/my-project/git/commits
```

Request Body:
```json
{
  "message": "Fix bug in authentication middleware"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "commit": "a1b2c3d4e5f6",
    "summary": {
      "changes": 3,
      "insertions": 10,
      "deletions": 5
    }
  }
}
```

## Implementation Details

The Git API is implemented using the `simple-git` npm package, which provides a Node.js wrapper around git command-line operations.

The API follows a consistent pattern:
1. Extract request parameters
2. Build the full project path using the `USER_MOUNT` environment variable
3. Call the appropriate git service method
4. Return a standardized response

All operations are properly logged and include error handling.