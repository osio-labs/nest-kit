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

### Multi-transport (shorthand)

```typescript
LoggerModule.forRoot({
  transports: [
    { target: 'pino/file', options: { destination: './logs/app.log' }, level: 'info' },
    { target: 'pino-pretty', options: { colorize: true }, level: 'debug' },
  ],
});
```

### Pino options

```typescript
LoggerModule.forRoot({
  pinoOptions: {
    redact: ['req.headers.authorization'],
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

Custom ID generator:

```typescript
LoggerModule.forRoot({
  correlationId: {
    generate: () => nanoid(),
  },
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

Exclude paths from request logging:

```typescript
LoggerModule.forRoot({
  requestLogging: {
    excludePaths: ['/health', '/metrics', '/readyz'],
  },
});
```

---

## Child Loggers

Create a child logger with bound context for service-specific fields:

```typescript
const childLogger = this.logger.child({ service: 'payments' });
childLogger.log('Processing payment');
// → includes { service: 'payments' }
```

---

## Integration with Log Storage & Visualization

Pino's transport architecture makes it straightforward to ship structured JSON logs to virtually any log storage system. The two primary approaches are:

| Approach             | Pros                            | Cons                           | Best for                    |
| -------------------- | ------------------------------- | ------------------------------ | --------------------------- |
| **Direct transport** | Single process, low latency     | Blocks the app on backpressure | Small to medium services    |
| **Sidecar**          | Decouples shipping from the app | Extra infrastructure           | High-throughput, production |
| **Via Logstash**     | Rich transformation pipeline    | Extra hop, operational cost    | Complex ETL requirements    |

You can even combine approaches — for example, log to both a file (sidecar) and Elasticsearch (direct) simultaneously via the `transports` array:

```typescript
LoggerModule.forRoot({
  transports: [
    { target: 'pino/file', options: { destination: '/var/log/app/app.log' }, level: 'info' },
    {
      target: 'pino-elasticsearch',
      options: { node: 'http://localhost:9200', index: 'logs' },
      level: 'warn',
    },
    { target: 'pino-pretty', options: { colorize: true }, level: 'debug' },
  ],
});
```

### Elasticsearch (direct)

Ship logs directly to Elasticsearch with minimal overhead. Best for single-cluster setups where Logstash is unnecessary.

**Installation:**

```bash
npm install pino-elasticsearch
```

**Configuration:**

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino-elasticsearch',
      options: {
        index: 'logs', // Elasticsearch index name
        node: 'http://elasticsearch:9200', // Elasticsearch endpoint
        'es-version': 7, // Elasticsearch major version
        'flush-bytes': 1000, // Flush batch size
        'flush-interval': 30000, // Flush interval (ms)
      },
    },
  ],
});
```

**How it works:**

```
┌──────────┐    JSON over HTTP    ┌────────────────┐
│  NestJS  │ ──────────────────→  │  Elasticsearch  │
│  (pino)  │    bulk API          │  :9200          │
└──────────┘                      └────────────────┘
```

Each log entry is buffered and sent as a bulk request to Elasticsearch. The `flush-bytes` and `flush-interval` options control how often batches are sent.

**Elasticsearch index template (optional but recommended):**

Create a template so `correlationId`, `duration`, `statusCode` etc. are mapped correctly:

```json
{
  "index_patterns": ["logs-*"],
  "template": {
    "mappings": {
      "properties": {
        "correlationId": { "type": "keyword" },
        "level": { "type": "integer" },
        "time": { "type": "date" },
        "pid": { "type": "long" },
        "hostname": { "type": "keyword" },
        "context": { "type": "keyword" },
        "req.method": { "type": "keyword" },
        "req.url": { "type": "keyword" },
        "res.statusCode": { "type": "integer" },
        "responseTime": { "type": "integer" },
        "msg": { "type": "text" }
      }
    }
  }
}
```

---

### Elasticsearch (via Logstash)

Use Logstash when you need a transformation pipeline — redact fields, enrich data, or route to multiple outputs.

**Installation:**

```bash
npm install pino-socket
# or
npm install pino-logstash
```

**Configuration:**

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino-socket',
      options: {
        address: 'logstash.example.com',
        port: 5000,
        mode: 'tcp', // 'tcp' or 'udp'
        reconnect: true, // auto-reconnect on disconnect
      },
    },
  ],
});
```

**How it works:**

