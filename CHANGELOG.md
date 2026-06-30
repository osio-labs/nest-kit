# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.0.1] — 2026-06-29

### Changed

- **bootstrap**: Split swagger/scalar into separate sub-paths (`@os.io/nest-kit/bootstrap/swagger`, `@os.io/nest-kit/bootstrap/scalar`)
- **bootstrap**: Inlined cache config into single `index.ts`
- **bootstrap**: Added `@nestjs/config`, `@nestjs/typeorm`, `typeorm` as optional peer deps
- **ci**: Migrated publish to OIDC-based `npm publish --provenance` (no token needed)
- **ci**: Bumped Node.js version to 24
- **lint**: Fixed all ESLint `no-unsafe-*` errors for strict mode compliance
- **test**: Fixed pre-existing bug in typeorm config spec (hardcoded `'oracle'` → `dbType`)

### Added

- `@os.io/nest-kit/bootstrap/scalar` sub-path export
- `docs/modules/bootstrap-scalar.md` documentation
- Fully automated release workflow (tag → publish with dist-tags)

### Documentation

- Updated bootstrap docs for split swagger/scalar modules
- Fixed stale package references in docs

## [0.0.1-alpha.0] — 2025-06-29

### Added

- Single-package scaffold with 5 module groups: core, bootstrap, auth, saas, infra
- Sub-path exports: `@os.io/nest-kit/<group>` and `@os.io/nest-kit/infra/<sub>`
- ESLint + Prettier configuration
- Husky + Commitlint hooks
- CI/CD via GitHub Actions
- VitePress documentation skeleton
- Contributing guide, license, and AI agent guidelines
