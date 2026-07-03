/**
 * Metric types supported by the adapter interface.
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timing';

/**
 * Adapter interface for third-party metrics backends.
 *
 * Each method records a metric value with optional tags/labels and
 * may return a `Promise` for backends that require async submission.
 */
export interface MetricsAdapter {
  /**
   * Increment a counter by the given value.
   */
  counter(name: string, value: number, tags?: Record<string, string>): Promise<void> | void;

  /**
   * Set a gauge to the given value.
   */
  gauge(name: string, value: number, tags?: Record<string, string>): Promise<void> | void;

  /**
   * Record a histogram observation.
   */
  histogram(name: string, value: number, tags?: Record<string, string>): Promise<void> | void;

  /**
   * Record a timing / duration in milliseconds.
   */
  timing(name: string, durationMs: number, tags?: Record<string, string>): Promise<void> | void;
}

/**
 * Options accepted by `MetricsModule.forRoot()`.
 */
export interface MetricsModuleOptions {
  /** The metrics adapter implementation to use. */
  adapter: MetricsAdapter;

  /**
   * Default tags applied to every metric.
   * Merged with per-call tags (per-call tags take precedence).
   */
  defaultTags?: Record<string, string>;

  /** Register the module as global (default `true`). */
  global?: boolean;
}

/**
 * Options accepted by `MetricsModule.forRootAsync()`.
 */
export interface MetricsModuleAsyncOptions {
  useFactory: (...args: unknown[]) => Promise<MetricsModuleOptions> | MetricsModuleOptions;
  inject?: any[];
  imports?: any[];
  global?: boolean;
}
