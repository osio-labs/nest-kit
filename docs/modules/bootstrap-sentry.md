# Bootstrap / Sentry

> Sentry error monitoring and performance tracing bootstrapper for NestJS — wraps [`@sentry/nestjs`](https://docs.sentry.io/platforms/javascript/guides/nestjs/).

## Install

```bash
npm install @sentry/nestjs
```

Optional — profiling:

```bash
npm install @sentry/profiling-node
```

## Quick Start

### Option A — `instrument.ts` (recommended by Sentry docs)

Create `instrument.ts` in your project root and import it **before** anything else in `main.ts`:

```ts
// instrument.ts
import { initSentry } from '@os.io/nest-kit/bootstrap';

await initSentry({
  tracesSampleRate: 1.0,
});
```

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
import { initSentry } from '@os.io/nest-kit/bootstrap';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

await initSentry({
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  integrations: [nodeProfilingIntegration()],
});
```

### Option B — `configSentry`

Returns a plain object compatible with `SentryModule.forRoot()`:

```ts
import { SentryModule } from '@sentry/nestjs/setup';
import { configSentry } from '@os.io/nest-kit/bootstrap';

@Module({
  imports: [SentryModule.forRoot(configSentry())],
})
export class AppModule {}
```

Async via `ConfigService`:

```ts
SentryModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (cs) => configSentry(undefined, cs),
});
```

## Environment Variables

| Variable                      | Default      | Description                      |
| ----------------------------- | ------------ | -------------------------------- |
| `SENTRY_DSN`                  | —            | Sentry DSN **(required)**        |
| `SENTRY_ENVIRONMENT`          | `production` | Environment name                 |
| `SENTRY_RELEASE`              | —            | Release version (e.g. `v1.2.3`)  |
| `SENTRY_DEBUG`                | `false`      | Enable Sentry SDK debug mode     |
| `SENTRY_TRACES_SAMPLE_RATE`   | `1.0`        | Traces sample rate (0.0 – 1.0)   |
| `SENTRY_PROFILES_SAMPLE_RATE` | —            | Profiles sample rate (0.0 – 1.0) |
| `SENTRY_ATTACH_STACKTRACE`    | `true`       | Attach stack traces to events    |
| `SENTRY_IS_GLOBAL`            | `true`       | Register as global module        |

## API

### `configSentry(options?, configService?)`

Build Sentry config from env vars or NestJS `ConfigService`. Returns a plain object for `SentryModule.forRoot()`.

```ts
const cfg = configSentry({ dsn: 'https://...' });
```

### `initSentry(options?)`

Async function. Calls `Sentry.init()` from `@sentry/nestjs`. Designed for the `instrument.ts` pattern.

```ts
await initSentry({ tracesSampleRate: 0.5 });
```

## Links

- [Sentry NestJS docs](https://docs.sentry.io/platforms/javascript/guides/nestjs/)
- [NestJS Sentry recipe](https://docs.nestjs.com/recipes/sentry)
- [`@sentry/nestjs` on npm](https://www.npmjs.com/package/@sentry/nestjs)
