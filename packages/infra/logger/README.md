# @os.io/nest-kit/infra/logger

> Structured logging for NestJS with Pino — fast, low-overhead JSON logging with correlation IDs and HTTP request logging.

```typescript
import { LoggerModule } from '@os.io/nest-kit/infra/logger';

@Module({
  imports: [LoggerModule.forRoot()],
})
export class AppModule {}
```

## Installation

```bash
npm install @os.io/nest-kit pino
```

`pino` is an **optional peer dependency** — safe to import without it; errors are thrown only on use.

For pretty-printed development output, also install:

```bash
npm install pino-pretty
```

---

## Quick Start

```typescript
import { LoggerModule, PinoLoggerService } from '@os.io/nest-kit/infra/logger';

@Module({
  imports: [
    LoggerModule.forRoot({
      level: 'debug',
      prettyPrint: true,
    }),
  ],
})
export class AppModule {}

@Injectable()
export class MyService {
  constructor(private readonly logger: PinoLoggerService) {}

  async run() {
    this.logger.log('Hello from Pino!', 'MyService');
    this.logger.warn({ retries: 3 }, 'Retrying request', 'MyService');
    this.logger.error('Something broke', new Error('timeout').stack, 'MyService');
    this.logger.debug('Current state', { userId: 123, role: 'admin' });
  }
}
```

---

## Configuration

### Synchronous

```typescript
LoggerModule.forRoot({
  level: 'debug',
  prettyPrint: true,
  correlationId: {
    headerName: 'x-request-id',
  },
  requestLogging: {
    includeHeaders: true,
    blacklistedHeaders: ['authorization', 'cookie'],
  },
});
```

### Async (from ConfigService)

```typescript
LoggerModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    level: config.get('log.level'),
    prettyPrint: config.get('log.prettyPrint'),
  }),
});
```

### Disable correlation ID or request logging

```typescript
LoggerModule.forRoot({
  correlationId: false, // disable correlation ID interceptor
  requestLogging: false, // disable request logging interceptor
});
```

### Custom Pino transport

```typescript
LoggerModule.forRoot({
  transport: {
    target: 'pino/file',
    options: { destination: './logs/app.log' },
  },
});
```

### Multi-transport (pino v8+)

```typescript
LoggerModule.forRoot({
  transport: {
    targets: [
      { target: 'pino/file', options: { destination: './logs/app.log' }, level: 'info' },
      { target: 'pino-pretty', options: { colorize: true }, level: 'debug' },
    ],
  },
});
```

---

## Correlation ID

By default, every incoming HTTP request gets a correlation ID that is:

- Read from the `x-correlation-id` request header (if present)
- Auto-generated as a v4 UUID (if absent)
- Set on the response header for client tracing
- Included in every log entry via the active `AsyncLocalStorage` context

Access the correlation ID programmatically:

```typescript
import { getCorrelationId } from '@os.io/nest-kit/infra/logger';

function handleWebhook() {
  const cid = getCorrelationId();
  // cid → 'uuid-xxx-xxx' or undefined
}
```

Run code within a custom correlation ID context:

```typescript
import { runWithCorrelationId } from '@os.io/nest-kit/infra/logger';

runWithCorrelationId('manual-cid-001', () => {
  // all logs inside this block include correlationId: 'manual-cid-001'
});
```

---

## Request Logging

When enabled, every HTTP request is logged with:

| Field           | Description                           |
| --------------- | ------------------------------------- |
| `method`        | HTTP method (GET, POST, …)            |
| `url`           | Request URL path                      |
| `statusCode`    | Response status code                  |
| `duration`      | Request duration in milliseconds      |
| `correlationId` | Correlation ID (if active)            |
| `headers`       | Request headers (if `includeHeaders`) |
| `body`          | Request body (if `includeBody`)       |

---

## API

### `LoggerModule`

| Method                  | Description                    |
| ----------------------- | ------------------------------ |
| `forRoot(options)`      | Configure synchronously        |
| `forRootAsync(options)` | Configure async via useFactory |

### `LoggerModuleOptions`

| Option           | Type                                  | Default  | Description                   |
| ---------------- | ------------------------------------- | -------- | ----------------------------- |
| `level`          | `LogLevel`                            | `'info'` | Minimum log level             |
| `prettyPrint`    | `boolean \| object`                   | —        | Enable pino-pretty (dev)      |
| `transport`      | `LoggerOptions['transport']`          | —        | Custom pino transport         |
| `pinoOptions`    | `LoggerOptions` (partial)             | —        | Additional pino options       |
| `correlationId`  | `LoggerCorrelationIdConfig \| false`  | enabled  | Correlation ID configuration  |
| `requestLogging` | `LoggerRequestLoggingConfig \| false` | enabled  | Request logging configuration |
| `global`         | `boolean`                             | `true`   | Register as global module     |

### `PinoLoggerService`

Implements NestJS `LoggerService`:

| Method                         | Pino level | Description                      |
| ------------------------------ | ---------- | -------------------------------- |
| `log(message, context?)`       | `info`     | General log messages             |
| `error(message, trace?, ctx?)` | `error`    | Error messages with trace        |
| `warn(message, context?)`      | `warn`     | Warning messages                 |
| `debug(message, context?)`     | `debug`    | Debug messages                   |
| `verbose(message, context?)`   | `trace`    | Verbose / trace messages         |
| `fatal(message, trace?, ctx?)` | `fatal`    | Fatal / critical messages        |
| `getPinoLogger()`              | —          | Returns raw Pino logger instance |

### Correlation ID utilities

| Function                       | Description                                       |
| ------------------------------ | ------------------------------------------------- |
| `getCorrelationId()`           | Returns the current correlation ID or `undefined` |
| `runWithCorrelationId(id, fn)` | Executes `fn` within a correlation ID context     |

### Interceptors

| Class                      | Description                       |
| -------------------------- | --------------------------------- |
| `CorrelationIdInterceptor` | Extracts/generates correlation ID |
| `RequestLoggerInterceptor` | Logs HTTP request/response        |

### Constants

| Export                          | Description                              |
| ------------------------------- | ---------------------------------------- |
| `LOGGER_MODULE_OPTIONS`         | DI token for module options              |
| `PINO_LOGGER`                   | DI token for raw Pino instance           |
| `DEFAULT_LOG_LEVEL`             | Default log level (`info`)               |
| `DEFAULT_CORRELATION_ID_HEADER` | Default header name (`x-correlation-id`) |

### Exported Types

| Type                         | Description                |
| ---------------------------- | -------------------------- |
| `LogLevel`                   | Union type for log levels  |
| `LoggerCorrelationIdConfig`  | Correlation ID options     |
| `LoggerRequestLoggingConfig` | Request logging options    |
| `LoggerModuleOptions`        | Module configuration       |
| `LoggerModuleAsyncOptions`   | Async module configuration |
