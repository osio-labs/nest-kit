# Infra / Metrics

> Metrics & observability for NestJS — record counters, gauges, histograms, and timings through a pluggable adapter interface. Supports [Prometheus](https://prometheus.io/), [OpenTelemetry](https://opentelemetry.io/), [Datadog](https://www.datadoghq.com/), [AWS CloudWatch](https://aws.amazon.com/cloudwatch/), [GCP Cloud Monitoring](https://cloud.google.com/monitoring), [InfluxDB](https://www.influxdata.com/), [StatsD](https://github.com/statsd/statsd), [New Relic](https://newrelic.com/), [Sentry](https://sentry.io/), and a development Console adapter.

```
@os.io/nest-kit/infra/metrics
```

---

## Installation

```bash
npm install @os.io/nest-kit
```

Optional peer dependencies for third-party backends:

```bash
# Prometheus
npm install prom-client

# OpenTelemetry
npm install @opentelemetry/api

# Datadog (via DogStatsD)
npm install hot-shots

# AWS CloudWatch
npm install @aws-sdk/client-cloudwatch

# Google Cloud Monitoring
npm install @google-cloud/monitoring

# InfluxDB
npm install @influxdata/influxdb-client

# StatsD (raw UDP)
npm install statsd-client

# New Relic
npm install @newrelic/telemetry-sdk

# Sentry
npm install @sentry/node
```

All optional deps are loaded lazily — safe to import without them; errors thrown only on use.

---

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
    // ... work ...
    this.metrics.timing('order.create.duration', Date.now() - start);
  }
}
```

---

## Adapters

Each adapter implements `MetricsAdapter` and is passed to `MetricsModule.forRoot({ adapter: … })`.

:::tabs

== Console

**No dependencies.**

```typescript
import { ConsoleAdapter } from '@os.io/nest-kit/infra/metrics/adapters';

MetricsModule.forRoot({
  adapter: new ConsoleAdapter({
    format: 'json', // 'json' | 'pretty'
    logger: console.log,
  }),
});
```

| Option   | Type                        | Default       | Description             |
| -------- | --------------------------- | ------------- | ----------------------- |
| `format` | `'json' \| 'pretty'`        | `'json'`      | Output format           |
| `logger` | `(message: string) => void` | `console.log` | Custom logging function |

Best for local development and debugging. Does not persist or send data anywhere.

== Prometheus

**Dependency:** [`prom-client`](https://github.com/siimon/prom-client) · [prometheus.io](https://prometheus.io/)

```typescript
import { PrometheusAdapter } from '@os.io/nest-kit/infra/metrics/adapters';

MetricsModule.forRoot({
  adapter: new PrometheusAdapter({
    prefix: 'myapp',
    defaultLabels: { app: 'myapi' },
  }),
});
```

| Option          | Type                     | Description                       |
| --------------- | ------------------------ | --------------------------------- |
| `prefix`        | `string`                 | Prefix added to every metric name |
| `defaultLabels` | `Record<string, string>` | Labels applied to all metrics     |
| `registry`      | `Registry`               | Custom `prom-client` registry     |

Automatically creates Counter, Gauge, and Histogram instruments on first use via `prom-client`.

== OpenTelemetry

**Dependency:** [`@opentelemetry/api`](https://www.npmjs.com/package/@opentelemetry/api) · [opentelemetry.io](https://opentelemetry.io/)

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

Creates Counter, Gauge, and Histogram instruments lazily. Timings use Histogram.

== Datadog

**Dependency:** [`hot-shots`](https://github.com/brightcove/hot-shots) via [DogStatsD](https://docs.datadoghq.com/developers/dogstatsd/) · [datadoghq.com](https://www.datadoghq.com/)

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

== AWS CloudWatch

**Dependency:** [`@aws-sdk/client-cloudwatch`](https://www.npmjs.com/package/@aws-sdk/client-cloudwatch) · [aws.amazon.com/cloudwatch](https://aws.amazon.com/cloudwatch/)

```typescript
import { CloudWatchAdapter } from '@os.io/nest-kit/infra/metrics/adapters';

MetricsModule.forRoot({
  adapter: new CloudWatchAdapter({
    namespace: 'MyApp/Metrics',
    region: 'us-east-1',
    flushIntervalMs: 10000,
  }),
});
```

| Option            | Type               | Description                              |
| ----------------- | ------------------ | ---------------------------------------- |
| `client`          | `CloudWatchClient` | Pre-configured client                    |
| `namespace`       | `string`           | CloudWatch namespace (`NestKit/Metrics`) |
| `region`          | `string`           | AWS region                               |
| `flushIntervalMs` | `number`           | Metric flush interval (default 10000ms)  |

Metrics are buffered and sent in batches of up to 20. Call `destroy()` to flush on shutdown.

== GCP Cloud Monitoring

**Dependency:** [`@google-cloud/monitoring`](https://www.npmjs.com/package/@google-cloud/monitoring) · [cloud.google.com/monitoring](https://cloud.google.com/monitoring)

```typescript
import { GcpMonitoringAdapter } from '@os.io/nest-kit/infra/metrics/adapters';

