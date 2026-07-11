import type { DataSource, QueryRunner } from 'typeorm';
import { UnitOfWork } from './unit-of-work.js';
import { createUnitOfWork, withUnitOfWork } from './factory.js';

describe('UnitOfWork', () => {
  let connectMock: jest.Mock;
  let startTransactionMock: jest.Mock;
  let commitTransactionMock: jest.Mock;
  let rollbackTransactionMock: jest.Mock;
  let releaseMock: jest.Mock;
  let getRepositoryMock: jest.Mock;
  let dataSource: DataSource;
  let uow: UnitOfWork;

  beforeEach(() => {
    connectMock = jest.fn();
    startTransactionMock = jest.fn();
    commitTransactionMock = jest.fn();
    rollbackTransactionMock = jest.fn();
    releaseMock = jest.fn();
    getRepositoryMock = jest.fn();

    const qr = {
      connect: connectMock,
      startTransaction: startTransactionMock,
      commitTransaction: commitTransactionMock,
      rollbackTransaction: rollbackTransactionMock,
      release: releaseMock,
      manager: { getRepository: getRepositoryMock },
    } as unknown as QueryRunner;

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(qr),
    } as unknown as DataSource;

    uow = new UnitOfWork(dataSource);
  });

  describe('start', () => {
    it('should connect and start transaction', async () => {
      await uow.start();

      expect(connectMock).toHaveBeenCalled();
      expect(startTransactionMock).toHaveBeenCalled();
    });
  });

  describe('commit', () => {
    it('should commit transaction', async () => {
      await uow.commit();

      expect(commitTransactionMock).toHaveBeenCalled();
    });
  });

  describe('rollback', () => {
    it('should rollback transaction', async () => {
      await uow.rollback();

      expect(rollbackTransactionMock).toHaveBeenCalled();
    });
  });

  describe('release', () => {
    it('should release query runner', async () => {
      await uow.release();

      expect(releaseMock).toHaveBeenCalled();
    });
  });

  describe('getRepository', () => {
    it('should return repository from query runner manager', () => {
      const mockRepo = {};
      getRepositoryMock.mockReturnValue(mockRepo);

      const repo = uow.getRepository('User');

      expect(getRepositoryMock).toHaveBeenCalledWith('User');
      expect(repo).toBe(mockRepo);
    });
  });
});

describe('createUnitOfWork', () => {
  it('should create and start a unit of work', async () => {
    const connectMock = jest.fn();
    const startTransactionMock = jest.fn();
    const qr = {
      connect: connectMock,
      startTransaction: startTransactionMock,
    } as unknown as QueryRunner;
    const dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(qr),
    } as unknown as DataSource;

    const uow = await createUnitOfWork(dataSource);

    expect(uow).toBeInstanceOf(UnitOfWork);
    expect(connectMock).toHaveBeenCalled();
    expect(startTransactionMock).toHaveBeenCalled();
  });
});

describe('withUnitOfWork', () => {
  let connectMock: jest.Mock;
  let startTransactionMock: jest.Mock;
  let commitTransactionMock: jest.Mock;
  let rollbackTransactionMock: jest.Mock;
  let releaseMock: jest.Mock;
  let getRepositoryMock: jest.Mock;
  let dataSource: DataSource;

  beforeEach(() => {
    connectMock = jest.fn();
    startTransactionMock = jest.fn();
    commitTransactionMock = jest.fn();
    rollbackTransactionMock = jest.fn();
    releaseMock = jest.fn();
    getRepositoryMock = jest.fn();

    const qr = {
      connect: connectMock,
      startTransaction: startTransactionMock,
      commitTransaction: commitTransactionMock,
      rollbackTransaction: rollbackTransactionMock,
      release: releaseMock,
      manager: { getRepository: getRepositoryMock },
    } as unknown as QueryRunner;

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(qr),
    } as unknown as DataSource;
  });

  it('should run fn within transaction and commit', async () => {
    const fn = jest.fn().mockResolvedValue('done');

    const result = await withUnitOfWork(dataSource, fn);

    expect(result).toBe('done');
    expect(connectMock).toHaveBeenCalled();
    expect(startTransactionMock).toHaveBeenCalled();
    expect(fn).toHaveBeenCalledWith(expect.any(UnitOfWork));
    expect(commitTransactionMock).toHaveBeenCalled();
    expect(releaseMock).toHaveBeenCalled();
  });

  it('should rollback on error and rethrow', async () => {
    const error = new Error('db error');
    const fn = jest.fn().mockRejectedValue(error);

    await expect(withUnitOfWork(dataSource, fn)).rejects.toThrow('db error');

    expect(rollbackTransactionMock).toHaveBeenCalled();
    expect(releaseMock).toHaveBeenCalled();
  });

  it('should release even when rollback fails', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));
    rollbackTransactionMock.mockRejectedValue(new Error('rollback fail'));

    await expect(withUnitOfWork(dataSource, fn)).rejects.toThrow('fail');

    expect(releaseMock).toHaveBeenCalled();
  });

  it('should run operations within transaction via getRepository', async () => {
    const findMock = jest.fn().mockResolvedValue([]);
    getRepositoryMock.mockReturnValue({ find: findMock });

    const fn = jest.fn().mockImplementation(async (uow: UnitOfWork) => {
      const repo = uow.getRepository('User');
      return repo.find();
    });

    const result = await withUnitOfWork(dataSource, fn);

    expect(result).toEqual([]);
    expect(getRepositoryMock).toHaveBeenCalledWith('User');
  });
});
