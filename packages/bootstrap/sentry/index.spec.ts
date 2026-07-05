import { ConfigService } from '@nestjs/config';
import { configSentry } from './index';

describe('configSentry', () => {
  const OLD_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it('should return defaults when no env vars are set', () => {
    delete process.env.NODE_ENV;
    const cfg = configSentry();

    expect(cfg.dsn).toBeUndefined();
    expect(cfg.environment).toBe('development');
    expect(cfg.tracesSampleRate).toBe(0.2);
    expect(cfg.profilesSampleRate).toBe(0.1);
    expect(cfg.debug).toBe(false);
    expect(cfg.spotlight).toBe(false);
    expect(cfg.replaysSessionSampleRate).toBe(0.1);
    expect(cfg.replaysOnErrorSampleRate).toBe(1.0);
    expect(cfg.isGlobal).toBe(false);
  });

  it('should read SENTRY_DSN from env', () => {
    process.env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/0';

    const cfg = configSentry();

    expect(cfg.dsn).toBe('https://key@o0.ingest.sentry.io/0');
  });

  it('should respect SENTRY_ENVIRONMENT', () => {
    process.env.SENTRY_ENVIRONMENT = 'staging';

    const cfg = configSentry();

    expect(cfg.environment).toBe('staging');
  });

  it('should fallback to NODE_ENV when SENTRY_ENVIRONMENT is not set', () => {
    process.env.NODE_ENV = 'production';

    const cfg = configSentry();

    expect(cfg.environment).toBe('production');
  });

  it('should read SENTRY_RELEASE from env', () => {
    process.env.SENTRY_RELEASE = '1.2.3';

    const cfg = configSentry();

    expect(cfg.release).toBe('1.2.3');
  });

  it('should not include release when not set', () => {
    const cfg = configSentry();

    expect(cfg.release).toBeUndefined();
  });

  it('should read SENTRY_TRACES_SAMPLE_RATE', () => {
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.5';

    const cfg = configSentry();

    expect(cfg.tracesSampleRate).toBe(0.5);
  });

  it('should read SENTRY_PROFILES_SAMPLE_RATE', () => {
    process.env.SENTRY_PROFILES_SAMPLE_RATE = '0.75';

    const cfg = configSentry();

    expect(cfg.profilesSampleRate).toBe(0.75);
  });

  it('should read SENTRY_DEBUG', () => {
    process.env.SENTRY_DEBUG = 'true';

    const cfg = configSentry();

    expect(cfg.debug).toBe(true);
  });

  it('should read SENTRY_SPOTLIGHT', () => {
    process.env.SENTRY_SPOTLIGHT = 'true';

    const cfg = configSentry();

    expect(cfg.spotlight).toBe(true);
  });

  it('should read SENTRY_REPLAYS_SESSION_SAMPLE_RATE', () => {
    process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE = '0.5';

    const cfg = configSentry();

    expect(cfg.replaysSessionSampleRate).toBe(0.5);
  });

  it('should read SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE', () => {
    process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE = '0.25';

    const cfg = configSentry();

    expect(cfg.replaysOnErrorSampleRate).toBe(0.25);
  });

  it('should read SENTRY_IS_GLOBAL', () => {
    process.env.SENTRY_IS_GLOBAL = 'true';

    const cfg = configSentry();

    expect(cfg.isGlobal).toBe(true);
  });

  it('should override env vars with options', () => {
    process.env.SENTRY_DSN = 'https://env@o0.ingest.sentry.io/0';
    process.env.SENTRY_ENVIRONMENT = 'staging';

    const cfg = configSentry({
      dsn: 'https://opt@o0.ingest.sentry.io/0',
      environment: 'production',
    });

    expect(cfg.dsn).toBe('https://opt@o0.ingest.sentry.io/0');
    expect(cfg.environment).toBe('production');
  });

  it('should accept partial options', () => {
    delete process.env.NODE_ENV;
    process.env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/0';

    const cfg = configSentry({ debug: true });

    expect(cfg.dsn).toBe('https://key@o0.ingest.sentry.io/0');
    expect(cfg.debug).toBe(true);
    expect(cfg.environment).toBe('development');
  });
});

describe('configSentry (with ConfigService)', () => {
  function mockCs(map: Record<string, unknown>): ConfigService {
    return {
      get: jest.fn((key: string, def?: unknown) => (key in map ? map[key] : def)),
    } as unknown as ConfigService;
  }

  it('should return defaults when ConfigService has no values', () => {
    const cs = mockCs({});
    const cfg = configSentry(cs);

    expect(cfg.dsn).toBeUndefined();
    expect(cfg.environment).toBe('development');
    expect(cfg.tracesSampleRate).toBe(0.2);
    expect(cfg.debug).toBe(false);
  });

  it('should read from ConfigService', () => {
    const cs = mockCs({
      SENTRY_DSN: 'https://cs@o0.ingest.sentry.io/0',
      SENTRY_ENVIRONMENT: 'production',
      SENTRY_TRACES_SAMPLE_RATE: 0.8,
      SENTRY_DEBUG: true,
    });

    const cfg = configSentry(cs);

    expect(cfg.dsn).toBe('https://cs@o0.ingest.sentry.io/0');
    expect(cfg.environment).toBe('production');
    expect(cfg.tracesSampleRate).toBe(0.8);
    expect(cfg.debug).toBe(true);
  });

  it('should respect options over ConfigService', () => {
    const cs = mockCs({
      SENTRY_DSN: 'https://cs@o0.ingest.sentry.io/0',
      SENTRY_ENVIRONMENT: 'cs-env',
    });

    const cfg = configSentry(cs, {
      dsn: 'https://opt@o0.ingest.sentry.io/0',
      environment: 'opt-env',
    });

    expect(cfg.dsn).toBe('https://opt@o0.ingest.sentry.io/0');
    expect(cfg.environment).toBe('opt-env');
  });

  it('should include release when set', () => {
    const cs = mockCs({ SENTRY_RELEASE: '2.0.0' });

    const cfg = configSentry(cs);

    expect(cfg.release).toBe('2.0.0');
  });

  it('should omit release when not set', () => {
    const cs = mockCs({});

    const cfg = configSentry(cs);

    expect(cfg.release).toBeUndefined();
  });
});
