import { PaymentIntentsService } from './payment-intents.service';
import type { PaymentStore, StripeModuleOptions } from '../stripe.types';
import type { Stripe } from 'stripe';

const mockStripePI = {
  create: jest.fn(),
  retrieve: jest.fn(),
  confirm: jest.fn(),
  capture: jest.fn(),
  cancel: jest.fn(),
  update: jest.fn(),
  list: jest.fn(),
};

const mockStripe = {
  paymentIntents: mockStripePI,
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

const defaultOptions: StripeModuleOptions = { apiKey: 'sk_test_xxx' };

describe('PaymentIntentsService', () => {
  let service: PaymentIntentsService;
  let store: jest.Mocked<PaymentStore>;

  beforeEach(() => {
    store = createMockStore();
    jest.clearAllMocks();
  });

  function createService(useStore = false) {
    return new PaymentIntentsService(mockStripe, useStore ? store : null, defaultOptions);
  }

  describe('create', () => {
    it('should create a payment intent', async () => {
      service = createService();
      const mockResult = {
        id: 'pi_123',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method',
        customer: null,
        description: null,
        metadata: {},
      };
      mockStripePI.create.mockResolvedValue(mockResult);

      const result = await service.create({ amount: 1000, currency: 'usd' });

      expect(mockStripePI.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1000, currency: 'usd' }),
        expect.objectContaining({}),
      );
      expect(result).toEqual(mockResult);
    });

    it('should use default currency from options', async () => {
      service = createService();
      mockStripePI.create.mockResolvedValue({
        id: 'pi_123',
        amount: 500,
        currency: 'eur',
        status: 'requires_payment_method',
        customer: null,
        description: null,
        metadata: {},
      });

      await service.create({ amount: 500 });

      expect(mockStripePI.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'usd' }),
        expect.any(Object),
      );
    });

    it('should persist to store when available', async () => {
      service = createService(true);
      const mockResult = {
        id: 'pi_123',
        amount: 2000,
        currency: 'usd',
        status: 'requires_payment_method',
        customer: 'cus_1',
        description: 'test',
        metadata: { key: 'val' },
      };
      mockStripePI.create.mockResolvedValue(mockResult);

      await service.create({
        amount: 2000,
        customer: 'cus_1',
        description: 'test',
        metadata: { key: 'val' },
      });

      expect(store.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'pi_123',
          stripeId: 'pi_123',
          amount: 2000,
          currency: 'usd',
          status: 'requires_payment_method',
          customerId: 'cus_1',
        }),
      );
    });

    it('should pass idempotency key', async () => {
      service = createService();
      mockStripePI.create.mockResolvedValue({
        id: 'pi_123',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method',
        customer: null,
        description: null,
        metadata: {},
      });

      await service.create({ amount: 1000, idempotencyKey: 'idem-123' });

      expect(mockStripePI.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ idempotencyKey: 'idem-123' }),
      );
    });
  });

  describe('retrieve', () => {
    it('should retrieve a payment intent', async () => {
      service = createService();
      const mockResult = {
        id: 'pi_123',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        customer: null,
        description: null,
        metadata: {},
      };
      mockStripePI.retrieve.mockResolvedValue(mockResult);

      const result = await service.retrieve('pi_123');

      expect(mockStripePI.retrieve).toHaveBeenCalledWith('pi_123');
      expect(result).toEqual(mockResult);
    });
  });

  describe('confirm', () => {
    it('should confirm a payment intent', async () => {
      service = createService();
      const mockResult = { id: 'pi_123', status: 'succeeded' };
      mockStripePI.confirm.mockResolvedValue(mockResult);

      const result = await service.confirm('pi_123', { paymentMethod: 'pm_456' });

      expect(mockStripePI.confirm).toHaveBeenCalledWith(
        'pi_123',
        expect.objectContaining({ payment_method: 'pm_456' }),
        expect.any(Object),
      );
      expect(result).toEqual(mockResult);
    });

    it('should update store status when store is active', async () => {
      service = createService(true);
      store.getPaymentIntent.mockResolvedValue({
        id: '1',
        stripeId: 'pi_123',
        amount: 1000,
        currency: 'usd',
        status: 'requires_confirmation',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockStripePI.confirm.mockResolvedValue({ id: 'pi_123', status: 'succeeded' });

      await service.confirm('pi_123');

      expect(store.updatePaymentIntentStatus).toHaveBeenCalledWith('pi_123', 'succeeded');
    });
  });

  describe('capture', () => {
    it('should capture a payment intent', async () => {
      service = createService();
      mockStripePI.capture.mockResolvedValue({ id: 'pi_123', status: 'succeeded' });

      const result = await service.capture('pi_123', { amountToCapture: 500 });

      expect(mockStripePI.capture).toHaveBeenCalledWith(
        'pi_123',
        expect.objectContaining({ amount_to_capture: 500 }),
        expect.any(Object),
      );
      expect(result.status).toBe('succeeded');
    });
  });

  describe('cancel', () => {
    it('should cancel a payment intent', async () => {
      service = createService();
      mockStripePI.cancel.mockResolvedValue({ id: 'pi_123', status: 'canceled' });

      const result = await service.cancel('pi_123');

      expect(mockStripePI.cancel).toHaveBeenCalledWith('pi_123', expect.any(Object));
      expect(result.status).toBe('canceled');
    });
  });

  describe('update', () => {
    it('should update a payment intent', async () => {
      service = createService();
      mockStripePI.update.mockResolvedValue({ id: 'pi_123', amount: 1500, description: 'updated' });

      const result = await service.update('pi_123', { amount: 1500, description: 'updated' });

      expect(mockStripePI.update).toHaveBeenCalledWith(
        'pi_123',
        expect.objectContaining({ amount: 1500, description: 'updated' }),
        expect.any(Object),
      );
      expect(result).toBeDefined();
    });
  });

  describe('list', () => {
    it('should list payment intents', async () => {
      service = createService();
      mockStripePI.list.mockResolvedValue({ data: [{ id: 'pi_1' }, { id: 'pi_2' }] });

      const result = await service.list(5);

      expect(mockStripePI.list).toHaveBeenCalledWith({ limit: 5 });
      expect(result).toHaveLength(2);
    });

    it('should default to 10 items', async () => {
      service = createService();
      mockStripePI.list.mockResolvedValue({ data: [] });

      await service.list();

      expect(mockStripePI.list).toHaveBeenCalledWith({ limit: 10 });
    });
  });
});
