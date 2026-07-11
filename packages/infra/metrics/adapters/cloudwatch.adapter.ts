/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { MetricsAdapter } from '../metrics.types.js';

export interface CloudWatchAdapterOptions {
  client?: any;
  namespace?: string;
  region?: string;
  /** Flush interval in milliseconds (default 10000). */
  flushIntervalMs?: number;
}

interface MetricDatum {
  MetricName: string;
  Value: number;
  Unit: string;
  Dimensions?: { Name: string; Value: string }[];
  Timestamp?: Date;
}

export class CloudWatchAdapter implements MetricsAdapter {
  private client: any;
  private namespace: string;
  private buffer: MetricDatum[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(options: CloudWatchAdapterOptions = {}) {
    this.namespace = options.namespace ?? 'NestKit/Metrics';
    this.client = options.client ?? this.loadClient(options);
    const interval = options.flushIntervalMs ?? 10000;
    this.timer = setInterval(() => {
      void this.flush();
    }, interval);
    if (this.timer && typeof this.timer === 'object' && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  private loadClient(options: CloudWatchAdapterOptions): any {
    try {
      const { CloudWatchClient } = require('@aws-sdk/client-cloudwatch');
      return new CloudWatchClient({
        region: options.region ?? process.env.AWS_REGION ?? 'us-east-1',
      });
    } catch {
      throw new Error(
        'Cannot find module "@aws-sdk/client-cloudwatch".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install @aws-sdk/client-cloudwatch\n',
      );
    }
  }

  private toDimensions(
    tags?: Record<string, string>,
  ): { Name: string; Value: string }[] | undefined {
    if (!tags || Object.keys(tags).length === 0) return undefined;
    return Object.entries(tags).map(([Name, Value]) => ({ Name, Value }));
  }

  counter(name: string, value: number, tags?: Record<string, string>): void {
    this.buffer.push({
      MetricName: name,
      Value: value,
      Unit: 'Count',
      Dimensions: this.toDimensions(tags),
      Timestamp: new Date(),
    });
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.buffer.push({
      MetricName: name,
      Value: value,
      Unit: 'None',
      Dimensions: this.toDimensions(tags),
      Timestamp: new Date(),
    });
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.buffer.push({
      MetricName: name,
      Value: value,
      Unit: 'None',
      Dimensions: this.toDimensions(tags),
      Timestamp: new Date(),
    });
  }

  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    this.buffer.push({
      MetricName: name,
      Value: durationMs,
      Unit: 'Milliseconds',
      Dimensions: this.toDimensions(tags),
      Timestamp: new Date(),
    });
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.buffer.length);
    try {
      const { PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
      while (batch.length > 0) {
        const chunk = batch.splice(0, 20);
        await this.client.send(
          new PutMetricDataCommand({
            Namespace: this.namespace,
            MetricData: chunk,
          }),
        );
      }
    } catch {
      /* swallow — metrics must never crash the app */
    }
  }

  async destroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush().catch(() => {
      /* swallow */
    });
  }
}
