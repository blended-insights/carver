# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- Build all: `npx nx run-many --target=build --all`
- Lint all: `npx nx run-many --target=lint --all`
- Run tests: `npx nx run-many --target=test --all`
- Single test: `npx nx test [package] --testFile=[path]` (e.g., `npx nx test watcher --testFile=src/tests/watcher.spec.ts`)
- Development: `npm run dev` (runs watcher & web together)
- TypeCheck: `npx nx run-many --target=typecheck --all`

## Code Style Guidelines

- Typescript: Use strict typing, avoid `any`, use interfaces/types
- Imports: Group imports (external, internal), alphabetize
- Naming: camelCase for variables/functions, PascalCase for classes/interfaces/types
- Errors: Use try/catch with proper error logging
- Functions: Prefer pure functions, document with JSDoc
- Commits: Follow conventional commits (`feat`, `fix`, `docs`, `refactor`, etc.)
- Testing: Write unit tests for all functionality
- Logging: Use the shared logger utility with appropriate levels

## Architecture

- Services in `apps/watcher/src/services`
- UI components in `apps/web/src/components`
- Watcher APIs in `apps/watcher/src/app/routes`

## Commit Message Syntax

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
