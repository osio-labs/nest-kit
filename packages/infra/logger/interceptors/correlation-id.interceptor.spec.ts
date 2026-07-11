import { of } from 'rxjs';
import { CorrelationIdInterceptor } from './correlation-id.interceptor.js';
import { LOGGER_MODULE_OPTIONS, DEFAULT_CORRELATION_ID_HEADER } from '../logger.constants.js';
import type { LoggerModuleOptions } from '../logger.types.js';
import { getCorrelationId, correlationIdStorage } from '../correlation-id.js';

function createMockContext(reqHeaders: Record<string, string> = {}): any {
  const headers: Record<string, string> = { ...reqHeaders };
  const responseHeaders: Record<string, string> = {};

  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
      getResponse: () => ({
        setHeader: (name: string, value: string) => {
          responseHeaders[name] = value;
        },
      }),
    }),
    // Expose responseHeaders for assertions
    __responseHeaders: responseHeaders,
  };
}

function createCallHandler(): any {
  return { handle: () => of('handled') };
}

describe('CorrelationIdInterceptor', () => {
  let interceptor: CorrelationIdInterceptor;

  afterEach(() => {
    correlationIdStorage.disable();
  });

  describe('when correlationId config is default', () => {
    beforeEach(() => {
      const options: LoggerModuleOptions = {};
      interceptor = new CorrelationIdInterceptor(options);
    });

    it('should use the default header name x-correlation-id', (done) => {
      const ctx = createMockContext({});
      interceptor.intercept(ctx as any, createCallHandler()).subscribe(() => {
        expect(ctx.__responseHeaders[DEFAULT_CORRELATION_ID_HEADER]).toBeDefined();
        done();
      });
    });

    it('should generate a UUID when no header is present', (done) => {
      const ctx = createMockContext({});
      interceptor.intercept(ctx as any, createCallHandler()).subscribe(() => {
        const cid = ctx.__responseHeaders[DEFAULT_CORRELATION_ID_HEADER];
        // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        expect(cid).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
        done();
      });
    });

    it('should propagate the existing correlation ID from headers', (done) => {
      const ctx = createMockContext({ 'x-correlation-id': 'incoming-cid' });
      interceptor.intercept(ctx as any, createCallHandler()).subscribe(() => {
        const cid = ctx.__responseHeaders[DEFAULT_CORRELATION_ID_HEADER];
        expect(cid).toBe('incoming-cid');
        done();
      });
    });

    it('should set the correlation ID in AsyncLocalStorage', (done) => {
      const ctx = createMockContext({ 'x-correlation-id': 'async-cid' });
      interceptor.intercept(ctx as any, createCallHandler()).subscribe(() => {
        expect(getCorrelationId()).toBe('async-cid');
        done();
      });
    });

    it('should pass through non-http contexts', () => {
      const ctx = { getType: () => 'graphql' };
      const result = interceptor.intercept(ctx as any, createCallHandler());
      expect(result).toBeDefined();
    });
  });

  describe('when custom header name is configured', () => {
    beforeEach(() => {
      const options: LoggerModuleOptions = {
        correlationId: { headerName: 'x-request-id' },
      };
      interceptor = new CorrelationIdInterceptor(options);
    });

    it('should use the configured header name', (done) => {
      const ctx = createMockContext({ 'x-request-id': 'custom-header' });
      interceptor.intercept(ctx as any, createCallHandler()).subscribe(() => {
        expect(ctx.__responseHeaders['x-request-id']).toBe('custom-header');
        done();
      });
    });
  });

  describe('when custom generate function is configured', () => {
    beforeEach(() => {
      const options: LoggerModuleOptions = {
        correlationId: { generate: () => 'custom-generated-id' },
      };
      interceptor = new CorrelationIdInterceptor(options);
    });

    it('should use the custom generate function when no header is present', (done) => {
      const ctx = createMockContext({});
      interceptor.intercept(ctx as any, createCallHandler()).subscribe(() => {
        expect(ctx.__responseHeaders[DEFAULT_CORRELATION_ID_HEADER]).toBe('custom-generated-id');
        done();
      });
    });

    it('should still use existing header even when generate is configured', (done) => {
      const ctx = createMockContext({ 'x-correlation-id': 'from-header' });
      interceptor.intercept(ctx as any, createCallHandler()).subscribe(() => {
        expect(ctx.__responseHeaders[DEFAULT_CORRELATION_ID_HEADER]).toBe('from-header');
        done();
      });
    });
  });
});
