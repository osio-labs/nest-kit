import type { DataSource, EntityTarget, ObjectLiteral, QueryRunner, Repository } from 'typeorm';

export class UnitOfWork {
  private queryRunner: QueryRunner;

  constructor(dataSource: DataSource) {
    this.queryRunner = dataSource.createQueryRunner();
  }

  async start(): Promise<void> {
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction();
  }

  async commit(): Promise<void> {
    await this.queryRunner.commitTransaction();
  }

  async rollback(): Promise<void> {
    await this.queryRunner.rollbackTransaction();
  }

  async release(): Promise<void> {
    await this.queryRunner.release();
  }

  getRepository<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
    return this.queryRunner.manager.getRepository(entity);
  }
}
