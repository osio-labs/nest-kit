/**
 * @os.io/nest-kit/bootstrap/queue
 *
 * BullMQ queue module configuration bootstrapper for NestJS applications.
 * Supports Redis-backed queues with connection, prefix, and default job options.
 *
 * @module
 * @packageDocumentation
 */

import type { Getter } from '../with-config.js';
import { withConfig } from '../with-config.js';

/** Per-queue configuration. */
export interface QueueRegisterConfig {
  /** Queue name (required for `registerQueue`). */
  name: string;

  /** Default job options for this queue. */
  defaultJobOptions?: BullDefaultJobOptions;

  /** Streams prefix (overrides global). */
  prefix?: string;
}

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
  /** Redis connection details. */
  connection?: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    db?: number;
    tls?: Record<string, unknown>;
    maxRetriesPerRequest?: number | null;
    enableReadyCheck?: boolean;
  };

  /** Key prefix for all queue keys in Redis. */
  prefix?: string;

  /** Default job options applied to all queues. */
  defaultJobOptions?: BullDefaultJobOptions;

  /** Queues to register via `BullModule.registerQueue()`. */
  queues?: QueueRegisterConfig[];

  /** Register as `@Global()` module. */
  isGlobal?: boolean;

  /**
   * The `Queue` class from `bullmq` package.
   *
   * When provided, the config builds `Queue` instances so the output
   * is ready for `BullModule.registerQueue()`.
   *
   * @example
   * ```ts
   * import { Queue } from 'bullmq';
   * ```
   */
  Queue?: new (...args: unknown[]) => Record<string, unknown>;

  /**
   * The `FlowProducer` class from `bullmq` package.
   *
   * Optional — only needed when using flows.
   */
  FlowProducer?: new (...args: unknown[]) => Record<string, unknown>;
}

type QueueResult = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseConnection(get: Getter, options?: QueueConfigOptions): Record<string, unknown> {
  const optConn = options?.connection;
  const url = get.str('QUEUE_URL') ?? get.str('VALKEY_URL') ?? get.str('REDIS_URL');

  if (url) {
    return { url, ...(optConn?.tls ? { tls: optConn.tls } : {}) };
  }

  const host = optConn?.host ?? get.str('QUEUE_HOST') ?? 'localhost';
  const port = optConn?.port ?? get.num('QUEUE_PORT') ?? 6379;
  const password = optConn?.password ?? get.str('QUEUE_PASSWORD');
  const username = optConn?.username ?? get.str('QUEUE_USERNAME');
  const db = optConn?.db ?? get.num('QUEUE_DB');
  const tls = optConn?.tls ?? (get.bool('QUEUE_TLS', false) ? {} : undefined);
  const maxRetriesPerRequest =
    optConn?.maxRetriesPerRequest ?? get.num('QUEUE_MAX_RETRIES_PER_REQUEST') ?? null;
  const enableReadyCheck = optConn?.enableReadyCheck ?? get.bool('QUEUE_ENABLE_READY_CHECK', true);

  const conn: Record<string, unknown> = { host, port };
  if (password !== undefined) conn.password = password;
  if (username !== undefined) conn.username = username;
  if (db !== undefined) conn.db = db;
  if (tls !== undefined) conn.tls = tls;
  if (maxRetriesPerRequest !== undefined) conn.maxRetriesPerRequest = maxRetriesPerRequest;
  if (enableReadyCheck !== undefined) conn.enableReadyCheck = enableReadyCheck;

  return conn;
}

function parseDefaultJobOptions(
  get: Getter,
  options?: QueueConfigOptions,
): Record<string, unknown> {
  const opt = options?.defaultJobOptions;

  const attempts = opt?.attempts ?? get.num('QUEUE_DEFAULT_ATTEMPTS');
  const backoffDelay = opt?.backoff?.delay ?? get.num('QUEUE_DEFAULT_BACKOFF_DELAY');
  const backoffType =
    opt?.backoff?.type ??
    (get.str('QUEUE_DEFAULT_BACKOFF_TYPE') as 'fixed' | 'exponential' | undefined);

  // Production safety: auto-remove jobs unless user explicitly opts out
  const removeOnComplete = opt?.removeOnComplete !== undefined ? opt.removeOnComplete : true;
  const removeOnFail = opt?.removeOnFail !== undefined ? opt.removeOnFail : true;

  const out: Record<string, unknown> = {
    removeOnComplete,
    removeOnFail,
  };

  if (attempts !== undefined) out.attempts = attempts;
  if (backoffDelay !== undefined && backoffType !== undefined) {
    out.backoff = { type: backoffType, delay: backoffDelay };
  } else if (backoffDelay !== undefined) {
    out.backoff = { type: 'fixed', delay: backoffDelay };
  }
  if (opt?.delay !== undefined) out.delay = opt.delay;
  if (opt?.priority !== undefined) out.priority = opt.priority;
  if (opt?.timeout !== undefined) out.timeout = opt.timeout;
  if (opt?.ttl !== undefined) out.ttl = opt.ttl;
  if (opt?.stackTraceLimit !== undefined) out.stackTraceLimit = opt.stackTraceLimit;
  if (opt?.lifo !== undefined) out.lifo = opt.lifo;

  return out;
}

