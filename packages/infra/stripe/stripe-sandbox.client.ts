/**
 * Stripe sandbox client — a full in-memory mock of the Stripe SDK.
 *
 * Returns deterministic fake responses without making any API calls.
 * Ideal for development, CI, and integration tests.
 *
 * Configured automatically when `sandbox: true` is passed to `StripeModule.forRoot()`.
 */

import { Logger } from '@nestjs/common';

export const SANDBOX_TEST_CARDS = {
  VISA_SUCCESS: '4242424242424242',
  VISA_3DS: '4000002500003155',
  GENERIC_DECLINE: '4000000000000002',
  INSUFFICIENT_FUNDS: '4000000000009995',
  STOLEN_CARD: '4000000000004954',
  EXPIRED_CARD: '4000000000000069',
  INCORRECT_CVC: '4000000000000127',
  PROCESSING_ERROR: '4000000000000119',
} as const;

interface NextAction {
  type: string;
  redirect_to_url?: { url: string };
}

interface LastPaymentError {
  type: string;
  code: string;
  message: string;
}

interface CardOutcome {
  status: string;
  nextAction?: NextAction | null;
  lastPaymentError?: LastPaymentError | null;
}

interface SandboxListResponse<T> {
  object: 'list';
  data: T[];
  has_more: boolean;
  url: string;
}

interface SandboxPaymentIntent {
  id: string;
  object: string;
  amount: number;
  amount_capturable: number;
  amount_received: number;
  currency: string;
  status: string;
  customer: string | null;
  payment_method: string | null;
  client_secret: string;
  description: string | null;
  capture_method: string;
  confirmation_method: string;
  payment_method_types: string[];
  return_url: string | null;
  metadata: Record<string, string>;
  next_action: NextAction | null;
  last_payment_error: LastPaymentError | null;
  created: number;
  livemode: boolean;
  canceled_at: number | null;
  cancellation_reason?: string | null;
}

interface SandboxRefund {
  id: string;
  object: string;
  amount: number;
  currency: string;
  status: string;
  payment_intent: string;
  reason: string | null;
  metadata: Record<string, string>;
  created: number;
  livemode: boolean;
}

interface SandboxPaymentMethod {
  id: string;
  object: string;
  type: string;
  customer: string | null;
  billing_details: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    wallet: null;
  } | null;
  ideal: null;
  sepa_debit: null;
  us_bank_account: null;
  metadata: Record<string, string>;
  created: number;
  livemode: boolean;
}

interface SandboxCustomer {
  id: string;
  object: string;
  email: string;
  name: string | null;
  phone: string | null;
  metadata: Record<string, string>;
  created: number;
  livemode: boolean;
  balance: number;
  currency: null;
  default_source: null;
  delinquent: boolean;
  description: null;
  invoice_prefix: string;
}

interface SandboxSubscriptionItem {
  id: string;
  object: string;
  price: {
    id: string;
    object: string;
    product: string;
    unit_amount: number;
    currency: string;
    recurring: { interval: string; interval_count?: number };
  };
  quantity: number;
  created: number;
}

interface SandboxSubscription {
  id: string;
  object: string;
  customer: string;
  status: string;
  items: { object: string; data: SandboxSubscriptionItem[] };
  cancel_at_period_end: boolean;
  trial_end: number | null;
  current_period_start: number;
  current_period_end: number;
  latest_invoice?: {
    id: string;
    payment_intent: { id: string; client_secret: string; status: string };
  };
  metadata: Record<string, string>;
  created: number;
  livemode: boolean;
  canceled_at?: number | null;
}

interface SandboxCheckoutSession {
  id: string;
  object: string;
  url: string;
  customer: string | null;
  mode: string;
  success_url: string;
  cancel_url: string;
  line_items: unknown[];
  metadata: Record<string, string>;
  payment_status: string;
  status: string;
  currency: string;
  created: number;
  livemode: boolean;
  allow_promotion_codes: boolean;
}

interface SandboxBillingPortalSession {
  id: string;
  object: string;
  url: string;
  customer: string;
  return_url: string;
  created: number;
  livemode: boolean;
}

interface SandboxInvoice {
  id: string;
  object: string;
  number: string;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string;
  customer: string;
  invoice_pdf: null;
  status_transitions: { paid_at: number | null };
  lines: {
    object: string;
    data: Array<{
      id: string;
      description: string;
      amount: number;
      quantity: number;
      period: { start: number; end: number };
    }>;
  };
  created: number;
  livemode: boolean;
}

