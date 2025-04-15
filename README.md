# Carver

Carver is a comprehensive codebase assistant toolset that helps developers manage, monitor, and interact with their projects.

## Project Components

Carver consists of the following main components:

### API Server

**Recent Updates:**

- Removed versioning from Neo4j graph database for simpler structure (April 14, 2025)
- Made `path` property on File node unique to ensure data consistency (April 14, 2025)
- Fixed bug where Git commit operations were failing due to missing user identity (April 14, 2025)
- Fixed bug where folders endpoint returned all folders across the graph instead of only those for the specified project (April 14, 2025)
- Fixed critical bug in file text replacement that failed with template literals (April 14, 2025)
- Added command tools to MCP: carver-commands-list and carver-commands-execute (April 13, 2025)
- Fixed issue with the directory items query showing incorrect file types (April 08, 2025)
- Added GET endpoint to expose allowed commands configuration (April 13, 2025) 
- Added command execution endpoint to run npm/npx commands on project root (April 13, 2025)
- Enhanced file creation/update endpoint to store file data in Redis (April 12, 2025)
- Fixed reliability issue in the file processing queue (April 11, 2025)
- Fixed bug in directory tree query to correctly return recursive tree structure (April 10, 2025)
- Enhanced file editing endpoint for better reliability (April 10, 2025)
- Fixed bug where class methods were not being indexed as separate function nodes (April 08, 2025)

[See API Documentation](apps/api/README.md)

### MCP (Model Context Protocol) Server

The Carver MCP server provides file operations and project management capabilities over the Model Context Protocol.

**Available Tools:**

- File Operations (read, write, update, search)
- Folder Operations (create, browse)
- Git Operations (status, diff, commit, add, etc.)
- Prompt Generators (bug reports, enhancement requests)

[See MCP Documentation](apps/mcp/README.md)

### Web Dashboard

The Carver Dashboard is a user-friendly web interface for managing and monitoring file watcher processes.

**Features:**

- Real-time Updates: See file changes and watcher status in real-time
- Interactive UI: Modern, developer-focused interface
- Process Management: Start, stop, and restart watcher processes
- Folder Browsing: Browse available folders and start new watcher processes
- Status Monitoring: Monitor the status of all active watchers

[See Web Dashboard Documentation](apps/web/README.md)

## Getting Started

### Prerequisites

Before running the Carver services, make sure you have:

1. Node.js 20.x or later
2. Redis server running locally or accessible via network
3. Neo4j database running locally or accessible via network

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-organization/carver.git
   cd carver
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory with:
     ```
     REDIS_URL=redis://localhost:6379
     NEO4J_URI=bolt://localhost:7687
     NEO4J_USERNAME=neo4j
     NEO4J_PASSWORD=password
     ```

### Development

To run all services in development mode:

```bash
npm run dev
```

To run individual services:

```bash
# API Server
npx nx serve api

# MCP Server
npm run mcp:dev

# Web Dashboard
npx nx run web:serve --configuration=development
```

### Building

To build all projects:

```bash
npx nx run-many --target=build --all
```

To build a specific project:

```bash
npx nx build api
npx nx build mcp
npx nx build web
```

## Project Structure

Carver is organized as a monorepo with the following structure:

```
carver/
├── apps/
│   ├── api/                # RESTful API server
│   ├── mcp/                # Model Context Protocol server
│   └── web/                # Web dashboard
├── libs/                   # Shared libraries
├── package.json
└── nx.json
```

## Development Guides

### Code Style Guidelines

- TypeScript: Use strict typing, avoid `any`, use interfaces/types
- Imports: Group imports (external, internal), alphabetize
- Naming: camelCase for variables/functions, PascalCase for classes/interfaces/types
- Errors: Use try/catch with proper error logging
- Functions: Prefer pure functions, document with JSDoc
- Commits: Follow conventional commits (`feat`, `fix`, `docs`, `refactor`, etc.)
- Testing: Write unit tests for all functionality
- Logging: Use the shared logger utility with appropriate levels

### Commit Message Syntax

```
<type>[optional scope]: <description>
[optional body]
[optional footer(s)]
```

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

For more details, see [CLAUDE.md](CLAUDE.md)
