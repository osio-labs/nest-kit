/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { MetricsAdapter } from '../metrics.types';

export interface InfluxDbAdapterOptions {
  client?: any;
  url?: string;
  token?: string;
  org?: string;
  bucket?: string;
  /** Tags applied to every point. */
  defaultTags?: Record<string, string>;
}

export class InfluxDbAdapter implements MetricsAdapter {
  private client: any;
  private org: string;
  private bucket: string;
  private defaultTags: Record<string, string>;

  constructor(options: InfluxDbAdapterOptions = {}) {
    this.org = options.org ?? process.env.INFLUX_ORG ?? '';
    this.bucket = options.bucket ?? process.env.INFLUX_BUCKET ?? 'metrics';
    this.defaultTags = options.defaultTags ?? {};
    this.client = options.client ?? this.loadClient(options);
  }

  private loadClient(options: InfluxDbAdapterOptions): any {
    try {
      const { InfluxDB, Point } = require('@influxdata/influxdb-client');
      const influx = new InfluxDB({
        url: options.url ?? process.env.INFLUX_URL ?? 'http://localhost:8086',
        token: options.token ?? process.env.INFLUX_TOKEN,
      });
      influx.Point = Point;
      return influx;
    } catch {
      throw new Error(
        'Cannot find module "@influxdata/influxdb-client".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install @influxdata/influxdb-client\n',
      );
    }
  }

  private async writePoint(
    measurement: string,
    value: number,
    tags?: Record<string, string>,
  ): Promise<void> {
    const Point = this.client.Point;
    const point = new Point(measurement);
    point.floatField('value', value);
    const allTags = { ...this.defaultTags, ...tags };
    for (const [k, v] of Object.entries(allTags)) {
      point.tag(k, v);
    }
    point.timestamp(new Date());
    const writeApi = this.client.getWriteApi(this.org, this.bucket);
    writeApi.writePoint(point);
    try {
      await writeApi.close();
    } catch {
      /* swallow */
    }
  }

  counter(name: string, value: number, tags?: Record<string, string>): Promise<void> {
    return this.writePoint(name, value, tags);
  }

  gauge(name: string, value: number, tags?: Record<string, string>): Promise<void> {
    return this.writePoint(name, value, tags);
  }

  histogram(name: string, value: number, tags?: Record<string, string>): Promise<void> {
    return this.writePoint(name, value, tags);
  }

  timing(name: string, durationMs: number, tags?: Record<string, string>): Promise<void> {
    return this.writePoint(name, durationMs, tags);
  }
}