interface SandboxEvent {
  id: string;
  object: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
  livemode: boolean;
  pending_webhooks: number;
  request: null;
}

interface SandboxProduct {
  id: string;
  object: string;
  name: string;
  active: boolean;
  default_price: string | Record<string, unknown>;
  metadata: Record<string, string>;
  created: number;
  updated: number;
}

interface SandboxPrice {
  id: string;
  object: string;
  product: string;
  active: boolean;
  currency: string;
  unit_amount: number;
  type: string;
  recurring: { interval: string };
  metadata: Record<string, string>;
  created: number;
}

export class StripeSandboxClient {
  private readonly logger = new Logger(StripeSandboxClient.name);
  private idCounter = 1;

  private paymentIntentsStore = new Map<string, SandboxPaymentIntent>();
  private refundsStore = new Map<string, SandboxRefund>();
  private customersStore = new Map<string, SandboxCustomer>();
  private subscriptionsStore = new Map<string, SandboxSubscription>();
  private paymentMethodsStore = new Map<string, SandboxPaymentMethod>();

  private readonly productsStore: SandboxProduct[] = [
    {
      id: 'prod_sandbox_default',
      object: 'product',
      name: 'Default Sandbox Product',
      active: true,
      default_price: 'price_sandbox_default_monthly',
      metadata: {},
      created: Math.floor(Date.now() / 1000),
      updated: Math.floor(Date.now() / 1000),
    },
  ];

  private readonly pricesStore: SandboxPrice[] = [
    {
      id: 'price_sandbox_default_monthly',
      object: 'price',
      product: 'prod_sandbox_default',
      active: true,
      currency: 'usd',
      unit_amount: 999,
      type: 'recurring',
      recurring: { interval: 'month' },
      metadata: {},
      created: Math.floor(Date.now() / 1000),
    },
    {
      id: 'price_sandbox_default_yearly',
      object: 'price',
      product: 'prod_sandbox_default',
      active: true,
      currency: 'usd',
      unit_amount: 9990,
      type: 'recurring',
      recurring: { interval: 'year' },
      metadata: {},
      created: Math.floor(Date.now() / 1000),
    },
  ];

  constructor() {
    this.logger.warn('StripeSandboxClient initialized — no real API calls');
  }

  private nextId(prefix: string): string {
    return `${prefix}_sandbox_${this.idCounter++}`;
  }

  private now(): number {
    return Math.floor(Date.now() / 1000);
  }

  private defaultPi(id: string, overrides?: Partial<SandboxPaymentIntent>): SandboxPaymentIntent {
    return {
      id,
      object: 'payment_intent',
      amount: 2000,
      amount_capturable: 0,
      amount_received: 0,
      currency: 'usd',
      status: 'requires_payment_method',
      customer: null,
      payment_method: null,
      client_secret: `${id}_secret_sandbox`,
      description: null,
      capture_method: 'automatic',
      confirmation_method: 'automatic',
      payment_method_types: ['card'],
      return_url: null,
      metadata: {},
      next_action: null,
      last_payment_error: null,
      created: this.now(),
      livemode: false,
      canceled_at: null,
      ...overrides,
    };
  }