```
┌──────────┐    TCP/JSON     ┌──────────┐    ES bulk    ┌────────────────┐
│  NestJS  │ ─────────────→ │ Logstash  │ ────────────→ │  Elasticsearch  │
│  (pino)  │   port 5000    │ :5000     │               │  :9200          │
└──────────┘                └──────────┘               └────────────────┘
```

**Logstash config (`logstash.conf`):**

```
input {
  tcp {
    port  => 5000
    codec => json
  }
}

filter {
  # Optional: add metadata
  mutate {
    add_field => { "[@metadata][index_prefix]" => "logs" }
  }
}

output {
  elasticsearch {
    hosts  => ["http://elasticsearch:9200"]
    index  => "logs-%{+YYYY.MM.dd}"
  }

  # Optional: also output to stdout for debugging
  # stdout { codec => rubydebug }
}
```

**Important security notes for production:**

1. Use **TLS** between your app and Logstash — `pino-socket` supports TLS via `tls: true` and `tlsOptions`
2. Place Logstash behind a load balancer if you have multiple app instances
3. Consider `pino-logstash` (over HTTP) instead of raw TCP if your network enforces HTTP-only egress

---

### OpenSearch

OpenSearch (the open-source fork of Elasticsearch) is fully compatible with the same transport pattern.

**Installation:**

```bash
npm install pino-opensearch
```

**Configuration:**

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino-opensearch',
      options: {
        index: 'logs',
        node: 'http://opensearch:9200',
        'flush-bytes': 1000,
        'flush-interval': 30000,
      },
    },
  ],
});
```

**How it works:** Identical to the Elasticsearch direct approach. `pino-opensearch` uses OpenSearch's bulk API.

**OpenSearch Dashboards setup:**

Once logs are indexed:

1. Go to **OpenSearch Dashboards → Stack Management → Index Patterns**
2. Create an index pattern `logs-*`
3. Select `@timestamp` or `time` as the time field
4. Explore logs in **Discover** — filter by `correlationId`, `level`, `context`

---

### Filebeat (sidecar)

The sidecar pattern is production-proven for high-throughput services. Your app writes logs to a file, and Filebeat ships them.

**Installation:**

```bash
npm install pino
# pino/file is built into pino itself — no extra package needed
```

**Configuration:**

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino/file',
      options: {
        destination: '/var/log/app/app.log',
        mkdir: true, // create directory if it doesn't exist
        sync: false, // async writes for better performance
      },
    },
  ],
});
```

**How it works:**

```
┌──────────┐  write   ┌──────────────┐  harvest   ┌──────────┐  bulk    ┌────────────────┐
│  NestJS  │ ───────→ │  app.log     │ ─────────→ │ Filebeat │ ──────→ │  Elasticsearch  │
│  (pino)  │          │  (JSON lines) │            │          │         │  or Logstash    │
└──────────┘          └──────────────┘            └──────────┘         └────────────────┘
```

**Filebeat config (`filebeat.yml`):**

```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/app/*.log
    json.keys_under_root: true
    json.overwrite_keys: true
    json.add_error_key: true
    json.message_key: msg
    # Tail files from the end on first start
    scan_frequency: 1s

# Output to Elasticsearch directly
output.elasticsearch:
  hosts: ['http://elasticsearch:9200']
  index: 'logs-%{+yyyy.MM.dd}'

# Alternative: output to Logstash
# output.logstash:
#   hosts: ["logstash:5044"]
```

**Filebeat lifecycle management:**

Add an ILM policy in Filebeat to prevent unbounded index growth:

```yaml
setup.ilm.enabled: true
setup.ilm.policy_name: 'logs-policy'
setup.ilm.rollover_alias: 'logs'
```

**When to choose the sidecar pattern vs direct transport:**

| Scenario                       | Recommendation      |
| ------------------------------ | ------------------- |
| Single instance, dev/staging   | Direct transport    |
| Multiple instances, production | Sidecar (Filebeat)  |
| Kubernetes (DaemonSet)         | Sidecar (Filebeat)  |
| Need log persistence           | Sidecar (pino/file) |
| Minimal operational overhead   | Direct transport    |

---

### Loki / Grafana

Loki is a horizontally-scalable, highly-available log aggregation system optimized for Grafana.

**Installation:**

```bash
npm install pino-loki
```

