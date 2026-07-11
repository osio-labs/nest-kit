import { Inject, Injectable } from '@nestjs/common';
import type { Stripe } from 'stripe';
import { STRIPE_CLIENT, STRIPE_MODULE_OPTIONS } from './stripe.constants.js';
import type { StripeModuleOptions, InvoiceResult } from './stripe.types.js';
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
 * Main facade service for Stripe payment processing.
 *
 * Provides convenient access to all Stripe sub-services through
 * a single injectable entry point.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class PaymentService {
 *   constructor(private readonly stripe: StripeService) {}
 *
 *   async charge(amount: number, currency: string) {
 *     const intent = await this.stripe.paymentIntents.create({ amount, currency });
 *     return intent;
 *   }
 * }
 * ```
 */
@Injectable()
export class StripeService {
  constructor(
    /** Payment Intents API. */
    public readonly paymentIntents: PaymentIntentsService,
    /** Refunds API. */
    public readonly refunds: RefundsService,
    /** Payment Methods API. */
    public readonly paymentMethods: PaymentMethodsService,
    /** Customers API. */
    public readonly customers: CustomersService,
    /** Subscriptions API. */
    public readonly subscriptions: SubscriptionsService,
    /** Checkout Sessions API. */
    public readonly checkout: CheckoutService,
    /** Billing Portal API. */
    public readonly billingPortal: BillingPortalService,
    /** Webhooks API. */
    public readonly webhooks: WebhooksService,
    /** Products & Prices API. */
    public readonly products: ProductsService,
    @Inject(STRIPE_CLIENT)
    private readonly stripe: Stripe,
    @Inject(STRIPE_MODULE_OPTIONS)
    private readonly options: StripeModuleOptions,
  ) {}

  /**
   * List invoices for a customer.
   */
  async getInvoices(customerId: string, limit = 10): Promise<InvoiceResult[]> {
    const invoices = await this.stripe.invoices.list({
      customer: customerId,
      limit,
    });
    return invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number ?? '',
      amountPaid: inv.amount_paid,
      amountDue: inv.amount_due,
      currency: inv.currency,
      status: inv.status ?? '',
      pdfUrl: inv.invoice_pdf ?? undefined,
      paidAt: inv.status_transitions?.paid_at
        ? new Date(inv.status_transitions.paid_at * 1000)
        : undefined,
      lines: (inv.lines?.data ?? []).map((line) => ({
        description: line.description ?? '',
        amount: line.amount,
        quantity: line.quantity ?? 1,
      })),
    }));
  }
}
