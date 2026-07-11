import { Test } from '@nestjs/testing';
import { createCrudController } from './controller.js';
import type { CrudService } from './service.js';

interface TestEntity {
  id: number;
  name: string;
}

describe('createCrudController', () => {
  let controller: Record<string, unknown>;
  let findAllMock: jest.Mock;
  let findOneMock: jest.Mock;
  let createMock: jest.Mock;
  let updateMock: jest.Mock;
  let removeMock: jest.Mock;

  beforeEach(async () => {
    findAllMock = jest.fn();
    findOneMock = jest.fn();
    createMock = jest.fn();
    updateMock = jest.fn();
    removeMock = jest.fn();

    const service: CrudService<TestEntity> = {
      findAll: findAllMock,
      findOne: findOneMock,
      create: createMock,
      update: updateMock,
      remove: removeMock,
    };

    const Controller = createCrudController<TestEntity>(service, {
      path: 'test',
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [Controller],
    }).compile();

    controller = moduleRef.get(Controller);
  });

  describe('findAll', () => {
    it('should return all entities', async () => {
      const entities: TestEntity[] = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      findAllMock.mockResolvedValue(entities);

      const result = await (controller as { findAll: () => Promise<TestEntity[]> }).findAll();

      expect(result).toEqual(entities);
    });
  });

  describe('findOne', () => {
    it('should return entity by id', async () => {
      const entity: TestEntity = { id: 1, name: 'Alice' };
      findOneMock.mockResolvedValue(entity);

      const result = await (
        controller as {
          findOne: (id: string) => Promise<TestEntity | null>;
        }
      ).findOne('1');

      expect(result).toEqual(entity);
      expect(findOneMock).toHaveBeenCalledWith('1');
    });

    it('should return null when not found', async () => {
      findOneMock.mockResolvedValue(null);

      const result = await (
        controller as {
          findOne: (id: string) => Promise<TestEntity | null>;
        }
      ).findOne('999');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create entity', async () => {
      const input = { name: 'Charlie' };
      const created: TestEntity = { id: 3, name: 'Charlie' };
      createMock.mockResolvedValue(created);

      const result = await (
        controller as {
          create: (data: Record<string, unknown>) => Promise<TestEntity>;
        }
      ).create(input);

      expect(result).toEqual(created);
      expect(createMock).toHaveBeenCalledWith(input);
    });
  });

  describe('update', () => {
    it('should update entity', async () => {
      const updateData = { name: 'Updated' };
      const updated: TestEntity = { id: 1, name: 'Updated' };
      updateMock.mockResolvedValue(updated);

      const result = await (
        controller as {
          update: (id: string, data: Record<string, unknown>) => Promise<TestEntity>;
        }
      ).update('1', updateData);

      expect(result).toEqual(updated);
      expect(updateMock).toHaveBeenCalledWith('1', updateData);
    });
  });

  describe('remove', () => {
    it('should delete entity', async () => {
      removeMock.mockResolvedValue(undefined);

      const fn = controller as { remove: (id: string) => Promise<void> };

      await fn.remove('1');

      expect(removeMock).toHaveBeenCalledWith('1');
    });
  });
});