MetricsModule.forRoot({
  adapter: new GcpMonitoringAdapter({
    projectId: 'my-project',
    metricPrefix: 'custom.googleapis.com',
  }),
});
```

| Option         | Type         | Description                                  |
| -------------- | ------------ | -------------------------------------------- |
| `client`       | `Monitoring` | Pre-configured Monitoring client             |
| `projectId`    | `string`     | GCP project ID (from `GCP_PROJECT_ID`)       |
| `metricPrefix` | `string`     | Metric type prefix (`custom.googleapis.com`) |

Counters use CUMULATIVE / INT64; gauges, histograms, and timings use GAUGE / DOUBLE.

== InfluxDB

**Dependency:** [`@influxdata/influxdb-client`](https://www.npmjs.com/package/@influxdata/influxdb-client) · [influxdata.com](https://www.influxdata.com/)

```typescript
import { InfluxDbAdapter } from '@os.io/nest-kit/infra/metrics/adapters';

MetricsModule.forRoot({
  adapter: new InfluxDbAdapter({
    url: 'http://localhost:8086',
    token: process.env.INFLUX_TOKEN,
    org: 'my-org',
    bucket: 'my-bucket',
    defaultTags: { app: 'myapi' },
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

Each method call writes a point with a `value` float field and closes the write API.

== StatsD

**Dependency:** [`statsd-client`](https://github.com/msiebuhr/node-statsd-client) · [github.com/statsd/statsd](https://github.com/statsd/statsd)

```typescript
import { StatsdAdapter } from '@os.io/nest-kit/infra/metrics/adapters';

MetricsModule.forRoot({
  adapter: new StatsdAdapter({
    host: 'localhost',
    port: 8125,
    prefix: 'myapp',
    globalTags: 'env:production',
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

Raw UDP StatsD protocol. Errors are silently swallowed (fire-and-forget).

== New Relic

**Dependency:** [`@newrelic/telemetry-sdk`](https://www.npmjs.com/package/@newrelic/telemetry-sdk) · [newrelic.com](https://newrelic.com/)

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

Histograms and timings use SummaryMetric (count + sum). Counters use CounterMetric; gauges use GaugeMetric.

== Sentry

**Dependency:** [`@sentry/node`](https://www.npmjs.com/package/@sentry/node) · [sentry.io](https://sentry.io/)

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
| `client`      | `@sentry/node` module    | Pre-configured Sentry instance |
| `defaultTags` | `Record<string, string>` | Tags added to every breadcrumb |

Sends metrics as Sentry breadcrumbs (`metric.counter`, `metric.gauge`, `metric.histogram`, `metric.timing` categories).

:::

---

## Module Options

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

---

## Exported Values

| Export                 | Kind      | Description                                       |
| ---------------------- | --------- | ------------------------------------------------- |
| `MetricsModule`        | Class     | NestJS dynamic module                             |
| `MetricsService`       | Class     | Singleton service for all metrics                 |
| `MetricsAdapter`       | Interface | Contract for backend adapters                     |
| `MetricsModuleOptions` | Interface | Module configuration options                      |
| `MetricType`           | Type      | `'counter' \| 'gauge' \| 'histogram' \| 'timing'` |

### Adapter exports (`@os.io/nest-kit/infra/metrics/adapters`)

| Export                 | Backend             | Dependency                    |
| ---------------------- | ------------------- | ----------------------------- |
| `ConsoleAdapter`       | Console             | None                          |
| `PrometheusAdapter`    | Prometheus          | `prom-client`                 |
| `OpenTelemetryAdapter` | OpenTelemetry       | `@opentelemetry/api`          |
| `DatadogAdapter`       | Datadog / DogStatsD | `hot-shots`                   |
| `CloudWatchAdapter`    | AWS CloudWatch      | `@aws-sdk/client-cloudwatch`  |
| `GcpMonitoringAdapter` | GCP Monitoring      | `@google-cloud/monitoring`    |
| `InfluxDbAdapter`      | InfluxDB            | `@influxdata/influxdb-client` |
| `StatsdAdapter`        | StatsD (UDP)        | `statsd-client`               |
| `NewRelicAdapter`      | New Relic           | `@newrelic/telemetry-sdk`     |
| `SentryMetricsAdapter` | Sentry              | `@sentry/node`                |
