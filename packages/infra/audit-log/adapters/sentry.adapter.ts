/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import type { AuditLogEntry, AuditLogQuery, AuditLogRepository } from '../audit-log.types.js';

/**
 * Configuration for the Sentry audit-log adapter.
 */
export interface SentryAdapterOptions {
  /** Sentry DSN. Defaults to `process.env.SENTRY_DSN`. */
  dsn?: string;
  /** Optional pre-configured Sentry instance. */
  client?: unknown;
  /**
   * Sentry event level (default `'info'`).
   * Use `'warning'` or `'error'` for important audit events.
   */
  level?: 'info' | 'warning' | 'error';
}

/**
 * Sentry adapter for the audit-log repository interface.
 *
 * Sends audit entries as breadcrumbs or capture events to Sentry.
 * Useful for correlating audit events with error reports.
 *
 * @example
 * ```typescript
 * import { SentryAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';
 *
 * AuditLogModule.forRoot({ repository: new SentryAdapter() })
 * ```
 */
export class SentryAdapter implements AuditLogRepository {
  private Sentry: any;
  private level: string;

  constructor(options: SentryAdapterOptions = {}) {
    this.level = options.level ?? 'info';
    this.Sentry = options.client ?? this.loadClient();
  }

  private loadClient(): any {
    try {
      return require('@sentry/node');
    } catch {
      throw new Error(
        'Cannot find module "@sentry/node".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install @sentry/node\n',
      );
    }
  }

  save(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
    const result: AuditLogEntry = {
      id: crypto.randomUUID(),
      ...entry,
      createdAt: new Date(),
    };

    this.Sentry.addBreadcrumb({
      category: 'audit',
      message: `${entry.action} on ${entry.resource}`,
      level: this.level,
      data: {
        resource: entry.resource,
        resourceId: entry.resourceId,
        userId: entry.userId,
        organizationId: entry.organizationId,
        ip: entry.ip,
        path: entry.path,
        diff: entry.diff,
        metadata: entry.metadata,
      },
    });

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
