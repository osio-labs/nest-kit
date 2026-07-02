/** Supported audit actions — common values: `CREATE`, `UPDATE`, `DELETE`, `READ`, `LOGIN`, … */
export type AuditAction = string;

/** A single audit-log entry stored in the database. */
export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, unknown>;
  diff?: Record<string, { from: unknown; to: unknown }>;
  ip?: string;
  userAgent?: string;
  path?: string;
  createdAt: Date;
}

/** Query filters for retrieving audit logs. */
export interface AuditLogQuery {
  resource?: string;
  resourceId?: string;
  userId?: string;
  organizationId?: string;
  action?: AuditAction;
  path?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

/** Repository interface for persisting audit-log entries.
 *  Implement this interface to provide a custom backend. */
export interface AuditLogRepository {
  save(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry>;
  find(query: AuditLogQuery): Promise<AuditLogEntry[]>;
  count(query: AuditLogQuery): Promise<number>;
  findById(id: string): Promise<AuditLogEntry | null>;
}

/** Options accepted by `AuditLogModule.forRoot()`. */
export interface AuditLogModuleOptions {
  /**
   * Custom repository implementation.
   * When omitted, the built-in TypeORM repository is used (requires `@nestjs/typeorm`).
   */
  repository?: AuditLogRepository;
  /**
   * Entity metadata to include with every entry (e.g. `{ appVersion: '1.0.0' }`).
   */
  defaultMetadata?: Record<string, unknown>;
  /**
   * Capture IP address and user-agent from the request context.
   * Requires the NestJS `REQUEST` provider or an HTTP context. Default `true`.
   */
  captureRequestContext?: boolean;
  /** Register the module as global (default `true`). */
  global?: boolean;
  /**
   * Only record actions in this list. When empty or omitted, all actions are recorded.
   * Useful for reducing storage noise (e.g. only `['user.login', 'order.created']`).
   */
  enabledActions?: string[];
  /**
   * Request path patterns to exclude from audit logging.
   * Supports simple string prefixes (e.g. `/health`, `/metrics`).
   * Only applies when `path` is present on the entry.
   */
  excludePaths?: string[];
  /**
   * TypeORM-specific configuration.
   * Set `{ enabled: false }` to disable the built-in TypeORM integration.
   */
  typeorm?: {
    /** Enable TypeORM integration (default `true`). */
    enabled: boolean;
  };
}

/** Options accepted by `AuditLogModule.forRootAsync()`. */
export interface AuditLogModuleAsyncOptions {
  useFactory: (...args: unknown[]) => Promise<AuditLogModuleOptions> | AuditLogModuleOptions;
  inject?: any[];
  imports?: any[];
  global?: boolean;
}
