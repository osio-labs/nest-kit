import { STRIPE_CLIENT, STRIPE_MODULE_OPTIONS } from '../stripe.constants.js';
import { WebhooksService } from './webhooks.service.js';
import type { StripeModuleOptions } from '../stripe.types.js';
import type { Stripe } from 'stripe';

const mockConstructEvent = jest.fn();
const mockStripe = {
  webhooks: { constructEvent: mockConstructEvent },
} as unknown as Stripe;

describe('WebhooksService', () => {
  let service: WebhooksService;

  function createService(options: StripeModuleOptions) {
    return new WebhooksService(mockStripe, options);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructEvent', () => {
    it('should construct event from payload and signature', () => {
      service = createService({ apiKey: 'sk_test_xxx', webhookSecret: 'whsec_123' });
      const mockEvent = { id: 'evt_123', type: 'payment_intent.succeeded' };
      mockConstructEvent.mockReturnValue(mockEvent);

      const result = service.constructEvent('{"raw":"body"}', 'sig_123');

      expect(mockConstructEvent).toHaveBeenCalledWith('{"raw":"body"}', 'sig_123', 'whsec_123');
      expect(result).toEqual(mockEvent);
    });

    it('should throw when webhook secret is not configured', () => {
      service = createService({ apiKey: 'sk_test_xxx' });

      expect(() => service.constructEvent('{}', 'sig_123')).toThrow(
        'Stripe webhook secret is not configured',
      );
    });
  });

  describe('toPayload', () => {
    it('should convert event to typed payload', () => {
      service = createService({ apiKey: 'sk_test_xxx' });
      const event = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123', amount: 1000 } },
      } as any;

      const payload = service.toPayload<{ id: string; amount: number }>(event);

      expect(payload.type).toBe('payment_intent.succeeded');
      expect(payload.data).toEqual({ id: 'pi_123', amount: 1000 });
      expect(payload.raw).toBe(event);
    });
  });
});