  private determineStatusFromCard(paymentMethodId?: string): CardOutcome {
    if (!paymentMethodId) {
      return { status: 'requires_payment_method' };
    }

    if (paymentMethodId.includes(SANDBOX_TEST_CARDS.VISA_3DS)) {
      return {
        status: 'requires_action',
        nextAction: {
          type: 'redirect_to_url',
          redirect_to_url: { url: 'https://sandbox.stripe.com/test_3ds' },
        },
      };
    }

    if (paymentMethodId.includes(SANDBOX_TEST_CARDS.GENERIC_DECLINE)) {
      return {
        status: 'failed',
        lastPaymentError: {
          type: 'card_declined',
          code: 'generic_decline',
          message: 'Your card was declined.',
        },
      };
    }

    if (paymentMethodId.includes(SANDBOX_TEST_CARDS.INSUFFICIENT_FUNDS)) {
      return {
        status: 'failed',
        lastPaymentError: {
          type: 'card_declined',
          code: 'insufficient_funds',
          message: 'Your card has insufficient funds.',
        },
      };
    }

    if (paymentMethodId.includes(SANDBOX_TEST_CARDS.STOLEN_CARD)) {
      return {
        status: 'failed',
        lastPaymentError: {
          type: 'card_declined',
          code: 'lost_card',
          message: 'Your card was declined.',
        },
      };
    }

    if (paymentMethodId.includes(SANDBOX_TEST_CARDS.EXPIRED_CARD)) {
      return {
        status: 'failed',
        lastPaymentError: {
          type: 'card_declined',
          code: 'expired_card',
          message: 'Your card has expired.',
        },
      };
    }

    if (paymentMethodId.includes(SANDBOX_TEST_CARDS.INCORRECT_CVC)) {
      return {
        status: 'failed',
        lastPaymentError: {
          type: 'card_declined',
          code: 'incorrect_cvc',
          message: "Your card's security code is incorrect.",
        },
      };
    }

    if (paymentMethodId.includes(SANDBOX_TEST_CARDS.PROCESSING_ERROR)) {
      return {
        status: 'failed',
        lastPaymentError: {
          type: 'processing_error',
          code: 'processing_error',
          message: 'An error occurred while processing your card.',
        },
      };
    }

    return { status: 'succeeded' };
  }

  paymentIntents: {
    create(params: {
      amount?: number;
      currency?: string;
      customer?: string;
      payment_method?: string;
      payment_method_types?: string[];
      description?: string;
      capture_method?: string;
      return_url?: string;
      metadata?: Record<string, string>;
      confirm?: boolean;
      off_session?: boolean;
    }): Promise<SandboxPaymentIntent>;
    confirm(
      id: string,
      params?: { payment_method?: string; return_url?: string },
    ): Promise<SandboxPaymentIntent>;
    capture(id: string, params?: { amount_to_capture?: number }): Promise<SandboxPaymentIntent>;
    cancel(id: string, params?: { cancellation_reason?: string }): Promise<SandboxPaymentIntent>;
    retrieve(id: string): Promise<SandboxPaymentIntent>;
    list(params?: {
      customer?: string;
      limit?: number;
    }): Promise<SandboxListResponse<SandboxPaymentIntent>>;
  } = {
    create: (params) => {
      const id = this.nextId('pi');
      const cardResult = this.determineStatusFromCard(params.payment_method);
      const isManual = params.capture_method === 'manual';
      const amount = params.amount ?? 2000;

      const pi = this.defaultPi(id, {
        amount,
        amount_capturable: isManual ? amount : 0,
        amount_received: cardResult.status === 'succeeded' ? amount : 0,
        currency: params.currency ?? 'usd',
        status: cardResult.status,
        customer: params.customer ?? null,
        payment_method: params.payment_method ?? null,
        description: params.description ?? null,
        capture_method: params.capture_method ?? 'automatic',
        payment_method_types: params.payment_method_types ?? ['card'],
        return_url: params.return_url ?? null,
        metadata: params.metadata ?? {},
        next_action: cardResult.nextAction ?? null,
        last_payment_error: cardResult.lastPaymentError ?? null,
      });

      this.paymentIntentsStore.set(id, pi);
      return Promise.resolve(pi);
    },

    confirm: (id, params) => {
      const existing = this.paymentIntentsStore.get(id) ?? this.defaultPi(id);
      const cardResult = this.determineStatusFromCard(
        params?.payment_method ?? existing.payment_method ?? undefined,
      );
      const pi: SandboxPaymentIntent = {
        ...existing,
        status: cardResult.status,
        payment_method: params?.payment_method ?? existing.payment_method ?? null,
        client_secret: `${id}_secret_sandbox`,
        next_action: cardResult.nextAction ?? null,
        last_payment_error: cardResult.lastPaymentError ?? null,
        return_url: params?.return_url ?? null,
      };
      this.paymentIntentsStore.set(id, pi);
      return Promise.resolve(pi);
    },

    capture: (id, params) => {
      const existing = this.paymentIntentsStore.get(id) ?? this.defaultPi(id);
      const amountToCapture = params?.amount_to_capture ?? existing.amount;
      const pi: SandboxPaymentIntent = {
        ...existing,
        status: 'succeeded',
        amount_capturable: 0,
        amount_received: amountToCapture,
      };
      this.paymentIntentsStore.set(id, pi);
      return Promise.resolve(pi);
    },

    cancel: (id, params) => {
      const existing = this.paymentIntentsStore.get(id) ?? this.defaultPi(id);
      const pi: SandboxPaymentIntent = {
        ...existing,
        status: 'canceled',
        canceled_at: this.now(),
        cancellation_reason: params?.cancellation_reason ?? null,
      };
      this.paymentIntentsStore.set(id, pi);
      return Promise.resolve(pi);
    },

    retrieve: (id) => {
      const existing = this.paymentIntentsStore.get(id);
      if (existing) return Promise.resolve(existing);
      return Promise.resolve(
        this.defaultPi(id, {
          status: 'succeeded',
          amount_received: 2000,
          created: this.now() - 3600,
        }),
      );
    },

    list: (params) => {
      const intents = Array.from(this.paymentIntentsStore.values());
      const filtered = params?.customer
        ? intents.filter((pi) => pi.customer === params.customer)
        : intents;
      return Promise.resolve({
        object: 'list' as const,
        data: filtered.slice(0, params?.limit ?? 10),
        has_more: false,
        url: '/v1/payment_intents',
      });
    },
  };

