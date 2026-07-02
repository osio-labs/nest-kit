import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request correlation-ID store based on Node.js `AsyncLocalStorage`.
 *
 * Values are automatically scoped to the current request / async context
 * and are available throughout the call chain without explicit propagation.
 */
export const correlationIdStorage = new AsyncLocalStorage<string>();

/**
 * Return the correlation ID for the current async context, if any.
 */
export function getCorrelationId(): string | undefined {
  return correlationIdStorage.getStore();
}

/**
 * Run a function within a new correlation-ID context.
 */
export function runWithCorrelationId<T>(id: string, fn: () => T): T {
  return correlationIdStorage.run(id, fn);
}
