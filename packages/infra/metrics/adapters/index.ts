/**
 * Built-in adapters for the metrics module.
 *
 * Each adapter implements {@link MetricsAdapter} and can be passed
 * to `MetricsModule.forRoot({ adapter: … })`.
 *
 * @module
 * @packageDocumentation
 */

export { ConsoleAdapter } from './console.adapter';
export type { ConsoleAdapterOptions } from './console.adapter';

export { PrometheusAdapter } from './prometheus.adapter';
export type { PrometheusAdapterOptions } from './prometheus.adapter';

export { OpenTelemetryAdapter } from './opentelemetry.adapter';
export type { OpenTelemetryAdapterOptions } from './opentelemetry.adapter';

export { DatadogAdapter } from './datadog.adapter';
export type { DatadogAdapterOptions } from './datadog.adapter';

export { CloudWatchAdapter } from './cloudwatch.adapter';
export type { CloudWatchAdapterOptions } from './cloudwatch.adapter';

export { GcpMonitoringAdapter } from './gcp-monitoring.adapter';
export type { GcpMonitoringAdapterOptions } from './gcp-monitoring.adapter';

export { InfluxDbAdapter } from './influxdb.adapter';
export type { InfluxDbAdapterOptions } from './influxdb.adapter';

export { StatsdAdapter } from './statsd.adapter';
export type { StatsdAdapterOptions } from './statsd.adapter';

export { NewRelicAdapter } from './newrelic.adapter';
export type { NewRelicAdapterOptions } from './newrelic.adapter';

export { SentryMetricsAdapter } from './sentry.adapter';
export type { SentryMetricsAdapterOptions } from './sentry.adapter';
