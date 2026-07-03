import { STRIPE_CLIENT } from '../stripe.constants';
import { CustomersService } from './customers.service';
import type { Stripe } from 'stripe';

const mockStripeCustomers = {
  create: jest.fn(),
  retrieve: jest.fn(),
};

const mockStripe = {
  customers: mockStripeCustomers,
} as unknown as Stripe;

describe('CustomersService', () => {
  let service: CustomersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CustomersService(mockStripe);
  });

  describe('create', () => {
    it('should create a customer with email and name', async () => {
      mockStripeCustomers.create.mockResolvedValue({
        id: 'cus_123',
        email: 'a@b.com',
        name: 'John',
      });

      const result = await service.create({ email: 'a@b.com', name: 'John' });

      expect(mockStripeCustomers.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'a@b.com', name: 'John' }),
        expect.any(Object),
      );
      expect(result.id).toBe('cus_123');
    });

    it('should create a customer with minimal options', async () => {
      mockStripeCustomers.create.mockResolvedValue({ id: 'cus_123' });

      await service.create({});

      expect(mockStripeCustomers.create).toHaveBeenCalled();
    });

    it('should pass idempotency key', async () => {
      mockStripeCustomers.create.mockResolvedValue({ id: 'cus_123' });

      await service.create({ email: 'a@b.com', idempotencyKey: 'idem-123' });

      expect(mockStripeCustomers.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ idempotencyKey: 'idem-123' }),
      );
    });
  });

  describe('retrieve', () => {
    it('should retrieve a customer', async () => {
      mockStripeCustomers.retrieve.mockResolvedValue({ id: 'cus_123', email: 'a@b.com' });

      const result = await service.retrieve('cus_123');

      expect(mockStripeCustomers.retrieve).toHaveBeenCalledWith('cus_123');
      expect(result.id).toBe('cus_123');
    });
  });
});
