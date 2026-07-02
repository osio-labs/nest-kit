/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */

import type { AuditLogEntry, AuditLogQuery, AuditLogRepository } from '../audit-log.types';

/**
 * Configuration for the Elasticsearch audit-log adapter.
 */
export interface ElasticsearchAdapterOptions {
  /** Elasticsearch node URL (default `http://localhost:9200`). */
  node?: string;
  /** Elasticsearch API key. */
  apiKey?: string;
  /** Index name prefix (default `audit-log`). */
  index?: string;
  /** Optional pre-configured Elasticsearch client. */
  client?: unknown;
}

/**
 * Elasticsearch adapter for the audit-log repository interface.
 *
 * Stores audit entries as documents in an Elasticsearch index.
 * Supports full-text search and aggregation on all fields.
 *
 * @example
 * ```typescript
 * import { ElasticsearchAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';
 *
 * AuditLogModule.forRoot({ repository: new ElasticsearchAdapter({ node: 'http://localhost:9200' }) })
 * ```
 */
export class ElasticsearchAdapter implements AuditLogRepository {
  private client: any;
  private index: string;

  constructor(private readonly options: ElasticsearchAdapterOptions = {}) {
    this.index = options.index ?? 'audit-log';
    this.client = options.client ?? this.loadClient();
  }

  private loadClient(): any {
    try {
      const { Client } = require('@elastic/elasticsearch');
      return new Client({
        node: this.options.node ?? 'http://localhost:9200',
        ...(this.options.apiKey ? { auth: { apiKey: this.options.apiKey } } : {}),
      });
    } catch {
      throw new Error(
        'Cannot find module "@elastic/elasticsearch".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install @elastic/elasticsearch\n',
      );
    }
  }

  async save(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
    const body = {
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
      '@timestamp': new Date().toISOString(),
    };

    const result = await this.client.index({
      index: this.index,
      body,
    });

    return {
      id: result._id ?? crypto.randomUUID(),
      ...body,
      createdAt: new Date(),
    };
  }

  async find(_query: AuditLogQuery): Promise<AuditLogEntry[]> {
    try {
      const must: unknown[] = [];

      if (_query.action) must.push({ term: { action: _query.action } });
      if (_query.resource) must.push({ term: { resource: _query.resource } });
      if (_query.resourceId) must.push({ term: { resourceId: _query.resourceId } });
      if (_query.userId) must.push({ term: { userId: _query.userId } });
      if (_query.organizationId) must.push({ term: { organizationId: _query.organizationId } });
      if (_query.path) must.push({ term: { path: _query.path } });
      if (_query.from) must.push({ range: { '@timestamp': { gte: _query.from.toISOString() } } });
      if (_query.to) must.push({ range: { '@timestamp': { lte: _query.to.toISOString() } } });

      const result = await this.client.search({
        index: this.index,
        body: {
          query: must.length > 0 ? { bool: { must } } : { match_all: {} },
          sort: [{ '@timestamp': { order: 'desc' } }],
          size: _query.limit ?? 50,
          from: _query.offset ?? 0,
        },
      });

      return (result.hits?.hits ?? []).map((hit: any) => ({
        id: hit._id,
        action: hit._source.action ?? '',
        resource: hit._source.resource ?? '',
        resourceId: hit._source.resourceId ?? '',
        userId: hit._source.userId,
        organizationId: hit._source.organizationId,
        metadata: hit._source.metadata,
        diff: hit._source.diff,
        ip: hit._source.ip,
        userAgent: hit._source.userAgent,
        path: hit._source.path,
        createdAt: new Date(hit._source['@timestamp'] ?? Date.now()),
      }));
    } catch {
      return [];
    }
  }

  async count(_query: AuditLogQuery): Promise<number> {
    try {
      const must: unknown[] = [];
      if (_query.action) must.push({ term: { action: _query.action } });
      if (_query.resource) must.push({ term: { resource: _query.resource } });
      if (_query.userId) must.push({ term: { userId: _query.userId } });

      const result = await this.client.count({
        index: this.index,
        body: must.length > 0 ? { query: { bool: { must } } } : undefined,
      });

      return result.count ?? 0;
    } catch {
      return 0;
    }
  }

  async findById(id: string): Promise<AuditLogEntry | null> {
    try {
      const result = await this.client.get({ index: this.index, id });
      if (!result.found) return null;

      return {
        id: result._id,
        action: result._source.action ?? '',
        resource: result._source.resource ?? '',
        resourceId: result._source.resourceId ?? '',
        userId: result._source.userId,
        organizationId: result._source.organizationId,
        metadata: result._source.metadata,
        diff: result._source.diff,
        ip: result._source.ip,
        userAgent: result._source.userAgent,
        path: result._source.path,
        createdAt: new Date(result._source['@timestamp'] ?? Date.now()),
      };
    } catch {
      return null;
    }
  }
}
