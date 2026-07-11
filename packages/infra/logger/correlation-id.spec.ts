import { getCorrelationId, runWithCorrelationId, correlationIdStorage } from './correlation-id.js';

describe('correlation-id', () => {
  beforeEach(() => {
    correlationIdStorage.disable();
  });

  describe('getCorrelationId', () => {
    it('should return undefined when called outside a correlation context', () => {
      expect(getCorrelationId()).toBeUndefined();
    });

    it('should return the correlation ID within a runWithCorrelationId context', () => {
      runWithCorrelationId('test-cid-123', () => {
        expect(getCorrelationId()).toBe('test-cid-123');
      });
    });

    it('should return undefined after the context exits', () => {
      runWithCorrelationId('test-cid-456', () => {
        expect(getCorrelationId()).toBe('test-cid-456');
      });
      expect(getCorrelationId()).toBeUndefined();
    });
  });

  describe('runWithCorrelationId', () => {
    it('should execute the function and return its value', () => {
      const result = runWithCorrelationId('cid', () => 42);
      expect(result).toBe(42);
    });

    it('should propagate the correlation ID to nested calls', () => {
      runWithCorrelationId('outer', () => {
        const inner = runWithCorrelationId('inner', () => getCorrelationId());
        expect(inner).toBe('inner');
        expect(getCorrelationId()).toBe('outer');
      });
    });

    it('should support changing the correlation ID via enterWith', () => {
      runWithCorrelationId('original', () => {
        correlationIdStorage.enterWith('updated');
        expect(getCorrelationId()).toBe('updated');
      });
    });
  });
});
