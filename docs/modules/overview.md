# Module Overview

This is a **single npm package** `@os.io/nest-kit` with tree-shakeable
sub-path exports. Use only what you need.

| Import path                          | Description                              |
| ------------------------------------ | ---------------------------------------- |
| `@os.io/nest-kit` (or `./core`)      | Shared types, utilities, base classes    |
| `@os.io/nest-kit/bootstrap`          | NestJS app bootstrap helpers             |
| `@os.io/nest-kit/bootstrap/swagger`  | Swagger API Doc config                   |
| `@os.io/nest-kit/bootstrap/scalar`   | Scalar API Reference config              |
| `@os.io/nest-kit/bootstrap/cache`    | CacheModule setup                        |
| `@os.io/nest-kit/bootstrap/typeorm`  | TypeORM setup, CRUD factories, UoW       |
| `@os.io/nest-kit/auth`               | RBAC, OAuth, SSO, JWT, API keys          |
| `@os.io/nest-kit/saas`               | Orgs, teams, multi-tenancy               |
| `@os.io/nest-kit/infra`              | Infrastructure integrations              |
| `@os.io/nest-kit/infra/logger`       | Structured logging (Pino, Winston)       |
| `@os.io/nest-kit/infra/notification` | Email, SMS, Push, in-app                 |
| `@os.io/nest-kit/infra/storage`      | S3, GCS, Azure, local filesystem         |
| `@os.io/nest-kit/infra/stripe`       | Stripe webhooks, subscriptions           |
| `@os.io/nest-kit/infra/audit-log`    | Audit trails, data change capture        |
| `@os.io/nest-kit/infra/metrics`      | Prometheus, OpenTelemetry, health checks |
| `@os.io/nest-kit/infra/excel`        | Export arrays of objects to .xlsx        |
