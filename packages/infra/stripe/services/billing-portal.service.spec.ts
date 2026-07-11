import { STRIPE_CLIENT } from '../stripe.constants.js';
import { BillingPortalService } from './billing-portal.service.js';
import type { Stripe } from 'stripe';

const mockSessions = {
  create: jest.fn(),
};

const mockStripe = {
  billingPortal: { sessions: mockSessions },
} as unknown as Stripe;

describe('BillingPortalService', () => {
  let service: BillingPortalService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BillingPortalService(mockStripe);
  });

  describe('create', () => {
    it('should create a billing portal session', async () => {
      mockSessions.create.mockResolvedValue({
        id: 'bps_123',
        url: 'https://billing.stripe.com/session/bps_123',
        customer: 'cus_123',
        return_url: 'https://example.com/portal',
      });

      const result = await service.create({
        customer: 'cus_123',
        returnUrl: 'https://example.com/portal',
      });

      expect(mockSessions.create).toHaveBeenCalledWith(
        {
          customer: 'cus_123',
          return_url: 'https://example.com/portal',
        },
        expect.any(Object),
      );
      expect(result.id).toBe('bps_123');
      expect(result.url).toContain('stripe.com');
    });

    it('should pass idempotency key', async () => {
      mockSessions.create.mockResolvedValue({
        id: 'bps_123',
        url: 'https://billing.stripe.com/session/bps_123',
        customer: 'cus_123',
        return_url: 'https://example.com/portal',
      });

      await service.create({
        customer: 'cus_123',
        returnUrl: 'https://example.com/portal',
        idempotencyKey: 'idem-456',
      });

      expect(mockSessions.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ idempotencyKey: 'idem-456' }),
      );
    });
  });
});
