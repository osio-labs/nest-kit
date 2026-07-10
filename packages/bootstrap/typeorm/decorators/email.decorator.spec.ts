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
  IsEmail: jest.fn().mockReturnValue(jest.fn()),
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
import { Email } from './email.decorator';

const MockedColumn = Column as unknown as jest.Mock;
const MockedTransform = Transform as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('@Email', () => {
  it('should call Column with varchar type', () => {
    class Entity {
      @Email()
      email!: string;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'varchar', nullable: false }),
    );
  });

  it('should be nullable when not required', () => {
    class Entity {
      @Email({ required: false })
      email!: string;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(expect.objectContaining({ nullable: true }));
  });

  it('should call Transform with trim+lowercase function', () => {
    class Entity {
      @Email()
      email!: string;
    }
    void Entity;

    expect(MockedTransform).toHaveBeenCalled();
    const transformFn = MockedTransform.mock.calls[0][0];
    expect(transformFn({ value: '  USER@Example.COM  ' })).toBe('user@example.com');
    expect(transformFn({ value: undefined })).toBe(undefined);
  });
});
