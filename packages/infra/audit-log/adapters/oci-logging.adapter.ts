/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */

import type { AuditLogEntry, AuditLogQuery, AuditLogRepository } from '../audit-log.types.js';

/**
 * Configuration for the Oracle Cloud Infrastructure (OCI) Logging audit-log adapter.
 */
export interface OciLoggingAdapterOptions {
  /** OCI log group OCID. */
  logGroupId?: string;
  /** OCI compartment OCID (for native Audit API queries). */
  compartmentId?: string;
  /** OCI config profile name (default `DEFAULT`). */
  profile?: string;
  /** Optional pre-configured OCI LoggingManagement client. */
  loggingClient?: unknown;
  /** Optional pre-configured OCI LoggingSearch client. */
  searchClient?: unknown;
  /** Optional pre-configured OCI Audit client. */
  auditClient?: unknown;
}

/**
 * Oracle Cloud Infrastructure (OCI) Logging adapter for the audit-log repository interface.
 *
 * Writes to OCI Logging (custom log entries) and optionally reads from both
 * custom logs and native OCI Audit events.
 *
 * @example
 * ```typescript
 * import { OciLoggingAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';
 *
 * AuditLogModule.forRoot({ repository: new OciLoggingAdapter({
 *   logGroupId: 'ocid1.loggroup.oc1...',
 *   compartmentId: 'ocid1.compartment.oc1...',
 * }) })
 * ```
 */
export class OciLoggingAdapter implements AuditLogRepository {
  private loggingClient: any;
  private searchClient: any;
  private auditClient: any;
  private logGroupId: string;
  private compartmentId: string;

  constructor(private readonly options: OciLoggingAdapterOptions = {}) {
    this.logGroupId = options.logGroupId ?? process.env.OCI_LOG_GROUP_ID ?? '';
    this.compartmentId = options.compartmentId ?? process.env.OCI_COMPARTMENT_ID ?? '';

    this.loggingClient = options.loggingClient ?? this.loadLoggingClient();
    this.searchClient = options.searchClient ?? this.loadSearchClient();
    this.auditClient = options.auditClient ?? this.loadAuditClient();
  }

  private loadLoggingClient(): any {
    try {
      const common = require('oci-common');
      const { LoggingManagementClient } = require('oci-loggingingestion');
      const provider = new common.ConfigFileAuthenticationDetailsProvider({
        profile: this.options.profile ?? 'DEFAULT',
      });
      return new LoggingManagementClient({ authenticationDetailsProvider: provider });
    } catch {
      throw new Error(
        'Cannot find module "oci-common" or "oci-loggingingestion".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install oci-sdk\n',
      );
    }
  }

  private loadSearchClient(): any {
    try {
      const common = require('oci-common');
      const { LoggingSearchClient } = require('oci-loggingingestion');
      const provider = new common.ConfigFileAuthenticationDetailsProvider({
        profile: this.options.profile ?? 'DEFAULT',
      });
      return new LoggingSearchClient({ authenticationDetailsProvider: provider });
    } catch {
      return null;
    }
  }

  private loadAuditClient(): any {
    try {
      const common = require('oci-common');
      const { AuditClient } = require('oci-audit');
      const provider = new common.ConfigFileAuthenticationDetailsProvider({
        profile: this.options.profile ?? 'DEFAULT',
      });
      return new AuditClient({ authenticationDetailsProvider: provider });
    } catch {
      return null;
    }
  }

  async save(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
    const entryId = crypto.randomUUID();
    await this.loggingClient.putLogs({
      logGroupId: this.logGroupId,
      putLogsDetails: {
        specVersion: '1.0',
        logEntries: [
          {
            id: entryId,
            data: JSON.stringify({
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
            }),
            time: new Date().toISOString(),
          },
        ],
      },
    });

    return {
      id: entryId,
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
    const entries: AuditLogEntry[] = [];

    // Fetch from OCI Logging custom log
    if (this.searchClient) {
      try {
        const filterParts = Object.entries({
          action: _query.action,
          resource: _query.resource,
          userId: _query.userId,
          organizationId: _query.organizationId,
        })
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k} = '${v}'`);

        const searchQuery =
          `search "${this.logGroupId}"` +
          (filterParts.length ? ` | ${filterParts.join(' && ')}` : '') +
          ` | sort by datetime desc | limit ${_query.limit ?? 50}`;

        const result = await this.searchClient.searchLogs({
          searchLogsDetails: {
            timeStart:
              _query.from?.toISOString() ?? new Date(Date.now() - 90 * 86400000).toISOString(),
            timeEnd: _query.to?.toISOString() ?? new Date().toISOString(),
            searchQuery,
          },
        });

        for (const r of result.searchResult?.results ?? []) {
          const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
          entries.push({
            id: r.id ?? crypto.randomUUID(),
            action: data.action ?? '',
            resource: data.resource ?? '',
            resourceId: data.resourceId ?? '',
            userId: data.userId,
            organizationId: data.organizationId,
            metadata: data.metadata,
            diff: data.diff,
            ip: data.ip,
            userAgent: data.userAgent,
            path: data.path,
            createdAt: new Date(r.time ?? Date.now()),
          });
        }
      } catch {
        // fall through
      }
    }

    // Also fetch native OCI Audit events if querying by resource
    if (this.auditClient && _query.resource) {
      try {
        const auditEvents = await this.auditClient.listEvents({
          compartmentId: this.compartmentId,
          startTime:
            _query.from?.toISOString() ?? new Date(Date.now() - 90 * 86400000).toISOString(),
          endTime: _query.to?.toISOString() ?? new Date().toISOString(),
        });

        for (const e of auditEvents.items ?? []) {
          if (!_query.action || e.eventName === _query.action) {
            entries.push({
              id: e.eventId ?? crypto.randomUUID(),
              action: e.eventName ?? '',
              resource: e.eventSource ?? _query.resource,
              resourceId: e.eventId,
              createdAt: new Date(e.eventTime ?? Date.now()),
            });
          }
        }
      } catch {
        // fall through
      }
    }

    return entries.slice(0, _query.limit ?? 50);
  }

  async count(_query: AuditLogQuery): Promise<number> {
    const results = await this.find(_query);
    return results.length;
  }

  async findById(id: string): Promise<AuditLogEntry | null> {
    const results = await this.find({});
    return results.find((e) => e.id === id) ?? null;
  }
}
