/**
 * Built-in adapters for the metrics module.
 *
 * Each adapter implements {@link MetricsAdapter} and can be passed
 * to `MetricsModule.forRoot({ adapter: … })`.
 *
 * @module
 * @packageDocumentation
 */

export { ConsoleAdapter } from './console.adapter.js';
export type { ConsoleAdapterOptions } from './console.adapter.js';

export { PrometheusAdapter } from './prometheus.adapter.js';
export type { PrometheusAdapterOptions } from './prometheus.adapter.js';

export { OpenTelemetryAdapter } from './opentelemetry.adapter.js';
export type { OpenTelemetryAdapterOptions } from './opentelemetry.adapter.js';

export { DatadogAdapter } from './datadog.adapter.js';
export type { DatadogAdapterOptions } from './datadog.adapter.js';

export { CloudWatchAdapter } from './cloudwatch.adapter.js';
export type { CloudWatchAdapterOptions } from './cloudwatch.adapter.js';

export { GcpMonitoringAdapter } from './gcp-monitoring.adapter.js';
export type { GcpMonitoringAdapterOptions } from './gcp-monitoring.adapter.js';

export { InfluxDbAdapter } from './influxdb.adapter.js';
export type { InfluxDbAdapterOptions } from './influxdb.adapter.js';

export { StatsdAdapter } from './statsd.adapter.js';
export type { StatsdAdapterOptions } from './statsd.adapter.js';

export { NewRelicAdapter } from './newrelic.adapter.js';
export type { NewRelicAdapterOptions } from './newrelic.adapter.js';

export { SentryMetricsAdapter } from './sentry.adapter.js';
export type { SentryMetricsAdapterOptions } from './sentry.adapter.js';
