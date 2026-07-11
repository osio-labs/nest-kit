/**
 * @os.io/nest-kit/infra/metrics
 *
 * Metrics & observability — record counters, gauges, histograms, and
 * timings through a pluggable adapter interface. Supports Prometheus,
 * OpenTelemetry, Datadog, CloudWatch, GCP Monitoring, InfluxDB, StatsD,
 * New Relic, Sentry, and a development Console adapter.
 *
 * ## Quick Start
 *
 * ```typescript
 * import { MetricsModule } from '@os.io/nest-kit/infra/metrics';
 * import { ConsoleAdapter } from '@os.io/nest-kit/infra/metrics/adapters';
 *
 * @Module({
 *   imports: [
 *     MetricsModule.forRoot({
 *       adapter: new ConsoleAdapter({ format: 'pretty' }),
 *       defaultTags: { app: 'my-api' },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * Then inject `MetricsService` anywhere:
 * ```typescript
 * constructor(private readonly metrics: MetricsService) {}
 * // ...
 * this.metrics.counter('http.requests', 1, { method: 'GET' });
 * ```
 *
 * @module
 * @packageDocumentation
 */

// ──────── Types ────────
export type {
  MetricType,
  MetricsAdapter,
  MetricsModuleOptions,
  MetricsModuleAsyncOptions,
} from './metrics.types.js';

// ──────── Constants ────────
export { METRICS_MODULE_OPTIONS, METRICS_ADAPTER } from './metrics.constants.js';

// ──────── Service ────────
export { MetricsService } from './metrics.service.js';

// ──────── NestJS Module ────────
export { MetricsModule } from './metrics.module.js';

// ──────── Built-in Adapters ────────
export * from './adapters/index.js';