  refunds: {
    create(params: {
      payment_intent: string;
      amount?: number;
      reason?: string;
      metadata?: Record<string, string>;
    }): Promise<SandboxRefund>;
    list(params?: { payment_intent?: string }): Promise<SandboxListResponse<SandboxRefund>>;
    cancel(refundId: string): Promise<SandboxRefund>;
  } = {
    create: (params) => {
      const id = this.nextId('re');
      const refund: SandboxRefund = {
        id,
        object: 'refund',
        amount: params.amount ?? 2000,
        currency: 'usd',
        status: 'succeeded',
        payment_intent: params.payment_intent,
        reason: params.reason ?? null,
        metadata: params.metadata ?? {},
        created: this.now(),
        livemode: false,
      };
      this.refundsStore.set(id, refund);
      return Promise.resolve(refund);
    },

    list: (params) => {
      const refunds = Array.from(this.refundsStore.values());
      const filtered = params?.payment_intent
        ? refunds.filter((r) => r.payment_intent === params.payment_intent)
        : refunds;
      return Promise.resolve({
        object: 'list' as const,
        data: filtered,
        has_more: false,
        url: '/v1/refunds',
      });
    },

    cancel: (refundId) => {
      const existing = this.refundsStore.get(refundId);
      if (existing) {
        const refund: SandboxRefund = { ...existing, status: 'canceled' };
        this.refundsStore.set(refundId, refund);
        return Promise.resolve(refund);
      }
      const refund: SandboxRefund = {
        id: refundId,
        object: 'refund',
        amount: 2000,
        currency: 'usd',
        status: 'canceled',
        payment_intent: 'pi_sandbox_unknown',
        reason: null,
        metadata: {},
        created: this.now() - 3600,
        livemode: false,
      };
      this.refundsStore.set(refundId, refund);
      return Promise.resolve(refund);
    },
  };

  paymentMethods: {
    list(params: {
      customer?: string;
      type?: string;
      limit?: number;
    }): Promise<SandboxListResponse<SandboxPaymentMethod>>;
    attach(pmId: string, params: { customer?: string }): Promise<SandboxPaymentMethod>;
    detach(pmId: string): Promise<SandboxPaymentMethod>;
  } = {
    list: (params) => {
      const pms = Array.from(this.paymentMethodsStore.values());
      const filtered = params?.customer ? pms.filter((pm) => pm.customer === params.customer) : pms;
      return Promise.resolve({
        object: 'list' as const,
        data: filtered.slice(0, params?.limit ?? 10),
        has_more: false,
        url: '/v1/payment_methods',
      });
    },

    attach: (pmId, params) => {
      const pm: SandboxPaymentMethod = {
        id: pmId,
        object: 'payment_method',
        type: 'card',
        customer: params.customer ?? null,
        billing_details: { name: 'Sandbox User', email: 'sandbox@example.com', phone: null },
        card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2034, wallet: null },
        ideal: null,
        sepa_debit: null,
        us_bank_account: null,
        metadata: {},
        created: this.now(),
        livemode: false,
      };
      this.paymentMethodsStore.set(pmId, pm);
      return Promise.resolve(pm);
    },

