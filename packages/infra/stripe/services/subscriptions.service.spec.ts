import { STRIPE_CLIENT } from '../stripe.constants.js';
import { SubscriptionsService } from './subscriptions.service.js';
import type { Stripe } from 'stripe';

const mockStripeSubs = {
  create: jest.fn(),
  update: jest.fn(),
  cancel: jest.fn(),
  retrieve: jest.fn(),
  list: jest.fn(),
};

const mockStripe = {
  subscriptions: mockStripeSubs,
} as unknown as Stripe;

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SubscriptionsService(mockStripe);
  });

  describe('create', () => {
    it('should create a subscription', async () => {
      mockStripeSubs.create.mockResolvedValue({
        id: 'sub_123',
        customer: 'cus_1',
        status: 'active',
      });

      const result = await service.create({
        customer: 'cus_1',
        items: [{ price: 'price_1' }],
      });

      expect(mockStripeSubs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_1',
          items: [{ price: 'price_1', quantity: undefined }],
        }),
        expect.any(Object),
      );
      expect(result.id).toBe('sub_123');
    });

    it('should create subscription with trial', async () => {
      mockStripeSubs.create.mockResolvedValue({
        id: 'sub_123',
        customer: 'cus_1',
        status: 'trialing',
      });

      await service.create({
        customer: 'cus_1',
        items: [{ price: 'price_1', quantity: 2 }],
        trialPeriodDays: 14,
      });

      expect(mockStripeSubs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          trial_period_days: 14,
          items: [{ price: 'price_1', quantity: 2 }],
        }),
        expect.any(Object),
      );
    });
  });

  describe('update', () => {
    it('should update a subscription', async () => {
      mockStripeSubs.update.mockResolvedValue({ id: 'sub_123', status: 'active' });

      const result = await service.update('sub_123', {
        items: [{ price: 'price_2' }],
        metadata: { key: 'val' },
      });

      expect(mockStripeSubs.update).toHaveBeenCalledWith(
        'sub_123',
        expect.objectContaining({
          items: [{ price: 'price_2', quantity: undefined }],
          metadata: { key: 'val' },
        }),
        expect.any(Object),
      );
      expect(result.id).toBe('sub_123');
    });
  });

  describe('cancel', () => {
    it('should set cancel_at_period_end by default', async () => {
      mockStripeSubs.update.mockResolvedValue({ id: 'sub_123', cancel_at_period_end: true });

      await service.cancel('sub_123');

      expect(mockStripeSubs.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
    });

    it('should cancel immediately when cancelAtPeriodEnd is false', async () => {
      mockStripeSubs.cancel.mockResolvedValue({ id: 'sub_123', status: 'canceled' });

      await service.cancel('sub_123', { cancelAtPeriodEnd: false });

      expect(mockStripeSubs.cancel).toHaveBeenCalledWith('sub_123', expect.any(Object));
    });

    it('should use update when cancelAtPeriodEnd is true', async () => {
      mockStripeSubs.update.mockResolvedValue({ id: 'sub_123', cancel_at_period_end: true });

      await service.cancel('sub_123', { cancelAtPeriodEnd: true });

      expect(mockStripeSubs.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
    });
  });

  describe('retrieve', () => {
    it('should retrieve a subscription', async () => {
      mockStripeSubs.retrieve.mockResolvedValue({ id: 'sub_123' });

      const result = await service.retrieve('sub_123');

      expect(mockStripeSubs.retrieve).toHaveBeenCalledWith('sub_123');
      expect(result.id).toBe('sub_123');
    });
  });

  describe('list', () => {
    it('should list subscriptions', async () => {
      mockStripeSubs.list.mockResolvedValue({ data: [{ id: 'sub_1' }, { id: 'sub_2' }] });

      const result = await service.list(5);

      expect(mockStripeSubs.list).toHaveBeenCalledWith({ limit: 5 });
      expect(result).toHaveLength(2);
    });
  });
});
