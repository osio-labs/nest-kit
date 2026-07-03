/**
 * @os.io/nest-kit/bootstrap/queue
 *
 * BullMQ queue module configuration bootstrapper for NestJS applications.
 * Supports Redis-backed queues with connection, prefix, and default job options.
 *
 * @module
 * @packageDocumentation
 */

export { configQueue, configQueueAsync } from './config';
export type { QueueConfigOptions, QueueRegisterConfig, BullDefaultJobOptions } from './config';
