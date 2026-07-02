/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */

import type { AuditLogEntry, AuditLogQuery, AuditLogRepository } from '../audit-log.types';

/**
 * Configuration for the Pangea Audit adapter.
 */
export interface PangeaAdapterOptions {
  /** Pangea Audit API token. Defaults to `process.env.PANGEA_AUDIT_TOKEN`. */
  token?: string;
  /** Pangea domain (e.g. `aws.us.pangea.cloud`). Defaults to `process.env.PANGEA_DOMAIN`. */
  domain?: string;
  /** Optional pre-configured Pangea Audit instance. */
  client?: unknown;
  /** Optional config ID for Pangea Audit. */
  configId?: string;
}

/**
 * Pangea Audit adapter for the audit-log repository interface.
 *
 * Uses the `pangea-node-sdk` Audit service to record and search
 * audit events via Pangea's Secure Audit Log API.
 *
 * @example
 * ```typescript
 * import { PangeaAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';
 *
 * AuditLogModule.forRoot({ repository: new PangeaAdapter() })
 * ```
 */
export class PangeaAdapter implements AuditLogRepository {
  private audit: any;
  private configId: string | undefined;

  constructor(private readonly options: PangeaAdapterOptions = {}) {
    this.configId = options.configId;
    this.audit = options.client ?? this.loadClient();
  }

  private loadClient(): any {
    try {
      const { PangeaConfig, AuditService } = require('pangea-node-sdk');
      const token = this.options.token ?? process.env.PANGEA_AUDIT_TOKEN;
      const domain = this.options.domain ?? process.env.PANGEA_DOMAIN;
      if (!token) throw new Error('PANGEA_AUDIT_TOKEN is required');
      const config = new PangeaConfig({ domain });
      return new AuditService(token, config);
    } catch (err) {
      if (err instanceof Error && err.message.includes('pangea-node-sdk')) {
        throw new Error(
          'Cannot find module "pangea-node-sdk".\n' +
            'Install the optional peer dependency:\n\n' +
            '  npm install pangea-node-sdk\n',
        );
      }
      throw err;
    }
  }

  async save(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
    const event: Record<string, unknown> = {
      action: entry.action,
      message: `${entry.action} on ${entry.resource}`,
      actor: entry.userId,
      target: entry.resourceId ? `${entry.resource}:${entry.resourceId}` : entry.resource,
      source: entry.ip,
      status: 'success',
      new: entry.diff
        ? Object.fromEntries(Object.entries(entry.diff).map(([k, v]) => [k, v.to]))
        : undefined,
      old: entry.diff
        ? Object.fromEntries(Object.entries(entry.diff).map(([k, v]) => [k, v.from]))
        : undefined,
    };

    if (entry.organizationId) event.organization = entry.organizationId;
    if (entry.metadata) event.metadata = entry.metadata;
    if (entry.userAgent) event.user_agent = entry.userAgent;
    if (entry.path) event.path = entry.path;

    let response: any;
    if (this.configId) {
      response = await this.audit.log(event, { configId: this.configId });
    } else {
      response = await this.audit.log(event);
    }

    const result = response?.result ?? {};
    const envelope = result.envelope ?? {};

    return {
      id: envelope.leaf_hash ?? crypto.randomUUID(),
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
      createdAt: envelope.received_at ? new Date(envelope.received_at) : new Date(),
    };
  }

  async find(_query: AuditLogQuery): Promise<AuditLogEntry[]> {
    try {
      const searchInput: Record<string, unknown> = {
        query: _query.action ? `action:"${_query.action}"` : '*',
        limit: _query.limit ?? 50,
        order: 'desc',
        order_by: 'received_at',
      };

      if (_query.userId) searchInput.search_restriction = { actor: [_query.userId] };
      if (_query.from) searchInput.start_at = _query.from.toISOString();
      if (_query.to) searchInput.end_at = _query.to.toISOString();

      let response: any;
      if (this.configId) {
        response = await this.audit.search(searchInput, { configId: this.configId });
      } else {
        response = await this.audit.search(searchInput);
      }

      const results = response?.result?.events ?? [];
      return results.map((e: any) => {
        const envelope = e.envelope ?? e;
        return {
          id: envelope.leaf_hash ?? crypto.randomUUID(),
          action: envelope.action ?? '',
          resource: (envelope.target ?? '').split(':')[0] ?? '',
          resourceId: (envelope.target ?? '').split(':')[1] ?? envelope.target,
          userId: envelope.actor,
          organizationId: envelope.organization,
          metadata: envelope.metadata,
          diff:
            envelope.old && envelope.new
              ? Object.keys(envelope.new).reduce(
                  (acc: Record<string, { from: unknown; to: unknown }>, k: string) => {
                    acc[k] = { from: envelope.old[k], to: envelope.new[k] };
                    return acc;
                  },
                  {},
                )
              : undefined,
          ip: envelope.source,
          userAgent: envelope.user_agent,
          path: envelope.path,
          createdAt: new Date(envelope.received_at ?? Date.now()),
        };
      });
    } catch {
      return [];
    }
  }

  async count(_query: AuditLogQuery): Promise<number> {
    try {
      const searchInput: Record<string, unknown> = {
        query: _query.action ? `action:"${_query.action}"` : '*',
        limit: 1,
      };

      let response: any;
      if (this.configId) {
        response = await this.audit.search(searchInput, { configId: this.configId });
      } else {
        response = await this.audit.search(searchInput);
      }

      return response?.result?.count ?? 0;
    } catch {
      return 0;
    }
  }

  async findById(id: string): Promise<AuditLogEntry | null> {
    try {
      let response: any;
      if (this.configId) {
        response = await this.audit.search(
          { query: `leaf_hash:"${id}"` },
          { configId: this.configId },
        );
      } else {
        response = await this.audit.search({ query: `leaf_hash:"${id}"` });
      }

      const events = response?.result?.events ?? [];
      if (events.length === 0) return null;

      return (await this.find({})).find((e) => e.id === id) ?? null;
    } catch {
      return null;
    }
  }
}
