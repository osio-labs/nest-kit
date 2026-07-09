# @os.io/nest-kit/bootstrap/sentry

Sentry error monitoring and performance tracing for NestJS applications — wraps [`@sentry/nestjs`](https://docs.sentry.io/platforms/javascript/guides/nestjs/).

## Installation

### 1. Install `@sentry/nestjs`

```bash
npm install @sentry/nestjs
```

Optional — profiling:

```bash
npm install @sentry/profiling-node
```

### 2. Create a Sentry project

1. Go to [sentry.io](https://sentry.io) → **Create Project**
2. Choose **Nest.js**
3. Copy your **DSN** (looks like `https://key@o0.ingest.sentry.io/0`)

## Quick Start

### Option A — `instrument.ts` (recommended by Sentry docs)

Create `instrument.ts` in your project root:

```ts
// instrument.ts
import { initSentry } from '@os.io/nest-kit/bootstrap';

await initSentry({
  tracesSampleRate: 1.0, // 100% in dev; lower in production
});
```

Then import it **first** in `main.ts`:

```ts
// main.ts
import './instrument'; // ← must be first
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

With profiling:

```ts
// instrument.ts
import { initSentry } from '@os.io/nest-kit/bootstrap';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

await initSentry({
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  integrations: [nodeProfilingIntegration()],
});
```

### Option B — Manual module registration

```ts
import { SentryModule } from '@sentry/nestjs/setup';
import { configSentry } from '@os.io/nest-kit/bootstrap';

@Module({
  imports: [SentryModule.forRoot(configSentry())],
})
export class AppModule {}
```

## Environment Variables

| Variable                      | Default      | Description                        |
| ----------------------------- | ------------ | ---------------------------------- |
| `SENTRY_DSN`                  | —            | Sentry DSN **(required)**          |
| `SENTRY_ENVIRONMENT`          | `production` | Environment name                   |
| `SENTRY_RELEASE`              | —            | Release version (e.g. `v1.2.3`)    |
| `SENTRY_DEBUG`                | `false`      | Enable Sentry SDK debug mode       |
| `SENTRY_TRACES_SAMPLE_RATE`   | `1.0`        | Traces sample rate (0.0 – 1.0)     |
| `SENTRY_PROFILES_SAMPLE_RATE` | —            | Profiles sample rate (0.0 – 1.0)   |
| `SENTRY_ATTACH_STACKTRACE`    | `true`       | Attach stack traces to events      |
| `SENTRY_IS_GLOBAL`            | `true`       | Register the module as `@Global()` |

## API

### `configSentry(options?, configService?)`

Build Sentry config from env vars or NestJS `ConfigService`. Returns a plain object compatible with `SentryModule.forRoot()`.

```ts
// Sync
const cfg = configSentry({ dsn: 'https://...' });

// Async — with ConfigService
const cfg = configSentry(undefined, configService);
```

### `initSentry(options?)`

Async function that calls `Sentry.init()` from `@sentry/nestjs`. Designed for the `instrument.ts` pattern.

```ts
await initSentry({ tracesSampleRate: 0.5 });
```

## Links

- [Sentry NestJS docs](https://docs.sentry.io/platforms/javascript/guides/nestjs/)
- [NestJS Sentry recipe](https://docs.nestjs.com/recipes/sentry)
- [`@sentry/nestjs` on npm](https://www.npmjs.com/package/@sentry/nestjs)
