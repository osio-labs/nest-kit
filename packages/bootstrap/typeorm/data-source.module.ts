import { Module, Global, Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { useDataSource } from './decorators/registry.js';

@Injectable()
class DataSourceRegistrar implements OnApplicationBootstrap {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  onApplicationBootstrap(): void {
    useDataSource(this.dataSource);
  }
}

/**
 * NestJS module that auto-registers the TypeORM `DataSource`
 * for decorators that need database access inside lifecycle hooks
 * (e.g. `@SequenceId()`).
 *
 * Import this module **after** `TypeOrmModule.forRoot(...)` so that
 * the DataSource is already available in the DI container.
 *
 * @example
 * ```ts
 * @Module({
 *   imports: [
 *     TypeOrmModule.forRoot({ … }),
 *     TypeOrmDataSourceModule,
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  providers: [DataSourceRegistrar],
})
export class TypeOrmDataSourceModule {}
