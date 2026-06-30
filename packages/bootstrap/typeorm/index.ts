/**
 * @os.io/nest-kit/bootstrap/typeorm
 *
 * TypeORM configuration, CRUD factories, and Unit of Work support for NestJS applications.
 *
 * ## Sub-modules
 *
 * - `config` — `configTypeOrm` / `configTypeOrmAsync` for connection setup
 * - `crud` — `createCrudService` / `createCrudController` for generic REST endpoints
 * - `uow` — `UnitOfWork`, `@Transactional()`, `@TransactionalController()`
 *
 * @module
 * @packageDocumentation
 */

export * from './config';
export * from './crud';
export * from './uow';
