# @os.io/nest-kit/bootstrap/sentry

Sentry module configuration bootstrapper for NestJS applications.

## Installation

```bash
npm install @sentry/nestjs
```

> **Note**: `@sentry/nestjs` is an optional peer dependency. The bootstrapper
> works without it — you can use the returned config object with other
> Sentry setup approaches.

## Quick Start

### Synchronous (env vars)

```ts
import { SentryModule } from '@sentry/nestjs/setup';
import { configSentry } from '@os.io/nest-kit/bootstrap/sentry';

@Module({
  imports: [SentryModule.forRoot(configSentry())],
})
export class AppModule {}
```

### Async (ConfigService)

```ts
import { SentryModule } from '@sentry/nestjs/setup';
import { configSentryAsync } from '@os.io/nest-kit/bootstrap/sentry';

@Module({
  imports: [
    SentryModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs) => configSentryAsync(cs),
    }),
  ],
})
export class AppModule {}
```

### With custom options

```ts
configSentry({
  dsn: 'https://key@o0.ingest.sentry.io/0',
  environment: 'production',
  release: '1.0.0',
  tracesSampleRate: 0.5,
  profilesSampleRate: 0.2,
  debug: false,
  spotlight: process.env.NODE_ENV === 'development',
});
```

## .env example

```dotenv
SENTRY_DSN=https://key@o0.ingest.sentry.io/0
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.2
SENTRY_PROFILES_SAMPLE_RATE=0.1
SENTRY_DEBUG=false
SENTRY_SPOTLIGHT=false
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.1
SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0
SENTRY_IS_GLOBAL=true
```

## Options

| Option                     | Type      | Default                         | Description                     |
| -------------------------- | --------- | ------------------------------- | ------------------------------- |
| `dsn`                      | `string`  | —                               | Sentry DSN                      |
| `environment`              | `string`  | `NODE_ENV` \|\| `'development'` | Environment name                |
| `release`                  | `string`  | —                               | Release version                 |
| `tracesSampleRate`         | `number`  | `0.2`                           | Performance tracing sample rate |
| `profilesSampleRate`       | `number`  | `0.1`                           | Profiling sample rate           |
| `debug`                    | `boolean` | `false`                         | Enable debug logging            |
| `spotlight`                | `boolean` | `false`                         | Enable Spotlight for local dev  |
| `replaysSessionSampleRate` | `number`  | `0.1`                           | Session replay sample rate      |
| `replaysOnErrorSampleRate` | `number`  | `1.0`                           | Error-only replay sample rate   |
| `isGlobal`                 | `boolean` | `false`                         | Register as global module       |

## Environment Variables

| Variable                              | Default                       | Description                              |
| ------------------------------------- | ----------------------------- | ---------------------------------------- |
| `SENTRY_DSN`                          | —                             | Sentry DSN (required for data reporting) |
| `SENTRY_ENVIRONMENT`                  | `NODE_ENV` \|\| `development` | Environment name                         |
| `SENTRY_RELEASE`                      | —                             | Release version                          |
| `SENTRY_TRACES_SAMPLE_RATE`           | `0.2`                         | Performance tracing sample rate          |
| `SENTRY_PROFILES_SAMPLE_RATE`         | `0.1`                         | Profiling sample rate                    |
| `SENTRY_DEBUG`                        | `false`                       | Enable debug logging                     |
| `SENTRY_SPOTLIGHT`                    | `false`                       | Enable Spotlight for local dev           |
| `SENTRY_REPLAYS_SESSION_SAMPLE_RATE`  | `0.1`                         | Session replay sample rate               |
| `SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` | `1.0`                         | Error-only replay sample rate            |
| `SENTRY_IS_GLOBAL`                    | `false`                       | Register as global module                |

## API

### `configSentry(options?)`

Returns a `Record<string, unknown>` suitable for `SentryModule.forRoot()`.

### `configSentryAsync(configService, options?)`

Returns a `Record<string, unknown>` suitable for `SentryModule.forRootAsync()`.
