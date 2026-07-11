import type { ConfigService } from '@nestjs/config';
import { configSentry } from './index.js';

/* ---------- configSentry (sync, reads process.env) ---------- */

describe('configSentry', () => {
  const OLD_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it('should return default values when no env vars are set', () => {
    const cfg = configSentry();

    expect(cfg.environment).toBe('production');
    expect(cfg.debug).toBe(false);
    expect(cfg.tracesSampleRate).toBe(1.0);
    expect(cfg.attachStacktrace).toBe(true);
    expect(cfg.isGlobal).toBe(true);
  });

  it('should read SENTRY_DSN from env', () => {
    process.env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/0';

    const cfg = configSentry();

    expect(cfg.dsn).toBe('https://key@o0.ingest.sentry.io/0');
  });

  it('should read SENTRY_ENVIRONMENT from env', () => {
    process.env.SENTRY_ENVIRONMENT = 'staging';

    const cfg = configSentry();

    expect(cfg.environment).toBe('staging');
  });

  it('should read SENTRY_RELEASE from env', () => {
    process.env.SENTRY_RELEASE = 'v1.2.3';

    const cfg = configSentry();

    expect(cfg.release).toBe('v1.2.3');
  });

  it('should read SENTRY_DEBUG from env', () => {
    process.env.SENTRY_DEBUG = 'true';

    const cfg = configSentry();

    expect(cfg.debug).toBe(true);
  });

  it('should read SENTRY_TRACES_SAMPLE_RATE from env', () => {
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.5';

    const cfg = configSentry();

    expect(cfg.tracesSampleRate).toBe(0.5);
  });

  it('should read SENTRY_PROFILES_SAMPLE_RATE from env', () => {
    process.env.SENTRY_PROFILES_SAMPLE_RATE = '0.2';

    const cfg = configSentry();

    expect(cfg.profilesSampleRate).toBe(0.2);
  });

  it('should read SENTRY_ATTACH_STACKTRACE from env', () => {
    process.env.SENTRY_ATTACH_STACKTRACE = 'false';

    const cfg = configSentry();

    expect(cfg.attachStacktrace).toBe(false);
  });

  it('should read SENTRY_IS_GLOBAL from env', () => {
    process.env.SENTRY_IS_GLOBAL = 'false';

    const cfg = configSentry();

    expect(cfg.isGlobal).toBe(false);
  });

  it('should override env with options', () => {
    process.env.SENTRY_DSN = 'https://env@o0.ingest.sentry.io/0';
    process.env.SENTRY_ENVIRONMENT = 'staging';

    const cfg = configSentry({
      dsn: 'https://opt@o0.ingest.sentry.io/1',
      environment: 'production',
    });

    expect(cfg.dsn).toBe('https://opt@o0.ingest.sentry.io/1');
    expect(cfg.environment).toBe('production');
  });
});

/* ---------- configSentry with ConfigService ---------- */

describe('configSentry with ConfigService', () => {
  function mockCs(map: Record<string, unknown>): ConfigService {
    return {
      get: jest.fn((key: string, def?: unknown) => (key in map ? map[key] : def)),
    } as unknown as ConfigService;
  }

  it('should return default values when ConfigService has no keys', () => {
    const cs = mockCs({});
    const cfg = configSentry(undefined, cs);

    expect(cfg.environment).toBe('production');
    expect(cfg.debug).toBe(false);
    expect(cfg.tracesSampleRate).toBe(1.0);
  });

  it('should read from ConfigService', () => {
    const cs = mockCs({
      SENTRY_DSN: 'https://cs@o0.ingest.sentry.io/0',
      SENTRY_ENVIRONMENT: 'production',
      SENTRY_TRACES_SAMPLE_RATE: 0.75,
    });

    const cfg = configSentry(undefined, cs);

    expect(cfg.dsn).toBe('https://cs@o0.ingest.sentry.io/0');
    expect(cfg.environment).toBe('production');
    expect(cfg.tracesSampleRate).toBe(0.75);
  });

  it('should respect options over ConfigService', () => {
    const cs = mockCs({ SENTRY_DSN: 'https://cs@o0.ingest.sentry.io/0' });

    const cfg = configSentry({ dsn: 'https://opt@o0.ingest.sentry.io/1' }, cs);

    expect(cfg.dsn).toBe('https://opt@o0.ingest.sentry.io/1');
  });
});

/* ---------- initSentry ---------- */

describe('initSentry', () => {
  const OLD_ENV = { ...process.env };

  afterEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  it('should call Sentry.init with config from env', async () => {
    process.env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/0';

    jest.doMock('@sentry/nestjs', () => ({
      init: jest.fn(),
    }));

    const { initSentry } = await import('./instrument.js');
    await initSentry();

    const sentry = await import('@sentry/nestjs');
    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: 'https://key@o0.ingest.sentry.io/0' }),
    );
  });

  it('should call Sentry.init with options override', async () => {
    jest.doMock('@sentry/nestjs', () => ({
      init: jest.fn(),
    }));

    const { initSentry } = await import('./instrument.js');
    await initSentry({ environment: 'staging' });

    const sentry = await import('@sentry/nestjs');
    expect(sentry.init).toHaveBeenCalledWith(expect.objectContaining({ environment: 'staging' }));
  });

  it('should throw when @sentry/nestjs is not installed', async () => {
    jest.doMock('@sentry/nestjs', () => {
      throw new Error('MODULE_NOT_FOUND');
    });

    const { initSentry } = await import('./instrument.js');

    await expect(initSentry()).rejects.toThrow('@sentry/nestjs is required');
  });

  it('should be re-exported from index', async () => {
    jest.doMock('@sentry/nestjs', () => ({
      init: jest.fn(),
    }));

    const mod = await import('./index.js');
    expect(mod.initSentry).toBeDefined();
    expect(typeof mod.initSentry).toBe('function');
  });
});
