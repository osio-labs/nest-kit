/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */

import type { AuditLogEntry, AuditLogQuery, AuditLogRepository } from '../audit-log.types.js';

/**
 * Configuration for the Google Cloud Logging audit-log adapter.
 */
export interface GcpCloudLoggingAdapterOptions {
  /** GCP project ID. Defaults to `process.env.GCP_PROJECT_ID`. */
  projectId?: string;
  /** GCP log name (default `audit-trail`). */
  logName?: string;
  /** Optional pre-configured Logging client instance. */
  client?: unknown;
  /** Optional GCP resource type (default `global`). */
  resourceType?: string;
}

/**
 * Google Cloud Logging adapter for the audit-log repository interface.
 *
 * Writes audit entries to GCP Cloud Logging using the `@google-cloud/logging` SDK.
 *
 * @example
 * ```typescript
 * import { GcpCloudLoggingAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';
 *
 * AuditLogModule.forRoot({ repository: new GcpCloudLoggingAdapter() })
 * ```
 */
export class GcpCloudLoggingAdapter implements AuditLogRepository {
  private logging: any;
  private log: any;
  private logName: string;
  private resourceType: string;

  constructor(private readonly options: GcpCloudLoggingAdapterOptions = {}) {
    this.logName = options.logName ?? 'audit-trail';
    this.resourceType = options.resourceType ?? 'global';
    this.logging = options.client ?? this.loadClient();
    this.log = this.logging.log(this.logName);
  }

  private loadClient(): any {
    try {
      const { Logging } = require('@google-cloud/logging');
      return new Logging({ projectId: this.options.projectId });
    } catch {
      throw new Error(
        'Cannot find module "@google-cloud/logging".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install @google-cloud/logging\n',
      );
    }
  }

  async save(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
    const metadata = {
      resource: { type: this.resourceType },
      labels: {
        action: entry.action,
        resource: entry.resource,
        userId: entry.userId ?? '',
        organizationId: entry.organizationId ?? '',
      },
    };

    const logEntry = this.log.entry(metadata, {
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      userId: entry.userId,
      organizationId: entry.organizationId,
      metadata: entry.metadata,
      diff: entry.diff,
      ip: entry.ip,
      userAgent: entry.userAgent,
      path: entry.path,
    });

    await this.log.write(logEntry);

    return {
      id: logEntry.metadata?.insertId ?? crypto.randomUUID(),
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      userId: entry.userId,
      organizationId: entry.organizationId,
      metadata: entry.metadata,
      diff: entry.diff,
      ip: entry.ip,
      userAgent: entry.userAgent,
      path: entry.path,
      createdAt: new Date(),
    };
  }

  async find(_query: AuditLogQuery): Promise<AuditLogEntry[]> {
    try {
      const filterParts = [
        `logName="projects/${this.options.projectId ?? process.env.GCP_PROJECT_ID ?? '-'}/logs/${this.logName}"`,
      ];
      if (_query.action) filterParts.push(`jsonPayload.action="${_query.action}"`);
      if (_query.resource) filterParts.push(`jsonPayload.resource="${_query.resource}"`);
      if (_query.userId) filterParts.push(`jsonPayload.userId="${_query.userId}"`);

      const [entries] = await this.logging.getEntries({
        filter: filterParts.join(' AND '),
        pageSize: _query.limit ?? 50,
        orderBy: 'timestamp desc',
      });

      return (entries ?? []).map((e: any) => {
        const payload = e.data?.jsonPayload ?? e.data ?? {};
        return {
          id: e.metadata?.insertId ?? crypto.randomUUID(),
          action: payload.action ?? '',
          resource: payload.resource ?? '',
          resourceId: payload.resourceId ?? '',
          userId: payload.userId,
          organizationId: payload.organizationId,
          metadata: payload.metadata,
          diff: payload.diff,
          ip: payload.ip,
          userAgent: payload.userAgent,
          path: payload.path,
          createdAt: new Date(e.metadata?.timestamp ?? Date.now()),
        };
      });
    } catch {
      return [];
    }
  }

  async count(query: AuditLogQuery): Promise<number> {
    const results = await this.find(query);
    return results.length;
  }

  async findById(id: string): Promise<AuditLogEntry | null> {
    const results = await this.find({});
    return results.find((e) => e.id === id) ?? null;
  }
}
