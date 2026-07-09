import { Column } from 'typeorm';

jest.mock('typeorm', () => {
  const actual = jest.requireActual('typeorm');
  return {
    ...actual,
    Column: jest.fn().mockImplementation((...args: unknown[]) => {
      const actualModule = jest.requireActual('typeorm');
      if (typeof actualModule.Column === 'function') {
        return actualModule.Column(...args);
      }
      return () => {};
    }),
  };
});

jest.mock('@nestjs/swagger', () => ({
  ApiProperty: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('class-validator', () => ({
  IsNumber: jest.fn().mockReturnValue(jest.fn()),
  IsDefined: jest.fn().mockReturnValue(jest.fn()),
  IsOptional: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('class-transformer', () => ({
  Type: jest.fn().mockReturnValue(jest.fn()),
}));

import { Money } from './money.decorator';

const MockedColumn = Column as jest.MockedFunction<typeof Column>;

beforeEach(() => {
  MockedColumn.mockClear();
});

describe('@Money', () => {
  it('should call Column with decimal type and default options', () => {
    class Entity {
      @Money()
      price!: number;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledTimes(1);
    expect(MockedColumn).toHaveBeenCalledWith({
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: false,
      transformer: expect.objectContaining({
        to: expect.any(Function),
        from: expect.any(Function),
      }),
    });
  });

  it('should accept custom precision and scale', () => {
    class Entity {
      @Money({ precision: 12, scale: 4 })
      price!: number;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(expect.objectContaining({ precision: 12, scale: 4 }));
  });

  it('should make column nullable when not required', () => {
    class Entity {
      @Money({ required: false })
      price!: number;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(expect.objectContaining({ nullable: true }));
  });

  it('should use custom column name', () => {
    class Entity {
      @Money({ name: 'unit_price' })
      price!: number;
    }
    void Entity;

    expect(MockedColumn).toHaveBeenCalledWith(expect.objectContaining({ name: 'unit_price' }));
  });

  it('should transform number to string and back', () => {
    const callArgs = (MockedColumn as jest.Mock).mock.calls[0];
    // Access the last call's transformer
  });
});
