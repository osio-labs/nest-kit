/**
 * @os.io/nest-kit/infra/audit-log
 *
 * Audit trail for NestJS — track who did what and when. Automatically
 * captures user actions, data changes, and security events with structured
 * diffs, IP, user-agent, and organization scoping.
 *
 * ## Quick Start
 *
 * ```typescript
 * // TypeORM backend
 * import { AuditLogModule } from '@os.io/nest-kit/infra/audit-log';
 *
 * @Module({
 *   imports: [
 *     AuditLogModule.forFeature(),
 *     AuditLogModule.forRoot(),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * Custom backend:
 * ```typescript
 * import { AuditLogModule } from '@os.io/nest-kit/infra/audit-log';
 *
 * @Module({
 *   imports: [
 *     AuditLogModule.forRoot({ repository: myCustomRepo }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @module
 * @packageDocumentation
 */

// ──────── Entity ────────
export { AuditLogEntity } from './audit-log.entity.js';

// ──────── Types ────────
export type {
  AuditAction,
  AuditLogEntry,
  AuditLogQuery,
  AuditLogRepository,
  AuditLogModuleOptions,
  AuditLogModuleAsyncOptions,
} from './audit-log.types.js';

// ──────── Constants ────────
export {
  AUDIT_LOG_MODULE_OPTIONS,
  AUDIT_LOG_REPOSITORY,
  DEFAULT_AUDIT_LOG_TABLE,
} from './audit-log.constants.js';

// ──────── Service ────────
export { AuditLogService } from './audit-log.service.js';

// ──────── NestJS Module ────────
export { AuditLogModule } from './audit-log.module.js';

// ──────── Built-in Adapters ────────
export * from './adapters/index.js';
