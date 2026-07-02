import { Subject, of } from 'rxjs';
import { RequestLoggerInterceptor } from './request-logger.interceptor';
import { LOGGER_MODULE_OPTIONS, PINO_LOGGER } from '../logger.constants';
import type { LoggerModuleOptions } from '../logger.types';

function createMockContext(opts?: {
  method?: string;
  url?: string;
  statusCode?: number;
  headers?: Record<string, string>;
  body?: unknown;
}): any {
  const {
    method = 'GET',
    url = '/test',
    statusCode = 200,
    headers = {},
    body = undefined,
  } = opts ?? {};

  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({ method, url, headers, body }),
      getResponse: () => ({ statusCode, setHeader: jest.fn() }),
    }),
  };
}

function createCallHandler(): any {
  return { handle: () => of('handled') };
}

describe('RequestLoggerInterceptor', () => {
  let mockPino: { info: jest.Mock; error: jest.Mock };

  function createInterceptor(options: LoggerModuleOptions = {}) {
    const opts: LoggerModuleOptions = { requestLogging: true, ...options };
    return new RequestLoggerInterceptor(mockPino as any, opts);
  }

  beforeEach(() => {
    mockPino = { info: jest.fn(), error: jest.fn() };
  });

  it('should log request completion on success', (done) => {
    const interceptor = createInterceptor();
    const ctx = createMockContext({ method: 'POST', url: '/api/data', statusCode: 201 });

    interceptor.intercept(ctx as any, createCallHandler()).subscribe(() => {
      expect(mockPino.info).toHaveBeenCalledTimes(1);
      const [logData, msg] = mockPino.info.mock.calls[0];
      expect(logData).toMatchObject({ method: 'POST', url: '/api/data', statusCode: 201 });
      expect(typeof logData.duration).toBe('number');
      expect(msg).toBe('request completed');
      done();
    });
  });

  it('should log request failure on error', (done) => {
    const interceptor = createInterceptor();
    const ctx = createMockContext({ method: 'GET', url: '/fail', statusCode: 500 });
    const error = new Error('test error');
    const subject = new Subject<any>();
    const callHandler = { handle: jest.fn(() => subject) };

    interceptor.intercept(ctx as any, callHandler).subscribe({
      error: (err: Error) => {
        expect(err).toBe(error);
        expect(mockPino.error).toHaveBeenCalledTimes(1);
        const [logData, msg] = mockPino.error.mock.calls[0];
        expect(logData).toMatchObject({ method: 'GET', url: '/fail', statusCode: 500 });
        expect(logData.err).toBe(error);
        expect(typeof logData.duration).toBe('number');
        expect(msg).toBe('request failed');
        done();
      },
    });

    subject.error(error);
  });

  it('should include headers when includeHeaders is true', (done) => {
    const interceptor = createInterceptor({
      requestLogging: { includeHeaders: true },
    });
    const ctx = createMockContext({
      headers: { 'content-type': 'application/json', authorization: 'Bearer xxx' },
    });

    interceptor.intercept(ctx as any, createCallHandler()).subscribe(() => {
      expect(mockPino.info).toHaveBeenCalledTimes(1);
      const [logData] = mockPino.info.mock.calls[0];
      expect(logData.headers).toMatchObject({ 'content-type': 'application/json' });
      done();
    });
  });

  it('should redact blacklisted headers', (done) => {
    const interceptor = createInterceptor({
      requestLogging: {
        includeHeaders: true,
        blacklistedHeaders: ['authorization'],
      },
    });
    const ctx = createMockContext({
      headers: { authorization: 'Bearer secret', 'x-custom': 'visible' },
    });

    interceptor.intercept(ctx as any, createCallHandler()).subscribe(() => {
      const [logData] = mockPino.info.mock.calls[0];
      expect(logData.headers.authorization).toBe('[REDACTED]');
      expect(logData.headers['x-custom']).toBe('visible');
      done();
    });
  });

  it('should include body when includeBody is true', (done) => {
    const interceptor = createInterceptor({
      requestLogging: { includeBody: true },
    });
    const ctx = createMockContext({ body: { name: 'test' } });

    interceptor.intercept(ctx as any, createCallHandler()).subscribe(() => {
      const [logData] = mockPino.info.mock.calls[0];
      expect(logData.body).toEqual({ name: 'test' });
      done();
    });
  });

  it('should not log headers or body when disabled', (done) => {
    const interceptor = createInterceptor({
      requestLogging: false,
    });
    const ctx = createMockContext({
      headers: { authorization: 'Bearer xxx' },
      body: { secret: 'data' },
    });

    interceptor.intercept(ctx as any, createCallHandler()).subscribe(() => {
      const [logData] = mockPino.info.mock.calls[0];
      expect(logData.headers).toBeUndefined();
      expect(logData.body).toBeUndefined();
      done();
    });
  });

  it('should pass through non-http contexts', () => {
    const interceptor = createInterceptor();
    const ctx = { getType: () => 'graphql' };
    const result = interceptor.intercept(ctx as any, createCallHandler());
    expect(result).toBeDefined();
    expect(mockPino.info).not.toHaveBeenCalled();
  });

  // ──────── Exclude paths ────────

  it('should skip logging for excluded paths', (done) => {
    const interceptor = createInterceptor({
      requestLogging: { excludePaths: ['/health', '/metrics'] },
    });
    const ctx = createMockContext({ url: '/health' });

    interceptor.intercept(ctx as any, createCallHandler()).subscribe(() => {
      expect(mockPino.info).not.toHaveBeenCalled();
      done();
    });
  });

  it('should log for paths not in exclude list', (done) => {
    const interceptor = createInterceptor({
      requestLogging: { excludePaths: ['/health'] },
    });
    const ctx = createMockContext({ url: '/api/users' });

    interceptor.intercept(ctx as any, createCallHandler()).subscribe(() => {
      expect(mockPino.info).toHaveBeenCalledTimes(1);
      done();
    });
  });
});
