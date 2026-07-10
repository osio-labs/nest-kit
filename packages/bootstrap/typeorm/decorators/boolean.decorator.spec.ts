import { Column } from 'typeorm';

jest.mock('typeorm', () => {
  const actual = jest.requireActual('typeorm');
  return {
    ...actual,
    Column: jest.fn().mockImplementation((...args: unknown[]) => {
      const m = jest.requireActual('typeorm');
      return typeof m.Column === 'function' ? m.Column(...args) : () => {};
    }),
  };
});

jest.mock('@nestjs/swagger', () => ({
  ApiProperty: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('class-validator', () => ({
  IsDefined: jest.fn().mockReturnValue(jest.fn()),
  IsOptional: jest.fn().mockReturnValue(jest.fn()),
}));

import { Boolean } from './boolean.decorator';

const MockedColumn = Column as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('@Boolean', () => {
  it('should call Column with boolean type', () => {
    class Entity {
      @Boolean()
      isActive!: boolean;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'boolean', nullable: false }),
    );
  });

  it('should be nullable when not required', () => {
    class Entity {
      @Boolean({ required: false })
      isActive!: boolean;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(expect.objectContaining({ nullable: true }));
  });

  it('should accept default value', () => {
    class Entity {
      @Boolean({ default: false })
      isActive!: boolean;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(expect.objectContaining({ default: false }));
  });

  it('should use custom column name', () => {
    class Entity {
      @Boolean({ name: 'is_active' })
      isActive!: boolean;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(expect.objectContaining({ name: 'is_active' }));
  });
});
