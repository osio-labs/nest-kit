# Infra / Logger

> Structured logging module for NestJS — Pino-based with correlation IDs and HTTP request logging.

**Import path:** `@os.io/nest-kit/infra/logger`

**Peer dependency:** `pino` (optional)

---

## Features

- **Pino-based** — fast, low-overhead structured JSON logging
- **NestJS-native** — implements `LoggerService`, works with NestJS DI
- **Correlation ID** — auto-generate and propagate request tracing IDs via `AsyncLocalStorage`
- **Request logging** — interceptor for HTTP request/response logging
- **Pretty print** — human-readable console output in development
- **Multi-transport** — send logs to Elasticsearch, OpenSearch, Logstash, Filebeat, Grafana, etc.
- **Child loggers** — create context-scoped loggers with bound fields
- **Exclude paths** — skip logging for health checks, metrics, etc.

---

## Quick Start

### 1. Import the module

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule } from '@os.io/nest-kit/infra/logger';

@Module({
  imports: [
    LoggerModule.forRoot({
      level: process.env.LOG_LEVEL ?? 'info',
      prettyPrint: process.env.NODE_ENV !== 'production',
    }),
  ],
})
export class AppModule {}
```

### 2. Inject the logger

```typescript
import { Injectable } from '@nestjs/common';
import { PinoLoggerService } from '@os.io/nest-kit/infra/logger';

@Injectable()
export class UserService {
  constructor(private readonly logger: PinoLoggerService) {}

  createUser(email: string) {
    this.logger.log(`Creating user ${email}`, 'UserService');
    this.logger.warn({ retries: 3 }, 'Retrying request', 'UserService');
    this.logger.error('Database timeout', new Error('timeout').stack, 'UserService');
  }
}
```

### 3. Configure correlation ID

Correlation ID is automatically handled by the `CorrelationIdInterceptor` (registered by default).

```typescript
import { getCorrelationId } from '@os.io/nest-kit/infra/logger';

@Injectable()
export class PaymentService {
  processPayment(orderId: string) {
    const cid = getCorrelationId();
    // cid → 'uuid-xxx-xxx' or undefined
    this.logger.log({ orderId }, 'Processing payment');
    // log entry automatically includes { correlationId: 'uuid-xxx-xxx' }
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
    generate: () => nanoid(), // custom ID generator
  },
  requestLogging: {
    includeHeaders: true,
    blacklistedHeaders: ['authorization', 'cookie'],
    excludePaths: ['/health', '/metrics'],
  },
  pinoOptions: {
    redact: ['req.headers.authorization'],
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

### Multi-transport

```typescript
LoggerModule.forRoot({
  transports: [
    { target: 'pino/file', options: { destination: './logs/app.log' }, level: 'info' },
    { target: 'pino-elasticsearch', options: { node: 'http://localhost:9200', index: 'logs' } },
    { target: 'pino-pretty', options: { colorize: true }, level: 'debug' },
  ],
});
```

---

## Integration with Log Storage & Visualization

Pino's transport architecture lets you ship structured JSON logs to virtually any log storage system. The `transports` option accepts an array of `{ target, options, level }` objects.

| Approach             | Pros                            | Cons                           | Best for                    |
| -------------------- | ------------------------------- | ------------------------------ | --------------------------- |
| **Direct transport** | Single process, low latency     | Blocks the app on backpressure | Small to medium services    |
| **Sidecar**          | Decouples shipping from the app | Extra infrastructure           | High-throughput, production |
| **Via Logstash**     | Rich transformation pipeline    | Extra hop, operational cost    | Complex ETL requirements    |

### Elasticsearch (direct)

Ship logs directly to Elasticsearch with minimal overhead.

**Installation:** `npm install pino-elasticsearch`

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino-elasticsearch',
      options: {
        index: 'logs',
        node: 'http://elasticsearch:9200',
        'es-version': 7,
        'flush-bytes': 1000,
      },
    },
  ],
});
```

### Elasticsearch (via Logstash)

Use Logstash when you need a transformation pipeline.

**Installation:** `npm install pino-socket`

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino-socket',
      options: { address: 'logstash.example.com', port: 5000, mode: 'tcp' },
    },
  ],
});
```

