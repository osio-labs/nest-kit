# Changelog

<!--
Format: https://keepachangelog.com/en/1.1.0/
Types: feat, fix, chore, docs, refactor, test, style, perf, ci, build, revert
-->

## [Unreleased]

### Added

_No unreleased changes yet._

---

## [0.0.3] — 2026-07-05

### Added

#### Infrastructure (`@os.io/nest-kit/infra/*`)

- **infra/webhook**: incoming & outgoing webhook handling with HMAC signing, exponential backoff retry, circuit breaker, event bus, BullMQ queue, TypeORM persistence, and 5 source-specific adapters (GitHub, GitLab, Stripe, Sentry, Slack). (@os.io/nest-kit/infra/webhook)
- **infra/rate-limit**: multi-adapter rate limiting — memory, Redis, database, cache. Decorator-based, per-route and per-identifier, sliding window / token bucket. (@os.io/nest-kit/infra/rate-limit)
- **infra/metrics**: Prometheus metrics (counters, histograms, gauges, summaries). Push/Pull modes, request timing, custom metric decorators. (@os.io/nest-kit/infra/metrics)
- **infra/notification**: multi-adapter, multi-channel notification system with providers (email, SMS, push, in-app) and channel routing. (@os.io/nest-kit/infra/notification)
- **infra/activity-feed**: multi-adapter activity feeds (in-memory, Redis, database). Fan-out on write / on read, notification triggers. (@os.io/nest-kit/infra/activity-feed)
- **infra/audit-log**: track entity changes (who, what, when) with diff storage, queryable audit trail, retention policies. (@os.io/nest-kit/infra/audit-log)
- **infra/logger**: structured logging with `LoggerService` — console, file, external transports. Correlation IDs, log levels, redaction. (@os.io/nest-kit/infra/logger)
- **infra/storage**: multi-adapter file storage — local filesystem, S3-compatible, GCS, Azure Blob. Streaming upload/download, signed URLs, directory management. (@os.io/nest-kit/infra/storage)
- **infra/stripe**: Stripe integration — `StripeService` wrapping Stripe SDK with typed methods, webhook handling with signature verification, idempotency support. (@os.io/nest-kit/infra/stripe)
- **infra/excel**: import/export Excel files (XLSX/CSV) with `ExcelService`, schema validation, streaming large files. (@os.io/nest-kit/infra/excel)

#### Authentication

- **auth/api-key**: API key authentication and authorization — `ApiKeyAuthGuard`, `@ApiKey()` decorator, key generation/validation with hashed storage and scoped permissions. (@os.io/nest-kit/auth/api-key)

#### Bootstrap

- **bootstrap/queue**: `configQueue` / `configQueueAsync` — BullMQ queue bootstrapper with Redis/Valkey, auto-removal defaults, queue registration, `FlowProducer` support. (@os.io/nest-kit/bootstrap/queue)

---

## [0.0.2] — 2026-07-02

### Added

- **auth/interfaces**: core interfaces for authentication and authorization (`IAuthConfig`, `IAuthService`, `IAuthGuard`, `IAuthSession`, etc.).
- **auth/authorization**:
  - RBAC — role-based access control with `@Roles()` decorator, `RolesGuard`.
  - PBAC — policy-based access control with `@Policies()` decorator, `PoliciesGuard`.
- **auth/decorators & guards**: `@CurrentUser()`, `@Public()`, `@Auth()` decorators; `JwtAuthGuard`, `OptionalAuthGuard`.
- **auth/password**: `PasswordService` — bcrypt-based hashing and verification with salt rounds config.
- **auth/session**: `SessionManager` — JWT token management, device sessions, token blacklisting, refresh token rotation.
- **auth/throttling**: `AuthThrottleGuard` — rate-limits login attempts per identifier (email, IP, etc.).
- **auth/strategies**: `JwtStrategy`, `ApiKeyStrategy`, `OAuthStrategy` — pluggable authentication strategies.
- **auth/module & services**: `AuthModule` with `AuthService`, `SessionService`, `TokenService` — integrates all auth components.

### Changed

- Auth module re-exported via `@os.io/nest-kit/auth/*` sub-path imports.

### Fixed

- `auth/session`: token blacklist TTL cleanup on expiry, device session conflict on concurrent login.
- `auth/strategies`: missing `passReqToCallback` option propagation.
- `auth/password`: hash comparison error handling for invalid salt.

---

## [0.0.1] — 2026-07-01

### Added

- **bootstrap/swagger**: `configSwagger` / `configSwaggerAsync` — Swagger/OpenAPI setup from env vars. Theming, custom CSS, CDN, server URLs, persist authorization.
- **bootstrap/scalar**: `configScalar` / `configScalarAsync` — Scalar API reference UI configuration.
- **bootstrap/cache**: `configCache` / `configCacheAsync` — Cache module with memory (KeyvCacheableMemory), Redis (@keyv/redis), Valkey (@keyv/valkey), multi-store, and RDS TLS support.
- **bootstrap/typeorm**: `configTypeOrm` / `configTypeOrmAsync` — TypeORM connection setup with env vars, RDS mode, IAM auth, CRUD factories (`createCrudService`, `createCrudController`), and Unit of Work with `@Transactional()` decorator.
- **package**: `@os.io/nest-kit` npm package with sub-path exports for `bootstrap/*`.

---

## [0.0.3] — Unreleased

### Added

#### Infrastructure (`@os.io/nest-kit/infra/*`)

- **infra/excel**: import/export Excel files (XLSX/CSV) with `ExcelService`, schema validation, streaming large files.
- **infra/storage**: multi-adapter file storage — local filesystem, S3-compatible, GCS, Azure Blob. Streaming upload/download, signed URLs, directory management.
- **infra/stripe**: Stripe integration — `StripeService` wrapping Stripe SDK with typed methods, webhook handling with signature verification, idempotency support.
- **infra/logger**: structured logging with `LoggerService` — console, file, external transports. Correlation IDs, log levels, redaction.
- **infra/audit-log**: `AuditLogService` — track entity changes (who, what, when) with diff storage, queryable audit trail, retention policies.
- **infra/metrics**: `MetricsService` — Prometheus metrics (counters, histograms, gauges, summaries). Request timing, custom metric decorators. Push/Pull modes.
- **infra/activity-feed**: `ActivityFeedService` — multi-adapter activity feeds (in-memory, Redis, database). Fan-out on write / on read, notification triggers.
- **infra/rate-limit**: `RateLimitGuard` — multi-adapter rate limiting (memory, Redis, database). Decorator-based, per-route and per-identifier, sliding window / token bucket.
- **infra/notification**: `NotificationService` — multi-adapter, multi-channel notification with providers (email, SMS, push, in-app). Template rendering, channel routing, deduplication, delivery status tracking.

#### Authentication

- **auth/api-key**: API key authentication and authorization — `ApiKeyAuthGuard`, `@ApiKey()` decorator, key generation/validation with hashed storage and scoped permissions.

#### Bootstrap

- **bootstrap/queue**: `configQueue` / `configQueueAsync` — BullMQ queue bootstrapper with Redis/Valkey, auto-removal defaults, queue registration, `FlowProducer` support.

[unreleased]: https://github.com/osio-labs/nest-kit/compare/v0.0.3...HEAD
[0.0.3]: https://github.com/osio-labs/nest-kit/releases/tag/v0.0.3
[0.0.2]: https://github.com/osio-labs/nest-kit/releases/tag/v0.0.2
[0.0.1]: https://github.com/osio-labs/nest-kit/releases/tag/v0.0.1
