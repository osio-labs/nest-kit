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

import { Json } from './json.decorator';

const MockedColumn = Column as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('@Json', () => {
  it('should call Column with jsonb type by default', () => {
    class Entity {
      @Json()
      metadata!: Record<string, unknown>;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'jsonb', nullable: false }),
    );
  });

  it('should fall back to json when binary is false', () => {
    class Entity {
      @Json({ binary: false })
      metadata!: Record<string, unknown>;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(expect.objectContaining({ type: 'json' }));
  });

  it('should be nullable when not required', () => {
    class Entity {
      @Json({ required: false })
      metadata!: Record<string, unknown>;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(expect.objectContaining({ nullable: true }));
  });

  it('should include transformer for JSON serialization', () => {
    class Entity {
      @Json()
      metadata!: Record<string, unknown>;
    }
    void Entity;

    const callArgs = MockedColumn.mock.calls[0][0];
    expect(callArgs.transformer).toBeDefined();
    expect(typeof callArgs.transformer.to).toBe('function');
    expect(typeof callArgs.transformer.from).toBe('function');
  });

  it('should transform object to JSON string and back', () => {
    class Entity {
      @Json()
      metadata!: Record<string, unknown>;
    }
    void Entity;

    const callArgs = MockedColumn.mock.calls[0][0];
    const { to, from } = callArgs.transformer;

    const obj = { key: 'value', num: 42 };
    expect(to(obj)).toBe('{"key":"value","num":42}');
    expect(from('{"key":"value"}')).toEqual({ key: 'value' });
  });

  it('should return null when transforming null', () => {
    class Entity {
      @Json({ required: false })
      metadata!: Record<string, unknown> | null;
    }
    void Entity;

    const callArgs = MockedColumn.mock.calls[0][0];
    const { to, from } = callArgs.transformer;

    expect(to(null)).toBeNull();
    expect(from(null)).toBeNull();
  });
});
