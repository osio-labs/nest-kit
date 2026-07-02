import type { AuditLogEntry, AuditLogQuery, AuditLogRepository } from '../audit-log.types';

/**
 * Configuration for the Console audit-log adapter.
 */
export interface ConsoleAdapterOptions {
  /** Optional custom logger function (defaults to `console.log`). */
  logger?: (message: string, data?: unknown) => void;
  /** Format to use: `'json'` (default) or `'pretty'`. */
  format?: 'json' | 'pretty';
}

/**
 * Console adapter for the audit-log repository interface.
 *
 * Prints all audit entries to the console. Useful for local development
 * and debugging. Does not persist data — `find()` always returns `[]`.
 *
 * @example
 * ```typescript
 * import { ConsoleAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';
 *
 * AuditLogModule.forRoot({ repository: new ConsoleAdapter({ format: 'pretty' }) })
 * ```
 */
export class ConsoleAdapter implements AuditLogRepository {
  private logger: (message: string, data?: unknown) => void;
  private format: 'json' | 'pretty';

  constructor(options: ConsoleAdapterOptions = {}) {
    this.logger = options.logger ?? console.log;
    this.format = options.format ?? 'json';
  }

  save(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
    const result: AuditLogEntry = {
      id: crypto.randomUUID(),
      ...entry,
      createdAt: new Date(),
    };

    if (this.format === 'pretty') {
      this.logger(
        `[AUDIT] ${result.createdAt.toISOString()} | ${entry.action} | ${entry.resource}${entry.resourceId ? `:${entry.resourceId}` : ''}${entry.userId ? ` | user:${entry.userId}` : ''}`,
      );
      if (entry.metadata) this.logger('  metadata:', entry.metadata);
      if (entry.diff) this.logger('  diff:', entry.diff);
    } else {
      this.logger(JSON.stringify(result));
    }

    return Promise.resolve(result);
  }

  find(_query: AuditLogQuery): Promise<AuditLogEntry[]> {
    return Promise.resolve([]);
  }

  count(_query: AuditLogQuery): Promise<number> {
    return Promise.resolve(0);
  }

  findById(_id: string): Promise<AuditLogEntry | null> {
    return Promise.resolve(null);
  }
}
