/**
 * Built-in adapters for the audit-log repository interface.
 *
 * Each adapter implements {@link AuditLogRepository} and can be passed
 * to `AuditLogModule.forRoot({ repository: … })`.
 *
 * @module
 * @packageDocumentation
 */

export { createTypeOrmAuditLogRepository } from './typeorm.adapter.js';

export { CloudTrailAdapter } from './cloudtrail.adapter.js';
export type { CloudTrailAdapterOptions } from './cloudtrail.adapter.js';

export { GcpCloudLoggingAdapter } from './gcp-cloud-logging.adapter.js';
export type { GcpCloudLoggingAdapterOptions } from './gcp-cloud-logging.adapter.js';

export { OciLoggingAdapter } from './oci-logging.adapter.js';
export type { OciLoggingAdapterOptions } from './oci-logging.adapter.js';

export { PangeaAdapter } from './pangea.adapter.js';
export type { PangeaAdapterOptions } from './pangea.adapter.js';

export { ElasticsearchAdapter } from './elasticsearch.adapter.js';
export type { ElasticsearchAdapterOptions } from './elasticsearch.adapter.js';

export { MongoAdapter } from './mongo.adapter.js';
export type { MongoAdapterOptions } from './mongo.adapter.js';

export { ConsoleAdapter } from './console.adapter.js';
export type { ConsoleAdapterOptions } from './console.adapter.js';

export { SentryAdapter } from './sentry.adapter.js';
export type { SentryAdapterOptions } from './sentry.adapter.js';
