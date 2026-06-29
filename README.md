<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="NestJS Logo" />
  <br/>
  <strong>+</strong>
  <br/>
  <img src="https://raw.githubusercontent.com/oxpo-io/nest-kit/main/docs/public/nest-kit-logo.svg" width="240" alt="@oxpo/nest-kit" />
</p>

<h1 align="center">@oxpo/nest-kit</h1>

<p align="center">
  <em>A modular, production-ready NestJS toolkit.</em>
  <br />
  <em>Bootstrap · Auth · SaaS · Infra</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@oxpo/nest-kit">
    <img src="https://img.shields.io/npm/v/@oxpo/nest-kit?logo=npm" alt="npm version" />
  </a>
  <a href="https://github.com/oxpo-io/nest-kit/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/oxpo-io/nest-kit/ci.yml?branch=main&logo=github" alt="CI" />
  </a>
  <a href="https://github.com/oxpo-io/nest-kit/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/oxpo-io/nest-kit" alt="License" />
  </a>
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/node/v/@oxpo/nest-kit" alt="Node version" />
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

| Import path                    | Directory            | Description                                  |
| ------------------------------ | -------------------- | -------------------------------------------- |
| `@oxpo/nest-kit` (or `./core`) | `packages/core`      | Shared types, utilities, base classes        |
| `@oxpo/nest-kit/bootstrap`     | `packages/bootstrap` | One-liner setup for Swagger, Cache, TypeORM… |
| `@oxpo/nest-kit/auth`          | `packages/auth`      | RBAC, OAuth 2.0, SSO, JWT, API Keys          |
| `@oxpo/nest-kit/saas`          | `packages/saas`      | Orgs, Teams, Multi-tenancy, Subscriptions    |
| `@oxpo/nest-kit/infra`         | `packages/infra`     | Infrastructure integrations                  |

**Infra sub-modules** (import via sub-path):

| Import path                         | Purpose                                         |
| ----------------------------------- | ----------------------------------------------- |
| `@oxpo/nest-kit/infra/logger`       | Structured logging (Pino, Winston)              |
| `@oxpo/nest-kit/infra/notification` | Email (SES, SendGrid), SMS (Twilio), Push (FCM) |
| `@oxpo/nest-kit/infra/storage`      | Unified file API: LocalFS, S3, GCS, Azure       |
| `@oxpo/nest-kit/infra/stripe`       | Webhooks, subscriptions, checkout               |
| `@oxpo/nest-kit/infra/audit-log`    | Audit trails, data change capture               |
| `@oxpo/nest-kit/infra/metrics`      | Prometheus, OpenTelemetry, health checks        |

## 📦 Installation

```bash
npm install @oxpo/nest-kit
```

Then import only what you need:

```ts
import { setupSwagger } from '@oxpo/nest-kit/bootstrap';
import { RBACGuard } from '@oxpo/nest-kit/auth';
```

> **All modules are in early alpha.** APIs are subject to change.

## 🚀 Quick Start

```ts
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// import { setupSwagger } from '@oxpo/nest-kit/bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // setupSwagger(app, { title: 'My API', version: '1.0.0' });
  await app.listen(3000);
}
bootstrap();
```

## 📖 Documentation

Full documentation is available at:
➡️ **https://oxpo-io.github.io/nest-kit** (coming soon)

Or browse the [docs](./docs) folder locally.

## 🤝 Contributing

We welcome contributions! Please read our [contributing guide](./CONTRIBUTING.md).

## 📄 License

This project is [MIT licensed](./LICENSE).

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/oxpo-io">Wind Blade</a>
</p>
