# AI Agent Guidelines — @oxpo/nest-kit

This file instructs AI coding assistants (Cursor, Copilot, Codeium, etc.) on
how to contribute to this repository correctly.

## Project structure

This is a **single npm package** (`@oxpo/nest-kit`) with 5 module groups:

| Module group | Directory             | Description                              |
| ------------ | --------------------- | ---------------------------------------- |
| `core`       | `packages/core/`      | Shared types, utilities, base classes    |
| `bootstrap`  | `packages/bootstrap/` | NestJS app bootstrap helpers             |
| `auth`       | `packages/auth/`      | RBAC, OAuth, SSO, JWT, API keys          |
| `saas`       | `packages/saas/`      | Orgs, teams, multi-tenancy               |
| `infra`      | `packages/infra/`     | Logger, Notification, Storage, Stripe, … |

Sub-path imports: `@oxpo/nest-kit/<group>` or `@oxpo/nest-kit/infra/<sub>`.

## Before you write code

1. Read `tsconfig.json` and `eslint.config.mjs` — respect the strict settings.
2. Read `package.json` exports map to understand the public API surface.
3. Look at existing code in the same group for style conventions.

## Code style

- **Language**: All code, comments, JSDoc, commit messages, and PR descriptions
  **must be written in English**.
- **JSDoc**: Every exported function, class, interface, and type **must** have a
  JSDoc comment describing its purpose, parameters, and return value.
- **Comments**: Use comments to explain _why_, not _what_. The code itself
  should be self-documenting.
- **Naming**: Use descriptive PascalCase for types/classes, camelCase for
  functions/variables, and kebab-case for file names.
- **Imports**: Use `import type { ... }` for type-only imports. Prefer named
  exports over default exports.

## Testing

- Every module **must** have unit tests with `*.spec.ts` naming.
- Run `npm test` before committing to verify nothing is broken.
- Aim for at least 80 % test coverage.

## Commit convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

**Types**: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`, `build`, `revert`

**Scopes**: `root`, `core`, `bootstrap`, `auth`, `saas`, `infra`, `docs`, `release`, `deps`

Examples:

- `feat(auth): add rbac guard`
- `fix(bootstrap): correct swagger theme path`
- `docs(readme): update installation guide`

## Pull requests

- Keep PRs focused on a single concern.
- Ensure CI (lint → typecheck → test) passes.

## Verification

Before finishing any task, always run:

```bash
npm run lint:check
npm run build
npm test
```
