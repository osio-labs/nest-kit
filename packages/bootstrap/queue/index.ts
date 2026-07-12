/**
 * @os.io/nest-kit/bootstrap/queue
 *
 * BullMQ queue module configuration bootstrapper for NestJS applications.
 * Builds `BullModule.forRoot()` options from env vars or `ConfigService`.
 *
 * @module
 * @packageDocumentation
 */

import type { Getter } from '../with-config.js';
import { withConfig } from '../with-config.js';

/** Default job options shared by all queues. */
export interface BullDefaultJobOptions {
  /** Number of retry attempts. */
  attempts?: number;

  /** Backoff strategy for retries. */
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };

  /** Automatically remove completed jobs. */
  removeOnComplete?: boolean | { age?: number; count?: number };

  /** Automatically remove failed jobs. */
  removeOnFail?: boolean | { age?: number; count?: number };

  /** Delay before processing (milliseconds). */
  delay?: number;

  /** Optional priority. */
  priority?: number;

  /** Processing timeout (milliseconds). */
  timeout?: number;

  /** TTL for the job (milliseconds). */
  ttl?: number;

  /** Stack trace limit. */
  stackTraceLimit?: number;

  /** If true, jobs won't be processed automatically. */
  lifo?: boolean;
}

/** Top-level queue configuration for `BullModule.forRoot()`. */
export interface QueueConfigOptions {
  /** Key prefix for all queue keys in Redis. */
  prefix?: string;

  /** Default job options applied to all queues. */
  defaultJobOptions?: BullDefaultJobOptions;

  /** Register as `@Global()` module. */
  isGlobal?: boolean;
}

type QueueResult = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildQueueConfig(get: Getter, options?: QueueConfigOptions): QueueResult {
  const url = get.str('QUEUE_URL');
  if (!url) throw new Error('[@os.io/nest-kit] QUEUE_URL is required');

  const prefix = options?.prefix ?? get.str('QUEUE_PREFIX');

  return {
    connection: { url },
    defaultJobOptions: {
      timeout: 5 * 60 * 1000,
      removeOnComplete: true,
      removeOnFail: true,
      ...options?.defaultJobOptions,
    },
    ...(prefix !== undefined && { prefix }),
    ...(options?.isGlobal && { isGlobal: true }),
  };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Build BullMQ module options from environment variables or ConfigService.
 *
 * Connection is read from `QUEUE_URL`. All other settings (job options,
 * global, prefix) go in the options object.
 *
 * @param options - Optional overrides (prefix, job options, isGlobal).
 * @param configService - Optional ConfigService (for `forRootAsync` pattern).
 *
 * @example
 * ```ts
 * // Sync — reads process.env
 * BullModule.forRoot(configQueue())
 *
 * // Async — uses ConfigService
 * BullModule.forRootAsync({
 *   useFactory: (cs) => configQueue(undefined, cs),
 *   inject: [ConfigService],
 * })
 * ```
 *
 * Environment variables:
 * | Variable        | Default | Description                |
 * |-----------------|---------|----------------------------|
 * | `QUEUE_URL`     | —       | Redis/Valkey connection URL |
 * | `QUEUE_PREFIX`  | —       | Key prefix for queue keys  |
 */
export const configQueue = withConfig<QueueConfigOptions, QueueResult>(buildQueueConfig);
