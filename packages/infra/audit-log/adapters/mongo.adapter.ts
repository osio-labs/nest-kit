/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */

import type { AuditLogEntry, AuditLogQuery, AuditLogRepository } from '../audit-log.types.js';

/**
 * Configuration for the MongoDB audit-log adapter.
 */
export interface MongoAdapterOptions {
  /** MongoDB connection URI (default `mongodb://localhost:27017`). */
  uri?: string;
  /** Database name (default `audit`). */
  database?: string;
  /** Collection name (default `audit_log`). */
  collection?: string;
  /** Optional pre-configured MongoClient instance. */
  client?: unknown;
}

/**
 * MongoDB adapter for the audit-log repository interface.
 *
 * Stores audit entries as documents in a MongoDB collection with
 * indexes on action, resource, userId, and organizationId.
 *
 * @example
 * ```typescript
 * import { MongoAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';
 *
 * AuditLogModule.forRoot({ repository: new MongoAdapter() })
 * ```
 */
export class MongoAdapter implements AuditLogRepository {
  private client: any;
  private dbName: string;
  private collName: string;
  private collection: any;

  constructor(private readonly options: MongoAdapterOptions = {}) {
    this.dbName = options.database ?? 'audit';
    this.collName = options.collection ?? 'audit_log';
    this.client = options.client ?? this.loadClient();
    this.collection = this.client.db(this.dbName).collection(this.collName);
  }

  private loadClient(): any {
    try {
      const { MongoClient } = require('mongodb');
      return new MongoClient(this.options.uri ?? 'mongodb://localhost:27017');
    } catch {
      throw new Error(
        'Cannot find module "mongodb".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install mongodb\n',
      );
    }
  }

  async save(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
    const doc = {
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

    const result = await this.collection.insertOne(doc);

    return { id: result.insertedId.toString(), ...doc };
  }

  async find(_query: AuditLogQuery): Promise<AuditLogEntry[]> {
    try {
      const filter: Record<string, unknown> = {};
      if (_query.action) filter.action = _query.action;
      if (_query.resource) filter.resource = _query.resource;
      if (_query.resourceId) filter.resourceId = _query.resourceId;
      if (_query.userId) filter.userId = _query.userId;
      if (_query.organizationId) filter.organizationId = _query.organizationId;
      if (_query.path) filter.path = _query.path;
      if (_query.from || _query.to) {
        filter.createdAt = {};
        if (_query.from) (filter.createdAt as Record<string, unknown>).$gte = _query.from;
        if (_query.to) (filter.createdAt as Record<string, unknown>).$lte = _query.to;
      }

      const docs = await this.collection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(_query.offset ?? 0)
        .limit(_query.limit ?? 50)
        .toArray();

      return docs.map((doc: any) => ({
        id: doc._id.toString(),
        action: doc.action ?? '',
        resource: doc.resource ?? '',
        resourceId: doc.resourceId ?? '',
        userId: doc.userId,
        organizationId: doc.organizationId,
        metadata: doc.metadata,
        diff: doc.diff,
        ip: doc.ip,
        userAgent: doc.userAgent,
        path: doc.path,
        createdAt: doc.createdAt ?? new Date(),
      }));
    } catch {
      return [];
    }
  }

  async count(_query: AuditLogQuery): Promise<number> {
    try {
      const filter: Record<string, unknown> = {};
      if (_query.action) filter.action = _query.action;
      if (_query.resource) filter.resource = _query.resource;
      if (_query.userId) filter.userId = _query.userId;

      return await this.collection.countDocuments(filter);
    } catch {
      return 0;
    }
  }

  async findById(id: string): Promise<AuditLogEntry | null> {
    try {
      const { ObjectId } = require('mongodb');
      const doc = await this.collection.findOne({ _id: new ObjectId(id) });
      if (!doc) return null;

      return {
        id: doc._id.toString(),
        action: doc.action ?? '',
        resource: doc.resource ?? '',
        resourceId: doc.resourceId ?? '',
        userId: doc.userId,
        organizationId: doc.organizationId,
        metadata: doc.metadata,
        diff: doc.diff,
        ip: doc.ip,
        userAgent: doc.userAgent,
        path: doc.path,
        createdAt: doc.createdAt ?? new Date(),
      };
    } catch {
      return null;
    }
  }
}
