import { PrimaryColumn, Column } from 'typeorm';

jest.mock('typeorm', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual = jest.requireActual('typeorm');
  return {
    ...actual,
    PrimaryColumn: jest.fn().mockImplementation((...args: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const m = jest.requireActual('typeorm');
      return typeof m.PrimaryColumn === 'function' ? m.PrimaryColumn(...args) : () => {};
    }),
    Column: jest.fn().mockImplementation((...args: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const m = jest.requireActual('typeorm');
      return typeof m.Column === 'function' ? m.Column(...args) : () => {};
    }),
  };
});

jest.mock('@nestjs/swagger', () => ({
  ApiProperty: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('class-validator', () => ({
  IsString: jest.fn().mockReturnValue(jest.fn()),
  IsDefined: jest.fn().mockReturnValue(jest.fn()),
  IsOptional: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('class-transformer', () => ({
  Type: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('./registry', () => ({
  getDataSource: jest.fn(),
}));

// query response helper
function makeQueryResult(m: number | null): Array<{ m: number | null }> {
  return [{ m }];
}

const mockRepo = {
  query: jest.fn(),
};

const mockDataSource = {
  getRepository: jest.fn().mockReturnValue(mockRepo),
  getMetadata: jest.fn().mockReturnValue({ tableName: 'test_entity' }),
};

import { getDataSource } from './registry.js';
import { SequenceId } from './sequence-id.decorator.js';

const MockedPrimaryColumn = PrimaryColumn as unknown as jest.Mock;
const MockedColumn = Column as unknown as jest.Mock;

const mockedGetDataSource = getDataSource as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetDataSource.mockReturnValue(mockDataSource);
});

describe('@SequenceId', () => {
  it('should call PrimaryColumn with varchar type by default', () => {
    class Entity {
      @SequenceId({ prefix: 'ORDER' })
      id!: string;
    }
    void Entity;

    expect(MockedPrimaryColumn).toHaveBeenCalledWith(expect.objectContaining({ type: 'varchar' }));
  });

  it('should call Column when primary is false', () => {
    class Entity {
      @SequenceId({ prefix: 'ORDER', primary: false })
      id!: string;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(expect.objectContaining({ type: 'varchar' }));
  });

  it('should register BeforeInsert hook on prototype', () => {
    class Entity {
      @SequenceId({ prefix: 'ORDER' })
      id!: string;
    }
    void Entity;

    const proto = Entity.prototype as Record<string, unknown>;
    const hookKey = Object.getOwnPropertyNames(proto).find((k) => k.startsWith('__seqId_'));

    expect(hookKey).toBeDefined();
    expect(typeof proto[hookKey!]).toBe('function');
  });

  it('should generate next ID based on DB max value', async () => {
    mockRepo.query.mockResolvedValue(makeQueryResult(100));

    class Entity {
      @SequenceId({ prefix: 'ORDER' })
      id!: string;
    }
    void Entity;

    const proto = Entity.prototype as Record<string, unknown>;
    const hookKey = Object.getOwnPropertyNames(proto).find((k) => k.startsWith('__seqId_'))!;
    const hookFn = proto[hookKey] as (this: Record<string, unknown>) => Promise<void>;

    const instance: Record<string, unknown> = {};
    await hookFn.call(instance);

    expect(instance.id).toBe('ORDER_101');
  });

  it('should use startFrom when DB returns null (empty table)', async () => {
    mockRepo.query.mockResolvedValue(makeQueryResult(null));

    class Entity {
      @SequenceId({ prefix: 'ORDER', startFrom: 10000 })
      id!: string;
    }
    void Entity;

    const proto = Entity.prototype as Record<string, unknown>;
    const hookKey = Object.getOwnPropertyNames(proto).find((k) => k.startsWith('__seqId_'))!;
    const hookFn = proto[hookKey] as (this: Record<string, unknown>) => Promise<void>;

    const instance: Record<string, unknown> = {};
    await hookFn.call(instance);

    expect(instance.id).toBe('ORDER_10000');
  });

  it('should not overwrite an existing value', async () => {
    class Entity {
      @SequenceId({ prefix: 'ORDER' })
      id!: string;
    }
    void Entity;

    const proto = Entity.prototype as Record<string, unknown>;
    const hookKey = Object.getOwnPropertyNames(proto).find((k) => k.startsWith('__seqId_'))!;
    const hookFn = proto[hookKey] as (this: Record<string, unknown>) => Promise<void>;

    const instance = { id: 'MANUAL-001' };
    await hookFn.call(instance);

    expect(mockRepo.query).not.toHaveBeenCalled();
    expect(instance.id).toBe('MANUAL-001');
  });

  it('should zero-pad the number when padding is set', async () => {
    mockRepo.query.mockResolvedValue(makeQueryResult(null));

    class Entity {
      @SequenceId({ prefix: 'INV', padding: 5 })
      id!: string;
    }
    void Entity;

    const proto = Entity.prototype as Record<string, unknown>;
    const hookKey = Object.getOwnPropertyNames(proto).find((k) => k.startsWith('__seqId_'))!;
    const hookFn = proto[hookKey] as (this: Record<string, unknown>) => Promise<void>;

    const instance: Record<string, unknown> = {};
    await hookFn.call(instance);

    expect(instance.id).toBe('INV_00001');
  });

  it('should support custom separator', async () => {
    mockRepo.query.mockResolvedValue(makeQueryResult(99));

    class Entity {
      @SequenceId({ prefix: 'ORD', separator: '-' })
      id!: string;
    }
    void Entity;

    const proto = Entity.prototype as Record<string, unknown>;
    const hookKey = Object.getOwnPropertyNames(proto).find((k) => k.startsWith('__seqId_'))!;
    const hookFn = proto[hookKey] as (this: Record<string, unknown>) => Promise<void>;

    const instance: Record<string, unknown> = {};
    await hookFn.call(instance);

    expect(instance.id).toBe('ORD-100');
  });

  it('should use explicit tableName when provided', async () => {
    mockRepo.query.mockResolvedValue(makeQueryResult(200));

    class Entity {
      @SequenceId({ prefix: 'ORD', tableName: 'orders' })
      id!: string;
    }
    void Entity;

    const proto = Entity.prototype as Record<string, unknown>;
    const hookKey = Object.getOwnPropertyNames(proto).find((k) => k.startsWith('__seqId_'))!;
    const hookFn = proto[hookKey] as (this: Record<string, unknown>) => Promise<void>;

    const instance: Record<string, unknown> = {};
    await hookFn.call(instance);

    // Should contain "orders" (the explicit table name) in the SQL
    const sql = mockRepo.query.mock.calls[0][0] as string;
    expect(sql).toContain('orders');
    expect(instance.id).toBe('ORD_201');
  });

  it('should fallback to startFrom when query throws', async () => {
    mockRepo.query.mockRejectedValue(new Error('DB error'));

    class Entity {
      @SequenceId({ prefix: 'ORDER', startFrom: 5000 })
      id!: string;
    }
    void Entity;

    const proto = Entity.prototype as Record<string, unknown>;
    const hookKey = Object.getOwnPropertyNames(proto).find((k) => k.startsWith('__seqId_'))!;
    const hookFn = proto[hookKey] as (this: Record<string, unknown>) => Promise<void>;

    const instance: Record<string, unknown> = {};
    await hookFn.call(instance);

    expect(instance.id).toBe('ORDER_5000');
  });
});
