<p align="center">
  <img src="https://docs.nestjs.com/assets/logo-small.svg" width="120" alt="NestJS Logo" />
  <br/>
  <strong>+</strong>
  <br/>
  <img src="https://raw.githubusercontent.com/osio-labs/nest-kit/master/docs/public/nest-kit-logo.svg" width="240" alt="@os.io/nest-kit" />
</p>

<h1 align="center">@os.io/nest-kit</h1>

<p align="center">
  <em>A modular, production-ready NestJS toolkit.</em>
  <br />
  <em>Bootstrap · Auth · SaaS · Infra</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@os.io/nest-kit">
    <img src="https://img.shields.io/npm/v/@os.io/nest-kit?logo=npm" alt="npm version" />
  </a>
  <a href="https://github.com/osio-labs/nest-kit/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/osio-labs/nest-kit/ci.yml?logo=github" alt="CI" />
  </a>
  <a href="https://github.com/osio-labs/nest-kit/blob/master/LICENSE">
    <img src="https://img.shields.io/github/license/osio-labs/nest-kit" alt="License" />
  </a>
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/node/v/@os.io/nest-kit" alt="Node version" />
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript" alt="TypeScript" />
  </a>
  <a href="https://nestjs.com/">
    <img src="https://img.shields.io/badge/NestJS-11-e0234e?logo=nestjs" alt="NestJS" />
  </a>
</p>

---

## ✨ Module Groups

| Import path                     | Directory            | Description                               |
| ------------------------------- | -------------------- | ----------------------------------------- |
| `@os.io/nest-kit` (or `./core`) | `packages/core`      | Shared types, utilities, base classes     |
| `@os.io/nest-kit/bootstrap`     | `packages/bootstrap` | Swagger, Scalar, Cache, TypeORM, Queue    |
| `@os.io/nest-kit/auth`          | `packages/auth`      | RBAC, OAuth 2.0, SSO, JWT, API Keys       |
| `@os.io/nest-kit/saas`          | `packages/saas`      | Orgs, Teams, Multi-tenancy, Subscriptions |
| `@os.io/nest-kit/infra`         | `packages/infra`     | Infrastructure integrations               |

All bootstrap features are available via `@os.io/nest-kit/bootstrap`:

| Feature     | Description                                     |
| ----------- | ----------------------------------------------- |
| **OpenAPI** | Swagger / Scalar API doc (auto-detect)          |
| **Cache**   | Cache module (Keyv, Redis, Valkey, multi-store) |
| **TypeORM** | Connection setup, CRUD factories, UoW           |
| **Queue**   | BullMQ queue bootstrapper with Redis/Valkey     |

**Infra sub-modules** (import via sub-path):

| Import path                           | Purpose                                           |
| ------------------------------------- | ------------------------------------------------- |
| `@os.io/nest-kit/infra/activity-feed` | Activity feeds (in-memory, Redis, database)       |
| `@os.io/nest-kit/infra/audit-log`     | Audit trails, data change capture                 |
| `@os.io/nest-kit/infra/excel`         | Import/export Excel files (XLSX/CSV)              |
| `@os.io/nest-kit/infra/logger`        | Structured logging (Pino)                         |
| `@os.io/nest-kit/infra/metrics`       | Prometheus metrics (counters, histograms, gauges) |
| `@os.io/nest-kit/infra/notification`  | Email (SES, SendGrid), SMS (Twilio), Push (FCM)   |
| `@os.io/nest-kit/infra/rate-limit`    | Multi-adapter rate limiting (memory, Redis, DB)   |
| `@os.io/nest-kit/infra/storage`       | Unified file API: LocalFS, S3, GCS, Azure         |
| `@os.io/nest-kit/infra/stripe`        | Webhooks, subscriptions, checkout                 |
| `@os.io/nest-kit/infra/webhook`       | Incoming/outgoing webhooks with HMAC, retry, CB   |

**Infra adapter/store sub-paths** (deep imports):

| Import path                                    | Purpose                               |
| ---------------------------------------------- | ------------------------------------- |
| `@os.io/nest-kit/infra/activity-feed/adapters` | Activity feed adapter implementations |
| `@os.io/nest-kit/infra/audit-log/adapters`     | Audit log adapter implementations     |
| `@os.io/nest-kit/infra/metrics/adapters`       | Metrics adapter implementations       |
| `@os.io/nest-kit/infra/notification/providers` | Notification provider implementations |
| `@os.io/nest-kit/infra/notification/stores`    | Notification store implementations    |
| `@os.io/nest-kit/infra/rate-limit/adapters`    | Rate limit adapter implementations    |

**Auth sub-modules** (import via sub-path):

| Import path                    | Purpose                                  |
| ------------------------------ | ---------------------------------------- |
| `@os.io/nest-kit/auth/api-key` | API key authentication and authorization |

## 📦 Installation

```bash
npm install @os.io/nest-kit
```

Then import only what you need:

```ts
import { configOpenApi } from '@os.io/nest-kit/bootstrap';
import { RBACGuard } from '@os.io/nest-kit/auth';
```

> **Ready for production use.** Requires NestJS 11+.

## 🚀 Quick Start

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configCache } from '@os.io/nest-kit/bootstrap';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [CacheModule.register(configCache())],
})
export class AppModule {}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

## 📖 Documentation

Full documentation is available at:
➡️ **https://osio-labs.github.io/nest-kit**
➡️ **https://osio-labs.github.io/nest-kit** (coming soon)

Or browse the [docs](./docs) folder locally.

## 🤝 Contributing

We welcome contributions! Please read our [contributing guide](./CONTRIBUTING.md).

## 📄 License

This project is [MIT licensed](./LICENSE).

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/osio-labs">Wind Blade</a>
</p>
