# Module Overview

**Package:** [`@os.io/nest-kit`](https://www.npmjs.com/package/@os.io/nest-kit)

All modules are importable from the package root or via sub-path exports (infra, auth).

## Implemented

| Import path                     | Description                                      | Doc                                                                                 |
| ------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `@os.io/nest-kit/bootstrap`     | Swagger, Cache, TypeORM, Queue                   | [Docs](./bootstrap-openapi), [Docs](./bootstrap-cache), [Docs](./bootstrap-typeorm) |
| `@os.io/nest-kit/auth`          | RBAC, OAuth, SSO, JWT, API keys                  | [Docs](./auth)                                                                      |
| `@os.io/nest-kit/infra/storage` | Multi-disk file storage (local, S3, GCS, memory) | [Docs](./infra-storage)                                                             |
| `@os.io/nest-kit/infra/excel`   | Excel import & export with exceljs               | [Docs](./infra-excel)                                                               |
| `@os.io/nest-kit/infra/stripe`  | Stripe webhooks, subscriptions, payments         | [Docs](./infra-stripe)                                                              |
| `@os.io/nest-kit/infra/logger`  | Structured logging (Pino)                        | [Docs](./infra-logger)                                                              |

## Coming Soon

| Import path                     | Description                           |
| ------------------------------- | ------------------------------------- |
| `@os.io/nest-kit` (or `./core`) | Shared types, utilities, base classes |

| `@os.io/nest-kit/saas` | Orgs, teams, multi-tenancy |
| `@os.io/nest-kit/infra` | Infrastructure integrations |
| `@os.io/nest-kit/infra/notification` | Email, SMS, Push, in-app |
| `@os.io/nest-kit/infra/audit-log` | Audit trails, data change capture |
| `@os.io/nest-kit/infra/metrics` | Prometheus, OpenTelemetry, health checks |
