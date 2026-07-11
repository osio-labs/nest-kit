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
  IsString: jest.fn().mockReturnValue(jest.fn()),
  IsDefined: jest.fn().mockReturnValue(jest.fn()),
  IsOptional: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('class-transformer', () => {
  const actual = jest.requireActual('class-transformer');
  return {
    ...actual,
    Type: jest.fn().mockReturnValue(jest.fn()),
    Transform: jest.fn().mockImplementation((...args: unknown[]) => {
      const m = jest.requireActual('class-transformer');
      return typeof m.Transform === 'function' ? m.Transform(...args) : () => {};
    }),
  };
});

import { Transform } from 'class-transformer';
import { Text } from './text.decorator.js';

const MockedColumn = Column as unknown as jest.Mock;
const MockedTransform = Transform as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('@Text', () => {
  it('should call Column with text type by default', () => {
    class Entity {
      @Text()
      body!: string;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'text', nullable: false }),
    );
  });

  it('should accept custom text length', () => {
    class Entity {
      @Text({ length: 'long' })
      body!: string;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(expect.objectContaining({ type: 'longtext' }));
  });

  it('should be nullable when not required', () => {
    class Entity {
      @Text({ required: false })
      body!: string;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(expect.objectContaining({ nullable: true }));
  });

  it('should call Transform with trim function', () => {
    class Entity {
      @Text()
      body!: string;
    }
    void Entity;

    expect(MockedTransform).toHaveBeenCalled();
    const transformFn = MockedTransform.mock.calls[0][0];
    expect(transformFn({ value: '  hello world  ' })).toBe('hello world');
    expect(transformFn({ value: undefined })).toBe(undefined);
  });

  it('should use custom column name', () => {
    class Entity {
      @Text({ name: 'full_body' })
      body!: string;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(expect.objectContaining({ name: 'full_body' }));
  });
});
