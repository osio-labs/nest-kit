/**
 * Supported HMAC hash algorithms for webhook signature verification / signing.
 */
export type WebhookHashAlgorithm = 'sha256' | 'sha1';

/**
 * Delivery status of an outgoing webhook.
 */
export type WebhookDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'cancelled';

/**
 * Outgoing webhook payload to be delivered to a target URL.
 */
export interface OutgoingWebhookPayload {
  /** Unique identifier for this webhook event. */
  id: string;
  /** Event name / type. */
  event: string;
  /** Timestamp when the event was created. */
  createdAt: Date;
  /** Arbitrary payload body. */
  data: unknown;
  /** Number of delivery attempts so far. */
  attempts?: number;
}

/**
 * Record persisted for each webhook delivery attempt.
 */
export interface WebhookDeliveryRecord {
  /** Unique delivery ID. */
  id: string;
  /** Target URL. */
  url: string;
  /** Event name. */
  event: string;
  /** Serialized payload body. */
  payload: string;
  /** Current delivery status. */
  status: WebhookDeliveryStatus;
  /** HTTP status code returned (if any). */
  statusCode?: number;
  /** Response body (if any). */
  responseBody?: string;
  /** Error message (if any). */
  error?: string;
  /** Number of attempts made. */
  attempts: number;
  /** Maximum retries configured. */
  maxRetries: number;
  /** Timestamp of first attempt. */
  createdAt: Date;
  /** Timestamp of last attempt. */
  updatedAt: Date;
  /** Timestamp of next scheduled retry (if pending). */
  nextRetryAt?: Date;
}

/**
 * In-memory or persisted store for delivery logs.
 */
export interface WebhookDeliveryStore {
  save(
    record: Omit<WebhookDeliveryRecord, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<WebhookDeliveryRecord>;
  update(id: string, partial: Partial<WebhookDeliveryRecord>): Promise<void>;
  findById(id: string): Promise<WebhookDeliveryRecord | null>;
  findPendingRetries(before: Date, limit?: number): Promise<WebhookDeliveryRecord[]>;
}

/**
 * Options for configuring outgoing webhook delivery.
 */
export interface OutgoingWebhookOptions {
  /** Maximum number of retry attempts (default: 5). */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 1000). */
  baseDelayMs?: number;
  /** HMAC secret for signing outgoing payloads. */
  signingSecret?: string;
  /** Hash algorithm for signing (default: sha256). */
  algorithm?: WebhookHashAlgorithm;
  /** Request timeout in ms (default: 10000). */
  timeout?: number;
}

/**
 * Options for configuring the circuit breaker.
 */
export interface CircuitBreakerOptions {
  /** Failure threshold before opening the circuit (default: 5). */
  failureThreshold?: number;
  /** Cooldown period in ms before half-open (default: 30000). */
  cooldownMs?: number;
  /** Number of successful probes required to close (default: 3). */
  halfOpenSuccessThreshold?: number;
  /** Timeout in ms for probe requests (default: 5000). */
  probeTimeoutMs?: number;
}

/**
 * Circuit breaker state.
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half_open';

/**
 * HMAC verification / signing result.
 */
export interface HmacResult {
  signature: string;
  algorithm: WebhookHashAlgorithm;
}

/**
 * Incoming webhook event dispatched to registered handlers.
 */
export interface IncomingWebhookEvent {
  /** Source identifier (e.g. 'github', 'stripe'). */
  source: string;
  /** Raw HTTP headers. */
  headers: Record<string, string | string[] | undefined>;
  /** Raw request body. */
  body: unknown;
  /** Parsed event name / type. */
  event?: string;
  /** Parsed / transformed payload. */
  payload?: unknown;
}

/**
 * Handler function for incoming webhook events.
 */
export type IncomingWebhookHandler = (event: IncomingWebhookEvent) => void | Promise<void>;

/**
 * Incoming webhook adapter that transforms a raw request into a normalized event.
 */
export interface IncomingWebhookAdapter {
  /** Source name (e.g. 'github', 'stripe'). */
  readonly source: string;
  /** Parse the incoming request body and headers into a normalized event. */
  parse(
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): IncomingWebhookEvent;
  /** Verify the HMAC signature of the incoming request. */
  verify?(
    body: unknown,
    signature: string,
    secret: string,
    headers?: Record<string, string | string[] | undefined>,
  ): boolean;
}

/**
 * Options for configuring incoming webhooks.
 */
export interface IncomingWebhookModuleOptions {
  /** Route path prefix (default: 'webhook'). */
  path?: string;
  /** Global HMAC secret for signature verification. */
  secret?: string;
  /** Hash algorithm for verification (default: sha256). */
  algorithm?: WebhookHashAlgorithm;
  /** Registered adapters. */
  adapters?: IncomingWebhookAdapter[];
  /** Registered handlers. */
  handlers?: IncomingWebhookHandler[];
}

/**
 * Full module options.
 */
export interface WebhookModuleOptions {
  /** Outgoing webhook configuration. */
  outgoing?: OutgoingWebhookOptions;
  /** Incoming webhook configuration. */
  incoming?: IncomingWebhookModuleOptions;
  /** Circuit breaker configuration. */
  circuitBreaker?: CircuitBreakerOptions;
  /** Queue integration (BullMQ). */
  queue?: {
    /** Enable queue-based delivery. */
    enabled: boolean;
    /** BullMQ queue name (default: 'webhook:outgoing'). */
    name?: string;
  };
  /** Database persistence configuration. */
  storage?: {
    /** Enable delivery log persistence. */
    enabled: boolean;
    /** Custom store implementation. */
    store?: WebhookDeliveryStore;
  };
  /** Make module global (default: true). */
  global?: boolean;
}

export interface WebhookModuleAsyncOptions {
  useFactory: (...args: unknown[]) => Promise<WebhookModuleOptions> | WebhookModuleOptions;
  inject?: unknown[];
  imports?: unknown[];
  global?: boolean;
}

/**
 * Event bus event.
 */
export interface WebhookEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
}

/**
 * Event bus listener.
 */
export type WebhookEventListener = (event: WebhookEvent) => void | Promise<void>;
