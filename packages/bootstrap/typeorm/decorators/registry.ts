import type { DataSource } from 'typeorm';

/** @internal */
let _dataSource: DataSource | undefined;

/**
 * Register the application's TypeORM `DataSource` so that decorators
 * like `@SequenceId()` can perform database queries inside lifecycle hooks.
 *
 * Must be called once during application bootstrap **after** the
 * DataSource has been initialized.
 *
 * @example
 * ```ts
 * // main.ts or AppModule constructor
 * import { useDataSource } from '@os.io/nest-kit/bootstrap';
 *
 * const dataSource = new DataSource({ ... });
 * await dataSource.initialize();
 * useDataSource(dataSource);
 * ```
 */
export function useDataSource(ds: DataSource): void {
  _dataSource = ds;
}

/**
 * Retrieve the registered `DataSource`.
 *
 * @throws {Error} If no DataSource has been registered yet.
 * @internal
 */
export function getDataSource(): DataSource {
  if (!_dataSource) {
    throw new Error('DataSource not registered.');
  }
  return _dataSource;
}

/**
 * Clear the registered DataSource (useful for testing).
 *
 * @internal
 */
export function resetDataSource(): void {
  _dataSource = undefined;
}
