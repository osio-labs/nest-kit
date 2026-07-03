/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { MetricsAdapter } from '../metrics.types';

export interface OpenTelemetryAdapterOptions {
  meter?: any;
  meterName?: string;
  meterVersion?: string;
}

export class OpenTelemetryAdapter implements MetricsAdapter {
  private api: any;
  private meter: any;
  private counters: Map<string, any> = new Map();
  private gauges: Map<string, any> = new Map();
  private histograms: Map<string, any> = new Map();

  constructor(options: OpenTelemetryAdapterOptions = {}) {
    this.api = this.loadApi();
    this.meter =
      options.meter ??
      this.api.metrics.getMeter(options.meterName ?? 'nestjs-kit', options.meterVersion ?? '1.0.0');
  }

  private loadApi(): any {
    try {
      return require('@opentelemetry/api');
    } catch {
      throw new Error(
        'Cannot find module "@opentelemetry/api".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install @opentelemetry/api\n',
      );
    }
  }

  private getOrCreateCounter(name: string): any {
    let counter = this.counters.get(name);
    if (!counter) {
      counter = this.meter.createCounter(name, { description: `Counter ${name}` });
      this.counters.set(name, counter);
    }
    return counter;
  }

  private getOrCreateGauge(name: string): any {
    let gauge = this.gauges.get(name);
    if (!gauge) {
      gauge = this.meter.createGauge(name, { description: `Gauge ${name}` });
      this.gauges.set(name, gauge);
    }
    return gauge;
  }

  private getOrCreateHistogram(name: string): any {
    let histogram = this.histograms.get(name);
    if (!histogram) {
      histogram = this.meter.createHistogram(name, { description: `Histogram ${name}` });
      this.histograms.set(name, histogram);
    }
    return histogram;
  }

  counter(name: string, value: number, tags?: Record<string, string>): void {
    const counter = this.getOrCreateCounter(name);
    counter.add(value, tags ?? {});
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const gauge = this.getOrCreateGauge(name);
    gauge.record(value, tags ?? {});
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    const histogram = this.getOrCreateHistogram(name);
    histogram.record(value, tags ?? {});
  }

  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    const histogram = this.getOrCreateHistogram(name);
    histogram.record(durationMs, tags ?? {});
  }
}
