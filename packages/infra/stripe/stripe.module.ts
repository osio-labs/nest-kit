import { type DynamicModule, type Provider, Module } from '@nestjs/common';
import {
  STRIPE_MODULE_OPTIONS,
  STRIPE_CLIENT,
  PAYMENT_STORE,
  STRIPE_WEBHOOK_HANDLERS,
} from './stripe.constants.js';
import { loadStripe } from './stripe.utils.js';
import type { StripeModuleOptions, StripeModuleAsyncOptions } from './stripe.types.js';
import { StripeService } from './stripe.service.js';
import { StripeController } from './stripe.controller.js';
import { StripeSandboxClient } from './stripe-sandbox.client.js';
import { PaymentIntentsService } from './services/payment-intents.service.js';
import { RefundsService } from './services/refunds.service.js';
import { PaymentMethodsService } from './services/payment-methods.service.js';
import { CustomersService } from './services/customers.service.js';
import { SubscriptionsService } from './services/subscriptions.service.js';
import { CheckoutService } from './services/checkout.service.js';
import { BillingPortalService } from './services/billing-portal.service.js';
import { WebhooksService } from './services/webhooks.service.js';
import { ProductsService } from './services/products.service.js';

/**
 * NestJS `DynamicModule` for Stripe payment processing.
 *
 * Registers the Stripe SDK client (or sandbox) and all sub-services.
 * Optionally accepts a `PaymentStore` implementation for database
 * persistence and webhook handlers for incoming Stripe events.
 *
 * @example
 * ```typescript
 * import { StripeModule } from '@os.io/nest-kit/infra/stripe';
 *
 * @Module({
 *   imports: [
 *     StripeModule.forRoot({
 *       apiKey: process.env.STRIPE_SECRET_KEY,
 *       webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class StripeModule {
  /**
   * Configure Stripe synchronously.
   */
  static forRoot(options: StripeModuleOptions): DynamicModule {
    return {
      module: StripeModule,
      global: true,
      providers: StripeModule.createProviders(options),
      controllers: options.sandbox ? [] : [StripeController],
      exports: [StripeService],
    };
  }

  /**
   * Configure Stripe asynchronously (e.g. from `ConfigService`).
   *
   * @example
   * ```typescript
   * StripeModule.forRootAsync({
   *   imports: [ConfigModule],
   *   inject: [ConfigService],
   *   useFactory: (config: ConfigService) => ({
   *     apiKey: config.get('stripe.secretKey'),
   *   }),
   * })
   * ```
   */
  static forRootAsync(options: StripeModuleAsyncOptions): DynamicModule {
    return {
      module: StripeModule,
      global: options.global ?? true,
      imports: (options.imports as DynamicModule['imports']) ?? [],
      providers: StripeModule.createAsyncProviders(options),
      controllers: [StripeController],
      exports: [StripeService],
    };
  }

  private static createProviders(options: StripeModuleOptions): Provider[] {
    return [
      { provide: STRIPE_MODULE_OPTIONS, useValue: options },
      {
        provide: STRIPE_CLIENT,
        useFactory: async (opts: StripeModuleOptions) => {
          if (opts.sandbox) {
            return new StripeSandboxClient();
          }
          /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
          const mod = await loadStripe();
          return new mod.default(opts.apiKey, {
            apiVersion: '2025-02-24.acacia' as const,
          });
          /* eslint-enable */
        },
        inject: [STRIPE_MODULE_OPTIONS],
      },
      {
        provide: PAYMENT_STORE,
        useFactory: (opts: StripeModuleOptions) => {
          if (opts.PaymentStore) {
            return new opts.PaymentStore();
          }
          return null;
        },
        inject: [STRIPE_MODULE_OPTIONS],
      },
      {
        provide: STRIPE_WEBHOOK_HANDLERS,
        useValue: options.webhookHandlers ?? [],
      },
      ...StripeModule.createServiceProviders(),
    ];
  }

  private static createAsyncProviders(options: StripeModuleAsyncOptions): Provider[] {
    return [
      {
        provide: STRIPE_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
      {
        provide: STRIPE_CLIENT,
        useFactory: async (opts: StripeModuleOptions) => {
          if (opts.sandbox) {
            return new StripeSandboxClient();
          }
          /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
          const mod = await loadStripe();
          return new mod.default(opts.apiKey, {
            apiVersion: '2025-02-24.acacia' as const,
          });
          /* eslint-enable */
        },
        inject: [STRIPE_MODULE_OPTIONS],
      },
      {
        provide: PAYMENT_STORE,
        useFactory: (opts: StripeModuleOptions) => {
          if (opts.PaymentStore) {
            return new opts.PaymentStore();
          }
          return null;
        },
        inject: [STRIPE_MODULE_OPTIONS],
      },
      {
        provide: STRIPE_WEBHOOK_HANDLERS,
        useFactory: (opts: StripeModuleOptions) => opts.webhookHandlers ?? [],
        inject: [STRIPE_MODULE_OPTIONS],
      },
      ...StripeModule.createServiceProviders(),
    ];
  }

  private static createServiceProviders(): Provider[] {
    return [
      PaymentIntentsService,
      RefundsService,
      PaymentMethodsService,
      CustomersService,
      SubscriptionsService,
      CheckoutService,
      BillingPortalService,
      WebhooksService,
      ProductsService,
      StripeService,
    ];
  }
}
