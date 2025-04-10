# Contributing to Carver

Thank you for your interest in contributing to Carver! This document outlines the process for contributing to the project and provides guidelines to help you get started.

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

Carver is an NX monorepo with multiple apps:

```
carver/
├── apps/                # NX apps
│   ├── web/                 # Next.js web application
│   ├── watcher/             # File watcher service
│   ├── shared/              # Shared utilities and types
│   ├── watcher-e2e/         # End-to-end tests for watcher
│   └── web-e2e/             # End-to-end tests for web
├── node_modules/            # Project dependencies
├── dist/                    # Compiled output (generated)
├── nx.json                  # NX configuration
├── tsconfig.json            # TypeScript base configuration
└── package.json             # Workspace root package.json
```

### Next.js Project Structure

The web application follows the Next.js App Router convention:

```
apps/web/
├── src/                 
│   ├── app/             # Next.js App Router structure
│   │   ├── api/         # API routes
│   │   ├── layout.tsx   # Root layout component
│   │   └── page.tsx     # Home page component
│   ├── components/      # Reusable React components
│   ├── hooks/           # Custom React hooks
│   └── utils/           # Utility functions
├── public/              # Static assets
├── next.config.js       # Next.js configuration
└── package.json         # Package-specific dependencies
```

## Development Workflow

### Using NX Commands

Carver uses NX to manage the workspace. Common commands include:

```bash
# Run all projects in development mode
npm run dev

# Run only the web project in development mode
npm run dev:web

# Run only the watcher project in development mode
npm run dev:watcher

# Build a specific project
npx nx build web
npx nx build watcher

# Run tests for a specific project
npx nx test web
npx nx test watcher

# Run linting for a specific project
npx nx lint web
```

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
# Check for linting errors across all projects
npx nx run-many --target=lint --all

# Lint a specific project
npx nx lint web

# Format code with Prettier
npx nx format:write
```

### Code Style Guidelines

We follow specific code style guidelines to maintain consistency across the codebase:

#### Strings

- **Always use double quotes** for strings, not single quotes

  ```typescript
  // ✅ Good
  const message = "Hello, world!";

  // ❌ Bad
  const message = 'Hello, world!';
  ```

#### Formatting

- Use 2 spaces for indentation
- Maximum line length is 100 characters
- Use trailing commas in multiline object/array literals
- Always use parentheses around arrow function parameters
- Use semicolons after statements

These rules are enforced by our Prettier configuration (`.prettierrc`) and detailed in our [Style Guide](docs/STYLE_GUIDE.md).

## Testing

### Test Frameworks

The project uses Jest for unit tests and Playwright for end-to-end tests:

```bash
# Run Jest tests for all projects
npx nx run-many --target=test --all

# Run tests for a specific project
npx nx test web

# Run end-to-end tests
npx nx e2e web-e2e
npx nx e2e watcher-e2e
```

### Writing Tests

- Create test files with `.spec.ts` or `.test.ts` extension
- Use descriptive `describe` and `it` blocks
- Mock external services where appropriate
- Aim for comprehensive test coverage

Example test structure:

```typescript
describe("MyComponent", () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it("should render correctly", () => {
    // Test
    expect(result).toBe(expected);
  });
});
```

## Documentation

### Code Documentation

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

Keep the README.md and package-specific README files updated with the latest features, examples, and usage instructions.

## Continuous Integration

The project uses GitHub Actions for continuous integration and deployment:

- CI workflow runs on each push and pull request
- Tests, linting, and builds are verified
- Documentation is automatically generated and published

## Release Process

The project uses NX release for automated versioning and releases:

```bash
# Release with automatic versioning
npx nx release

# Dry run to see what would happen
npx nx release --dry-run
```

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

Thank you for contributing to Carver! Your efforts help make this tool better for everyone.
