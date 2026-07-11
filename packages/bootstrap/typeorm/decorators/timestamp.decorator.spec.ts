import { CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

jest.mock('typeorm', () => {
  const actual = jest.requireActual('typeorm');
  return {
    ...actual,
    CreateDateColumn: jest.fn().mockImplementation((...args: unknown[]) => {
      const m = jest.requireActual('typeorm');
      return typeof m.CreateDateColumn === 'function' ? m.CreateDateColumn(...args) : () => {};
    }),
    UpdateDateColumn: jest.fn().mockImplementation((...args: unknown[]) => {
      const m = jest.requireActual('typeorm');
      return typeof m.UpdateDateColumn === 'function' ? m.UpdateDateColumn(...args) : () => {};
    }),
    DeleteDateColumn: jest.fn().mockImplementation((...args: unknown[]) => {
      const m = jest.requireActual('typeorm');
      return typeof m.DeleteDateColumn === 'function' ? m.DeleteDateColumn(...args) : () => {};
    }),
  };
});

jest.mock('@nestjs/swagger', () => ({
  ApiProperty: jest.fn().mockReturnValue(jest.fn()),
}));

import { CreatedAt, UpdatedAt, DeletedAt } from './timestamp.decorator.js';

const MockedCreateDateColumn = CreateDateColumn as unknown as jest.Mock;
const MockedUpdateDateColumn = UpdateDateColumn as unknown as jest.Mock;
const MockedDeleteDateColumn = DeleteDateColumn as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('@CreatedAt', () => {
  it('should call CreateDateColumn with default name', () => {
    class Entity {
      @CreatedAt()
      createdAt!: Date;
    }
    void Entity;

    expect(MockedCreateDateColumn).toHaveBeenCalledWith({ name: 'created_at' });
  });

  it('should accept custom name', () => {
    class Entity {
      @CreatedAt({ name: 'created_at_custom' })
      createdAt!: Date;
    }
    void Entity;

    expect(MockedCreateDateColumn).toHaveBeenCalledWith({ name: 'created_at_custom' });
  });

  it('should accept timestamptz type', () => {
    class Entity {
      @CreatedAt({ type: 'timestamptz' })
      createdAt!: Date;
    }
    void Entity;

    expect(MockedCreateDateColumn).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'created_at', type: 'timestamptz' }),
    );
  });
});

describe('@UpdatedAt', () => {
  it('should call UpdateDateColumn with default name', () => {
    class Entity {
      @UpdatedAt()
      updatedAt!: Date;
    }
    void Entity;

    expect(MockedUpdateDateColumn).toHaveBeenCalledWith({ name: 'updated_at' });
  });

  it('should accept custom name', () => {
    class Entity {
      @UpdatedAt({ name: 'updated_at_custom' })
      updatedAt!: Date;
    }
    void Entity;

    expect(MockedUpdateDateColumn).toHaveBeenCalledWith({ name: 'updated_at_custom' });
  });

  it('should accept timestamptz type', () => {
    class Entity {
      @UpdatedAt({ type: 'timestamptz' })
      updatedAt!: Date;
    }
    void Entity;

    expect(MockedUpdateDateColumn).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'updated_at', type: 'timestamptz' }),
    );
  });
});

describe('@DeletedAt', () => {
  it('should call DeleteDateColumn with default name and nullable', () => {
    class Entity {
      @DeletedAt()
      deletedAt!: Date | null;
    }
    void Entity;

    expect(MockedDeleteDateColumn).toHaveBeenCalledWith({ name: 'deleted_at', nullable: true });
  });

  it('should accept custom name', () => {
    class Entity {
      @DeletedAt({ name: 'deleted_at_custom' })
      deletedAt!: Date | null;
    }
    void Entity;

    expect(MockedDeleteDateColumn).toHaveBeenCalledWith({
      name: 'deleted_at_custom',
      nullable: true,
    });
  });

  it('should accept timestamptz type', () => {
    class Entity {
      @DeletedAt({ type: 'timestamptz' })
      deletedAt!: Date | null;
    }
    void Entity;

    expect(MockedDeleteDateColumn).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'deleted_at', nullable: true, type: 'timestamptz' }),
    );
  });
});
