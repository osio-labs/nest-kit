import { Test } from '@nestjs/testing';
import { StripeController } from './stripe.controller.js';
import { StripeService } from './stripe.service.js';
import {
  STRIPE_CLIENT,
  STRIPE_WEBHOOK_HANDLERS,
  STRIPE_MODULE_OPTIONS,
  PAYMENT_STORE,
} from './stripe.constants.js';
import { PaymentIntentsService } from './services/payment-intents.service.js';
import { RefundsService } from './services/refunds.service.js';
import { PaymentMethodsService } from './services/payment-methods.service.js';
import { CustomersService } from './services/customers.service.js';
import { SubscriptionsService } from './services/subscriptions.service.js';
import { CheckoutService } from './services/checkout.service.js';
import { BillingPortalService } from './services/billing-portal.service.js';
import { WebhooksService } from './services/webhooks.service.js';
import { ProductsService } from './services/products.service.js';
import type { Stripe } from 'stripe';
import type { StripeModuleOptions } from './stripe.types.js';

const mockPaymentIntentsService = {
  create: jest.fn(),
  confirm: jest.fn(),
  capture: jest.fn(),
  cancel: jest.fn(),
  retrieve: jest.fn(),
  list: jest.fn(),
};

const mockRefundsService = {
  create: jest.fn(),
  list: jest.fn(),
  cancel: jest.fn(),
  retrieve: jest.fn(),
};

const mockPaymentMethodsService = {
  list: jest.fn(),
  attach: jest.fn(),
  detach: jest.fn(),
};

const mockCustomersService = {
  create: jest.fn(),
  retrieve: jest.fn(),
};

const mockSubscriptionsService = {
  create: jest.fn(),
  retrieve: jest.fn(),
  cancel: jest.fn(),
  update: jest.fn(),
};

const mockCheckoutService = {
  create: jest.fn(),
};

const mockBillingPortalService = {
  create: jest.fn(),
};

const mockWebhooksService = {
  constructEvent: jest.fn(),
};

const mockProductsService = {
  listProducts: jest.fn(),
  listPrices: jest.fn(),
};

const mockStripeClient = {} as Stripe;
const mockOptions: StripeModuleOptions = { apiKey: 'sk_test_xxx', webhookSecret: 'whsec_123' };