function buildQueueConfig(get: Getter, options?: QueueConfigOptions): QueueResult {
  const BaseQueue = options?.Queue;
  const FlowProducerClass = options?.FlowProducer;

  const connection = parseConnection(get, options);
  const prefix = options?.prefix ?? get.str('QUEUE_PREFIX');
  const defaultJobOptions = parseDefaultJobOptions(get, options);
  const isGlobal = options?.isGlobal ?? get.bool('QUEUE_IS_GLOBAL', false);

  // When Queue class is provided, build Queue instances
  if (BaseQueue) {
    const queues = options?.queues ?? [];

    // ForRoot config (without specific queues)
    const forRoot: Record<string, unknown> = {
      connection,
      defaultJobOptions,
    };
    if (prefix !== undefined) forRoot.prefix = prefix;

    // Build Queue instances for each registered queue
    const queueInstances = queues.map((q) => {
      const queueOpts: Record<string, unknown> = {};
      if (q.prefix) queueOpts.prefix = q.prefix;
      if (q.defaultJobOptions) queueOpts.defaultJobOptions = q.defaultJobOptions;
      if (Object.keys(connection).length > 0) queueOpts.connection = connection;

      return {
        name: q.name,
        queue: new BaseQueue(q.name, queueOpts),
      };
    });

    const out: QueueResult = { ...forRoot };

    if (queueInstances.length === 1) {
      out.queue = queueInstances[0].queue;
      out.name = queueInstances[0].name;
    } else if (queueInstances.length > 1) {
      out.queues = queueInstances;
    }

    if (FlowProducerClass && queues.length > 0) {
      out.flowProducer = new FlowProducerClass({ connection });
    }

    return out;
  }

  // Without Queue class — return raw config data
  const out: QueueResult = { connection, defaultJobOptions };

  if (prefix !== undefined) out.prefix = prefix;
  if (isGlobal) out.isGlobal = true;

  const queues = options?.queues;
  if (queues && queues.length > 0) {
    out.queues = queues;
  }

  return out;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Build BullMQ module options from environment variables or ConfigService.
 *
 * When `configService` is provided, reads from it (which internally may read
 * `process.env` by default). Otherwise reads directly from `process.env`.
 *
 * @param options - Optional overrides (connection, queues, etc.).
 * @param configService - Optional ConfigService (for `forRootAsync` pattern).
 *
 * @example
 * ```ts
 * // Sync — reads process.env
 * BullModule.forRoot(configQueue({ Queue }))
 *
 * // Async — uses ConfigService
 * BullModule.forRootAsync({
 *   useFactory: (cs) => configQueue({ Queue }, cs),
 *   inject: [ConfigService],
 * })
 * ```
 *
 * Environment variables:
 * | Variable                        | Default                    | Description                           |
 * |---------------------------------|----------------------------|---------------------------------------|
 * | `QUEUE_URL` / `VALKEY_URL` / `REDIS_URL` | —                 | Redis/Valkey connection URL           |
 * | `QUEUE_HOST`                    | `localhost`                | Redis host                            |
 * | `QUEUE_PORT`                    | `6379`                     | Redis port                            |
 * | `QUEUE_PASSWORD`                | —                          | Redis password                        |
 * | `QUEUE_USERNAME`                | —                          | Redis username                        |
 * | `QUEUE_DB`                      | —                          | Redis database number                 |
 * | `QUEUE_TLS`                     | `false`                    | Enable TLS                            |
 * | `QUEUE_PREFIX`                  | —                          | Key prefix for queue keys             |
 * | `QUEUE_DEFAULT_ATTEMPTS`        | —                          | Default retry attempts                |
 * | `QUEUE_DEFAULT_BACKOFF_TYPE`    | `fixed`                    | Backoff type (fixed/exponential)      |
 * | `QUEUE_DEFAULT_BACKOFF_DELAY`   | —                          | Backoff delay (milliseconds)          |
 * | `QUEUE_IS_GLOBAL`               | `false`                    | Register as global module             |
 * | `QUEUE_MAX_RETRIES_PER_REQUEST` | `null`                     | Max retries per Redis request         |
 * | `QUEUE_ENABLE_READY_CHECK`      | `true`                     | Enable ready check                    |
 */
export const configQueue = withConfig<QueueConfigOptions, QueueResult>(buildQueueConfig);
