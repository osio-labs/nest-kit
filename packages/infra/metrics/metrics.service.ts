import { Inject, Injectable } from '@nestjs/common';
import { METRICS_ADAPTER, METRICS_MODULE_OPTIONS } from './metrics.constants';
import type { MetricsAdapter, MetricsModuleOptions } from './metrics.types';

/**
 * Service for recording application metrics.
 *
 * Delegates to a configurable {@link MetricsAdapter} and applies default
 * tags automatically.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class OrderService {
 *   constructor(private readonly metrics: MetricsService) {}
 *
 *   async createOrder() {
 *     this.metrics.counter('order.created', 1, { currency: 'USD' });
 *     const start = Date.now();
 *     // ... work ...
 *     this.metrics.timing('order.create.duration', Date.now() - start);
 *   }
 * }
 * ```
 */
@Injectable()
export class MetricsService {
  constructor(
    @Inject(METRICS_ADAPTER)
    private readonly adapter: MetricsAdapter,
    @Inject(METRICS_MODULE_OPTIONS)
    private readonly options: MetricsModuleOptions,
  ) {}

  /**
   * Increment a counter metric.
   *
   * @param name   Metric name (e.g. `'http.requests.total'`).
   * @param value  Amount to increment (default `1`).
   * @param tags   Optional labels / tags.
   */
  counter(name: string, value = 1, tags?: Record<string, string>): void {
    void this.adapter.counter(name, value, this.mergeTags(tags));
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    void this.adapter.gauge(name, value, this.mergeTags(tags));
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    void this.adapter.histogram(name, value, this.mergeTags(tags));
  }

  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    void this.adapter.timing(name, durationMs, this.mergeTags(tags));
  }

  private mergeTags(tags?: Record<string, string>): Record<string, string> | undefined {
    if (!this.options.defaultTags) return tags;
    if (!tags) return this.options.defaultTags;
    return { ...this.options.defaultTags, ...tags };
  }
}
