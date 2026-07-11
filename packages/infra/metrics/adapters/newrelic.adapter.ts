/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { MetricsAdapter } from '../metrics.types.js';

export interface NewRelicAdapterOptions {
  client?: any;
  apiKey?: string;
  /** Default: `'NestKit'`. */
  serviceName?: string;
  /** Default: `'https://metric-api.newrelic.com'`. */
  endpoint?: string;
}

export class NewRelicAdapter implements MetricsAdapter {
  private client: any;
  private CounterMetric: any;
  private GaugeMetric: any;
  private SummaryMetric: any;

  constructor(options: NewRelicAdapterOptions = {}) {
    this.loadSdkClasses();
    this.client = options.client ?? this.createClient(options);
  }

  private loadSdkClasses(): void {
    try {
      const sdk = require('@newrelic/telemetry-sdk');
      this.CounterMetric = sdk.CounterMetric;
      this.GaugeMetric = sdk.GaugeMetric;
      this.SummaryMetric = sdk.SummaryMetric;
    } catch {
      throw new Error(
        'Cannot find module "@newrelic/telemetry-sdk".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install @newrelic/telemetry-sdk\n',
      );
    }
  }

  private createClient(options: NewRelicAdapterOptions): any {
    const { MetricClient } = require('@newrelic/telemetry-sdk');
    return new MetricClient({
      apiKey: options.apiKey ?? process.env.NEW_RELIC_API_KEY ?? '',
      serviceName: options.serviceName ?? 'NestKit',
      endpoint: options.endpoint ?? 'https://metric-api.newrelic.com',
    });
  }

  private async sendMetric(
    type: 'counter' | 'gauge' | 'summary',
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): Promise<void> {
    const common = { name, attributes: tags ?? {} };
    let metric: any;
    if (type === 'counter') {
      metric = new this.CounterMetric({ ...common, value });
    } else if (type === 'gauge') {
      metric = new this.GaugeMetric({ ...common, value });
    } else {
      metric = new this.SummaryMetric({ ...common, count: 1, sum: value });
    }
    try {
      await this.client.send({ metrics: [metric] });
    } catch {
      /* swallow */
    }
  }

  counter(name: string, value: number, tags?: Record<string, string>): Promise<void> {
    return this.sendMetric('counter', name, value, tags);
  }

  gauge(name: string, value: number, tags?: Record<string, string>): Promise<void> {
    return this.sendMetric('gauge', name, value, tags);
  }

  histogram(name: string, value: number, tags?: Record<string, string>): Promise<void> {
    return this.sendMetric('summary', name, value, tags);
  }

  timing(name: string, durationMs: number, tags?: Record<string, string>): Promise<void> {
    return this.sendMetric('summary', name, durationMs, tags);
  }
}