    detach: (pmId) => {
      const existing = this.paymentMethodsStore.get(pmId);
      if (existing) {
        const pm: SandboxPaymentMethod = { ...existing, customer: null };
        this.paymentMethodsStore.set(pmId, pm);
        return Promise.resolve(pm);
      }
      const pm: SandboxPaymentMethod = {
        id: pmId,
        object: 'payment_method',
        type: 'card',
        customer: null,
        billing_details: { name: null, email: null, phone: null },
        card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2034, wallet: null },
        ideal: null,
        sepa_debit: null,
        us_bank_account: null,
        metadata: {},
        created: this.now() - 7200,
        livemode: false,
      };
      this.paymentMethodsStore.set(pmId, pm);
      return Promise.resolve(pm);
    },
  };

  customers: {
    create(params: {
      email?: string;
      name?: string;
      phone?: string;
      metadata?: Record<string, string>;
    }): Promise<SandboxCustomer>;
    retrieve(id: string): Promise<SandboxCustomer>;
  } = {
    create: (params) => {
      const id = this.nextId('cus');
      const customer: SandboxCustomer = {
        id,
        object: 'customer',
        email: params.email ?? 'sandbox@example.com',
        name: params.name ?? 'Sandbox Customer',
        phone: params.phone ?? null,
        metadata: params.metadata ?? {},
        created: this.now(),
        livemode: false,
        balance: 0,
        currency: null,
        default_source: null,
        delinquent: false,
        description: null,
        invoice_prefix: 'SANDBOX',
      };
      this.customersStore.set(id, customer);
      return Promise.resolve(customer);
    },

    retrieve: (id) => {
      const existing = this.customersStore.get(id);
      if (existing) return Promise.resolve(existing);
      return Promise.resolve({
        id,
        object: 'customer',
        email: 'sandbox@example.com',
        name: 'Sandbox Customer',
        phone: null,
        metadata: {},
        created: this.now() - 86400,
        livemode: false,
        balance: 0,
        currency: null,
        default_source: null,
        delinquent: false,
        description: null,
        invoice_prefix: 'SANDBOX',
      });
    },
  };

  subscriptions: {
    create(params: {
      customer?: string;
      items?: Array<{ price?: string; quantity?: number }>;
      trial_period_days?: number;
      metadata?: Record<string, string>;
    }): Promise<SandboxSubscription>;
    cancel(id: string): Promise<SandboxSubscription>;
    update(
      id: string,
      params: {
        items?: Array<{ price?: string; quantity?: number }>;
        metadata?: Record<string, string>;
        trial_end?: number | 'now';
      },
    ): Promise<SandboxSubscription>;
    retrieve(id: string): Promise<SandboxSubscription>;
    list(params?: { customer?: string }): Promise<SandboxListResponse<SandboxSubscription>>;
  } = {
    create: (params) => {
      const id = this.nextId('sub');
      const now = this.now();
      const sub: SandboxSubscription = {
        id,
        object: 'subscription',
        customer: params.customer ?? 'cus_sandbox_default',
        status: 'active',
        items: {
          object: 'list',
          data: [
            {
              id: this.nextId('si'),
              object: 'subscription_item',
              price: {
                id: params.items?.[0]?.price ?? 'price_sandbox_default_monthly',
                object: 'price',
                product: 'prod_sandbox_default',
                unit_amount: 999,
                currency: 'usd',
                recurring: { interval: 'month', interval_count: 1 },
              },
              quantity: 1,
              created: now,
            },
          ],
        },
        cancel_at_period_end: false,
        trial_end: params.trial_period_days ? now + params.trial_period_days * 86400 : null,
        current_period_start: now,
        current_period_end: now + 2592000,
        latest_invoice: {
          id: this.nextId('in'),
          payment_intent: {
            id: this.nextId('pi'),
            client_secret: `${this.nextId('pi')}_secret_sandbox`,
            status: 'succeeded',
          },
        },
        metadata: params.metadata ?? {},
        created: now,
        livemode: false,
      };
      this.subscriptionsStore.set(id, sub);
      return Promise.resolve(sub);
    },

    cancel: (id) => {
      const existing = this.subscriptionsStore.get(id);
      if (existing) {
        const sub: SandboxSubscription = {
          ...existing,
          status: 'canceled',
          canceled_at: this.now(),
          cancel_at_period_end: false,
        };
        this.subscriptionsStore.set(id, sub);
        return Promise.resolve(sub);
      }
      const sub: SandboxSubscription = {
        id,
        object: 'subscription',
        customer: 'cus_sandbox_default',
        status: 'canceled',
        items: { object: 'list', data: [] },
        cancel_at_period_end: false,
        trial_end: null,
        current_period_start: this.now() - 86400,
        current_period_end: this.now() + 2505600,
        metadata: {},
        created: this.now() - 86400,
        livemode: false,
        canceled_at: this.now(),
      };
      this.subscriptionsStore.set(id, sub);
      return Promise.resolve(sub);
    },

    update: (id, params) => {
      const existing = this.subscriptionsStore.get(id);
      if (!existing) {
        return Promise.resolve({
          id,
          object: 'subscription',
          customer: 'cus_sandbox_default',
          status: 'active',
          items: { object: 'list', data: [] },
          cancel_at_period_end: false,
          trial_end: null,
          current_period_start: this.now() - 86400,
          current_period_end: this.now() + 2505600,
          metadata: params.metadata ?? {},
          created: this.now() - 86400,
          livemode: false,
        });
      }

      const items = params.items
        ? {
            object: 'list' as const,
            data: params.items.map((item) => ({
              id: this.nextId('si'),
              object: 'subscription_item' as const,
              price: {
                id: item.price ?? 'price_sandbox_default_monthly',
                object: 'price' as const,
                product: 'prod_sandbox_default',
                unit_amount: 999,
                currency: 'usd',
                recurring: { interval: 'month' as const, interval_count: 1 },
              },
              quantity: item.quantity ?? 1,
              created: this.now(),
            })),
          }
        : existing.items;

      const sub: SandboxSubscription = {
        ...existing,
        metadata: params.metadata ?? existing.metadata,
        items,
        trial_end:
          params.trial_end === 'now' ? this.now() : (params.trial_end ?? existing.trial_end),
      };
      this.subscriptionsStore.set(id, sub);
      return Promise.resolve(sub);
    },

    retrieve: (id) => {
      const existing = this.subscriptionsStore.get(id);
      if (existing) return Promise.resolve(existing);
      return Promise.resolve({
        id,
        object: 'subscription',
        customer: 'cus_sandbox_default',
        status: 'active',
        items: {
          object: 'list',
          data: [
            {
              id: this.nextId('si'),
              object: 'subscription_item',
              price: {
                id: 'price_sandbox_default_monthly',
                object: 'price',
                product: 'prod_sandbox_default',
                unit_amount: 999,
                currency: 'usd',
                recurring: { interval: 'month' },
              },
              quantity: 1,
              created: this.now(),
            },
          ],
        },
        cancel_at_period_end: false,
        trial_end: null,
        current_period_start: this.now() - 86400,
        current_period_end: this.now() + 2505600,
        metadata: {},
        created: this.now() - 86400,
        livemode: false,
      });
    },

    list: (params) => {
      const subs = Array.from(this.subscriptionsStore.values());
      const filtered = params?.customer ? subs.filter((s) => s.customer === params.customer) : subs;
      return Promise.resolve({
        object: 'list' as const,
        data: filtered,
        has_more: false,
        url: '/v1/subscriptions',
      });
    },
  };

  checkout: {
    sessions: {
      create(params: {
        customer?: string;
        mode?: string;
        success_url: string;
        cancel_url: string;
        line_items?: unknown[];
        metadata?: Record<string, string>;
        currency?: string;
        allow_promotion_codes?: boolean;
      }): Promise<SandboxCheckoutSession>;
    };
  } = {
    sessions: {
      create: (params) =>
        Promise.resolve({
          id: this.nextId('cs'),
          object: 'checkout.session',
          url: 'https://checkout.stripe.com/c/sandbox_test',
          customer: params.customer ?? null,
          mode: params.mode ?? 'subscription',
          success_url: params.success_url,
          cancel_url: params.cancel_url,
          line_items: params.line_items ?? [],
          metadata: params.metadata ?? {},
          payment_status: 'unpaid',
          status: 'open',
          currency: params.currency ?? 'usd',
          created: this.now(),
          livemode: false,
          allow_promotion_codes: params.allow_promotion_codes ?? false,
        }),
    },
  };

  billingPortal: {
    sessions: {
      create(params: {
        customer: string;
        return_url: string;
      }): Promise<SandboxBillingPortalSession>;
    };
  } = {
    sessions: {
      create: (params) =>
        Promise.resolve({
          id: this.nextId('bps'),
          object: 'billing_portal.session',
          url: 'https://billing.stripe.com/p/sandbox_test',
          customer: params.customer,
          return_url: params.return_url,
          created: this.now(),
          livemode: false,
        }),
    },
  };

  invoices: {
    list(params?: {
      customer?: string;
      limit?: number;
    }): Promise<SandboxListResponse<SandboxInvoice>>;
  } = {
    list: (params) => {
      const customer = params?.customer;
      if (!customer) {
        return Promise.resolve({
          object: 'list' as const,
          data: [this.defaultInvoice()],
          has_more: false,
          url: '/v1/invoices',
        });
      }
      const invoicePis = Array.from(this.paymentIntentsStore.values()).filter(
        (inv) => inv.customer === customer,
      );
      if (invoicePis.length === 0) {
        return Promise.resolve({
          object: 'list' as const,
          data: [this.defaultInvoice(customer)],
          has_more: false,
          url: '/v1/invoices',
        });
      }
      return Promise.resolve({
        object: 'list' as const,
        data: invoicePis.slice(0, params?.limit ?? 10).map((i) => ({
          id: i.id,
          object: 'invoice' as const,
          number: `SANDBOX-${i.id.slice(-4)}`,
          amount_paid: i.amount,
          amount_due: i.amount,
          currency: i.currency,
          status: 'paid' as const,
          customer: i.customer ?? '',
          invoice_pdf: null,
          status_transitions: { paid_at: this.now() - 3600 },
          lines: {
            object: 'list' as const,
            data: [
              {
                id: this.nextId('il'),
                description: 'Sandbox Payment',
                amount: i.amount,
                quantity: 1,
                period: { start: this.now() - 2592000, end: this.now() },
              },
            ],
          },
          created: i.created,
          livemode: false,
        })),
        has_more: false,
        url: '/v1/invoices',
      });
    },
  };

  private defaultInvoice(customer?: string): SandboxInvoice {
    return {
      id: this.nextId('in'),
      object: 'invoice',
      number: 'SANDBOX-0001',
      amount_paid: 999,
      amount_due: 999,
      currency: 'usd',
      status: 'paid',
      customer: customer ?? 'cus_sandbox_default',
      invoice_pdf: null,
      status_transitions: { paid_at: this.now() - 3600 },
      lines: {
        object: 'list',
        data: [
          {
            id: this.nextId('il'),
            description: 'Sandbox Subscription',
            amount: 999,
            quantity: 1,
            period: { start: this.now() - 2592000, end: this.now() },
          },
        ],
      },
      created: this.now() - 86400,
      livemode: false,
    };
  }

  webhooks: {
    constructEvent(payload: Buffer | string, signature: string, secret: string): SandboxEvent;
  } = {
    constructEvent: (): SandboxEvent => ({
      id: `evt_sandbox_${this.now()}`,
      object: 'event',
      type: 'payment_intent.succeeded',
      created: this.now(),
      data: {
        object: {
          id: this.nextId('pi'),
          object: 'payment_intent',
          amount: 2000,
          currency: 'usd',
          status: 'succeeded',
        },
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    }),
  };

  products: {
    list(params?: {
      active?: boolean;
      expand?: string[];
    }): Promise<SandboxListResponse<SandboxProduct>>;
  } = {
    list: (params) => {
      let products: SandboxProduct[] = this.productsStore;
      if (params?.active !== undefined) {
        products = products.filter((p) => p.active === params.active);
      }
      const data: SandboxProduct[] = products.map((p) => ({
        ...p,
        default_price:
          params?.expand?.includes('data.default_price') && typeof p.default_price === 'string'
            ? ((this.pricesStore.find((pr) => pr.id === p.default_price) as
                Record<string, unknown> | undefined) ?? p.default_price)
            : p.default_price,
      }));
      return Promise.resolve({
        object: 'list' as const,
        data,
        has_more: false,
        url: '/v1/products',
      });
    },
  };

  prices: {
    list(params?: {
      product?: string;
      active?: boolean;
    }): Promise<SandboxListResponse<SandboxPrice>>;
  } = {
    list: (params) => {
      let prices: SandboxPrice[] = this.pricesStore;
      if (params?.product) prices = prices.filter((p) => p.product === params.product);
      if (params?.active !== undefined) prices = prices.filter((p) => p.active === params.active);
      return Promise.resolve({
        object: 'list' as const,
        data: prices,
        has_more: false,
        url: '/v1/prices',
      });
    },
  };
}
