import { Column } from 'typeorm';

jest.mock('typeorm', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual = jest.requireActual('typeorm');
  return {
    ...actual,
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

import { UniqueCode } from './unique-code.decorator';

const MockedColumn = Column as unknown as jest.Mock;

beforeEach(() => {
  MockedColumn.mockClear();
});

describe('@UniqueCode', () => {
  it('should call Column with unique varchar', () => {
    class Entity {
      @UniqueCode({ prefix: 'SKU' })
      code!: string;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith({
      type: 'varchar',
      length: 12,
      unique: true,
      nullable: false,
    });
  });

  it('should accept custom length and separator', () => {
    class Entity {
      @UniqueCode({ prefix: 'ORD', length: 12, separator: '_' })
      code!: string;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith({
      type: 'varchar',
      length: 16,
      unique: true,
      nullable: false,
    });
  });

  it('should register BeforeInsert hook on prototype', () => {
    class Entity {
      @UniqueCode({ prefix: 'CPN' })
      code!: string;
    }
    void Entity;

    const proto = Entity.prototype as Record<string, unknown>;
    const hookKey = Object.getOwnPropertyNames(proto).find((k) => k.startsWith('__uniqueCode_'));

    expect(hookKey).toBeDefined();
    expect(typeof proto[hookKey!]).toBe('function');
  });

  it('should generate code with prefix and random string', () => {
    class Entity {
      @UniqueCode({ prefix: 'SKU', length: 8 })
      code!: string;
    }
    void Entity;

    const proto = Entity.prototype as Record<string, unknown>;
    const hookKey = Object.getOwnPropertyNames(proto).find((k) => k.startsWith('__uniqueCode_'))!;
    const hookFn = proto[hookKey] as (this: Record<string, unknown>) => void;

    const instance: Record<string, unknown> = {};
    hookFn.call(instance);
    expect(instance.code).toMatch(/^SKU-[A-Z0-9]{8}$/);
  });

  it('should not override existing code', () => {
    class Entity {
      @UniqueCode({ prefix: 'SKU', length: 8 })
      code!: string;
    }
    void Entity;

    const proto = Entity.prototype as Record<string, unknown>;
    const hookKey = Object.getOwnPropertyNames(proto).find((k) => k.startsWith('__uniqueCode_'))!;
    const hookFn = proto[hookKey] as (this: Record<string, unknown>) => void;

    const instance = { code: 'MANUAL-001' };
    hookFn.call(instance);
    expect(instance.code).toBe('MANUAL-001');
  });

  it('should be nullable when not required', () => {
    class Entity {
      @UniqueCode({ prefix: 'SKU', required: false })
      code!: string;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(expect.objectContaining({ nullable: true }));
  });
});
