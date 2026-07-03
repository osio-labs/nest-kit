/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { MetricsAdapter } from '../metrics.types';

export interface DatadogAdapterOptions {
  client?: any;
  host?: string;
  port?: number;
  prefix?: string;
  /** DogStatsD tags applied to all metrics. */
  defaultTags?: Record<string, string>;
}

export class DatadogAdapter implements MetricsAdapter {
  private client: any;
  private prefix: string;

  constructor(options: DatadogAdapterOptions = {}) {
    this.prefix = options.prefix ?? '';
    this.client = options.client ?? this.loadClient(options);
  }

  private loadClient(options: DatadogAdapterOptions): any {
    try {
      const { StatsD } = require('hot-shots');
      return new StatsD({
        host: options.host ?? 'localhost',
        port: options.port ?? 8125,
        globalTags: options.defaultTags,
        errorHandler: () => {
          /* swallow — metrics must never crash the app */
        },
      });
    } catch {
      throw new Error(
        'Cannot find module "hot-shots".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install hot-shots\n',
      );
    }
  }

  private prefixed(name: string): string {
    return this.prefix ? `${this.prefix}.${name}` : name;
  }

  counter(name: string, value: number, tags?: Record<string, string>): void {
    this.client.increment(this.prefixed(name), value, tags);
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.client.gauge(this.prefixed(name), value, tags);
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.client.histogram(this.prefixed(name), value, tags);
  }

  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    this.client.timing(this.prefixed(name), durationMs, tags);
  }
}
