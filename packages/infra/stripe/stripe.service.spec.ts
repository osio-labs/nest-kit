import { StripeService } from './stripe.service';
import { PaymentIntentsService } from './services/payment-intents.service';
import { RefundsService } from './services/refunds.service';
import { PaymentMethodsService } from './services/payment-methods.service';
import { CustomersService } from './services/customers.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { CheckoutService } from './services/checkout.service';
import { BillingPortalService } from './services/billing-portal.service';
import { WebhooksService } from './services/webhooks.service';
import { ProductsService } from './services/products.service';
import type { Stripe } from 'stripe';
import type { StripeModuleOptions } from './stripe.types';

const mockStripe = {
  invoices: { list: jest.fn() },
} as unknown as Stripe;

const mockOptions: StripeModuleOptions = { apiKey: 'sk_test_xxx' };

function createMockService() {
  return jest.fn() as any;
}

describe('StripeService', () => {
  let service: StripeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StripeService(
      createMockService() as PaymentIntentsService,
      createMockService() as RefundsService,
      createMockService() as PaymentMethodsService,
      createMockService() as CustomersService,
      createMockService() as SubscriptionsService,
      createMockService() as CheckoutService,
      createMockService() as BillingPortalService,
      createMockService() as WebhooksService,
      createMockService() as ProductsService,
      mockStripe,
      mockOptions,
    );
  });

  it('should expose all sub-services', () => {
    expect(service.paymentIntents).toBeDefined();
    expect(service.refunds).toBeDefined();
    expect(service.paymentMethods).toBeDefined();
    expect(service.customers).toBeDefined();
    expect(service.subscriptions).toBeDefined();
    expect(service.checkout).toBeDefined();
    expect(service.billingPortal).toBeDefined();
    expect(service.webhooks).toBeDefined();
    expect(service.products).toBeDefined();
  });

  describe('getInvoices', () => {
    it('should list invoices for a customer', async () => {
      const mockInvoices = {
        data: [
          {
            id: 'in_1',
            number: 'INV-001',
            amount_paid: 1000,
            amount_due: 1000,
            currency: 'usd',
            status: 'paid',
            invoice_pdf: 'https://invoice.stripe.com/in_1',
            status_transitions: { paid_at: 1700000000 },
            lines: {
              data: [{ description: 'Item 1', amount: 1000, quantity: 1 }],
            },
          },
        ],
      };
      (mockStripe.invoices.list as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await service.getInvoices('cus_123', 5);

      expect(mockStripe.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_123',
        limit: 5,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('in_1');
      expect(result[0].number).toBe('INV-001');
      expect(result[0].amountPaid).toBe(1000);
      expect(result[0].currency).toBe('usd');
      expect(result[0].pdfUrl).toBe('https://invoice.stripe.com/in_1');
      expect(result[0].paidAt).toBeInstanceOf(Date);
      expect(result[0].lines).toHaveLength(1);
    });

    it('should handle missing invoice fields gracefully', async () => {
      const mockInvoices = {
        data: [
          {
            id: 'in_2',
            amount_paid: 0,
            amount_due: 0,
            currency: 'usd',
            status: null,
            invoice_pdf: null,
            status_transitions: { paid_at: null },
            lines: { data: [] },
          },
        ],
      };
      (mockStripe.invoices.list as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await service.getInvoices('cus_456');

      expect(result[0].number).toBe('');
      expect(result[0].status).toBe('');
      expect(result[0].pdfUrl).toBeUndefined();
      expect(result[0].paidAt).toBeUndefined();
      expect(result[0].lines).toEqual([]);
    });
  });
});
