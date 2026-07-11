import { createCrudService } from './service.js';
import type { CrudService } from './service.js';
import type { Repository } from 'typeorm';

interface TestEntity {
  id: number;
  name: string;
  email?: string;
}

describe('createCrudService', () => {
  let repo: Repository<TestEntity>;
  let service: CrudService<TestEntity>;
  let findMock: jest.Mock;
  let findOneByMock: jest.Mock;
  let createMock: jest.Mock;
  let saveMock: jest.Mock;
  let updateMock: jest.Mock;
  let deleteMock: jest.Mock;

  beforeEach(() => {
    findMock = jest.fn();
    findOneByMock = jest.fn();
    createMock = jest.fn();
    saveMock = jest.fn();
    updateMock = jest.fn();
    deleteMock = jest.fn();

    repo = {
      find: findMock,
      findOneBy: findOneByMock,
      create: createMock,
      save: saveMock,
      update: updateMock,
      delete: deleteMock,
    } as unknown as Repository<TestEntity>;

    service = createCrudService(repo);
  });

  describe('findAll', () => {
    it('should call repo.find and return result', async () => {
      const entities: TestEntity[] = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      findMock.mockResolvedValue(entities);

      const result = await service.findAll();

      expect(findMock).toHaveBeenCalledWith();
      expect(result).toEqual(entities);
    });
  });

  describe('findOne', () => {
    it('should call repo.findOneBy with id and return result', async () => {
      const entity: TestEntity = { id: 1, name: 'Alice' };
      findOneByMock.mockResolvedValue(entity);

      const result = await service.findOne(1);

      expect(findOneByMock).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(entity);
    });

    it('should return null when not found', async () => {
      findOneByMock.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should call repo.create then repo.save and return saved entity', async () => {
      const input = { name: 'Charlie', email: 'c@test.com' };
      const entityInstance: TestEntity = {
        id: 0,
        name: 'Charlie',
        email: 'c@test.com',
      };
      const savedEntity: TestEntity = {
        id: 3,
        name: 'Charlie',
        email: 'c@test.com',
      };
      createMock.mockReturnValue(entityInstance);
      saveMock.mockResolvedValue(savedEntity);

      const result = await service.create(input);

      expect(createMock).toHaveBeenCalledWith(input);
      expect(saveMock).toHaveBeenCalledWith(entityInstance);
      expect(result).toEqual(savedEntity);
    });
  });

  describe('update', () => {
    it('should call repo.update then repo.findOneBy and return updated entity', async () => {
      const updateData = { name: 'Updated' };
      const updatedEntity: TestEntity = { id: 1, name: 'Updated' };
      updateMock.mockResolvedValue({ affected: 1 });
      findOneByMock.mockResolvedValue(updatedEntity);

      const result = await service.update(1, updateData);

      expect(updateMock).toHaveBeenCalledWith(1, updateData);
      expect(findOneByMock).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(updatedEntity);
    });
  });

  describe('remove', () => {
    it('should call repo.delete with id', async () => {
      deleteMock.mockResolvedValue({ affected: 1 });

      const result = await service.remove(1);

      expect(deleteMock).toHaveBeenCalledWith(1);
      expect(result).toEqual({ affected: 1 });
    });
  });
});
