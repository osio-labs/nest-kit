# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

[unreleased]: https://github.com/osio-labs/nest-kit/compare/v0.0.3...HEAD
[0.0.3]: https://github.com/osio-labs/nest-kit/releases/tag/v0.0.3
[0.0.2]: https://github.com/osio-labs/nest-kit/releases/tag/v0.0.2
[0.0.1]: https://github.com/osio-labs/nest-kit/releases/tag/v0.0.1

---

## [0.0.3] — 2026-07-05

### Added

- **infra/webhook**: Incoming & outgoing webhooks with HMAC signing, exponential backoff retry, circuit breaker, event bus, BullMQ queue, TypeORM persistence, and 5 adapters (GitHub, GitLab, Stripe, Sentry, Slack)
- **infra/rate-limit**: Multi-adapter rate limiting (memory, Redis, database, cache). Decorator-based, per-route and per-identifier, sliding window / token bucket
- **infra/metrics**: Prometheus metrics (counters, histograms, gauges, summaries). Push/Pull modes, request timing, custom metric decorators
- **infra/notification**: Multi-adapter, multi-channel notification system — email (SES, SendGrid), SMS (Twilio), push (FCM), in-app. Template rendering, channel routing, deduplication, delivery status
- **infra/activity-feed**: Multi-adapter activity feeds (in-memory, Redis, database). Fan-out on write / on read, notification triggers
- **infra/audit-log**: Track entity changes with diff storage, queryable audit trail, retention policies
- **infra/logger**: Structured logging (Pino) with correlation IDs, log levels, redaction, console/file/external transports
- **infra/storage**: Unified file API — local filesystem, S3-compatible, GCS, Azure Blob. Streaming upload/download, signed URLs, directory management
- **infra/stripe**: Stripe SDK wrapper with typed methods, webhook handling with signature verification, idempotency support
- **infra/excel**: Import/export Excel files (XLSX/CSV) with schema validation, streaming large files
- **auth/api-key**: API key authentication with `ApiKeyAuthGuard`, `@ApiKey()` decorator, key generation/validation with hashed storage and scoped permissions
- **bootstrap/queue**: BullMQ queue bootstrapper with `configQueue` / `configQueueAsync` — Redis/Valkey connection, auto-removal defaults, per-queue registration, `FlowProducer` support

### Documentation

- Added docs for all new infra modules (webhook, rate-limit, metrics, notification, activity-feed, audit-log, logger, storage, stripe, excel)
- Added docs for auth/api-key and bootstrap/queue
- Added docs changelog page

## [0.0.2] — 2026-07-02

### Added

- **auth**: Core authentication and authorization interfaces (`IAuthConfig`, `IAuthService`, `IAuthGuard`, `IAuthSession`, etc.)
- **auth/rbac**: Role-based access control with `@Roles()` decorator, `RolesGuard`
- **auth/pbac**: Policy-based access control with `@Policies()` decorator, `PoliciesGuard`
- **auth/decorators**: `@CurrentUser()`, `@Public()`, `@Auth()` decorators
- **auth/guards**: `JwtAuthGuard`, `OptionalAuthGuard`
- **auth/password**: `PasswordService` — bcrypt-based hashing and verification
- **auth/session**: `SessionManager` — JWT token management, device sessions, token blacklisting, refresh token rotation
- **auth/throttling**: `AuthThrottleGuard` — rate-limits login attempts per identifier
- **auth/strategies**: `JwtStrategy`, `ApiKeyStrategy`, `OAuthStrategy` — pluggable authentication strategies
- **auth/module**: `AuthModule` with `AuthService`, `SessionService`, `TokenService`

### Fixed

- Token blacklist TTL cleanup on expiry, device session conflict on concurrent login
- Missing `passReqToCallback` option propagation in auth strategies
- Hash comparison error handling for invalid salt in password service

## [0.0.1] — 2026-07-01

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
