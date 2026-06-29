# Module Overview

This is a **single npm package** `@oxpo/nest-kit` with tree-shakeable
sub-path exports. Use only what you need.

| Import path                         | Description                              |
| ----------------------------------- | ---------------------------------------- |
| `@oxpo/nest-kit` (or `./core`)      | Shared types, utilities, base classes    |
| `@oxpo/nest-kit/bootstrap`          | NestJS app bootstrap helpers             |
| `@oxpo/nest-kit/auth`               | RBAC, OAuth, SSO, JWT, API keys          |
| `@oxpo/nest-kit/saas`               | Orgs, teams, multi-tenancy               |
| `@oxpo/nest-kit/infra`              | Infrastructure integrations              |
| `@oxpo/nest-kit/infra/logger`       | Structured logging (Pino, Winston)       |
| `@oxpo/nest-kit/infra/notification` | Email, SMS, Push, in-app                 |
| `@oxpo/nest-kit/infra/storage`      | S3, GCS, Azure, local filesystem         |
| `@oxpo/nest-kit/infra/stripe`       | Stripe webhooks, subscriptions           |
| `@oxpo/nest-kit/infra/audit-log`    | Audit trails, data change capture        |
| `@oxpo/nest-kit/infra/metrics`      | Prometheus, OpenTelemetry, health checks |
