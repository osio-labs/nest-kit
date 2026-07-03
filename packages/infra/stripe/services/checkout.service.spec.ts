import { STRIPE_CLIENT } from '../stripe.constants';
import { CheckoutService } from './checkout.service';
import type { Stripe } from 'stripe';

const mockSessions = {
  create: jest.fn(),
  retrieve: jest.fn(),
};

const mockStripe = {
  checkout: { sessions: mockSessions },
} as unknown as Stripe;

describe('CheckoutService', () => {
  let service: CheckoutService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CheckoutService(mockStripe);
  });

  describe('create', () => {
    it('should create a checkout session', async () => {
      mockSessions.create.mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/pay/cs_123',
      });

      const result = await service.create({
        mode: 'payment',
        lineItems: [{ price: 'price_1', quantity: 1 }],
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(mockSessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          line_items: [{ price: 'price_1', quantity: 1 }],
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel',
        }),
        expect.any(Object),
      );
      expect(result.id).toBe('cs_123');
    });

    it('should create a subscription checkout session', async () => {
      mockSessions.create.mockResolvedValue({
        id: 'cs_456',
        url: 'https://checkout.stripe.com/pay/cs_456',
      });

      const result = await service.create({
        mode: 'subscription',
        lineItems: [{ price: 'price_monthly', quantity: 1 }],
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        customerEmail: 'a@b.com',
        allowPromotionCodes: true,
      });

      expect(mockSessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          customer_email: 'a@b.com',
          allow_promotion_codes: true,
        }),
        expect.any(Object),
      );
      expect(result.id).toBe('cs_456');
    });
  });

  describe('retrieve', () => {
    it('should retrieve a checkout session', async () => {
      mockSessions.retrieve.mockResolvedValue({ id: 'cs_123' });

      const result = await service.retrieve('cs_123');

      expect(mockSessions.retrieve).toHaveBeenCalledWith('cs_123');
      expect(result.id).toBe('cs_123');
    });
  });
});
