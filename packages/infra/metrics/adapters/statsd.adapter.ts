/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { MetricsAdapter } from '../metrics.types.js';

export interface StatsdAdapterOptions {
  client?: any;
  host?: string;
  port?: number;
  prefix?: string;
  /** Tags in `tag1:value1,tag2:value2` format appended to every metric. */
  globalTags?: string;
}

/**
 * Raw StatsD adapter using `statsd-client`.
 *
 * Sends metrics via UDP. Best-effort — errors are silently swallowed
 * since UDP datagrams are fire-and-forget.
 */
export class StatsdAdapter implements MetricsAdapter {
  private client: any;
  private prefix: string;

  constructor(options: StatsdAdapterOptions = {}) {
    this.prefix = options.prefix ?? '';
    this.client = options.client ?? this.loadClient(options);
  }

  private loadClient(options: StatsdAdapterOptions): any {
    try {
      const SDC = require('statsd-client');
      return new SDC({
        host: options.host ?? 'localhost',
        port: options.port ?? 8125,
        prefix: this.prefix,
        globalTags: options.globalTags,
      });
    } catch {
      throw new Error(
        'Cannot find module "statsd-client".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install statsd-client\n',
      );
    }
  }

  counter(name: string, value: number, tags?: Record<string, string>): void {
    try {
      this.client.counter(name, value, tags);
    } catch {
      /* swallow */
    }
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    try {
      this.client.gauge(name, value, tags);
    } catch {
      /* swallow */
    }
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    try {
      this.client.histogram(name, value, tags);
    } catch {
      /* swallow */
    }
  }

  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    try {
      this.client.timing(name, durationMs, tags);
    } catch {
      /* swallow */
    }
  }
}
