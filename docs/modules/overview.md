# Module Overview

**Package:** [`@os.io/nest-kit`](https://www.npmjs.com/package/@os.io/nest-kit)

All modules are importable from the package root or via sub-path exports (infra, auth).

## Implemented

| Import path                           | Description                                      | Docs                                                                                       |
| ------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `@os.io/nest-kit/bootstrap`           | Swagger, Cache, TypeORM, Queue                   | [OpenAPI](./bootstrap-openapi), [Cache](./bootstrap-cache), [TypeORM](./bootstrap-typeorm) |
| `@os.io/nest-kit/bootstrap/openapi`   | OpenAPI / Swagger / Scalar doc helpers           | [Docs](./bootstrap-openapi)                                                                |
| `@os.io/nest-kit/auth`                | RBAC, OAuth, SSO, JWT, API keys                  | [Docs](./auth)                                                                             |
| `@os.io/nest-kit/infra/storage`       | Multi-disk file storage (local, S3, GCS, memory) | [Docs](./infra-storage)                                                                    |
| `@os.io/nest-kit/infra/excel`         | Excel import & export with exceljs               | [Docs](./infra-excel)                                                                      |
| `@os.io/nest-kit/infra/stripe`        | Stripe webhooks, subscriptions, payments         | [Docs](./infra-stripe)                                                                     |
| `@os.io/nest-kit/infra/logger`        | Structured logging (Pino)                        | [Docs](./infra-logger)                                                                     |
| `@os.io/nest-kit/infra/notification`  | Email, SMS, Push, Telegram, Slack, Teams         | [Docs](./infra-notification)                                                               |
| `@os.io/nest-kit/infra/audit-log`     | Audit trails, data change capture                | [Docs](./infra-audit-log)                                                                  |
| `@os.io/nest-kit/infra/activity-feed` | Real-time activity feed, fan-out                 | [Docs](./infra-activity-feed)                                                              |
| `@os.io/nest-kit/infra/metrics`       | Prometheus, OpenTelemetry, health checks         | [Docs](./infra-metrics)                                                                    |
| `@os.io/nest-kit/infra/rate-limit`    | Rate limiting (8 adapters)                       | [Docs](./infra-rate-limit)                                                                 |
| `@os.io/nest-kit/infra/webhook`       | Incoming & outgoing webhooks                     | [Docs](./infra-webhook)                                                                    |

## Coming Soon

| Import path                     | Description                           |
| ------------------------------- | ------------------------------------- |
| `@os.io/nest-kit` (or `./core`) | Shared types, utilities, base classes |
| `@os.io/nest-kit/saas`          | Orgs, teams, multi-tenancy            |