**Configuration:**

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino-loki',
      options: {
        host: 'http://loki:3100', // Loki endpoint
        labels: { application: 'my-app', environment: 'production' },
        interval: 5, // push interval in seconds
        batching: true,
        clearOnError: true,
      },
    },
  ],
});
```

**How it works:**

```
┌──────────┐    HTTP/JSON    ┌──────┐  query   ┌──────────┐
│  NestJS  │ ──────────────→ │ Loki │ ←──────→ │ Grafana  │
│  (pino)  │                 │      │          │          │
└──────────┘                 └──────┘          └──────────┘
```

**Grafana Explore:**

In Grafana, add Loki as a data source, then use **Explore → Loki** to search logs:

```
{application="my-app"} |= "error"
{application="my-app"} |= "correlationId=\"a1b2c3\""
```

---

### AWS CloudWatch

Ship logs to Amazon CloudWatch Logs for integration with the AWS ecosystem.

**Installation:**

```bash
npm install pino-cloudwatch
```

**Configuration:**

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino-cloudwatch',
      options: {
        logGroupName: '/my-app/service',
        logStreamName: process.env.HOSTNAME ?? 'default',
        awsRegion: 'ap-southeast-1',
        // Credentials via AWS SDK default chain (env, IAM, ~/.aws)
      },
    },
  ],
});
```

**How it works:**

```
┌──────────┐   PutLogEvents    ┌──────────────┐
│  NestJS  │ ────────────────→ │ CloudWatch    │
│  (pino)  │   AWS SDK         │ Logs          │
└──────────┘                   └──────────────┘
```

**IAM permissions required:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "*"
    }
  ]
}
```

**Subscription filter — forward to Elasticsearch:**

Once in CloudWatch, you can create a subscription filter to stream logs to Amazon Elasticsearch Service via Lambda:

```
CloudWatch Logs → Lambda → Amazon Elasticsearch Service
```

---

### Google Cloud Logging

Ship logs to Google Cloud Logging (formerly Stackdriver) for GCP-native services.

**Installation:**

```bash
npm install pino-stackdriver
```

**Configuration:**

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino-stackdriver',
      options: {
        projectId: 'my-gcp-project',
        logName: 'my-app-log',
        // Credentials via GOOGLE_APPLICATION_CREDENTIALS env var
      },
    },
  ],
});
```

---

### Datadog

Ship logs to Datadog for APM and log correlation.

**Installation:**

```bash
npm install pino-datadog
```

**Configuration:**

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino-datadog',
      options: {
        ddClientConf: {
          apiKey: process.env.DATADOG_API_KEY,
          site: 'datadoghq.com', // or 'datadoghq.eu'
        },
        ddServerConf: {
          intakeRegion: 'us1', // or 'eu1'
        },
      },
    },
  ],
});
```

---

### Sentry (error tracking)

Forward error-level and fatal-level logs to Sentry for issue tracking.

**Installation:**

```bash
npm install pino-sentry
```

**Configuration:**

```typescript
LoggerModule.forRoot({
  transports: [
    {
      target: 'pino-sentry',
      level: 'error', // only send error+fatal to Sentry
      options: {
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        serverName: process.env.HOSTNAME,
      },
    },
  ],
});
```

---

### Multiple Destinations

Combine multiple transports to simultaneously log locally, ship to Elasticsearch, and forward errors to Sentry:

```typescript
LoggerModule.forRoot({
  transports: [
    // 1. Pretty-print to console in development
    { target: 'pino-pretty', options: { colorize: true }, level: 'debug' },

    // 2. File output for persistence
    { target: 'pino/file', options: { destination: './logs/app.log' }, level: 'info' },

    // 3. Elasticsearch for production search
    {
      target: 'pino-elasticsearch',
      options: { node: 'http://elasticsearch:9200', index: 'logs' },
      level: 'info',
    },

    // 4. Sentry for error tracking
    { target: 'pino-sentry', options: { dsn: process.env.SENTRY_DSN }, level: 'error' },
  ],
});
```

---

### Kibana / OpenSearch Dashboards

Once logs are indexed, leverage the full power of your visualization platform.

#### Creating an Index Pattern

1. **Kibana:** Stack Management → Index Patterns → Create index pattern → `logs-*` → Time field: `@timestamp`
2. **OpenSearch Dashboards:** Stack Management → Index Patterns → Create index pattern → `logs-*` → Time field: `@timestamp`

#### Exploring Logs

Use **Discover** to filter and explore log entries:

- `correlationId: "a1b2c3d4"` — trace a single request
- `level: 50` — find all error logs (Pino uses syslog levels: 50=error, 40=warn, 30=info)
- `context: "PaymentService"` — filter by service context
- `res.statusCode >= 500` — find 5xx responses

#### Tracing a Request Across Services

If your architecture uses microservices, propagate the same `correlationId` across service boundaries:

1. **Service A** receives an incoming HTTP request with `x-correlation-id: "abc-123"`
2. **Service A** makes an outgoing HTTP call to **Service B**, forwarding the header `x-correlation-id: "abc-123"`
3. Both services log with `correlationId: "abc-123"`
4. In Kibana/OpenSearch, search `correlationId: "abc-123"` to see the full trace

```
Search: correlationId:"abc-123"
Result:
  time                    level  context            msg
  12:00:00.000            30     GatewayService     incoming request GET /orders
  12:00:00.001            30     OrderService        fetching order from DB
  12:00:00.002            30     PaymentService      processing payment
  12:00:00.003            50     PaymentService      payment declined
  12:00:00.004            40     GatewayService      returning 402 to client
