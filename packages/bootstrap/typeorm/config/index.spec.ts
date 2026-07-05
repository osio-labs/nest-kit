import { ConfigService } from '@nestjs/config';
import { configTypeOrm } from './index';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

const OLD_ENV: Record<string, string | undefined> = { ...process.env };

type TestConfig = Record<string, unknown>;
const asTest = (o: TypeOrmModuleOptions): TestConfig => o as unknown as TestConfig;

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  process.env = { ...OLD_ENV };
});

function setEnv(vars: Record<string, string>): void {
  for (const [key, value] of Object.entries(vars)) {
    process.env[key] = value;
  }
}

function clearEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('DB_') || key.startsWith('RDS_')) {
      delete process.env[key];
    }
  }
}

const DB_TYPES = [
  { dbType: 'postgres', port: 5432, database: 'postgres' },
  { dbType: 'mysql', port: 3306, database: 'mysql' },
  { dbType: 'mariadb', port: 3306, database: 'mysql' },
  { dbType: 'better-sqlite3', port: 0, database: ':memory:' },
] as const;

/* ---------- config (sync / process.env) ---------- */

describe('configTypeOrm', () => {
  beforeEach(() => {
    clearEnv();
  });

  describe('DatabaseType defaults', () => {
    it.each(DB_TYPES)(
      'should set default port=$port and database=$database for $dbType',
      ({ dbType, port, database }) => {
        setEnv({ DB_TYPE: dbType });
        const result = asTest(configTypeOrm());

        expect(result.type).toBe(dbType);
        expect(result.port).toBe(port);
        expect(result.database).toBe(database);
        expect(result.host).toBe('localhost');
        expect(result.synchronize).toBe(false);
        expect(result.logging).toBe(false);
        expect(result.autoLoadEntities).toBe(true);
        expect(result.retryAttempts).toBe(10);
        expect(result.retryDelay).toBe(3000);
      },
    );

    it.each(DB_TYPES)('should not include ssl or extra by default for $dbType', ({ dbType }) => {
      setEnv({ DB_TYPE: dbType });
      const result = asTest(configTypeOrm());
      expect(result.type).toBe(dbType);
      expect(result.ssl).toBeUndefined();
      expect(result.extra).toBeUndefined();
    });

    it('should not set username/password by default for any type', () => {
      for (const { dbType } of DB_TYPES) {
        setEnv({ DB_TYPE: dbType });
        const result = asTest(configTypeOrm());
        expect(result.username).toBeUndefined();
        expect(result.password).toBeUndefined();
      }
    });
  });

  describe('env var overrides', () => {
    it('should read DB_HOST from env', () => {
      setEnv({ DB_HOST: 'db.example.com' });
      expect(configTypeOrm()).toHaveProperty('host', 'db.example.com');
    });

    it('should parse DB_PORT as number', () => {
      setEnv({ DB_PORT: '3306' });
      expect(configTypeOrm()).toHaveProperty('port', 3306);
    });

    it('should read DB_USERNAME and DB_PASSWORD from env', () => {
      setEnv({ DB_USERNAME: 'admin', DB_PASSWORD: 'secret' });
      const result = asTest(configTypeOrm());
      expect(result.username).toBe('admin');
      expect(result.password).toBe('secret');
    });

    it('should read DB_DATABASE from env', () => {
      setEnv({ DB_DATABASE: 'myapp' });
      expect(configTypeOrm()).toHaveProperty('database', 'myapp');
    });

    it('should enable synchronize when DB_SYNCHRONIZE=true', () => {
      setEnv({ DB_SYNCHRONIZE: 'true' });
      expect(configTypeOrm()).toHaveProperty('synchronize', true);
    });

    it('should treat DB_SYNCHRONIZE=1 as truthy', () => {
      setEnv({ DB_SYNCHRONIZE: '1' });
      expect(configTypeOrm()).toHaveProperty('synchronize', true);
    });

    it('should set logging to "all" when DB_LOGGING=true', () => {
      setEnv({ DB_LOGGING: 'true' });
      const result = asTest(configTypeOrm());
      expect(result.logging).toBe('all');
    });

    it('should treat DB_LOGGING=1 as truthy', () => {
      setEnv({ DB_LOGGING: '1' });
      expect(configTypeOrm()).toHaveProperty('logging', 'all');
    });
  });

  describe('SSL', () => {
    it('should set ssl when DB_SSL_REJECT_UNAUTHORIZED=true', () => {
      setEnv({ DB_SSL_REJECT_UNAUTHORIZED: 'true' });
      const result = asTest(configTypeOrm());
      expect(result.ssl).toEqual({ rejectUnauthorized: true });
    });

    it('should omit ssl when DB_SSL_REJECT_UNAUTHORIZED=false', () => {
      expect(configTypeOrm()).not.toHaveProperty('ssl');
    });

    it('should set ssl when DB_RDS_ENABLED=true even without SSL flag', () => {
      setEnv({ DB_RDS_ENABLED: 'true' });
      const result = asTest(configTypeOrm());
      expect(result.ssl).toEqual({ rejectUnauthorized: true });
    });
  });

  describe('schema option (non-RDS)', () => {
    it('should set root schema from options and omit extra', () => {
      const result = asTest(configTypeOrm({ schema: 'my_schema' }));
      expect(result.schema).toBe('my_schema');
      expect(result).not.toHaveProperty('extra');
    });
  });

  describe('RDS mode', () => {
    function withRds(): void {
      setEnv({ DB_RDS_ENABLED: 'true' });
    }

    it('should force ssl and add extra with ssl', () => {
      withRds();
      const result = asTest(configTypeOrm());
      expect(result.ssl).toEqual({ rejectUnauthorized: true });
      expect(result.extra).toMatchObject({
        ssl: { rejectUnauthorized: true },
      });
    });

    it('should apply default pool config when no options given', () => {
      withRds();
      const result = asTest(configTypeOrm());
      expect(result.extra).toMatchObject({
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    });

    it('should configure pool from options', () => {
      withRds();
      const result = asTest(
        configTypeOrm({
          poolSize: 10,
          idleTimeoutMs: 5000,
          connectionTimeoutMs: 3000,
        }),
      );
      expect(result.extra).toMatchObject({
        max: 10,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 3000,
      });
    });

    it('should set statement_timeout in extra', () => {
      withRds();
      const result = asTest(configTypeOrm({ statementTimeoutMs: 5000 }));
      expect(result.extra).toMatchObject({ statement_timeout: 5000 });
    });

    it('should move schema to extra.schema in RDS mode', () => {
      withRds();
      const result = asTest(configTypeOrm({ schema: 'rds_schema' }));
      expect(result.extra).toMatchObject({ schema: 'rds_schema' });
      expect(result).not.toHaveProperty('schema');
    });

    it('should set region when RDS_USE_IAM=true with RDS_REGION', () => {
      setEnv({
        DB_RDS_ENABLED: 'true',
        RDS_USE_IAM: 'true',
        RDS_REGION: 'ap-southeast-1',
      });
      const result = asTest(configTypeOrm());
      expect(result.extra).toMatchObject({ region: 'ap-southeast-1' });
    });

    it('should fallback region to us-east-1 when RDS_REGION is unset', () => {
      setEnv({ DB_RDS_ENABLED: 'true', RDS_USE_IAM: 'true' });
      const result = asTest(configTypeOrm());
      expect(result.extra).toMatchObject({ region: 'us-east-1' });
    });

    it('should omit region when RDS_USE_IAM is false', () => {
      withRds();
      const result = asTest(configTypeOrm());
      expect(result.extra).not.toHaveProperty('region');
    });
  });

  describe('TypeOrmModule.forRoot compatibility', () => {
    it('should produce valid config for every supported DatabaseType', () => {
      for (const { dbType } of DB_TYPES) {
        setEnv({ DB_TYPE: dbType });
        const options = configTypeOrm();
        expect(options.type).toBe(dbType);
        expect(options).toHaveProperty('host');
        expect(options).toHaveProperty('port');
      }
    });
  });
});

/* ---------- configTypeOrmAsync (ConfigService) ---------- */

describe('configTypeOrm (with ConfigService)', () => {
  let mockGet: jest.Mock<unknown, [string, unknown?]>;

  function createMockService(): ConfigService {
    return {
      get: <T>(key: string, defaultValue?: T): T | undefined => {
        const result = defaultValue !== undefined ? mockGet(key, defaultValue) : mockGet(key);
        return result as T | undefined;
      },
    } as unknown as ConfigService;
  }

  beforeEach(() => {
    mockGet = jest.fn((_key: string, defaultValue?: unknown) => defaultValue);
  });

  describe('DatabaseType defaults', () => {
    it.each(DB_TYPES)(
      'should set default port=$port and database=$database for $dbType',
      ({ dbType, port, database }) => {
        mockGet.mockImplementation((key: string, def?: unknown) => {
          if (key === 'DB_TYPE') return dbType;
          return def;
        });

        const result = asTest(configTypeOrm(createMockService()));

        expect(result.type).toBe(dbType);
        expect(result.port).toBe(port);
        expect(result.database).toBe(database);
        expect(result.host).toBe('localhost');
        expect(result.synchronize).toBe(false);
        expect(result.logging).toBe(false);
        expect(result.autoLoadEntities).toBe(true);
        expect(result.retryAttempts).toBe(10);
        expect(result.retryDelay).toBe(3000);
      },
    );

    it.each(DB_TYPES)('should not include ssl or extra by default for $dbType', ({ dbType }) => {
      mockGet.mockImplementation((key: string, def?: unknown) => {
        if (key === 'DB_TYPE') return dbType;
        return def;
      });

      const result = asTest(configTypeOrm(createMockService()));
      expect(result).not.toHaveProperty('ssl');
      expect(result).not.toHaveProperty('extra');
    });

    it('should default to postgres when DB_TYPE is unset', () => {
      const result = asTest(configTypeOrm(createMockService()));
      expect(result.type).toBe('postgres');
      expect(result.port).toBe(5432);
      expect(result.database).toBe('postgres');
    });

    it('should not set username/password by default for any type', () => {
      for (const { dbType } of DB_TYPES) {
        mockGet.mockImplementation((key: string, def?: unknown) => {
          if (key === 'DB_TYPE') return dbType;
          return def;
        });
        const result = asTest(configTypeOrm(createMockService()));
        expect(result.username).toBeUndefined();
        expect(result.password).toBeUndefined();
      }
    });
  });

  describe('env var overrides from ConfigService', () => {
    it('should read DB_HOST from ConfigService', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'DB_HOST') return 'db.example.com';
        return undefined;
      });
      const result = asTest(configTypeOrm(createMockService()));
      expect(result.host).toBe('db.example.com');
    });

    it('should read DB_PORT from ConfigService as number', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'DB_PORT') return 3306;
        return undefined;
      });
      const result = asTest(configTypeOrm(createMockService()));
      expect(result.port).toBe(3306);
    });

    it('should read DB_USERNAME and DB_PASSWORD from ConfigService', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'DB_USERNAME') return 'admin';
        if (key === 'DB_PASSWORD') return 'secret';
        return undefined;
      });
      const result = asTest(configTypeOrm(createMockService()));
      expect(result.username).toBe('admin');
      expect(result.password).toBe('secret');
    });

    it('should read DB_DATABASE from ConfigService', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'DB_DATABASE') return 'myapp';
        return undefined;
      });
      expect(configTypeOrm(createMockService())).toHaveProperty('database', 'myapp');
    });

    it('should enable synchronize when ConfigService returns true', () => {
      mockGet.mockImplementation((key: string, def?: unknown) => {
        if (key === 'DB_SYNCHRONIZE') return true;
        return def;
      });
      expect(configTypeOrm(createMockService())).toHaveProperty('synchronize', true);
    });

    it('should set logging to "all" when DB_LOGGING is true', () => {
      mockGet.mockImplementation((key: string, def?: unknown) => {
        if (key === 'DB_LOGGING') return true;
        return def;
      });
      const result = asTest(configTypeOrm(createMockService()));
      expect(result.logging).toBe('all');
    });

    it('should enable SSL when DB_SSL_REJECT_UNAUTHORIZED=true', () => {
      mockGet.mockImplementation((key: string, def?: unknown) => {
        if (key === 'DB_SSL_REJECT_UNAUTHORIZED') return true;
        return def;
      });
      const result = asTest(configTypeOrm(createMockService()));
      expect(result.ssl).toEqual({ rejectUnauthorized: true });
    });
  });

  describe('RDS mode', () => {
    function enableRds(): void {
      mockGet.mockImplementation((key: string, def?: unknown) => {
        if (key === 'DB_RDS_ENABLED') return true;
        return def;
      });
    }

    it('should force ssl and add extra when DB_RDS_ENABLED=true', () => {
      enableRds();
      const result = asTest(configTypeOrm(createMockService()));
      expect(result.ssl).toEqual({ rejectUnauthorized: true });
      expect(result.extra).toBeDefined();
    });

    it('should pass TypeOrmConfigOptions through in RDS mode', () => {
      enableRds();
      const result = asTest(
        configTypeOrm(createMockService(), {
          poolSize: 5,
          idleTimeoutMs: 2000,
          connectionTimeoutMs: 1000,
          statementTimeoutMs: 3000,
          schema: 'custom',
        }),
      );
      expect(result.extra).toMatchObject({
        max: 5,
        idleTimeoutMillis: 2000,
        connectionTimeoutMillis: 1000,
        statement_timeout: 3000,
        schema: 'custom',
      });
    });

    it('should set region when RDS_USE_IAM=true', () => {
      mockGet.mockImplementation((key: string, def?: unknown) => {
        if (key === 'DB_RDS_ENABLED') return true;
        if (key === 'RDS_USE_IAM') return true;
        if (key === 'RDS_REGION') return 'eu-west-1';
        return def;
      });
      const result = asTest(configTypeOrm(createMockService()));
      expect(result.extra).toMatchObject({ region: 'eu-west-1' });
    });
  });

  describe('TypeOrmModule.forRootAsync compatibility', () => {
    it('should return config usable as useFactory return value', () => {
      const options = configTypeOrm(createMockService());
      expect(options).toBeDefined();
    });

    it('should work with useFactory pattern for every DatabaseType', () => {
      for (const { dbType } of DB_TYPES) {
        mockGet.mockImplementation((key: string, def?: unknown) => {
          if (key === 'DB_TYPE') return dbType;
          return def;
        });

        const options = asTest(configTypeOrm(createMockService()));
        expect(options.type).toBe(dbType);
      }
    });

    it('should support passing TypeOrmConfigOptions in useFactory', () => {
      const options = asTest(
        configTypeOrm(createMockService(), {
          schema: 'app_schema',
        }),
      );
      expect(options.schema).toBe('app_schema');
    });
  });

  describe('ConfigService.get call expectations', () => {
    it('should call ConfigService.get with expected keys and defaults', () => {
      configTypeOrm(createMockService());

      expect(mockGet).toHaveBeenCalledWith('DB_TYPE');
      expect(mockGet).toHaveBeenCalledWith('DB_HOST');
      expect(mockGet).toHaveBeenCalledWith('DB_PORT');
      expect(mockGet).toHaveBeenCalledWith('DB_USERNAME');
      expect(mockGet).toHaveBeenCalledWith('DB_PASSWORD');
      expect(mockGet).toHaveBeenCalledWith('DB_DATABASE');
      expect(mockGet).toHaveBeenCalledWith('DB_SYNCHRONIZE', false);
      expect(mockGet).toHaveBeenCalledWith('DB_LOGGING', false);
      expect(mockGet).toHaveBeenCalledWith('DB_RDS_ENABLED', false);
      expect(mockGet).toHaveBeenCalledWith('DB_SSL_REJECT_UNAUTHORIZED', false);
    });
  });
});
