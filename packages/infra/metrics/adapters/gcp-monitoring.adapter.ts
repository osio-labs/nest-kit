/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { MetricsAdapter } from '../metrics.types';

export interface GcpMonitoringAdapterOptions {
  client?: any;
  projectId?: string;
  metricPrefix?: string;
}

export class GcpMonitoringAdapter implements MetricsAdapter {
  private client: any;
  private projectId: string;
  private metricPrefix: string;
  private buffer: any[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(options: GcpMonitoringAdapterOptions = {}) {
    this.projectId = options.projectId ?? process.env.GCP_PROJECT_ID ?? '';
    this.metricPrefix = options.metricPrefix ?? 'custom.googleapis.com';
    this.client = options.client ?? this.loadClient();
    const interval = 10000;
    this.timer = setInterval(() => {
      void this.flush();
    }, interval);
    if (this.timer && typeof this.timer === 'object' && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  private loadClient(): any {
    try {
      const { Monitoring } = require('@google-cloud/monitoring');
      return new Monitoring({ projectId: this.projectId || undefined });
    } catch {
      throw new Error(
        'Cannot find module "@google-cloud/monitoring".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install @google-cloud/monitoring\n',
      );
    }
  }

  private fullMetricName(name: string): string {
    return `${this.metricPrefix}/${name}`;
  }

  private buildTimeSeries(
    name: string,
    value: number,
    metricKind: string,
    valueType: string,
    tags?: Record<string, string>,
  ): any {
    return {
      metric: {
        type: this.fullMetricName(name),
        labels: tags ?? {},
      },
      resource: {
        type: 'global',
        labels: {},
      },
      metricKind,
      valueType,
      points: [
        {
          interval: {
            endTime: { seconds: Math.floor(Date.now() / 1000) },
          },
          value:
            valueType === 'INT64'
              ? { int64Value: String(Math.round(value)) }
              : { doubleValue: value },
        },
      ],
    };
  }

  counter(name: string, value: number, tags?: Record<string, string>): void {
    this.buffer.push(this.buildTimeSeries(name, value, 'CUMULATIVE', 'INT64', tags));
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.buffer.push(this.buildTimeSeries(name, value, 'GAUGE', 'DOUBLE', tags));
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.buffer.push(this.buildTimeSeries(name, value, 'GAUGE', 'DOUBLE', tags));
  }

  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    this.buffer.push(this.buildTimeSeries(name, durationMs, 'GAUGE', 'DOUBLE', tags));
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.buffer.length);
    try {
      const projectName = `projects/${this.projectId}`;
      await this.client.createTimeSeries({
        name: projectName,
        timeSeries: batch,
      });
    } catch {
      /* swallow */
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
