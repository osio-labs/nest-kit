import { Test } from '@nestjs/testing';
import {
  STRIPE_CLIENT,
  STRIPE_MODULE_OPTIONS,
  PAYMENT_STORE,
  STRIPE_WEBHOOK_HANDLERS,
} from './stripe.constants';
import { StripeModule } from './stripe.module';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { PaymentIntentsService } from './services/payment-intents.service';
import { RefundsService } from './services/refunds.service';
import { PaymentMethodsService } from './services/payment-methods.service';
import { CustomersService } from './services/customers.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { CheckoutService } from './services/checkout.service';
import { BillingPortalService } from './services/billing-portal.service';
import { WebhooksService } from './services/webhooks.service';
import { ProductsService } from './services/products.service';
import type { StripeModuleOptions } from './stripe.types';

describe('StripeModule', () => {
  describe('forRoot', () => {
    it('should provide StripeService', async () => {
      const modRef = await Test.createTestingModule({
        imports: [StripeModule.forRoot({ apiKey: 'sk_test_xxx' })],
      }).compile();

      const svc = modRef.get(StripeService);
      expect(svc).toBeInstanceOf(StripeService);
    });

    it('should provide all sub-services', async () => {
      const modRef = await Test.createTestingModule({
        imports: [StripeModule.forRoot({ apiKey: 'sk_test_xxx' })],
      }).compile();

      expect(modRef.get(PaymentIntentsService)).toBeInstanceOf(PaymentIntentsService);
      expect(modRef.get(RefundsService)).toBeInstanceOf(RefundsService);
      expect(modRef.get(PaymentMethodsService)).toBeInstanceOf(PaymentMethodsService);
      expect(modRef.get(CustomersService)).toBeInstanceOf(CustomersService);
      expect(modRef.get(SubscriptionsService)).toBeInstanceOf(SubscriptionsService);
      expect(modRef.get(CheckoutService)).toBeInstanceOf(CheckoutService);
      expect(modRef.get(BillingPortalService)).toBeInstanceOf(BillingPortalService);
      expect(modRef.get(WebhooksService)).toBeInstanceOf(WebhooksService);
      expect(modRef.get(ProductsService)).toBeInstanceOf(ProductsService);
    });

    it('should provide the Stripe client', async () => {
      const modRef = await Test.createTestingModule({
        imports: [StripeModule.forRoot({ apiKey: 'sk_test_xxx' })],
      }).compile();

      const client = modRef.get(STRIPE_CLIENT);
      expect(client).toBeDefined();
    });

    it('should be global by default', () => {
      const mod = StripeModule.forRoot({ apiKey: 'sk_test_xxx' });
      expect(mod.global).toBe(true);
    });

    it('should not register controller when sandbox is enabled', () => {
      const mod = StripeModule.forRoot({ apiKey: 'sk_test_xxx', sandbox: true });
      expect(mod.controllers).toEqual([]);
    });

    it('should register controller when sandbox is not enabled', () => {
      const mod = StripeModule.forRoot({ apiKey: 'sk_test_xxx' });
      expect(mod.controllers).toContain(StripeController);
    });

    it('should set PAYMENT_STORE to null when not provided', async () => {
      const modRef = await Test.createTestingModule({
        imports: [StripeModule.forRoot({ apiKey: 'sk_test_xxx' })],
      }).compile();

      const store = modRef.get(PAYMENT_STORE);
      expect(store).toBeNull();
    });

    it('should register webhook handlers', async () => {
      const handler = jest.fn();
      const modRef = await Test.createTestingModule({
        imports: [
          StripeModule.forRoot({
            apiKey: 'sk_test_xxx',
            webhookHandlers: [handler],
          }),
        ],
      }).compile();

      const handlers = modRef.get(STRIPE_WEBHOOK_HANDLERS);
      expect(handlers).toEqual([handler]);
    });

    it('should store module options', async () => {
      const options: StripeModuleOptions = {
        apiKey: 'sk_test_xxx',
        webhookSecret: 'whsec_123',
        defaultCurrency: 'eur',
      };

      const modRef = await Test.createTestingModule({
        imports: [StripeModule.forRoot(options)],
      }).compile();

      const stored = modRef.get(STRIPE_MODULE_OPTIONS);
      expect(stored).toMatchObject({
        apiKey: 'sk_test_xxx',
        webhookSecret: 'whsec_123',
        defaultCurrency: 'eur',
      });
    });
  });

  describe('forRootAsync', () => {
    it('should create module via useFactory', async () => {
      const modRef = await Test.createTestingModule({
        imports: [
          StripeModule.forRootAsync({
            useFactory: () => ({ apiKey: 'sk_test_async' }),
          }),
        ],
      }).compile();

      const svc = modRef.get(StripeService);
      expect(svc).toBeInstanceOf(StripeService);

      const options = modRef.get(STRIPE_MODULE_OPTIONS);
      expect(options.apiKey).toBe('sk_test_async');
    });

    it('should be global by default', () => {
      const mod = StripeModule.forRootAsync({
        useFactory: () => ({ apiKey: 'sk_test_xxx' }),
      });
      expect(mod.global).toBe(true);
    });

    it('should respect global option', () => {
      const mod = StripeModule.forRootAsync({
        useFactory: () => ({ apiKey: 'sk_test_xxx' }),
        global: false,
      });
      expect(mod.global).toBe(false);
    });
  });
});
