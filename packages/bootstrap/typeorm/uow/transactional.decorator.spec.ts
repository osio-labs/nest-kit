import type { DataSource, QueryRunner } from 'typeorm';
import {
  Transactional,
  TransactionalController,
  getCurrentUnitOfWork,
} from './transactional.decorator.js';
import { UnitOfWork } from './unit-of-work.js';

describe('@Transactional()', () => {
  let connectMock: jest.Mock;
  let startTransactionMock: jest.Mock;
  let commitTransactionMock: jest.Mock;
  let rollbackTransactionMock: jest.Mock;
  let releaseMock: jest.Mock;
  let dataSource: DataSource;

  beforeEach(() => {
    connectMock = jest.fn();
    startTransactionMock = jest.fn();
    commitTransactionMock = jest.fn();
    rollbackTransactionMock = jest.fn();
    releaseMock = jest.fn();

    const qr = {
      connect: connectMock,
      startTransaction: startTransactionMock,
      commitTransaction: commitTransactionMock,
      rollbackTransaction: rollbackTransactionMock,
      release: releaseMock,
      manager: { getRepository: jest.fn() },
    } as unknown as QueryRunner;

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(qr),
    } as unknown as DataSource;
  });

  it('should commit and release on success', async () => {
    class TestClass {
      dataSource = dataSource;

      @Transactional()
      run() {
        return Promise.resolve('ok');
      }
    }

    const instance = new TestClass();
    const result = await instance.run();

    expect(result).toBe('ok');
    expect(connectMock).toHaveBeenCalled();
    expect(startTransactionMock).toHaveBeenCalled();
    expect(commitTransactionMock).toHaveBeenCalled();
    expect(releaseMock).toHaveBeenCalled();
    expect(rollbackTransactionMock).not.toHaveBeenCalled();
  });

  it('should rollback and rethrow on error', async () => {
    class TestClass {
      dataSource = dataSource;

      @Transactional()
      run() {
        return Promise.reject(new Error('db error'));
      }
    }

    const instance = new TestClass();
    await expect(instance.run()).rejects.toThrow('db error');

    expect(rollbackTransactionMock).toHaveBeenCalled();
    expect(releaseMock).toHaveBeenCalled();
    expect(commitTransactionMock).not.toHaveBeenCalled();
  });

  it('should release even when rollback fails', async () => {
    rollbackTransactionMock.mockRejectedValue(new Error('rollback fail'));

    class TestClass {
      dataSource = dataSource;

      @Transactional()
      run() {
        return Promise.reject(new Error('orig error'));
      }
    }

    const instance = new TestClass();
    await expect(instance.run()).rejects.toThrow('orig error');

    expect(releaseMock).toHaveBeenCalled();
  });

  it('should provide UnitOfWork via getCurrentUnitOfWork inside method', async () => {
    let capturedUow: UnitOfWork | undefined;

    class TestClass {
      dataSource = dataSource;

      @Transactional()
      run() {
        capturedUow = getCurrentUnitOfWork();
        return Promise.resolve('done');
      }
    }

    const instance = new TestClass();
    await instance.run();

    expect(capturedUow).toBeInstanceOf(UnitOfWork);
    expect(connectMock).toHaveBeenCalled();
    expect(startTransactionMock).toHaveBeenCalled();
    expect(commitTransactionMock).toHaveBeenCalled();
  });

  it('should get repository from query runner via getCurrentUnitOfWork', async () => {
    const getRepositoryMock = jest.fn().mockReturnValue({ find: jest.fn() });
    (dataSource.createQueryRunner as jest.Mock).mockReturnValue({
      connect: connectMock,
      startTransaction: startTransactionMock,
      commitTransaction: commitTransactionMock,
      rollbackTransaction: rollbackTransactionMock,
      release: releaseMock,
      manager: { getRepository: getRepositoryMock },
    });

    class TestClass {
      dataSource = dataSource;

      @Transactional()
      run() {
        const uow = getCurrentUnitOfWork()!;
        return Promise.resolve(uow.getRepository('User'));
      }
    }

    const instance = new TestClass();
    const repo = await instance.run();

    expect(getRepositoryMock).toHaveBeenCalledWith('User');
    expect(repo).toBeDefined();
  });

  it('should throw if dataSource is missing', async () => {
    class TestClass {
      @Transactional()
      run() {
        return Promise.resolve('nope');
      }
    }

    const instance = new TestClass();
    await expect(instance.run()).rejects.toThrow(
      '@Transactional() requires a DataSource at this.dataSource',
    );
  });

  it('should use custom dataSourceProp', async () => {
    class TestClass {
      ds = dataSource;

      @Transactional('ds')
      run() {
        return Promise.resolve('ok');
      }
    }

    const instance = new TestClass();
    const result = await instance.run();

    expect(result).toBe('ok');
    expect(commitTransactionMock).toHaveBeenCalled();
  });
});

