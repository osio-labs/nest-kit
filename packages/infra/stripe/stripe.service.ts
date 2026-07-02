import { Inject, Injectable } from '@nestjs/common';
import type { Stripe } from 'stripe';
import { STRIPE_CLIENT, STRIPE_MODULE_OPTIONS } from './stripe.constants';
import type { StripeModuleOptions, InvoiceResult } from './stripe.types';
import { PaymentIntentsService } from './services/payment-intents.service';
import { RefundsService } from './services/refunds.service';
import { PaymentMethodsService } from './services/payment-methods.service';
import { CustomersService } from './services/customers.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { CheckoutService } from './services/checkout.service';
import { BillingPortalService } from './services/billing-portal.service';
import { WebhooksService } from './services/webhooks.service';
import { ProductsService } from './services/products.service';

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
