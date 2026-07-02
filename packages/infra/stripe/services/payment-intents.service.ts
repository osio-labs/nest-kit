import { Inject, Injectable } from '@nestjs/common';
import type { Stripe } from 'stripe';
import { STRIPE_CLIENT, PAYMENT_STORE, STRIPE_MODULE_OPTIONS } from '../stripe.constants';
import type {
  CreatePaymentIntentOptions,
  ConfirmPaymentIntentOptions,
  CapturePaymentIntentOptions,
  UpdatePaymentIntentOptions,
  PaymentStore,
  PaymentIntentStatus,
  StripeModuleOptions,
} from '../stripe.types';
import { assertValidTransition } from '../store/state-machine';

/**
 * Service for Stripe Payment Intents operations.
 *
 * Provides methods to create, confirm, capture, cancel, retrieve, and list
 * payment intents. When a `PaymentStore` is active, records are persisted
 * and legal status transitions are enforced.
 */
@Injectable()
export class PaymentIntentsService {
  constructor(
    @Inject(STRIPE_CLIENT)
    private readonly stripe: Stripe,
    @Inject(PAYMENT_STORE)
    private readonly store: PaymentStore | null,
    @Inject(STRIPE_MODULE_OPTIONS)
    private readonly options: StripeModuleOptions,
  ) {}

  /**
   * Create a new payment intent.
   */
  async create(options: CreatePaymentIntentOptions): Promise<Stripe.PaymentIntent> {
    const payload: Stripe.PaymentIntentCreateParams = {
      amount: options.amount,
      currency: options.currency ?? this.options.defaultCurrency ?? 'usd',
      customer: options.customer,
      payment_method: options.paymentMethod,
      description: options.description,
      metadata: options.metadata,
      confirm: options.confirm,
      capture_method: options.captureMethod,
      setup_future_usage: options.setupFutureUsage,
      statement_descriptor: options.statementDescriptor,
      return_url: options.returnUrl,
    };

    const intent = await this.stripe.paymentIntents.create(payload, {
      idempotencyKey: options.idempotencyKey,
    });

    if (this.store) {
      await this.store.createPaymentIntent({
        id: intent.id,
        stripeId: intent.id,
        amount: intent.amount,
        currency: intent.currency,
        status: intent.status as PaymentIntentStatus,
        customerId: intent.customer as string | undefined,
        description: intent.description ?? undefined,
        metadata: intent.metadata ?? undefined,
      });
    }

    return intent;
  }

  /**
   * Retrieve a payment intent by its Stripe ID.
   */
  async retrieve(id: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(id);
  }

  /**
   * Confirm a payment intent.
   */
  async confirm(id: string, options?: ConfirmPaymentIntentOptions): Promise<Stripe.PaymentIntent> {
    const payload: Stripe.PaymentIntentConfirmParams = {
      payment_method: options?.paymentMethod,
      return_url: options?.returnUrl,
    };

    const intent = await this.stripe.paymentIntents.confirm(id, payload, {
      idempotencyKey: options?.idempotencyKey,
    });

    if (this.store) {
      await this.transitionStatus(intent.id, intent.status as PaymentIntentStatus);
    }

    return intent;
  }

  /**
   * Capture a payment intent (for manual-capture intents).
   */
  async capture(id: string, options?: CapturePaymentIntentOptions): Promise<Stripe.PaymentIntent> {
    const payload: Stripe.PaymentIntentCaptureParams = {
      amount_to_capture: options?.amountToCapture,
    };

    const intent = await this.stripe.paymentIntents.capture(id, payload, {
      idempotencyKey: options?.idempotencyKey,
    });

    if (this.store) {
      await this.transitionStatus(intent.id, intent.status as PaymentIntentStatus);
    }

    return intent;
  }

  /**
   * Cancel a payment intent.
   */
  async cancel(id: string, idempotencyKey?: string): Promise<Stripe.PaymentIntent> {
    const intent = await this.stripe.paymentIntents.cancel(id, {
      idempotencyKey,
    });

    if (this.store) {
      await this.transitionStatus(intent.id, intent.status as PaymentIntentStatus);
    }

    return intent;
  }

  /**
   * Update a payment intent.
   */
  async update(id: string, options: UpdatePaymentIntentOptions): Promise<Stripe.PaymentIntent> {
    const payload: Stripe.PaymentIntentUpdateParams = {
      amount: options.amount,
      description: options.description,
      metadata: options.metadata,
      currency: options.currency,
    };

    return this.stripe.paymentIntents.update(id, payload, {
      idempotencyKey: options.idempotencyKey,
    });
  }

  /**
   * List payment intents with an optional limit.
   */
  async list(limit?: number): Promise<Stripe.PaymentIntent[]> {
    const response = await this.stripe.paymentIntents.list({ limit: limit ?? 10 });
    return response.data;
  }

  private async transitionStatus(stripeId: string, newStatus: PaymentIntentStatus): Promise<void> {
    const record = await this.store!.getPaymentIntent(stripeId);
    if (record) {
      assertValidTransition(record.status, newStatus);
    }
    await this.store!.updatePaymentIntentStatus(stripeId, newStatus);
  }
}
