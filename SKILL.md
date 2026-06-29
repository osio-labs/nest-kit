# SKILL.md — Development Workflow

## 1. Architecture

This is a **single npm package** `@oxpo/nest-kit` with sub-path exports:

```
packages/
├── core/        — Shared types, utilities, base classes
├── bootstrap/   — NestJS app bootstrap helpers
├── auth/        — RBAC, OAuth, SSO, JWT, API keys
├── saas/        — Orgs, teams, multi-tenancy
└── infra/       — Logger, Notification, Storage, Stripe, Audit-log, Metrics
    ├── logger/
    ├── notification/
    ├── storage/
    ├── stripe/
    ├── audit-log/
    └── metrics/
```

## 2. Development workflow

```
npm install → code → npm run lint:check → npm run build → npm test → commit
```

### Before coding

- Read `tsconfig.json` for strictness rules
- Check `AGENTS.md` for code style rules

### During coding

- JSDoc on every public export
- `import type` for type-only imports
- Follow existing patterns in the same group

### Before committing

1. `npm run lint:check` — ESLint + Prettier
2. `npm run build` — TypeScript compilation
3. `npm test` — Jest test suite

## 3. Adding a new module

1. Create files under the appropriate `packages/<group>/` directory
2. Add the sub-path export in root `package.json` exports map
3. Update docs and this file accordingly

## 4. Release workflow

Merging to `main` triggers GitHub Actions:

1. CI runs (lint → build → test)
2. On version tag push → publish to npm

Use `npm version` to bump version before tagging.
Alpha releases use `0.x.x-alpha.x` semver.
