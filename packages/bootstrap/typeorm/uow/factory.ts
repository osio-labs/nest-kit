import type { DataSource } from 'typeorm';
import { UnitOfWork } from './unit-of-work.js';

export async function createUnitOfWork(dataSource: DataSource): Promise<UnitOfWork> {
  const uow = new UnitOfWork(dataSource);
  await uow.start();
  return uow;
}

export async function withUnitOfWork<T>(
  dataSource: DataSource,
  fn: (uow: UnitOfWork) => Promise<T>,
): Promise<T> {
  const uow = await createUnitOfWork(dataSource);

  try {
    const result = await fn(uow);
    await uow.commit();
    return result;
  } catch (error) {
    try {
      await uow.rollback();
    } catch {
      // rollback failure — discard, original error takes precedence
    }
    throw error;
  } finally {
    await uow.release();
  }
}
