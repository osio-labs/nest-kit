import { STRIPE_CLIENT, PAYMENT_STORE } from '../stripe.constants';
import { RefundsService } from './refunds.service';
import type { PaymentStore } from '../stripe.types';
import type { Stripe } from 'stripe';

const mockStripeRefunds = {
  create: jest.fn(),
  retrieve: jest.fn(),
  list: jest.fn(),
  cancel: jest.fn(),
};

const mockStripe = {
  refunds: mockStripeRefunds,
} as unknown as Stripe;

function createMockStore(): jest.Mocked<PaymentStore> {
  return {
    createPaymentIntent: jest.fn(),
    updatePaymentIntentStatus: jest.fn(),
    getPaymentIntent: jest.fn(),
    listPaymentIntents: jest.fn(),
    createRefund: jest.fn(),
    updateRefundStatus: jest.fn(),
    getRefund: jest.fn(),
    listRefunds: jest.fn(),
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
  };
}

describe('RefundsService', () => {
  let service: RefundsService;
  let store: jest.Mocked<PaymentStore>;

  beforeEach(() => {
    store = createMockStore();
    jest.clearAllMocks();
  });

  function createService(useStore = false) {
    return new RefundsService(mockStripe, useStore ? store : null);
  }

  describe('create', () => {
    it('should create a full refund', async () => {
      service = createService();
      mockStripeRefunds.create.mockResolvedValue({
        id: 're_123',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        payment_intent: 'pi_456',
      });

      const result = await service.create({ paymentIntent: 'pi_456' });

      expect(mockStripeRefunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_intent: 'pi_456' }),
        expect.any(Object),
      );
      expect(result.id).toBe('re_123');
    });

    it('should create a partial refund', async () => {
      service = createService();
      mockStripeRefunds.create.mockResolvedValue({
        id: 're_123',
        amount: 500,
        currency: 'usd',
        status: 'succeeded',
        payment_intent: 'pi_456',
      });

      await service.create({ paymentIntent: 'pi_456', amount: 500 });

      expect(mockStripeRefunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 500 }),
        expect.any(Object),
      );
    });

    it('should create refund with reason', async () => {
      service = createService();
      mockStripeRefunds.create.mockResolvedValue({
        id: 're_123',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        payment_intent: 'pi_456',
      });

      await service.create({ paymentIntent: 'pi_456', reason: 'requested_by_customer' });

      expect(mockStripeRefunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'requested_by_customer' }),
        expect.any(Object),
      );
    });

    it('should persist to store when available', async () => {
      service = createService(true);
      mockStripeRefunds.create.mockResolvedValue({
        id: 're_123',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        payment_intent: 'pi_456',
      });

      await service.create({
        paymentIntent: 'pi_456',
        reason: 'duplicate',
        metadata: { key: 'val' },
      });

      expect(store.createRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 're_123',
          stripeId: 're_123',
          paymentIntentId: 'pi_456',
          amount: 1000,
          currency: 'usd',
          reason: 'duplicate',
        }),
      );
    });
  });

  describe('retrieve', () => {
    it('should retrieve a refund', async () => {
      service = createService();
      mockStripeRefunds.retrieve.mockResolvedValue({ id: 're_123', amount: 1000 });

      const result = await service.retrieve('re_123');

      expect(mockStripeRefunds.retrieve).toHaveBeenCalledWith('re_123');
      expect(result.id).toBe('re_123');
    });
  });

  describe('list', () => {
    it('should list refunds', async () => {
      service = createService();
      mockStripeRefunds.list.mockResolvedValue({ data: [{ id: 're_1' }, { id: 're_2' }] });

      const result = await service.list(5);

      expect(mockStripeRefunds.list).toHaveBeenCalledWith({ limit: 5 });
      expect(result).toHaveLength(2);
    });
  });

  describe('cancel', () => {
    it('should cancel a refund', async () => {
      service = createService();
      mockStripeRefunds.cancel.mockResolvedValue({ id: 're_123', status: 'canceled' });

      const result = await service.cancel('re_123');

      expect(mockStripeRefunds.cancel).toHaveBeenCalledWith('re_123', expect.any(Object));
      expect(result.status).toBe('canceled');
    });

    it('should update store status when available', async () => {
      service = createService(true);
      mockStripeRefunds.cancel.mockResolvedValue({ id: 're_123', status: 'canceled' });

      await service.cancel('re_123');

      expect(store.updateRefundStatus).toHaveBeenCalledWith('re_123', 'canceled');
    });
  });
});