describe('@TransactionalController()', () => {
  let connectMock: jest.Mock;
  let startTransactionMock: jest.Mock;
  let commitTransactionMock: jest.Mock;
  let rollbackTransactionMock: jest.Mock;
  let releaseMock: jest.Mock;
  let dataSource: DataSource;

  beforeEach(() => {
    connectMock = jest.fn();
    startTransactionMock = jest.fn();
    commitTransactionMock = jest.fn();
    rollbackTransactionMock = jest.fn();
    releaseMock = jest.fn();

    const qr = {
      connect: connectMock,
      startTransaction: startTransactionMock,
      commitTransaction: commitTransactionMock,
      rollbackTransaction: rollbackTransactionMock,
      release: releaseMock,
      manager: { getRepository: jest.fn() },
    } as unknown as QueryRunner;

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(qr),
    } as unknown as DataSource;
  });

  it('should wrap every method in a transaction', async () => {
    @TransactionalController()
    class TestClass {
      dataSource = dataSource;

      methodA() {
        return Promise.resolve('a');
      }

      methodB() {
        return Promise.resolve('b');
      }
    }

    const instance = new TestClass();
    const [ra, rb] = await Promise.all([instance.methodA(), instance.methodB()]);

    expect(ra).toBe('a');
    expect(rb).toBe('b');
    expect(connectMock).toHaveBeenCalledTimes(2);
    expect(startTransactionMock).toHaveBeenCalledTimes(2);
    expect(commitTransactionMock).toHaveBeenCalledTimes(2);
    expect(releaseMock).toHaveBeenCalledTimes(2);
  });

  it('should rollback and rethrow on error', async () => {
    @TransactionalController()
    class TestClass {
      dataSource = dataSource;

      methodA() {
        return Promise.resolve('ok');
      }

      methodB() {
        return Promise.reject(new Error('fail'));
      }
    }

    const instance = new TestClass();
    await expect(instance.methodB()).rejects.toThrow('fail');

    expect(rollbackTransactionMock).toHaveBeenCalledTimes(1);
    expect(releaseMock).toHaveBeenCalledTimes(1);
    expect(commitTransactionMock).not.toHaveBeenCalled();
  });

  it('should not wrap constructor', () => {
    let ctorRan = false;

    @TransactionalController()
    class TestClass {
      dataSource = dataSource;

      constructor() {
        ctorRan = true;
      }

      run() {
        return Promise.resolve('ok');
      }
    }

    new TestClass();
    expect(ctorRan).toBe(true);
    expect(connectMock).not.toHaveBeenCalled();
  });

  it('should use custom dataSourceProp', async () => {
    @TransactionalController('ds')
    class TestClass {
      ds = dataSource;

      run() {
        return Promise.resolve('ok');
      }
    }

    const instance = new TestClass();
    await instance.run();

    expect(commitTransactionMock).toHaveBeenCalled();
  });

  it('should provide UoW via getCurrentUnitOfWork from any method', async () => {
    const results: (UnitOfWork | undefined)[] = [];

    @TransactionalController()
    class TestClass {
      dataSource = dataSource;

      methodA() {
        results.push(getCurrentUnitOfWork());
        return Promise.resolve('a');
      }

      methodB() {
        results.push(getCurrentUnitOfWork());
        return Promise.resolve('b');
      }
    }

    const instance = new TestClass();
    await instance.methodA();
    await instance.methodB();

    expect(results[0]).toBeInstanceOf(UnitOfWork);
    expect(results[1]).toBeInstanceOf(UnitOfWork);
    expect(results[0]).not.toBe(results[1]); // separate transactions
  });
});

describe('getCurrentUnitOfWork', () => {
  it('should return undefined outside @Transactional()', () => {
    expect(getCurrentUnitOfWork()).toBeUndefined();
  });
});
