/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */

import type { AuditLogEntry, AuditLogQuery, AuditLogRepository } from '../audit-log.types.js';

/**
 * Configuration for the AWS CloudTrail audit-log adapter.
 */
export interface CloudTrailAdapterOptions {
  /** AWS region (e.g. `us-east-1`). */
  region?: string;
  /** Optional pre-configured CloudTrail client instance. */
  client?: unknown;
}

/**
 * AWS CloudTrail adapter for the audit-log repository interface.
 *
 * Uses `PutAuditEvents` from `@aws-sdk/client-cloudtrail` to send
 * audit events to AWS CloudTrail.
 *
 * > **Note:** `find()` and `count()` are read-only on CloudTrail with
 * > limited query ability — only `lookupEvents` is available.
 *
 * @example
 * ```typescript
 * import { CloudTrailAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';
 *
 * AuditLogModule.forRoot({ repository: new CloudTrailAdapter({ region: 'us-east-1' }) })
 * ```
 */
export class CloudTrailAdapter implements AuditLogRepository {
  private client: any;

  constructor(private readonly options: CloudTrailAdapterOptions = {}) {
    this.client = options.client ?? this.loadClient();
  }

  private loadClient(): any {
    try {
      const { CloudTrailClient } = require('@aws-sdk/client-cloudtrail');
      return new CloudTrailClient({
        region: this.options.region ?? process.env.AWS_REGION ?? 'us-east-1',
      });
    } catch {
      throw new Error(
        'Cannot find module "@aws-sdk/client-cloudtrail".\n' +
          'Install the optional peer dependency:\n\n' +
          '  npm install @aws-sdk/client-cloudtrail\n',
      );
    }
  }

  async save(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
    try {
      const { PutAuditEventsCommand } = require('@aws-sdk/client-cloudtrail');
      const eventId = crypto.randomUUID();

      await this.client.send(
        new PutAuditEventsCommand({
          AuditEvents: [
            {
              Id: eventId,
              EventName: entry.action,
              EventSource: entry.resource,
              Resources: entry.resourceId
                ? [{ ResourceName: entry.resourceId, ResourceType: entry.resource }]
                : undefined,
              UserIdentity: entry.userId ? { PrincipalId: entry.userId } : undefined,
              AdditionalEventData: JSON.stringify({
                organizationId: entry.organizationId,
                metadata: entry.metadata,
                diff: entry.diff,
                ip: entry.ip,
                userAgent: entry.userAgent,
                path: entry.path,
              }),
            },
          ],
        }),
      );

      return {
        id: eventId,
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
    } catch {
      throw new Error('CloudTrail PutAuditEvents failed');
    }
  }

  async find(_query: AuditLogQuery): Promise<AuditLogEntry[]> {
    try {
      const { LookupEventsCommand } = require('@aws-sdk/client-cloudtrail');
      const result = await this.client.send(new LookupEventsCommand({}));
      return (result.Events ?? []).map((e: any) => ({
        id: e.EventId,
        action: e.EventName,
        resource: e.EventSource,
        resourceId: e.EventId,
        createdAt: new Date(e.EventTime),
      }));
    } catch {
      return [];
    }
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
