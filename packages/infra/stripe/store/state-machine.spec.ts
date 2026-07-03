import {
  VALID_TRANSITIONS,
  assertValidTransition,
  PAYMENT_INTENT_FINAL_STATUSES,
} from './state-machine';

describe('VALID_TRANSITIONS', () => {
  it('should define transitions for requires_payment_method', () => {
    expect(VALID_TRANSITIONS.requires_payment_method).toEqual(
      expect.arrayContaining([
        'requires_confirmation',
        'requires_action',
        'processing',
        'canceled',
      ]),
    );
  });

  it('should define transitions for requires_confirmation', () => {
    expect(VALID_TRANSITIONS.requires_confirmation).toEqual(
      expect.arrayContaining(['requires_action', 'processing', 'succeeded', 'failed', 'canceled']),
    );
  });

  it('should define transitions for requires_action', () => {
    expect(VALID_TRANSITIONS.requires_action).toEqual(
      expect.arrayContaining(['processing', 'succeeded', 'failed', 'canceled']),
    );
  });

  it('should define transitions for processing', () => {
    expect(VALID_TRANSITIONS.processing).toEqual(
      expect.arrayContaining(['succeeded', 'failed', 'requires_payment_method', 'canceled']),
    );
  });

  it('succeeded should have no outgoing transitions', () => {
    expect(VALID_TRANSITIONS.succeeded).toEqual([]);
  });

  it('failed should have no outgoing transitions', () => {
    expect(VALID_TRANSITIONS.failed).toEqual([]);
  });

  it('canceled should have no outgoing transitions', () => {
    expect(VALID_TRANSITIONS.canceled).toEqual([]);
  });
});

describe('PAYMENT_INTENT_FINAL_STATUSES', () => {
  it('should contain succeeded, failed, and canceled', () => {
    expect(PAYMENT_INTENT_FINAL_STATUSES).toEqual(
      expect.arrayContaining(['succeeded', 'failed', 'canceled']),
    );
    expect(PAYMENT_INTENT_FINAL_STATUSES).toHaveLength(3);
  });
});

describe('assertValidTransition', () => {
  it('should not throw for valid transitions', () => {
    expect(() =>
      assertValidTransition('requires_payment_method', 'requires_confirmation'),
    ).not.toThrow();
    expect(() => assertValidTransition('requires_confirmation', 'succeeded')).not.toThrow();
    expect(() => assertValidTransition('requires_action', 'processing')).not.toThrow();
    expect(() => assertValidTransition('processing', 'succeeded')).not.toThrow();
    expect(() => assertValidTransition('requires_payment_method', 'canceled')).not.toThrow();
  });

  it('should throw for invalid transitions', () => {
    expect(() => assertValidTransition('succeeded', 'requires_payment_method')).toThrow(
      'Invalid payment intent transition',
    );
    expect(() => assertValidTransition('failed', 'processing')).toThrow(
      'Invalid payment intent transition',
    );
    expect(() => assertValidTransition('canceled', 'succeeded')).toThrow(
      'Invalid payment intent transition',
    );
    expect(() => assertValidTransition('requires_payment_method', 'succeeded')).toThrow(
      'Invalid payment intent transition',
    );
  });

  it('should throw for unknown status', () => {
    expect(() => assertValidTransition('unknown' as any, 'succeeded')).toThrow(
      'Unknown payment intent status',
    );
  });

  it('should show allowed transitions in error message', () => {
    expect(() => assertValidTransition('requires_payment_method', 'succeeded')).toThrow(
      'requires_confirmation',
    );
  });
});
