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
- Services in `packages/shared/src/services`
- UI components in `packages/web/src/components`
- Watcher APIs in `packages/watcher/src/app/routes`