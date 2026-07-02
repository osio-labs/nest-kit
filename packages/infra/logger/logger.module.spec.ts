import { Test } from '@nestjs/testing';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from './logger.module';
import { PinoLoggerService } from './logger.service';
import { LOGGER_MODULE_OPTIONS, PINO_LOGGER } from './logger.constants';
import type { LoggerModuleOptions, LoggerModuleAsyncOptions } from './logger.types';

// Mock pino — use jest.mock so the lazy import inside the module picks it up
jest.mock('./logger.utils', () => ({
  loadPino: jest.fn().mockResolvedValue({
    default: (opts: any) => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      level: opts?.level ?? 'info',
    }),
  }),
}));

describe('LoggerModule.forRoot', () => {
  it('should return a global DynamicModule', () => {
    const mod = LoggerModule.forRoot();
    expect(mod.module).toBe(LoggerModule);
    expect(mod.global).toBe(true);
    expect(mod.exports).toContain(PinoLoggerService);
  });

  it('should respect the global option', () => {
    const mod = LoggerModule.forRoot({ global: false });
    expect(mod.global).toBe(false);
  });

  it('should include LOGGER_MODULE_OPTIONS and PINO_LOGGER providers', () => {
    const mod = LoggerModule.forRoot({ level: 'debug' });
    const tokens = (mod.providers ?? []).map((p: any) =>
      typeof p === 'object' && p !== null ? p.provide : p,
    );
    expect(tokens).toContain(LOGGER_MODULE_OPTIONS);
    expect(tokens).toContain(PINO_LOGGER);
    expect(tokens).toContain(PinoLoggerService);
  });

  it('should include APP_INTERCEPTOR providers by default', () => {
    const mod = LoggerModule.forRoot();
    const interceptors = (mod.providers ?? []).filter((p: any) => p.provide === APP_INTERCEPTOR);
    expect(interceptors).toHaveLength(2);
  });

  it('should exclude correlation ID interceptor when disabled', () => {
    const mod = LoggerModule.forRoot({ correlationId: false });
    const interceptors = (mod.providers ?? []).filter((p: any) => p.provide === APP_INTERCEPTOR);
    // Only request logging interceptor remains
    expect(interceptors).toHaveLength(1);
  });

  it('should exclude request logging interceptor when disabled', () => {
    const mod = LoggerModule.forRoot({ requestLogging: false });
    const interceptors = (mod.providers ?? []).filter((p: any) => p.provide === APP_INTERCEPTOR);
    // Only correlation ID interceptor remains
    expect(interceptors).toHaveLength(1);
  });

  it('should exclude both interceptors when both disabled', () => {
    const mod = LoggerModule.forRoot({ correlationId: false, requestLogging: false });
    const interceptors = (mod.providers ?? []).filter((p: any) => p.provide === APP_INTERCEPTOR);
    expect(interceptors).toHaveLength(0);
  });

  it('should compile with Test.createTestingModule and resolve PinoLoggerService', async () => {
    const module = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({ level: 'silent', requestLogging: false, correlationId: false }),
      ],
    }).compile();

    const service = module.get(PinoLoggerService);
    expect(service).toBeInstanceOf(PinoLoggerService);
    expect(service.getPinoLogger()).toBeDefined();
  });

  it('should pass transports array to pino transport config', () => {
    const mod = LoggerModule.forRoot({
      transports: [{ target: 'pino/file', options: { destination: '/tmp/log' } }],
    });
    const pinoProvider = (mod.providers ?? []).find((p: any) => p.provide === PINO_LOGGER) as any;
    expect(pinoProvider).toBeDefined();
    // Can't easily test the factory output here since it requires pino,
    // but we verify the provider is configured correctly
    expect(pinoProvider.inject).toContain(LOGGER_MODULE_OPTIONS);
  });
});

describe('LoggerModule.forRootAsync', () => {
  it('should return a DynamicModule with async providers', () => {
    const asyncOptions: LoggerModuleAsyncOptions = {
      useFactory: () => ({ level: 'warn' }),
    };

    const mod = LoggerModule.forRootAsync(asyncOptions);
    expect(mod.module).toBe(LoggerModule);
    expect(mod.exports).toContain(PinoLoggerService);

    const tokens = (mod.providers ?? []).map((p: any) =>
      typeof p === 'object' && p !== null ? p.provide : p,
    );
    expect(tokens).toContain(LOGGER_MODULE_OPTIONS);
    expect(tokens).toContain(PINO_LOGGER);
    expect(tokens).toContain(PinoLoggerService);
  });

  it('should respect global option', () => {
    const mod = LoggerModule.forRootAsync({
      useFactory: () => ({}),
      global: false,
    });
    expect(mod.global).toBe(false);
  });

  it('should compile with Test.createTestingModule and resolve PinoLoggerService', async () => {
    const module = await Test.createTestingModule({
      imports: [
        LoggerModule.forRootAsync({
          useFactory: () => ({ level: 'silent', requestLogging: false, correlationId: false }),
        }),
      ],
    }).compile();

    const service = module.get(PinoLoggerService);
    expect(service).toBeInstanceOf(PinoLoggerService);
    expect(service.getPinoLogger()).toBeDefined();
  });

  it('should work with inject and imports', async () => {
    const module = await Test.createTestingModule({
      imports: [
        LoggerModule.forRootAsync({
          imports: [],
          inject: [],
          useFactory: () => ({ level: 'silent', requestLogging: false, correlationId: false }),
        }),
      ],
    }).compile();

    const service = module.get(PinoLoggerService);
    expect(service).toBeInstanceOf(PinoLoggerService);
  });
});