Logstash config (`logstash.conf`):

```
input { tcp { port => 5000 codec => json } }
output {
  elasticsearch {
    hosts  => ["http://elasticsearch:9200"]
    index  => "logs-%{+YYYY.MM.dd}"
  }
}
```

### OpenSearch

**Installation:** `npm install pino-opensearch`

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino-opensearch',
      options: { index: 'logs', node: 'http://opensearch:9200', 'flush-bytes': 1000 },
    },
  ],
});
```

### Filebeat (sidecar)

Production-proven pattern — app writes to file, Filebeat ships.

**No extra package needed** — `pino/file` is built into pino itself.

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino/file',
      options: { destination: '/var/log/app/app.log', mkdir: true },
    },
  ],
});
```

Filebeat config (`filebeat.yml`):

```yaml
filebeat.inputs:
  - type: log
    paths:
      - /var/log/app/*.log
    json.keys_under_root: true
    json.overwrite_keys: true
output.elasticsearch:
  hosts: ['http://elasticsearch:9200']
  index: 'logs-%{+yyyy.MM.dd}'
```

### Loki / Grafana

**Installation:** `npm install pino-loki`

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino-loki',
      options: {
        host: 'http://loki:3100',
        labels: { application: 'my-app' },
        interval: 5,
      },
    },
  ],
});
```

Grafana Explore: `{application="my-app"} |= "error"`

### AWS CloudWatch

**Installation:** `npm install pino-cloudwatch`

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino-cloudwatch',
      options: {
        logGroupName: '/my-app/service',
        logStreamName: process.env.HOSTNAME ?? 'default',
        awsRegion: 'ap-southeast-1',
      },
    },
  ],
});
```

### Google Cloud Logging

**Installation:** `npm install pino-stackdriver`

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino-stackdriver',
      options: { projectId: 'my-gcp-project', logName: 'my-app-log' },
    },
  ],
});
```

### Datadog

**Installation:** `npm install pino-datadog`

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino-datadog',
      options: {
        ddClientConf: { apiKey: process.env.DATADOG_API_KEY, site: 'datadoghq.com' },
        ddServerConf: { intakeRegion: 'us1' },
      },
    },
  ],
});
```

### Sentry (error tracking)

**Installation:** `npm install pino-sentry`

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino-sentry',
      level: 'error', // only error+fatal to Sentry
      options: { dsn: process.env.SENTRY_DSN },
    },
  ],
});
```

### Multiple Destinations

Combine transports to log locally, ship to Elasticsearch, and forward errors to Sentry:

```typescript
LoggerModule.forRoot({
  transports: [
    { target: 'pino-pretty', options: { colorize: true }, level: 'debug' },
    { target: 'pino/file', options: { destination: './logs/app.log' }, level: 'info' },
    { target: 'pino-elasticsearch', options: { node: 'http://es:9200', index: 'logs' } },
    { target: 'pino-sentry', options: { dsn: process.env.SENTRY_DSN }, level: 'error' },
  ],
});
```

### Tracing Across Services

Propagate the same `correlationId` across service boundaries by forwarding the `x-correlation-id` header in outgoing HTTP calls. In Kibana/OpenSearch, search `correlationId: "abc-123"` to see the full trace across all services.

### Log Output Examples

```json
{"level":30,"time":1718000000000,"pid":12345,"hostname":"my-host","correlationId":"abc-123","context":"UserService","msg":"Creating user"}
{"level":50,"time":1718000000002,"pid":12345,"hostname":"my-host","correlationId":"abc-123","context":"PaymentService","trace":"Error: payment declined","msg":"Payment failed"}
```

| Level | Value | Syslog Severity |
| ----- | ----- | --------------- |
| fatal | 60    | Emergency       |
| error | 50    | Error           |
| warn  | 40    | Warning         |
| info  | 30    | Informational   |
| debug | 20    | Debug           |
| trace | 10    | Debug (lowest)  |

---

See the [package README](https://github.com/os-io/nest-kit/blob/main/packages/infra/logger/README.md) for the full API reference, configuration guide, and detailed integration examples.
