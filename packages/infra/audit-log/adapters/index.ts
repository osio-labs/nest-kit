/**
 * Built-in adapters for the audit-log repository interface.
 *
 * Each adapter implements {@link AuditLogRepository} and can be passed
 * to `AuditLogModule.forRoot({ repository: … })`.
 *
 * @module
 * @packageDocumentation
 */

export { createTypeOrmAuditLogRepository } from './typeorm.adapter';

export { CloudTrailAdapter } from './cloudtrail.adapter';
export type { CloudTrailAdapterOptions } from './cloudtrail.adapter';

export { GcpCloudLoggingAdapter } from './gcp-cloud-logging.adapter';
export type { GcpCloudLoggingAdapterOptions } from './gcp-cloud-logging.adapter';

export { OciLoggingAdapter } from './oci-logging.adapter';
export type { OciLoggingAdapterOptions } from './oci-logging.adapter';

export { PangeaAdapter } from './pangea.adapter';
export type { PangeaAdapterOptions } from './pangea.adapter';

export { ElasticsearchAdapter } from './elasticsearch.adapter';
export type { ElasticsearchAdapterOptions } from './elasticsearch.adapter';

export { MongoAdapter } from './mongo.adapter';
export type { MongoAdapterOptions } from './mongo.adapter';

export { ConsoleAdapter } from './console.adapter';
export type { ConsoleAdapterOptions } from './console.adapter';

export { SentryAdapter } from './sentry.adapter';
export type { SentryAdapterOptions } from './sentry.adapter';
