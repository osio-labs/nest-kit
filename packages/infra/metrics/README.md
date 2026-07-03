# @os.io/nest-kit/infra/metrics

Metrics & observability for NestJS — record counters, gauges, histograms, and
timings through a pluggable adapter interface. Supports [Prometheus](https://prometheus.io/),
[OpenTelemetry](https://opentelemetry.io/), [Datadog](https://www.datadoghq.com/),
[AWS CloudWatch](https://aws.amazon.com/cloudwatch/), [GCP Cloud Monitoring](https://cloud.google.com/monitoring),
[InfluxDB](https://www.influxdata.com/), [StatsD](https://github.com/statsd/statsd),
[New Relic](https://newrelic.com/), [Sentry](https://sentry.io/),
and a development Console adapter.

## Features

- **Unified API** — `counter()`, `gauge()`, `histogram()`, `timing()` across all backends
- **Pluggable adapters** — swap backends without changing application code
- **Default tags** — automatic labels applied to every metric
- **Lazy dependencies** — optional peer SDKs loaded only when the adapter is used
- **Singleton service** — inject `MetricsService` anywhere after import

## Installation

```bash
npm install @os.io/nest-kit
```

## Quick Start

### Console adapter (development)

```typescript
import { Module } from '@nestjs/common';
import { MetricsModule } from '@os.io/nest-kit/infra/metrics';
import { ConsoleAdapter } from '@os.io/nest-kit/infra/metrics/adapters';

@Module({
  imports: [
    MetricsModule.forRoot({
      adapter: new ConsoleAdapter({ format: 'pretty' }),
      defaultTags: { app: 'my-api', env: 'development' },
    }),
  ],
})
export class AppModule {}
```

### Inject the service

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from '@os.io/nest-kit/infra/metrics';

@Injectable()
export class OrderService {
  constructor(private readonly metrics: MetricsService) {}

  async createOrder() {
    this.metrics.counter('order.created', 1, { currency: 'USD' });
    const start = Date.now();
    // ...
    this.metrics.timing('order.create.duration', Date.now() - start);
  }
}
```

## API

### `MetricsService`

| Method                            | Description                     |
| --------------------------------- | ------------------------------- |
| `counter(name, value?, tags?)`    | Increment a counter (default 1) |
| `gauge(name, value, tags?)`       | Set a gauge to the given value  |
| `histogram(name, value, tags?)`   | Record a histogram observation  |
| `timing(name, durationMs, tags?)` | Record a timing in milliseconds |

All methods accept optional tags/labels that are merged with `defaultTags`
(per-call tags take precedence).

## Configuration

### Module options

```typescript
MetricsModule.forRoot({
  adapter: new PrometheusAdapter({ prefix: 'myapp' }),
  defaultTags: { app: 'my-api', env: 'production' },
  global: true, // register as @Global() (default: true)
});
```

| Option        | Type                     | Default  | Description                        |
| ------------- | ------------------------ | -------- | ---------------------------------- |
| `adapter`     | `MetricsAdapter`         | required | Metrics backend adapter            |
| `defaultTags` | `Record<string, string>` | —        | Tags merged into every metric call |
| `global`      | `boolean`                | `true`   | Register as `@Global()`            |

### Async configuration

```typescript
MetricsModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    adapter: new PrometheusAdapter({ prefix: config.get('METRICS_PREFIX') }),
    defaultTags: { app: config.get('APP_NAME') },
  }),
  inject: [ConfigService],
});
```

## Adapters

The module ships with 10 built-in adapters. Each implements `MetricsAdapter`
and is passed as the `adapter` option.

### Overview

| Category       | Adapter                                               | Extra dep                     | Async |
| -------------- | ----------------------------------------------------- | ----------------------------- | ----- |
| **Dev tools**  | Console                                               | ❌                            | ❌    |
|                | [Sentry](https://sentry.io/)                          | `@sentry/node`                | ❌    |
| **Monitoring** | [Prometheus](https://prometheus.io/)                  | `prom-client`                 | ❌    |
|                | [OpenTelemetry](https://opentelemetry.io/)            | `@opentelemetry/api`          | ❌    |
|                | [Datadog](https://www.datadoghq.com/) (StatsD)        | `hot-shots`                   | ❌    |
| **Cloud**      | [AWS CloudWatch](https://aws.amazon.com/cloudwatch/)  | `@aws-sdk/client-cloudwatch`  | ✅    |
|                | [GCP Monitoring](https://cloud.google.com/monitoring) | `@google-cloud/monitoring`    | ✅    |
| **TSDB**       | [InfluxDB](https://www.influxdata.com/)               | `@influxdata/influxdb-client` | ✅    |
|                | [StatsD](https://github.com/statsd/statsd) (UDP)      | `statsd-client`               | ❌    |
| **APM**        | [New Relic](https://newrelic.com/)                    | `@newrelic/telemetry-sdk`     | ✅    |

---

### Dev tool adapters

Console and Sentry are **emission-only** — they log or breadcrumb metrics but
do not aggregate or expose query endpoints. Best for development or alongside
a full-featured backend.

#### Console

No dependencies. Prints metrics to stdout.

```typescript
import { ConsoleAdapter } from '@os.io/nest-kit/infra/metrics/adapters';

MetricsModule.forRoot({
  adapter: new ConsoleAdapter({
    format: 'json', // 'json' | 'pretty'
    logger: console.log,
  }),
});
```

| Option   | Type                    | Default       | Description   |
| -------- | ----------------------- | ------------- | ------------- |
| `format` | `'json' \| 'pretty'`    | `'json'`      | Output format |
| `logger` | `(msg: string) => void` | `console.log` | Custom logger |

#### [Sentry](https://sentry.io/)

Sends metrics as Sentry breadcrumbs.

**Install:** `npm install @sentry/node`

```typescript
import { SentryMetricsAdapter } from '@os.io/nest-kit/infra/metrics/adapters';

MetricsModule.forRoot({
  adapter: new SentryMetricsAdapter({
    defaultTags: { app: 'myapi' },
  }),
});
```

| Option        | Type                     | Description                    |
| ------------- | ------------------------ | ------------------------------ |
| `client`      | `@sentry/node`           | Pre-configured Sentry instance |
| `defaultTags` | `Record<string, string>` | Tags added to every breadcrumb |

---

### Monitoring adapters

Prometheus, OpenTelemetry, and Datadog are the primary monitoring backends.
They expose metrics for scraping or push to an agent.

#### [Prometheus](https://prometheus.io/)

Uses [`prom-client`](https://github.com/siimon/prom-client) with auto-created Counter, Gauge, and Histogram instruments.

**Install:** `npm install prom-client`

```typescript
import { PrometheusAdapter } from '@os.io/nest-kit/infra/metrics/adapters';

MetricsModule.forRoot({
  adapter: new PrometheusAdapter({
    prefix: 'myapp',
    defaultLabels: { app: 'myapi' },
  }),
});
```

| Option          | Type                     | Description                   |
| --------------- | ------------------------ | ----------------------------- |
| `prefix`        | `string`                 | Prefix added to every metric  |
| `defaultLabels` | `Record<string, string>` | Labels applied to all metrics |
| `registry`      | `Registry`               | Custom `prom-client` registry |

#### [OpenTelemetry](https://opentelemetry.io/)

Uses [`@opentelemetry/api`](https://www.npmjs.com/package/@opentelemetry/api) Meter API. Creates Counter, Gauge, and Histogram
instruments lazily. Timings use Histogram.

**Install:** `npm install @opentelemetry/api`

```typescript
import { OpenTelemetryAdapter } from '@os.io/nest-kit/infra/metrics/adapters';

MetricsModule.forRoot({
  adapter: new OpenTelemetryAdapter({
    meterName: 'myapp',
    meterVersion: '1.0.0',
  }),
});
```

| Option         | Type     | Description                         |
| -------------- | -------- | ----------------------------------- |
| `meter`        | `Meter`  | Pre-configured OpenTelemetry Meter  |
| `meterName`    | `string` | Meter name (default `'nestjs-kit'`) |
| `meterVersion` | `string` | Meter version                       |

#### [Datadog](https://www.datadoghq.com/)

Sends metrics via [DogStatsD](https://docs.datadoghq.com/developers/dogstatsd/) protocol using [`hot-shots`](https://github.com/brightcove/hot-shots).

**Install:** `npm install hot-shots`

```typescript
import { DatadogAdapter } from '@os.io/nest-kit/infra/metrics/adapters';

MetricsModule.forRoot({
  adapter: new DatadogAdapter({
    prefix: 'myapp',
    host: 'localhost',
    port: 8125,
    defaultTags: { env: 'production' },
  }),
});
```

| Option        | Type                     | Description                     |
| ------------- | ------------------------ | ------------------------------- |
| `client`      | `StatsD`                 | Pre-configured hot-shots client |
| `host`        | `string`                 | DogStatsD host (`localhost`)    |
| `port`        | `number`                 | DogStatsD port (`8125`)         |
| `prefix`      | `string`                 | Dot-separated metric prefix     |
| `defaultTags` | `Record<string, string>` | Global tags                     |

---

### Cloud adapters

AWS CloudWatch, GCP Monitoring, and InfluxDB buffer metrics and flush in
batches. Call `destroy()` on the adapter to flush pending data on shutdown.

#### [AWS CloudWatch](https://aws.amazon.com/cloudwatch/)

**Install:** `npm install @aws-sdk/client-cloudwatch`

```typescript
import { CloudWatchAdapter } from '@os.io/nest-kit/infra/metrics/adapters';

MetricsModule.forRoot({
  adapter: new CloudWatchAdapter({
    namespace: 'MyApp/Metrics',
    region: 'us-east-1',
  }),
});
```

| Option            | Type               | Description                              |
| ----------------- | ------------------ | ---------------------------------------- |
| `client`          | `CloudWatchClient` | Pre-configured client                    |
| `namespace`       | `string`           | CloudWatch namespace (`NestKit/Metrics`) |
| `region`          | `string`           | AWS region                               |
| `flushIntervalMs` | `number`           | Flush interval (default 10000ms)         |

Counters use `Count` unit; timings use `Milliseconds`. Metrics are sent in
batches of up to 20 via `PutMetricDataCommand`.

#### [GCP Cloud Monitoring](https://cloud.google.com/monitoring)

**Install:** `npm install @google-cloud/monitoring`

```typescript
import { GcpMonitoringAdapter } from '@os.io/nest-kit/infra/metrics/adapters';

MetricsModule.forRoot({
  adapter: new GcpMonitoringAdapter({
    projectId: 'my-project',
  }),
});
```

| Option         | Type         | Description                                  |
| -------------- | ------------ | -------------------------------------------- |
| `client`       | `Monitoring` | Pre-configured Monitoring client             |
| `projectId`    | `string`     | GCP project ID (from `GCP_PROJECT_ID`)       |
| `metricPrefix` | `string`     | Metric type prefix (`custom.googleapis.com`) |

Counters use `CUMULATIVE` / `INT64`; gauges, histograms, and timings use
`GAUGE` / `DOUBLE`.

---

### TSDB adapters

#### [InfluxDB](https://www.influxdata.com/)

**Install:** `npm install @influxdata/influxdb-client`

```typescript
import { InfluxDbAdapter } from '@os.io/nest-kit/infra/metrics/adapters';

MetricsModule.forRoot({
  adapter: new InfluxDbAdapter({
    url: process.env.INFLUX_URL,
    token: process.env.INFLUX_TOKEN,
    org: process.env.INFLUX_ORG,
    bucket: 'my-bucket',
  }),
});
```

| Option        | Type                     | Description                    |
| ------------- | ------------------------ | ------------------------------ |
| `client`      | `InfluxDB`               | Pre-configured InfluxDB client |
| `url`         | `string`                 | InfluxDB URL (`INFLUX_URL`)    |
| `token`       | `string`                 | Auth token (`INFLUX_TOKEN`)    |
| `org`         | `string`                 | Organization (`INFLUX_ORG`)    |
| `bucket`      | `string`                 | Bucket name (`INFLUX_BUCKET`)  |
| `defaultTags` | `Record<string, string>` | Tags added to every point      |

Each method call writes a point with a `value` float field.

#### [StatsD](https://github.com/statsd/statsd)

Raw UDP StatsD protocol via [`statsd-client`](https://github.com/msiebuhr/node-statsd-client). Fire-and-forget — errors are
silently swallowed.

**Install:** `npm install statsd-client`

```typescript
import { StatsdAdapter } from '@os.io/nest-kit/infra/metrics/adapters';

MetricsModule.forRoot({
  adapter: new StatsdAdapter({
    host: 'localhost',
    port: 8125,
    prefix: 'myapp',
  }),
});
```

| Option       | Type     | Description                      |
| ------------ | -------- | -------------------------------- |
| `client`     | `SDC`    | Pre-configured statsd-client     |
| `host`       | `string` | StatsD host (`localhost`)        |
| `port`       | `number` | StatsD port (`8125`)             |
| `prefix`     | `string` | Metric name prefix               |
| `globalTags` | `string` | Tags in `key:val,key:val` format |

---

### APM adapters

#### [New Relic](https://newrelic.com/)

**Install:** `npm install @newrelic/telemetry-sdk`

```typescript
import { NewRelicAdapter } from '@os.io/nest-kit/infra/metrics/adapters';

MetricsModule.forRoot({
  adapter: new NewRelicAdapter({
    apiKey: process.env.NEW_RELIC_API_KEY,
    serviceName: 'MyApp',
  }),
});
```

| Option        | Type           | Description                             |
| ------------- | -------------- | --------------------------------------- |
| `client`      | `MetricClient` | Pre-configured Metric client            |
| `apiKey`      | `string`       | New Relic API key (`NEW_RELIC_API_KEY`) |
| `serviceName` | `string`       | Service name (`NestKit`)                |
| `endpoint`    | `string`       | Metric API endpoint                     |

Histograms and timings use `SummaryMetric` (count + sum). Counters use
`CounterMetric`; gauges use `GaugeMetric`.

---

### Custom adapter

Implement the `MetricsAdapter` interface for any backend:

```typescript
import { MetricsModule } from '@os.io/nest-kit/infra/metrics';
import type { MetricsAdapter } from '@os.io/nest-kit/infra/metrics';

class RedisAdapter implements MetricsAdapter {
  counter(name: string, value: number, tags?: Record<string, string>) {
    await redis.incrby(`metric:${name}`, value);
  }
  gauge(name: string, value: number, tags?: Record<string, string>) {
    await redis.set(`metric:${name}`, value);
  }
  histogram(name: string, value: number, tags?: Record<string, string>) {
    await redis.lpush(`metric:${name}:hist`, value);
  }
  timing(name: string, durationMs: number, tags?: Record<string, string>) {
    await redis.lpush(`metric:${name}:timing`, durationMs);
  }
}

MetricsModule.forRoot({
  adapter: new RedisAdapter(),
});
```

## Architecture

```
┌──────────────┐   counter/gauge     ┌──────────────────┐
│  Controller  │   histogram/timing  │  MetricsService  │
│              │ ──────────────────>│  (singleton)      │
│  Service     │                    │                   │
│              │                    │  • mergeTags()    │
│  Guard       │                    └────────┬──────────┘
│  Interceptor │                             │
└──────────────┘                   ┌─────────┴──────────┐
                                   │   MetricsAdapter   │
                                   │   (interface)      │
                                   └─────────┬──────────┘
                                             │
        ┌──────┬──────┬──────┬──────┬──────┬─┴───┬──────┬──────┬──────┬──────┐
        │      │      │      │      │      │      │      │      │      │      │
   ┌────┴───┐ ┌┴─────┐ ┌┴─────┐ ┌┴─────┐ ┌┴─────┐ ┌┴─────┐ ┌┴─────┐ ┌┴─────┐ ┌┴─────┐ ┌┴──────┐
   │Console │ │Sentry│ │Prom- │ │Open- │ │Data- │ │Cloud- │ │  GCP │ │Influx│ │StatsD│ │  New  │
   │        │ │      │ │etheus│ │Tele- │ │ dog  │ │Watch  │ │Monitor│ │  DB  │ │      │ │ Relic │
   └────────┘ └──────┘ └──────┘ └──────┘ └──────┘ └───────┘ └───────┘ └──────┘ └──────┘ └───────┘
```

## Comparison

| Feature                | Console | Sentry | Prometheus | OpenTelemetry | Datadog | CloudWatch | GCP Monitor | InfluxDB | StatsD | New Relic |
| ---------------------- | ------- | ------ | ---------- | ------------- | ------- | ---------- | ----------- | -------- | ------ | --------- |
| No extra dep           | ✅      | ❌     | ❌         | ❌            | ❌      | ❌         | ❌          | ❌       | ❌     | ❌        |
| Aggregation / query    | ❌      | ❌     | ✅         | ✅            | ✅      | ✅         | ✅          | ✅       | ❌     | ✅        |
| Local / dev friendly   | ✅      | ✅     | ✅         | ✅            | ❌      | ❌         | ❌          | ✅       | ✅     | ❌        |
| Cloud-managed          | ❌      | ✅     | ❌         | ❌            | ✅      | ✅         | ✅          | ❌       | ❌     | ✅        |
| Async (buffered)       | ❌      | ❌     | ❌         | ❌            | ❌      | ✅         | ✅          | ✅       | ❌     | ✅        |
| Self-hosted            | ✅      | ❌     | ✅         | ✅            | ❌      | ❌         | ❌          | ✅       | ✅     | ❌        |
| Pull-based (scrape)    | ❌      | ❌     | ✅         | ✅            | ❌      | ❌         | ❌          | ❌       | ❌     | ❌        |
| Push-based (agent/API) | ❌      | ✅     | ❌         | ❌            | ✅      | ✅         | ✅          | ✅       | ✅     | ✅        |
