# Contributing to Carver CLI

Thank you for your interest in contributing to Carver CLI! This document outlines the process for contributing to the project and provides guidelines to help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
  - [Setting Up the Development Environment](#setting-up-the-development-environment)
  - [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
  - [Branching Strategy](#branching-strategy)
  - [Commit Messages](#commit-messages)
  - [Pull Requests](#pull-requests)
- [Coding Standards](#coding-standards)
  - [TypeScript Guidelines](#typescript-guidelines)
  - [ESLint and Prettier](#eslint-and-prettier)
- [Testing](#testing)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone. Be kind, patient, and constructive in your communications.

## License

By contributing to this project, you agree that your contributions will be licensed under the project's MIT License with Commons Clause, which permits free personal use but restricts commercial use. See the LICENSE file for details.

## Getting Started

### Setting Up the Development Environment

1. **Fork the repository** on GitHub.

2. **Clone your fork locally**:

   ```bash
   git clone https://github.com/YOUR-USERNAME/carver.git
   cd carver
   ```

3. **Install dependencies**:

   ```bash
   npm install
   ```

4. **Set up environment variables**:
   Copy the `.env.example` file to `.env` and update it with your own API keys and configuration settings.
   ```bash
   cp .env.example .env
   ```

### Project Structure

The project follows a typical TypeScript project structure:

```
carver/
├── src/                 # Source code
│   ├── commands/        # CLI commands
│   ├── utils/           # Utility functions
│   └── index.ts         # Entry point
├── dist/                # Compiled output (generated)
├── tests/               # Test files
├── .env                 # Environment variables (create from .env.example)
├── tsconfig.json        # TypeScript configuration
└── eslint.config.mjs    # ESLint configuration
```

## Development Workflow

### Branching Strategy

- `main` - Stable, production-ready code
- `develop` - Integration branch for active development
- Feature branches - Created from `develop` for new features or fixes

Create your feature branch from `develop`:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Build Process

The project uses TypeScript and compiles to JavaScript in the `dist/` directory:

```bash
# Clean and build the project
npm run build

# Development mode with hot reloading
npm run dev
```

### Testing

The project uses Jest for testing:

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types include:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Pull Requests

1. Ensure your code passes all linting and tests
2. Push your branch to your fork
3. Create a Pull Request against the `develop` branch
4. Provide a clear description of the changes
5. Link to any relevant issues

## Coding Standards

### TypeScript Guidelines

- Use TypeScript's type system effectively
- Minimize the use of `any` type
- Create interfaces for complex objects
- Use enums for predefined sets of values
- Document public APIs with JSDoc comments

### ESLint and Prettier

The project uses ESLint with Prettier for code linting and formatting:

```bash
# Check for linting errors
npm run lint

# Automatically fix linting errors
npm run lint:fix

# Format code with Prettier
npm run format
```

### Code Style Guidelines

We follow specific code style guidelines to maintain consistency across the codebase:

#### Strings

- **Always use double quotes** for strings, not single quotes

  ```typescript
  // ✅ Good
  const message = "Hello, world!";

  // ❌ Bad
  const message = "Hello, world!";
  ```

#### Formatting

- Use 2 spaces for indentation
- Maximum line length is 100 characters
- Use trailing commas in multiline object/array literals
- Always use parentheses around arrow function parameters
- Use semicolons after statements

These rules are enforced by our Prettier configuration (`.prettierrc`) and detailed in our [Style Guide](docs/STYLE_GUIDE.md).

### Validation

The project uses Joi for command-line argument validation. When adding new commands or options:

1. Define a schema in `src/utils/validation/schemas.ts`
2. Use the `validateOptions` function to validate command options

### Configuration

The project uses a hierarchical configuration system:

- Environment-specific configurations in `config/` directory
- `.env` file for sensitive configuration (API keys, etc.)
- Type-safe configuration access via `src/utils/config.ts`

### Logging

Use the Winston-based logger for consistent logging:

```typescript
import logger from "../utils/logger";

// Log levels: error, warn, info, debug
logger.error("Error message");
logger.warn("Warning message");
logger.info("Info message");
logger.debug("Debug message");
```

## Testing

### Jest Framework

Tests are written using Jest and are located in the `tests/` directory. The test structure mirrors the `src/` directory structure.

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

### Writing Tests

- Create test files with `.test.ts` extension
- Use descriptive `describe` and `it` blocks
- Mock external services (OpenAI, Neo4j) in tests
- Aim for at least 70% code coverage

Example test structure:

```typescript
describe("MyFunction", () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it("should do something specific", () => {
    // Test
    expect(result).toBe(expected);
  });
});
```

## Documentation

### API Documentation

The project uses TypeDoc to generate API documentation:

```bash
# Generate documentation
npm run docs
```

This will create documentation in the `docs/` directory.

### JSDoc Comments

Use JSDoc comments for all public functions, classes, and interfaces:

```typescript
/**
 * Performs an action with the specified parameters
 *
 * @param param1 - Description of the first parameter
 * @param param2 - Description of the second parameter
 * @returns Description of the return value
 * @throws Description of potential errors
 */
function myFunction(param1: string, param2: number): boolean {
  // Implementation
}
```

### README Updates

Keep the README.md updated with the latest features, examples, and usage instructions.

## Continuous Integration

The project uses GitHub Actions for continuous integration and deployment:

- CI workflow runs on each push and pull request
- Tests, linting, and builds are verified
- Documentation is automatically generated and published

## Release Process

The project uses semantic-release for automated versioning and releases:

1. Merge changes into the `main` branch
2. CI automatically determines the next version based on commit messages
3. CHANGELOG.md is automatically updated
4. A new GitHub release is created

To trigger specific release types:

- `feat: ...` - Minor version bump (new feature)
- `fix: ...` - Patch version bump (bug fix)
- `BREAKING CHANGE: ...` - Major version bump (breaking change)

## Issue Reporting

When reporting issues, please include:

1. Description of the issue
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Environment information (OS, Node.js version, etc.)
6. Screenshots or logs (if applicable)

## Feature Requests

For feature requests, please provide:

1. Clear description of the feature
2. Rationale for adding the feature
3. Examples of how the feature would be used
4. Any relevant references or research

---

Thank you for contributing to Carver CLI! Your efforts help make this tool better for everyone.
