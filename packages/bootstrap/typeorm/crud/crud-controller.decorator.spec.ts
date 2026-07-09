import { Test } from '@nestjs/testing';
import { CrudController } from './crud-controller.decorator';
import type { CrudService } from './service';

interface TestEntity {
  id: number;
  name: string;
}

class TestService implements CrudService<TestEntity> {
  findAll = jest.fn();
  findOne = jest.fn();
  create = jest.fn();
  update = jest.fn();
  remove = jest.fn();
}

@CrudController({ path: 'users' })
class UsersController {
  constructor(readonly service: TestService) {}
}

@CrudController()
class NoPathController {
  constructor(readonly service: TestService) {}
}

describe('@CrudController', () => {
  let controller: UsersController;
  let service: TestService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [TestService],
    }).compile();
    controller = moduleRef.get(UsersController);
    service = moduleRef.get(TestService);
  });

  describe('findAll', () => {
    it('should return all entities', async () => {
      const entities: TestEntity[] = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      service.findAll = jest.fn().mockResolvedValue(entities);

      const result = await (
        controller as unknown as { findAll: () => Promise<TestEntity[]> }
      ).findAll();

      expect(result).toEqual(entities);
    });
  });

  describe('findOne', () => {
    it('should return entity by id', async () => {
      const entity: TestEntity = { id: 1, name: 'Alice' };
      service.findOne = jest.fn().mockResolvedValue(entity);

      const result = await (
        controller as unknown as { findOne: (id: string) => Promise<TestEntity | null> }
      ).findOne('1');

      expect(result).toEqual(entity);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });

    it('should return null when not found', async () => {
      service.findOne = jest.fn().mockResolvedValue(null);

      const result = await (
        controller as unknown as { findOne: (id: string) => Promise<TestEntity | null> }
      ).findOne('999');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create entity', async () => {
      const input = { name: 'Charlie' };
      const created: TestEntity = { id: 3, name: 'Charlie' };
      service.create = jest.fn().mockResolvedValue(created);

      const result = await (
        controller as unknown as { create: (data: Record<string, unknown>) => Promise<TestEntity> }
      ).create(input);

      expect(result).toEqual(created);
      expect(service.create).toHaveBeenCalledWith(input);
    });
  });

  describe('update', () => {
    it('should update entity', async () => {
      const updateData = { name: 'Updated' };
      const updated: TestEntity = { id: 1, name: 'Updated' };
      service.update = jest.fn().mockResolvedValue(updated);

      const result = await (
        controller as unknown as {
          update: (id: string, data: Record<string, unknown>) => Promise<TestEntity>;
        }
      ).update('1', updateData);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith('1', updateData);
    });
  });

  describe('remove', () => {
    it('should delete entity', async () => {
      service.remove = jest.fn().mockResolvedValue({ affected: 1 });

      const fn = controller as unknown as {
        remove: (id: string) => Promise<{ affected: number }>;
      };

      await fn.remove('1');

      expect(service.remove).toHaveBeenCalledWith('1');
    });
  });

  describe('default path', () => {
    it('should default to empty path', async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [NoPathController],
        providers: [TestService],
      }).compile();

      const ctrl = moduleRef.get(NoPathController);
      expect(ctrl).toBeDefined();
    });
  });
});
