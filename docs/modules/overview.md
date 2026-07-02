# Module Overview

**Package:** [`@os.io/nest-kit`](https://www.npmjs.com/package/@os.io/nest-kit)

This is a **single npm package** with tree-shakeable sub-path exports.
Use only what you need.

## Implemented

| Import path                         | Description                                      | Doc                         |
| ----------------------------------- | ------------------------------------------------ | --------------------------- |
| `@os.io/nest-kit/bootstrap/swagger` | Swagger API Doc config                           | [Docs](./bootstrap-swagger) |
| `@os.io/nest-kit/bootstrap/scalar`  | Scalar API Reference config                      | [Docs](./bootstrap-scalar)  |
| `@os.io/nest-kit/bootstrap/cache`   | CacheModule setup                                | [Docs](./bootstrap-cache)   |
| `@os.io/nest-kit/bootstrap/typeorm` | TypeORM setup, CRUD factories, UoW               | [Docs](./bootstrap-typeorm) |
| `@os.io/nest-kit/auth`              | RBAC, OAuth, SSO, JWT, API keys                  | [Docs](./auth)              |
| `@os.io/nest-kit/infra/storage`     | Multi-disk file storage (local, S3, GCS, memory) | [Docs](./infra-storage)     |
| `@os.io/nest-kit/infra/excel`       | Excel import & export with exceljs               | [Docs](./infra-excel)       |

## Coming Soon

| Import path                          | Description                              |
| ------------------------------------ | ---------------------------------------- |
| `@os.io/nest-kit` (or `./core`)      | Shared types, utilities, base classes    |
| `@os.io/nest-kit/bootstrap`          | NestJS app bootstrap helpers             |
| `@os.io/nest-kit/saas`               | Orgs, teams, multi-tenancy               |
| `@os.io/nest-kit/infra`              | Infrastructure integrations              |
| `@os.io/nest-kit/infra/logger`       | Structured logging (Pino, Winston)       |
| `@os.io/nest-kit/infra/notification` | Email, SMS, Push, in-app                 |
| `@os.io/nest-kit/infra/stripe`       | Stripe webhooks, subscriptions           |
| `@os.io/nest-kit/infra/audit-log`    | Audit trails, data change capture        |
| `@os.io/nest-kit/infra/metrics`      | Prometheus, OpenTelemetry, health checks |
