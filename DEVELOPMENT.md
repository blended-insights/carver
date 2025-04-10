# Development Guide

This guide provides detailed information for developers working on the Carver CLI project.

## Project Architecture

### Directory Structure

TODO

## Setup Development Environment

### Prerequisites

- Node.js 20.x or higher
- npm 7.x or higher
- Docker and Docker Compose (for running Neo4j and Redis)
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/blended-insights/carver.git
cd carver

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your API keys and credentials

# Start the required services with Docker Compose
docker-compose up -d
```

## Docker Compose Services

The project uses Docker Compose to manage Neo4j and Redis services:

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Reset data
docker-compose down -v
```

### Neo4j Service

- **Port**: 7687 (Bolt), 7474 (HTTP)
- **Default credentials**: neo4j/password123
- **Data persistence**: Volume `neo4j_data`

### Redis Service

- **Port**: 6379
- **Data persistence**: Volume `redis_data`

You can access the Neo4j browser at http://localhost:7474 to view and query the graph database.

## Development Workflow

### Local Development

```bash
# Run in development mode (with hot reloading)
npm run dev

# Build the project
npm run build

# Run tests
npm test
```

### Adding a New Command

1. Create a new file in `src/commands/`
2. Define validation schema in `src/utils/validation/schemas.ts`
3. Register the command in `src/index.ts`
4. Add tests in `tests/commands/`

Example command structure:

```typescript
import { OptionValues } from "commander";
import { validateOptions, myCommandSchema } from "../utils/validation/schemas";
import logger from "../utils/logger";

export async function myCommand(opts: OptionValues): Promise<void> {
  try {
    // Validate options
    const validatedOpts = validateOptions(opts, myCommandSchema);

    // Command implementation
    logger.info("Command executed with options:", validatedOpts);

    // Return or display results
    console.log("Command completed successfully");
  } catch (error) {
    logger.error("Command failed:", error);
    process.exit(1);
  }
}
```

## Configuration System

### Configuration Files

- `config/default.js` - Base configuration for all environments
- `config/development.js` - Development environment overrides
- `config/production.js` - Production environment overrides

### Environment Variables

Critical configuration is stored in environment variables:

- `OPENAI_API_KEY` - Your OpenAI API key
- `NEO4J_URI` - Neo4j database URI
- `NEO4J_USERNAME` - Neo4j username
- `NEO4J_PASSWORD` - Neo4j password
- `GITHUB_TOKEN` - GitHub personal access token
- `NODE_ENV` - Environment (`development`, `production`)

### Accessing Configuration

```typescript
import config from "../utils/config";

// Get the entire configuration
const appConfig = config;

// Access specific settings
const openaiModel = appConfig.openai.model;
const neo4jUrl = appConfig.neo4j.url;
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Structure

- Tests are in the `tests/` directory
- File structure mirrors the `src/` directory
- Use Jest matchers and assertions
- Mock external dependencies

### Mocking External Services

Example of mocking OpenAI:

```typescript
// Mock the OpenAI module
jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: "Mocked response",
                },
              },
            ],
          }),
        },
      },
    };
  });
});
```

## Logging

The project uses Winston for structured logging:

- `logger.error()` - Error messages (highest severity)
- `logger.warn()` - Warning messages
- `logger.info()` - Informational messages (default level)
- `logger.debug()` - Debug messages (lowest severity)

Log files are written to the `logs/` directory:

- `combined.log` - All log messages
- `error.log` - Error messages only

## Documentation

### Generating Documentation

```bash
# Generate documentation
npm run docs
```

Documentation is generated using TypeDoc and saved to the `docs/` directory.

### Writing Documentation

- Use JSDoc comments for functions, classes, and interfaces
- Include examples where appropriate
- Document function parameters and return values

## Continuous Integration

GitHub Actions workflows:

- `ci.yml` - Runs on each push and pull request
- `release.yml` - Handles semantic versioning and releases
- `npm-ci.yml` - Updates package-lock.json after dependency changes

## Troubleshooting

Common issues and solutions:

- **TypeScript compilation errors**: Run `npm run lint:fix` to fix common issues
- **Jest test failures**: Check for proper mocking of external services
- **Configuration issues**: Verify your `.env` file contains all required variables
- **Git hooks not working**: Run `npm run prepare-husky` to reinstall Husky
