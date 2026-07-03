/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { MetricsAdapter } from '../metrics.types';

export interface PrometheusAdapterOptions {
  prefix?: string;
  defaultLabels?: Record<string, string>;
  registry?: any;
}

export class PrometheusAdapter implements MetricsAdapter {
  private client: any;
  private prefix: string;
  private registry: any;
  private counters: Map<string, any> = new Map();
  private gauges: Map<string, any> = new Map();
  private histograms: Map<string, any> = new Map();

  constructor(options: PrometheusAdapterOptions = {}) {
    this.prefix = options.prefix ?? '';
    this.client = this.loadClient();
    this.registry = options.registry ?? this.client.register;
    if (options.defaultLabels) {
      this.registry.setDefaultLabels(options.defaultLabels);
    }
  }

  private loadClient(): any {
    try {
      return require('prom-client');
    } catch {
      throw new Error(
        'Cannot find module "prom-client".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install prom-client\n',
      );
    }
  }

  private prefixed(name: string): string {
    return this.prefix ? `${this.prefix}_${name}` : name;
  }

  private getOrCreateCounter(name: string, tags?: Record<string, string>): any {
    const key = this.prefixed(name);
    let counter = this.counters.get(key);
    if (!counter) {
      const labelNames = tags ? Object.keys(tags) : [];
      counter = new this.client.Counter({
        name: key,
        help: `Counter metric ${key}`,
        labelNames,
        registers: [this.registry],
      });
      this.counters.set(key, counter);
    }
    return counter;
  }

  private getOrCreateGauge(name: string, tags?: Record<string, string>): any {
    const key = this.prefixed(name);
    let gauge = this.gauges.get(key);
    if (!gauge) {
      const labelNames = tags ? Object.keys(tags) : [];
      gauge = new this.client.Gauge({
        name: key,
        help: `Gauge metric ${key}`,
        labelNames,
        registers: [this.registry],
      });
      this.gauges.set(key, gauge);
    }
    return gauge;
  }

  private getOrCreateHistogram(name: string, tags?: Record<string, string>): any {
    const key = this.prefixed(name);
    let histogram = this.histograms.get(key);
    if (!histogram) {
      const labelNames = tags ? Object.keys(tags) : [];
      histogram = new this.client.Histogram({
        name: key,
        help: `Histogram metric ${key}`,
        labelNames,
        registers: [this.registry],
      });
      this.histograms.set(key, histogram);
    }
    return histogram;
  }

  counter(name: string, value: number, tags?: Record<string, string>): void {
    const counter = this.getOrCreateCounter(name, tags);
    counter.inc(tags ?? {}, value);
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const gauge = this.getOrCreateGauge(name, tags);
    gauge.set(tags ?? {}, value);
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    const histogram = this.getOrCreateHistogram(name, tags);
    histogram.observe(tags ?? {}, value);
  }

  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    const histogram = this.getOrCreateHistogram(name, tags);
    histogram.observe(tags ?? {}, durationMs);
  }
}
