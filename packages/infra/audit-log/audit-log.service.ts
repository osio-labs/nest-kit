import { Inject, Injectable, Optional, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AUDIT_LOG_MODULE_OPTIONS, AUDIT_LOG_REPOSITORY } from './audit-log.constants.js';
import type {
  AuditLogModuleOptions,
  AuditLogRepository,
  AuditLogEntry,
  AuditLogQuery,
  AuditAction,
} from './audit-log.types.js';

/**
 * Service for recording and querying audit-log entries.
 *
 * Automatically captures IP and user-agent from the current HTTP request
 * when injected into a request-scoped context.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class OrderService {
 *   constructor(private readonly auditLog: AuditLogService) {}
 *
 *   async deleteOrder(id: string) {
 *     await this.auditLog.record({
 *       action: 'DELETE',
 *       resource: 'Order',
 *       resourceId: id,
 *       userId: currentUser.id,
 *     });
 *   }
 * }
 * ```
 */
@Injectable({ scope: Scope.REQUEST })
export class AuditLogService {
  constructor(
    @Inject(AUDIT_LOG_MODULE_OPTIONS)
    private readonly options: AuditLogModuleOptions,
    @Inject(AUDIT_LOG_REPOSITORY)
    @Optional()
    private readonly repository?: AuditLogRepository,
    @Optional()
    @Inject(REQUEST)
    private readonly request?: any,
  ) {}

  private ensureRepository(): AuditLogRepository {
    if (!this.repository) {
      throw new Error(
        'AuditLog repository is not configured. ' +
          'Either enable TypeORM (typeorm: { enabled: true }) ' +
          'or provide a custom repository via AuditLogModule.forRoot({ repository: ... }).',
      );
    }
    return this.repository;
  }

  /**
   * Record a new audit-log entry.
   *
   * @returns The persisted entry with `id` and `createdAt`.
   */
  async record(params: {
    action: AuditAction;
    resource: string;
    resourceId?: string;
    userId?: string;
    organizationId?: string;
    metadata?: Record<string, unknown>;
    diff?: AuditLogEntry['diff'];
    ip?: string;
    userAgent?: string;
    path?: string;
  }): Promise<AuditLogEntry> {
    // Skip if action is not in the enabled list
    if (
      this.options.enabledActions?.length &&
      !this.options.enabledActions.includes(params.action)
    ) {
      return {
        id: '',
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId ?? '',
        createdAt: new Date(),
      };
    }

    // Skip if path matches an excluded pattern
    if (params.path && this.options.excludePaths?.length) {
      const shouldExclude = this.options.excludePaths.some((pattern) => {
        const normalized = pattern.endsWith('/') ? pattern : `${pattern}/`;
        return params.path === pattern || params.path!.startsWith(normalized);
      });
      if (shouldExclude) {
        return {
          id: '',
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId ?? '',
          createdAt: new Date(),
        };
      }
    }

    const repo = this.ensureRepository();
    const ip = params.ip ?? this.captureIp();
    const userAgent = params.userAgent ?? this.captureUserAgent();
    const metadata = {
      ...this.options.defaultMetadata,
      ...params.metadata,
    };

    return repo.save({
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId ?? '',
      userId: params.userId,
      organizationId: params.organizationId,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      diff: params.diff,
      ip,
      userAgent,
      path: params.path,
    });
  }

  /**
   * Query audit-log entries with optional filters.
   */
  async find(query: AuditLogQuery = {}): Promise<AuditLogEntry[]> {
    return this.ensureRepository().find(query);
  }

  /**
   * Count audit-log entries matching the given filters.
   */
  async count(query: AuditLogQuery = {}): Promise<number> {
    return this.ensureRepository().count(query);
  }

  /**
   * Find a single entry by its ID.
   */
  async findById(id: string): Promise<AuditLogEntry | null> {
    return this.ensureRepository().findById(id);
  }

  /**
   * Find entries for a specific resource.
   *
   * @param resource  Resource type (e.g. `'order'`, `'user'`).
   * @param resourceId  ID of the target resource.
   */
  async findByResource(resource: string, resourceId: string): Promise<AuditLogEntry[]> {
    return this.find({ resource, resourceId });
  }

  /**
   * Find entries by user.
   *
   * @param userId  The user who performed the actions.
   * @param limit  Max results (default 50).
   */
  async findByUser(userId: string, limit = 50): Promise<AuditLogEntry[]> {
    return this.find({ userId, limit });
  }

  /**
   * Find entries by organization.
   *
   * @param organizationId  The organization scope.
   * @param limit  Max results (default 50).
   */
  async findByOrganization(organizationId: string, limit = 50): Promise<AuditLogEntry[]> {
    return this.find({ organizationId, limit });
  }

  private captureIp(): string | undefined {
    if (this.options.captureRequestContext === false) return undefined;
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
    const req = this.request;
    if (!req) return undefined;
    const forwarded = req.headers?.['x-forwarded-for'];
    return typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : (req.ip ?? req.socket?.remoteAddress);
    /* eslint-enable */
  }

  private captureUserAgent(): string | undefined {
    if (this.options.captureRequestContext === false) return undefined;
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
    return this.request?.headers?.['user-agent'];
    /* eslint-enable */
  }
}
