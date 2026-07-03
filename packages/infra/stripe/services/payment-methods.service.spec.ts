import { STRIPE_CLIENT } from '../stripe.constants';
import { PaymentMethodsService } from './payment-methods.service';
import type { Stripe } from 'stripe';

const mockStripePM = {
  list: jest.fn(),
  attach: jest.fn(),
  detach: jest.fn(),
};

const mockStripe = {
  paymentMethods: mockStripePM,
} as unknown as Stripe;

describe('PaymentMethodsService', () => {
  let service: PaymentMethodsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentMethodsService(mockStripe);
  });

  describe('list', () => {
    it('should list payment methods for a customer', async () => {
      mockStripePM.list.mockResolvedValue({ data: [{ id: 'pm_1', type: 'card' }] });

      const result = await service.list('cus_123');

      expect(mockStripePM.list).toHaveBeenCalledWith({
        customer: 'cus_123',
        type: 'card',
        limit: 10,
      });
      expect(result).toHaveLength(1);
    });

    it('should list with custom type and limit', async () => {
      mockStripePM.list.mockResolvedValue({ data: [] });

      await service.list('cus_123', 'sepa_debit', 5);

      expect(mockStripePM.list).toHaveBeenCalledWith({
        customer: 'cus_123',
        type: 'sepa_debit',
        limit: 5,
      });
    });
  });

  describe('attach', () => {
    it('should attach a payment method to a customer', async () => {
      mockStripePM.attach.mockResolvedValue({ id: 'pm_1', customer: 'cus_123' });

      const result = await service.attach({ paymentMethod: 'pm_1', customer: 'cus_123' });

      expect(mockStripePM.attach).toHaveBeenCalledWith('pm_1', { customer: 'cus_123' });
      expect(result.id).toBe('pm_1');
    });
  });

  describe('detach', () => {
    it('should detach a payment method', async () => {
      mockStripePM.detach.mockResolvedValue({ id: 'pm_1', customer: null });

      const result = await service.detach('pm_1');

      expect(mockStripePM.detach).toHaveBeenCalledWith('pm_1');
      expect(result.customer).toBeNull();
    });
  });
});