describe('StripeController', () => {
  let controller: StripeController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const modRef = await Test.createTestingModule({
      controllers: [StripeController],
      providers: [
        {
          provide: StripeService,
          useValue: {
            paymentIntents: mockPaymentIntentsService,
            refunds: mockRefundsService,
            paymentMethods: mockPaymentMethodsService,
            customers: mockCustomersService,
            subscriptions: mockSubscriptionsService,
            checkout: mockCheckoutService,
            billingPortal: mockBillingPortalService,
            webhooks: mockWebhooksService,
            products: mockProductsService,
          },
        },
        { provide: STRIPE_WEBHOOK_HANDLERS, useValue: [] },
      ],
    }).compile();

    controller = modRef.get(StripeController);
  });

  describe('POST /stripe/webhook', () => {
    it('should handle webhook event', async () => {
      const mockEvent = { type: 'payment_intent.succeeded' };
      mockWebhooksService.constructEvent.mockReturnValue(mockEvent);

      const result = await controller.handleWebhook(
        { rawBody: '{"raw":"body"}' },
        'stripe-signature-value',
      );

      expect(mockWebhooksService.constructEvent).toHaveBeenCalledWith(
        '{"raw":"body"}',
        'stripe-signature-value',
      );
      expect(result).toEqual({ received: true });
    });

    it('should throw if payload or signature is missing', async () => {
      await expect(controller.handleWebhook({ rawBody: '' }, '')).rejects.toThrow(
        'Missing webhook payload or signature',
      );
    });
  });

  describe('POST /stripe/payment-intents', () => {
    it('should create a payment intent', async () => {
      const mockResult = { id: 'pi_123' };
      mockPaymentIntentsService.create.mockResolvedValue(mockResult);

      const result = await controller.createPaymentIntent({
        amount: 1000,
        currency: 'usd',
      });

      expect(mockPaymentIntentsService.create).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'usd',
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('POST /stripe/payment-intents/:id/confirm', () => {
    it('should confirm a payment intent', async () => {
      const mockResult = { id: 'pi_123', status: 'succeeded' };
      mockPaymentIntentsService.confirm.mockResolvedValue(mockResult);

      const result = await controller.confirmPaymentIntent('pi_123', { paymentMethod: 'pm_1' });

      expect(mockPaymentIntentsService.confirm).toHaveBeenCalledWith('pi_123', {
        paymentMethod: 'pm_1',
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('POST /stripe/payment-intents/:id/capture', () => {
    it('should capture a payment intent', async () => {
      const mockResult = { id: 'pi_123', status: 'succeeded' };
      mockPaymentIntentsService.capture.mockResolvedValue(mockResult);

      const result = await controller.capturePaymentIntent('pi_123', { amountToCapture: 500 });

      expect(mockPaymentIntentsService.capture).toHaveBeenCalledWith('pi_123', {
        amountToCapture: 500,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('POST /stripe/payment-intents/:id/cancel', () => {
    it('should cancel a payment intent', async () => {
      mockPaymentIntentsService.cancel.mockResolvedValue({ id: 'pi_123', status: 'canceled' });

      const result = await controller.cancelPaymentIntent('pi_123');

      expect(mockPaymentIntentsService.cancel).toHaveBeenCalledWith('pi_123');
      expect(result.status).toBe('canceled');
    });
  });

  describe('GET /stripe/payment-intents/:id', () => {
    it('should retrieve a payment intent', async () => {
      mockPaymentIntentsService.retrieve.mockResolvedValue({ id: 'pi_123' });

      const result = await controller.retrievePaymentIntent('pi_123');

      expect(mockPaymentIntentsService.retrieve).toHaveBeenCalledWith('pi_123');
      expect(result.id).toBe('pi_123');
    });
  });

  describe('GET /stripe/payment-intents', () => {
    it('should list payment intents', async () => {
      mockPaymentIntentsService.list.mockResolvedValue([{ id: 'pi_1' }]);

      const result = await controller.listPaymentIntents('5');

      expect(mockPaymentIntentsService.list).toHaveBeenCalledWith(5);
      expect(result).toHaveLength(1);
    });
  });

  describe('POST /stripe/refunds', () => {
    it('should create a refund', async () => {
      mockRefundsService.create.mockResolvedValue({ id: 're_123' });

      const result = await controller.createRefund({ paymentIntent: 'pi_456' });

      expect(mockRefundsService.create).toHaveBeenCalledWith({ paymentIntent: 'pi_456' });
      expect(result.id).toBe('re_123');
    });
  });

  describe('GET /stripe/refunds', () => {
    it('should list refunds', async () => {
      mockRefundsService.list.mockResolvedValue([{ id: 're_1' }]);

      const result = await controller.listRefunds('10');

      expect(mockRefundsService.list).toHaveBeenCalledWith(10);
    });
  });

  describe('POST /stripe/refunds/:id/cancel', () => {
    it('should cancel a refund', async () => {
      mockRefundsService.cancel.mockResolvedValue({ id: 're_123', status: 'canceled' });

      const result = await controller.cancelRefund('re_123');

      expect(mockRefundsService.cancel).toHaveBeenCalledWith('re_123');
      expect(result.status).toBe('canceled');
    });
  });

  describe('GET /stripe/customers/:id/payment-methods', () => {
    it('should list payment methods', async () => {
      mockPaymentMethodsService.list.mockResolvedValue([{ id: 'pm_1' }]);

      const result = await controller.listPaymentMethods('cus_123', 'card');

      expect(mockPaymentMethodsService.list).toHaveBeenCalledWith('cus_123', 'card');
      expect(result).toHaveLength(1);
    });
  });

  describe('POST /stripe/payment-methods/:id/attach', () => {
    it('should attach payment method', async () => {
      mockPaymentMethodsService.attach.mockResolvedValue({ id: 'pm_1', customer: 'cus_123' });

      const result = await controller.attachPaymentMethod('pm_1', { customer: 'cus_123' });

      expect(mockPaymentMethodsService.attach).toHaveBeenCalledWith({
        paymentMethod: 'pm_1',
        customer: 'cus_123',
      });
      expect(result.customer).toBe('cus_123');
    });
  });

  describe('POST /stripe/payment-methods/:id/detach', () => {
    it('should detach payment method', async () => {
      mockPaymentMethodsService.detach.mockResolvedValue({ id: 'pm_1', customer: null });

      const result = await controller.detachPaymentMethod('pm_1');

      expect(mockPaymentMethodsService.detach).toHaveBeenCalledWith('pm_1');
      expect(result.customer).toBeNull();
    });
  });

  describe('POST /stripe/customers', () => {
    it('should create a customer', async () => {
      mockCustomersService.create.mockResolvedValue({ id: 'cus_123', email: 'a@b.com' });

      const result = await controller.createCustomer({ email: 'a@b.com' });

      expect(mockCustomersService.create).toHaveBeenCalledWith({ email: 'a@b.com' });
      expect(result.id).toBe('cus_123');
    });
  });

  describe('GET /stripe/customers/:id', () => {
    it('should get a customer', async () => {
      mockCustomersService.retrieve.mockResolvedValue({ id: 'cus_123' });

      const result = await controller.getCustomer('cus_123');

      expect(mockCustomersService.retrieve).toHaveBeenCalledWith('cus_123');
      expect(result.id).toBe('cus_123');
    });
  });

  describe('POST /stripe/subscriptions', () => {
    it('should create a subscription', async () => {
      mockSubscriptionsService.create.mockResolvedValue({ id: 'sub_123' });

      const result = await controller.createSubscription({
        customer: 'cus_123',
        items: [{ price: 'price_1' }],
      });

      expect(mockSubscriptionsService.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        items: [{ price: 'price_1' }],
      });
      expect(result.id).toBe('sub_123');
    });
  });

  describe('GET /stripe/subscriptions/:id', () => {
    it('should get a subscription', async () => {
      mockSubscriptionsService.retrieve.mockResolvedValue({ id: 'sub_123' });

      const result = await controller.getSubscription('sub_123');

      expect(mockSubscriptionsService.retrieve).toHaveBeenCalledWith('sub_123');
    });
  });

  describe('POST /stripe/subscriptions/:id/cancel', () => {
    it('should cancel a subscription', async () => {
      mockSubscriptionsService.cancel.mockResolvedValue({ id: 'sub_123', status: 'canceled' });

      const result = await controller.cancelSubscription('sub_123');

      expect(mockSubscriptionsService.cancel).toHaveBeenCalledWith('sub_123');
      expect(result.status).toBe('canceled');
    });
  });

  describe('PATCH /stripe/subscriptions/:id', () => {
    it('should update a subscription', async () => {
      mockSubscriptionsService.update.mockResolvedValue({ id: 'sub_123', status: 'active' });

      const result = await controller.updateSubscription('sub_123', {
        cancelAtPeriodEnd: true,
      });

      expect(mockSubscriptionsService.update).toHaveBeenCalledWith('sub_123', {
        cancelAtPeriodEnd: true,
      });
      expect(result.status).toBe('active');
    });
  });

  describe('POST /stripe/checkout', () => {
    it('should create a checkout session', async () => {
      mockCheckoutService.create.mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/pay/cs_123',
      });

      const result = await controller.createCheckoutSession({
        mode: 'payment',
        lineItems: [{ price: 'price_1', quantity: 1 }],
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(mockCheckoutService.create).toHaveBeenCalledWith({
        mode: 'payment',
        lineItems: [{ price: 'price_1', quantity: 1 }],
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });
      expect(result.url).toContain('checkout.stripe.com');
    });
  });

  describe('POST /stripe/billing-portal', () => {
    it('should create a billing portal session', async () => {
      mockBillingPortalService.create.mockResolvedValue({
        id: 'bps_123',
        url: 'https://billing.stripe.com/session/bps_123',
      });

      const result = await controller.createBillingPortalSession({
        customer: 'cus_123',
        returnUrl: 'https://example.com/portal',
      });

      expect(mockBillingPortalService.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        returnUrl: 'https://example.com/portal',
      });
      expect(result.url).toContain('billing.stripe.com');
    });
  });

  describe('GET /stripe/products', () => {
    it('should list products', async () => {
      mockProductsService.listProducts.mockResolvedValue([{ id: 'prod_1' }]);

      const result = await controller.listProducts();

      expect(mockProductsService.listProducts).toHaveBeenCalledWith({ active: true });
      expect(result).toHaveLength(1);
    });
  });

  describe('GET /stripe/prices', () => {
    it('should list prices', async () => {
      mockProductsService.listPrices.mockResolvedValue([{ id: 'price_1' }]);

      const result = await controller.listPrices('prod_1');

      expect(mockProductsService.listPrices).toHaveBeenCalledWith({ product: 'prod_1' });
    });
  });
});
