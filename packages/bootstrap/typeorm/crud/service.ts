import type { DeleteResult, ObjectLiteral, Repository } from 'typeorm';

/**
 * Minimal CRUD interface for a TypeORM entity.
 *
 * Implementations can be created manually or via {@link createCrudService}.
 */
export interface CrudService<T> {
  /** List all records. */
  findAll(): Promise<T[]>;
  /** Find a single record by primary key. */
  findOne(id: string | number): Promise<T | null>;
  /** Create a new record from partial data. */
  create(data: Partial<T>): Promise<T>;
  /** Update an existing record by primary key. */
  update(id: string | number, data: Partial<T>): Promise<T>;
  /** Delete a record by primary key. */
  remove(id: string | number): Promise<DeleteResult>;
}

/**
 * Creates a minimal CRUD service from a TypeORM repository.
 *
 * Instead of manually writing 5 repository calls:
 *
 * ```ts
 * @Injectable()
 * class UserService {
 *   constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}
 *
 *   findAll() { return this.repo.find(); }
 *   findOne(id: number) { return this.repo.findOneBy({ id }); }
 *   // ... 3 more methods
 * }
 * ```
 *
 * You write:
 * ```ts
 * const userService = createCrudService(userRepo);
 * ```
 *
 * The returned object provides `findAll`, `findOne`, `create`, `update`, and `remove`.
 *
 * @param repo - A TypeORM {@link Repository}.
 */
export function createCrudService<T extends ObjectLiteral>(repo: Repository<T>): CrudService<T> {
  return {
    findAll() {
      return repo.find();
    },

    findOne(id) {
      return repo.findOneBy({ id } as never);
    },

    create(data) {
      return repo.save(repo.create(data as T));
    },

    async update(id, data) {
      await repo.update(id, data);
      return repo.findOneBy({ id } as never) as Promise<T>;
    },

    async remove(id) {
      return repo.delete(id);
    },
  };
}