```

#### Building Dashboards

Create visualizations to monitor your system:

- **Log level pie chart** — distribution of log levels over time
- **Error rate time series** — count of `level: 50` per minute
- **Top slow endpoints** — average `responseTime` by `req.url`
- **Status code distribution** — count by `res.statusCode`

---

### Log Output Examples

All examples below use the default JSON format. Fields are normalized for consistent parsing across all log storage systems.

**JSON (production):**

```json
{"level":30,"time":1718000000000,"pid":12345,"hostname":"my-host","correlationId":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","context":"UserService","msg":"Creating user","email":"user@example.com"}

{"level":30,"time":1718000000001,"pid":12345,"hostname":"my-host","correlationId":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","context":"RequestLogger","req":{"method":"GET","url":"/api/users","headers":{"accept":"application/json"}},"res":{"statusCode":200},"responseTime":15,"msg":"request completed"}

{"level":50,"time":1718000000002,"pid":12345,"hostname":"my-host","correlationId":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","context":"PaymentService","trace":"Error: payment declined\n    at ...","msg":"Payment processing failed"}
```

**Pretty-print (development):**

```
[12:00:00.123] INFO (12345): Creating user
    correlationId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    context: "UserService"
    email: "user@example.com"

[12:00:00.456] INFO (12345): request completed
    correlationId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    req.method: "GET"
    req.url: "/api/users"
    res.statusCode: 200
    responseTime: 15

[12:00:00.789] ERROR (12345): Payment processing failed
    correlationId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    context: "PaymentService"
    trace: "Error: payment declined\n    at ..."
```

**Pino log level mapping (syslog standard):**

| Level   | Value | Syslog Severity |
| ------- | ----- | --------------- |
| `fatal` | 60    | Emergency       |
| `error` | 50    | Error           |
| `warn`  | 40    | Warning         |
| `info`  | 30    | Informational   |
| `debug` | 20    | Debug           |
| `trace` | 10    | Debug (lowest)  |

---

## API

### `LoggerModule`

| Method                  | Description                    |
| ----------------------- | ------------------------------ |
| `forRoot(options)`      | Configure synchronously        |
| `forRootAsync(options)` | Configure async via useFactory |

### `LoggerModuleOptions`

| Option           | Type                                  | Default  | Description                       |
| ---------------- | ------------------------------------- | -------- | --------------------------------- |
| `level`          | `LogLevel`                            | `'info'` | Minimum log level                 |
| `prettyPrint`    | `boolean \| object`                   | —        | Enable pino-pretty (dev)          |
| `transport`      | `LoggerOptions['transport']`          | —        | Custom pino transport (single)    |
| `transports`     | `LoggerTransport[]`                   | —        | Multi-transport targets (pino v8) |
| `pinoOptions`    | `LoggerOptions` (partial)             | —        | Additional pino options           |
| `correlationId`  | `LoggerCorrelationIdConfig \| false`  | enabled  | Correlation ID configuration      |
| `requestLogging` | `LoggerRequestLoggingConfig \| false` | enabled  | Request logging configuration     |
| `global`         | `boolean`                             | `true`   | Register as global module         |

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
| `child(bindings)`              | —          | Create child logger with context |
| `getPinoLogger()`              | —          | Returns raw Pino logger instance |
| `fromPino(logger)` (static)    | —          | Create service from Pino logger  |

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
| `LoggerTransport`            | Transport target config    |
| `LoggerCorrelationIdConfig`  | Correlation ID options     |
| `LoggerRequestLoggingConfig` | Request logging options    |
| `LoggerModuleOptions`        | Module configuration       |
| `LoggerModuleAsyncOptions`   | Async module configuration |
