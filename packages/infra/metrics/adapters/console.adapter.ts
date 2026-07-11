import type { MetricsAdapter } from '../metrics.types.js';

export interface ConsoleAdapterOptions {
  logger?: (message: string) => void;
  format?: 'json' | 'pretty';
}

export class ConsoleAdapter implements MetricsAdapter {
  private logger: (message: string) => void;
  private format: 'json' | 'pretty';

  constructor(options: ConsoleAdapterOptions = {}) {
    this.logger = options.logger ?? console.log;
    this.format = options.format ?? 'json';
  }

  counter(name: string, value: number, tags?: Record<string, string>): void {
    this.log(this.serialize('counter', name, value, tags));
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.log(this.serialize('gauge', name, value, tags));
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.log(this.serialize('histogram', name, value, tags));
  }

  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    this.log(this.serialize('timing', name, durationMs, tags));
  }

  private serialize(
    type: string,
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): string {
    if (this.format === 'pretty') {
      const tagStr = tags ? ` ${JSON.stringify(tags)}` : '';
      return `[METRICS] ${type} | ${name} = ${value}${tagStr}`;
    }
    return JSON.stringify({ type, name, value, tags, timestamp: new Date().toISOString() });
  }

  private log(msg: string): void {
    this.logger(msg);
  }
}
