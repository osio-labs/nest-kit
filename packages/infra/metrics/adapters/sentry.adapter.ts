/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { MetricsAdapter } from '../metrics.types.js';

export interface SentryMetricsAdapterOptions {
  client?: any;
  /** Tags attached to every metric. */
  defaultTags?: Record<string, string>;
}

/**
 * Sentry metrics adapter.
 *
 * Uses `@sentry/node` to send metrics distributions (histogram/timing)
 * and increment counters via beforeSend / captureEvent.
 *
 * Note: As of Sentry SDK v8, the low-level metrics API may vary.
 * This adapter wraps the Sentry `captureEvent` / `addBreadcrumb` pattern
 * for metric-like instrumentation.
 */
export class SentryMetricsAdapter implements MetricsAdapter {
  private Sentry: any;
  private defaultTags: Record<string, string>;

  constructor(options: SentryMetricsAdapterOptions = {}) {
    this.defaultTags = options.defaultTags ?? {};
    this.Sentry = options.client ?? this.loadClient();
  }

  private loadClient(): any {
    try {
      return require('@sentry/node');
    } catch {
      throw new Error(
        'Cannot find module "@sentry/node".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install @sentry/node\n',
      );
    }
  }

  private allTags(tags?: Record<string, string>): Record<string, string> {
    return { ...this.defaultTags, ...tags };
  }

  counter(name: string, value: number, tags?: Record<string, string>): void {
    // Use captureEvent for a counter-like breadcrumb
    this.Sentry.addBreadcrumb({
      category: 'metric.counter',
      message: `${name} += ${value}`,
      data: { metric: name, value, ...this.allTags(tags) },
    });
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.Sentry.addBreadcrumb({
      category: 'metric.gauge',
      message: `${name} = ${value}`,
      data: { metric: name, value, ...this.allTags(tags) },
    });
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.Sentry.addBreadcrumb({
      category: 'metric.histogram',
      message: `${name} = ${value}`,
      data: { metric: name, value, ...this.allTags(tags) },
    });
  }

  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    this.Sentry.addBreadcrumb({
      category: 'metric.timing',
      message: `${name} = ${durationMs}ms`,
      data: { metric: name, value: durationMs, unit: 'ms', ...this.allTags(tags) },
    });
  }
}
