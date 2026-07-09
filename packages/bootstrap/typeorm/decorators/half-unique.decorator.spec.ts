import { Index } from 'typeorm';

jest.mock('typeorm', () => {
  const actual = jest.requireActual('typeorm');
  return {
    ...actual,
    Index: jest.fn().mockImplementation((...args: unknown[]) => {
      const actualModule = jest.requireActual('typeorm');
      if (typeof actualModule.Index === 'function') {
        return actualModule.Index(...args);
      }
      return function () {};
    }),
  };
});

import { HalfUnique } from './half-unique.decorator';

const MockedIndex = Index as jest.MockedFunction<typeof Index>;

beforeEach(() => {
  MockedIndex.mockClear();
});

describe('@HalfUnique', () => {
  it('should call Index with unique:true and where:"deleted_at IS NULL" when no args', () => {
    @HalfUnique()
    class _Entity {}
    void _Entity;

    expect(MockedIndex).toHaveBeenCalledTimes(1);
    expect(MockedIndex).toHaveBeenCalledWith({
      unique: true,
      synchronize: false,
      where: 'deleted_at IS NULL',
    });
  });

  it('should pass through HalfUniqueOptions', () => {
    @HalfUnique({ synchronize: false })
    class _Entity {}
    void _Entity;

    expect(MockedIndex).toHaveBeenCalledWith({
      unique: true,
      synchronize: false,
      where: 'deleted_at IS NULL',
    });
  });

  it('should accept a name string', () => {
    @HalfUnique('IDX_USER_EMAIL')
    class _Entity {}
    void _Entity;

    expect(MockedIndex).toHaveBeenCalledWith('IDX_USER_EMAIL', {
      unique: true,
      synchronize: false,
      where: 'deleted_at IS NULL',
    });
  });

  it('should accept name + options', () => {
    @HalfUnique('IDX_USER_EMAIL', { synchronize: false })
    class _Entity {}
    void _Entity;

    expect(MockedIndex).toHaveBeenCalledWith('IDX_USER_EMAIL', {
      unique: true,
      where: 'deleted_at IS NULL',
      synchronize: false,
    });
  });

  it('should accept column names array', () => {
    @HalfUnique(['email'])
    class _Entity {}
    void _Entity;

    expect(MockedIndex).toHaveBeenCalledWith(['email'], {
      unique: true,
      synchronize: false,
      where: 'deleted_at IS NULL',
    });
  });

  it('should accept columns + options', () => {
    @HalfUnique(['email', 'username'], { synchronize: false })
    class _Entity {}
    void _Entity;

    expect(MockedIndex).toHaveBeenCalledWith(['email', 'username'], {
      unique: true,
      where: 'deleted_at IS NULL',
      synchronize: false,
    });
  });

  it('should accept name + columns', () => {
    @HalfUnique('IDX_USER_EMAIL', ['email'])
    class _Entity {}
    void _Entity;

    expect(MockedIndex).toHaveBeenCalledWith('IDX_USER_EMAIL', ['email'], {
      unique: true,
      synchronize: false,
      where: 'deleted_at IS NULL',
    });
  });

  it('should accept name + columns + options', () => {
    @HalfUnique('IDX_USER_EMAIL', ['email'], { synchronize: false })
    class _Entity {}
    void _Entity;

    expect(MockedIndex).toHaveBeenCalledWith('IDX_USER_EMAIL', ['email'], {
      unique: true,
      where: 'deleted_at IS NULL',
      synchronize: false,
    });
  });

  it('should allow custom where override', () => {
    @HalfUnique({ where: "status != 'deleted'" })
    class _Entity {}
    void _Entity;

    expect(MockedIndex).toHaveBeenCalledWith({
      unique: true,
      synchronize: false,
      where: "status != 'deleted'",
    });
  });

  it('should work as a property decorator', () => {
    class Entity {
      @HalfUnique()
      email!: string;
    }
    void Entity;

    expect(MockedIndex).toHaveBeenCalledWith({
      unique: true,
      synchronize: false,
      where: 'deleted_at IS NULL',
    });
  });

  it('should append nonNull columns to default where', () => {
    @HalfUnique({ nonNull: ['tenant_id'] })
    class _Entity {}
    void _Entity;

    expect(MockedIndex).toHaveBeenCalledWith({
      unique: true,
      synchronize: false,
      where: 'deleted_at IS NULL AND tenant_id IS NOT NULL',
    });
  });

  it('should append multiple nonNull columns', () => {
    @HalfUnique({ nonNull: ['tenant_id', 'org_id'] })
    class _Entity {}
    void _Entity;

    expect(MockedIndex).toHaveBeenCalledWith({
      unique: true,
      synchronize: false,
      where: 'deleted_at IS NULL AND tenant_id IS NOT NULL AND org_id IS NOT NULL',
    });
  });

  it('should combine nonNull with custom where', () => {
    @HalfUnique({ where: "status != 'deleted'", nonNull: ['tenant_id'] })
    class _Entity {}
    void _Entity;

    expect(MockedIndex).toHaveBeenCalledWith({
      unique: true,
      synchronize: false,
      where: "status != 'deleted' AND tenant_id IS NOT NULL",
    });
  });

  it('should combine nonNull with name and columns', () => {
    @HalfUnique('IDX_USER_TENANT_EMAIL', ['email'], { nonNull: ['tenant_id'] })
    class _Entity {}
    void _Entity;

    expect(MockedIndex).toHaveBeenCalledWith('IDX_USER_TENANT_EMAIL', ['email'], {
      unique: true,
      synchronize: false,
      where: 'deleted_at IS NULL AND tenant_id IS NOT NULL',
    });
  });
});
