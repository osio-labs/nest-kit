import { Injectable } from '@nestjs/common';
import type { DeleteResult, FindOneOptions, ObjectLiteral, Repository } from 'typeorm';

/**
 * Options for the {@link CrudService} class decorator.
 */
export interface CrudServiceDecoratorOptions {
  /**
   * Name of the class property holding the TypeORM `Repository`.
   * Defaults to `'repo'`.
   *
   * @example
   * ```ts
   * \@CrudService({ repoProp: 'userRepo' })
   * class UserService {
   *   constructor(
   *     \@InjectRepository(User)
   *     readonly userRepo: Repository<User>,
   *   ) {}
   * }
   * ```
   */
  repoProp?: string;
}

function crudServiceMethod<T extends ObjectLiteral>(fn: (repo: Repository<T>) => unknown) {
  return function (this: Record<string, Repository<T>>) {
    return fn(this.repo);
  };
}

/**
 * Class decorator that auto-generates standard CRUD methods on a service.
 *
 * Instead of manually writing every repository call:
 * ```ts
 * \@Injectable()
 * class UserService {
 *   constructor(
 *     \@InjectRepository(User)
 *     readonly repo: Repository<User>,
 *   ) {}
 *
 *   findAll() { return this.repo.find(); }
 *   findOne(id: number) { return this.repo.findOneBy({ id }); }
 *   // ... more boilerplate
 * }
 * ```
 *
 * You write:
 * ```ts
 * \@CrudService()
 * \@Injectable()
 * class UserService {
 *   constructor(
 *     \@InjectRepository(User)
 *     readonly repo: Repository<User>,
 *   ) {}
 * }
 * ```
 *
 * The decorator generates `findAll`, `findOne`, `create`, `update`, and `remove`
 * methods that delegate to `this.repo` (or the property named via `repoProp`).
 * Existing methods on the prototype are **not** overwritten, so you can
 * override individual handlers while keeping the ones you don't customise.
 *
 * @example
 * ```ts
 * \@CrudService({ repoProp: 'userRepo' })
 * \@Injectable()
 * class UserService {
 *   constructor(
 *     \@InjectRepository(User)
 *     readonly userRepo: Repository<User>,
 *   ) {}
 *
 *   // override findAll with custom logic
 *   async findAll(activeOnly?: boolean) {
 *     if (activeOnly) {
 *       return this.userRepo.find({ where: { isActive: true } });
 *     }
 *     return this.userRepo.find();
 *   }
 * }
 * ```
 *
 * @param options - Optional {@link CrudServiceDecoratorOptions}.
 */
export function CrudService(options?: CrudServiceDecoratorOptions): ClassDecorator {
  const { repoProp = 'repo' } = options ?? {};

  return (target) => {
    Injectable()(target);

    const proto = (target as unknown as Record<string, unknown>).prototype as Record<
      string,
      unknown
    >;

    if (!('findAll' in proto)) {
      proto.findAll = crudServiceMethod((repo) => repo.find());
    }

    if (!('findOne' in proto)) {
      proto.findOne = function (
        this: Record<string, Repository<ObjectLiteral>>,
        id: string | number,
        options?: FindOneOptions<ObjectLiteral>,
      ) {
        const repo = this[repoProp];
        return repo.findOne({ where: { id }, ...options });
      };
    }

    if (!('create' in proto)) {
      proto.create = async function (
        this: Record<string, Repository<ObjectLiteral>>,
        data: Partial<ObjectLiteral>,
      ) {
        const repo = this[repoProp];
        return repo.save(repo.create(data));
      };
    }

    if (!('update' in proto)) {
      proto.update = async function (
        this: Record<string, Repository<ObjectLiteral>>,
        id: string | number,
        data: Partial<ObjectLiteral>,
      ) {
        const repo = this[repoProp];
        await repo.update(id, data);
        return repo.findOneBy({ id }) as Promise<ObjectLiteral>;
      };
    }

    if (!('remove' in proto)) {
      proto.remove = function (
        this: Record<string, Repository<ObjectLiteral>>,
        id: string | number,
      ): Promise<DeleteResult> {
        const repo = this[repoProp];
        return repo.delete(id);
      };
    }
  };
}
