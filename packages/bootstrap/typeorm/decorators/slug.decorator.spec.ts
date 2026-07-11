import { Column, Index } from 'typeorm';

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
    Index: jest.fn().mockImplementation((...args: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const m = jest.requireActual('typeorm');
      return typeof m.Index === 'function' ? m.Index(...args) : () => {};
    }),
  };
});

jest.mock('@nestjs/swagger', () => ({
  ApiProperty: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('class-validator', () => ({
  Matches: jest.fn().mockReturnValue(jest.fn()),
  IsDefined: jest.fn().mockReturnValue(jest.fn()),
  IsOptional: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('class-transformer', () => ({
  Type: jest.fn().mockReturnValue(jest.fn()),
}));

import { Slug } from './slug.decorator.js';

const MockedColumn = Column as unknown as jest.Mock;
const MockedIndex = Index as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('@Slug', () => {
  it('should call Column with citext type by default', () => {
    class Entity {
      @Slug({ from: 'name' })
      slug!: string;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'citext', nullable: false }),
    );
  });

  it('should fall back to varchar when citext is false', () => {
    class Entity {
      @Slug({ from: 'name', citext: false })
      slug!: string;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(expect.objectContaining({ type: 'varchar' }));
  });

  it('should add index by default', () => {
    class Entity {
      @Slug({ from: 'name' })
      slug!: string;
    }
    void Entity;

    expect(MockedIndex).toHaveBeenCalledTimes(1);
  });

  it('should skip index when index is false', () => {
    class Entity {
      @Slug({ from: 'name', index: false })
      slug!: string;
    }
    void Entity;

    expect(MockedIndex).not.toHaveBeenCalled();
  });

  it('should register BeforeInsert and BeforeUpdate hooks on prototype', () => {
    class Entity {
      @Slug({ from: 'name' })
      slug!: string;
    }
    void Entity;

    const proto = Entity.prototype as Record<string, unknown>;
    const hookKeys = Object.getOwnPropertyNames(proto).filter((k) => k.startsWith('__slug_'));

    expect(hookKeys.length).toBe(1);
    const hookFn = proto[hookKeys[0]] as (this: Record<string, unknown>) => void;
    expect(typeof hookFn).toBe('function');
  });

  it('should generate slug from source field', () => {
    class Entity {
      @Slug({ from: 'name' })
      slug!: string;
    }
    void Entity;

    const proto = Entity.prototype as Record<string, unknown>;
    const hookKey = Object.getOwnPropertyNames(proto).find((k) => k.startsWith('__slug_'))!;
    const hookFn = proto[hookKey] as (this: Record<string, unknown>) => void;

    const instance = { name: 'Hello World!' };
    hookFn.call(instance);
    expect(instance.slug).toBe('hello-world');
  });

  it('should be nullable when not required', () => {
    class Entity {
      @Slug({ from: 'name', required: false })
      slug!: string;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(expect.objectContaining({ nullable: true }));
  });
});
