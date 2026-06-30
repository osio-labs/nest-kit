import type { DeleteResult, ObjectLiteral, Repository } from 'typeorm';

export interface CrudService<T> {
  findAll(): Promise<T[]>;
  findOne(id: string | number): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string | number, data: Partial<T>): Promise<T>;
  remove(id: string | number): Promise<DeleteResult>;
}

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
