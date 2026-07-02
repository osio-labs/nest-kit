# @os.io/nest-kit/infra/stripe

> Stripe payment processing for NestJS — payment intents, refunds, payment methods, customers, subscriptions, checkout, webhooks, products/prices, sandbox mode, REST controller, and optional ACID transaction store.

```typescript
import { StripeModule } from '@os.io/nest-kit/infra/stripe';

@Module({
  imports: [StripeModule.forRoot({ apiKey: process.env.STRIPE_SECRET_KEY })],
})
export class AppModule {}
```

## Installation

```bash
npm install @os.io/nest-kit stripe
```

`stripe` is an **optional peer dependency** — safe to import without it; errors are thrown only on use.

---

## Quick Start

```typescript
import { StripeModule, StripeService } from '@os.io/nest-kit/infra/stripe';

@Module({
  imports: [
    StripeModule.forRoot({
      apiKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    }),
  ],
})
export class PaymentModule {}

@Injectable()
export class PaymentService {
  constructor(private readonly stripe: StripeService) {}

  async charge(amount: number, currency: string) {
    return this.stripe.paymentIntents.create({ amount, currency });
  }
}
```

---

## Payment Lifecycle & Flows

### Payment Intent State Machine

```
                        ┌───────────────────────────────────┐
                        │    requires_payment_method         │
                        │    (initial state)                 │
                        └──────────┬────────────────────────┘
                                   │
                      ┌────────────┼────────────┐
                      ▼            ▼            ▼
             ┌──────────────┐ ┌──────────┐ ┌──────────┐
             │   canceled   │ │requires_ │ │requires_ │
             │ (terminal)   │ │confirma- │ │ action   │
             │              │ │tion      │ │          │
             └──────────────┘ └────┬──────┘ └────┬─────┘
                                   │             │
                           ┌───────┘      ┌──────┘
                           ▼              ▼
                     ┌──────────┐  ┌──────────┐
                     │ succeeded│  │processing│
                     │(terminal)│  └─────┬────┘
                     └──────────┘        │
                                  ┌──────┘
                                  ▼
                            ┌──────────┐
                            │  failed  │
                            │(terminal)│
                            └──────────┘
```

Terminal states: `succeeded`, `failed`, `canceled` — no further transitions allowed.

### Standard One-Time Payment

```
Client                     Your Server                 Stripe
  │                           │                        │
  │  1. Request checkout      │                        │
  │──────────────────────────►│                        │
  │                           │  2. createPaymentIntent │
  │                           │───────────────────────►│
  │                           │◄───────────────────────│
  │  3. Return clientSecret   │                        │
  │◄──────────────────────────│                        │
  │                           │                        │
  │  4. Confirm via Stripe.js │                        │
  │──────────────────────────────────────────────────►│
  │                           │                        │
  │                           │  5. Webhook:           │
  │                           │  payment_intent.       │
  │                           │  succeeded             │
  │                           │◄───────────────────────│
```

### Two-Phase (Manual Capture)

```
Client                     Your Server                 Stripe
  │                           │                        │
  │  1. Authorize payment     │                        │
  │──────────────────────────►│                        │
  │                           │  2. createPaymentIntent│
  │                           │     (captureMethod:    │
  │                           │      'manual')         │
  │                           │───────────────────────►│
  │                           │◄───────────────────────│
  │◄──────────────────────────│                        │
  │                           │                        │
  │  3. Ship goods            │                        │
  │  4. Capture               │                        │
  │──────────────────────────►│  5. capturePaymentIntent│
  │                           │───────────────────────►│
  │◄──────────────────────────│◄───────────────────────│
```

### Checkout Session (Hosted Page)

```
Client (Browser)             Your Server                 Stripe
  │                           │                        │
  │  1. Request checkout      │                        │
  │──────────────────────────►│                        │
  │                           │  2. createCheckout     │
  │                           │     Session            │
  │                           │───────────────────────►│
  │                           │◄───────────────────────│
  │  3. Redirect to session   │                        │
  │◄──────────────────────────│                        │
  │  4. Customer pays on      │                        │
  │     Stripe hosted page    │                        │
  │──────────────────────────────────────────────────►│
  │  5. Redirect to           │                        │
  │     successUrl            │                        │
  │◄──────────────────────────────────────────────────│
  │                           │  6. Webhook:           │
  │                           │  checkout.session.     │
  │                           │  completed             │
  │                           │◄───────────────────────│
```

### Save Card & Charge Later

```
Client                     Your Server                 Stripe
  │                           │                        │
  │  1. Create customer       │                        │
  │──────────────────────────►│  2. createCustomer      │
  │                           │───────────────────────►│
  │◄──────────────────────────│◄───────────────────────│
  │  3. Collect card via      │                        │
  │     Stripe.js             │                        │
  │──────────────────────────────────────────────────►│
  │  4. Attach payment method │                        │
  │──────────────────────────►│───────────────────────►│
  │  5. Charge later          │  6. createPaymentIntent│
  │──────────────────────────►│  (customer + saved PM) │
  │                           │───────────────────────►│
  │◄──────────────────────────│◄───────────────────────│
```

### Subscription Lifecycle

```
Client                     Your Server                 Stripe
  │                           │                        │
  │  1. Subscribe             │                        │
  │──────────────────────────►│  2. createSubscription  │
  │                           │───────────────────────►│
  │◄──────────────────────────│◄───────────────────────│
  │                           │  3. Webhook:           │
  │                           │  invoice.payment_      │
  │                           │  succeeded (recurring) │
  │                           │◄───────────────────────│
  │  4. Upgrade / downgrade   │  5. updateSubscription  │
  │──────────────────────────►│───────────────────────►│
  │◄──────────────────────────│◄───────────────────────│
  │  6. Cancel at period end  │  7. cancelSubscription  │
  │──────────────────────────►│───────────────────────►│
```

---

## Configuration

### Synchronous

```typescript
StripeModule.forRoot({
  apiKey: 'sk_test_...',
  webhookSecret: 'whsec_...',
  defaultCurrency: 'usd',
  metadata: { app: 'my-app', env: 'production' },
  idempotencyTtl: 3_600_000,
  sandbox: false,
  PaymentStore: MyPaymentStore,
  webhookHandlers: [{ event: 'payment_intent.succeeded', handler: fn }],
});
```

### Async (from ConfigService)

```typescript
StripeModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    apiKey: config.get('stripe.secretKey'),
    webhookSecret: config.get('stripe.webhookSecret'),
  }),
});
```

---

## Payment Intents

```typescript
// Create
const intent = await this.stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  paymentMethod: 'pm_card_visa',
  confirm: true,
});

// Confirm
await this.stripe.paymentIntents.confirm(intent.id, {
  paymentMethod: 'pm_card_visa',
});

// Capture (manual)
await this.stripe.paymentIntents.capture(intent.id, {
  amountToCapture: 1000,
});

// Cancel
await this.stripe.paymentIntents.cancel(intent.id);

// Retrieve / List / Update
await this.stripe.paymentIntents.retrieve('pi_xxx');
await this.stripe.paymentIntents.list(5);
await this.stripe.paymentIntents.update('pi_xxx', { description: 'Updated' });
```

**Multi-currency:** Pass `currency` in any method — overrides `defaultCurrency`.

**Idempotency:** Auto-generated keys with configurable TTL. Pass a custom `idempotencyKey` to override.

---

## Refunds

```typescript
// Full refund
await this.stripe.refunds.create({ paymentIntent: 'pi_xxx' });

// Partial refund
await this.stripe.refunds.create({
  paymentIntent: 'pi_xxx',
  amount: 500,
  reason: 'requested_by_customer',
});

// List / Cancel
await this.stripe.refunds.list();
await this.stripe.refunds.cancel('ref_xxx');
```

---

## Payment Methods

List, attach, and detach payment methods for a customer (56+ payment method types):

```typescript
// List customer's cards
const methods = await this.stripe.paymentMethods.list('cus_xxx', 'card');

// Attach
await this.stripe.paymentMethods.attach({
  paymentMethod: 'pm_xxx',
  customer: 'cus_xxx',
});

// Detach
await this.stripe.paymentMethods.detach('pm_xxx');
```

---

## Customers

```typescript
// Create
const customer = await this.stripe.customers.create({
  email: 'alice@example.com',
  name: 'Alice',
  paymentMethod: 'pm_card_visa',
});

// Retrieve
const customer = await this.stripe.customers.retrieve('cus_xxx');
```

---

## Subscriptions

```typescript
// Create with trial
const sub = await this.stripe.subscriptions.create({
  customer: 'cus_xxx',
  items: [{ price: 'price_monthly_10' }],
  trialPeriodDays: 14,
});

// Update
await this.stripe.subscriptions.update(sub.id, {
  items: [{ price: 'price_monthly_20' }],
});

// Cancel (at period end) / Cancel immediately
await this.stripe.subscriptions.cancel(sub.id);
await this.stripe.subscriptions.cancel(sub.id, { cancelAtPeriodEnd: false });

// Retrieve / List
await this.stripe.subscriptions.retrieve(sub.id);
await this.stripe.subscriptions.list();
```

---

## Checkout Sessions

```typescript
const session = await this.stripe.checkout.create({
  mode: 'payment',
  lineItems: [{ price: 'price_xxx', quantity: 2 }],
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  allowPromotionCodes: true,
});

// Redirect to session.url
```

---

## Billing Portal

```typescript
const portal = await this.stripe.billingPortal.create({
  customer: 'cus_xxx',
  returnUrl: 'https://example.com/account',
});

// Redirect to portal.url
```

---

## Webhooks

### Manual controller

```typescript
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly stripe: StripeService) {}

  @Post('stripe')
  handle(@Req() req: any, @Headers('stripe-signature') sig: string) {
    const event = this.stripe.webhooks.constructEvent(req.rawBody, sig);

    switch (event.type) {
      case 'payment_intent.succeeded':
        // handle
        break;
      case 'payment_intent.payment_failed':
        // handle
        break;
    }
  }
}
```

### Via handler registration

```typescript
StripeModule.forRoot({
  apiKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  webhookHandlers: [
    {
      event: 'payment_intent.succeeded',
      handler: async (event) => {
        /* fulfill order */
      },
    },
    {
      event: 'payment_intent.payment_failed',
      handler: async (event) => {
        /* notify customer */
      },
    },
    {
      event: 'checkout.session.completed',
      handler: async (event) => {
        /* grant access */
      },
    },
  ],
});
```

### Typed payload

```typescript
const payload = this.stripe.webhooks.toPayload<Stripe.PaymentIntent>(event);
// payload.type → string
// payload.data → Stripe.PaymentIntent (typed)
```

---

## Products & Prices

```typescript
// List products
const products = await this.stripe.products.listProducts({ active: true });

// List prices for a product
const prices = await this.stripe.products.listPrices({ product: 'prod_xxx' });

// Retrieve individual
const product = await this.stripe.products.retrieveProduct('prod_xxx');
const price = await this.stripe.products.retrievePrice('price_xxx');
```

---

## Invoices

```typescript
const invoices = await this.stripe.getInvoices('cus_xxx', 10);
// Returns: InvoiceResult[]
```

---

## REST Controller

When the module is registered (non-sandbox), a `StripeController` is auto-registered at `/stripe`:

| Endpoint                                    | Description                   |
| ------------------------------------------- | ----------------------------- |
| `POST /stripe/payment-intents`              | Create payment intent         |
| `POST /stripe/payment-intents/:id/confirm`  | Confirm                       |
| `POST /stripe/payment-intents/:id/capture`  | Capture (manual)              |
| `POST /stripe/payment-intents/:id/cancel`   | Cancel                        |
| `GET /stripe/payment-intents/:id`           | Retrieve by ID                |
| `GET /stripe/payment-intents`               | List                          |
| `POST /stripe/refunds`                      | Create refund                 |
| `GET /stripe/refunds`                       | List refunds                  |
| `POST /stripe/refunds/:id/cancel`           | Cancel refund                 |
| `GET /stripe/customers/:id/payment-methods` | List payment methods          |
| `POST /stripe/payment-methods/:id/attach`   | Attach payment method         |
| `POST /stripe/payment-methods/:id/detach`   | Detach payment method         |
| `POST /stripe/customers`                    | Create customer               |
| `GET /stripe/customers/:id`                 | Get customer                  |
| `POST /stripe/subscriptions`                | Create subscription           |
| `GET /stripe/subscriptions/:id`             | Get subscription              |
| `POST /stripe/subscriptions/:id/cancel`     | Cancel subscription           |
| `PATCH /stripe/subscriptions/:id`           | Update subscription           |
| `POST /stripe/checkout`                     | Create checkout session       |
| `POST /stripe/billing-portal`               | Create billing portal session |
| `GET /stripe/products`                      | List products                 |
| `GET /stripe/prices`                        | List prices                   |
| `POST /stripe/webhook`                      | Receive webhook events        |

---

## Sandbox Mode

Enable sandbox for development, CI, and integration tests:

```typescript
StripeModule.forRoot({ apiKey: 'sk_test_...', sandbox: true });
```

All service methods work identically with in-memory mock data. Test card numbers control simulated outcomes:

| Card Number        | Outcome               |
| ------------------ | --------------------- |
| `4242424242424242` | ✅ Success            |
| `4000002500003155` | 🔐 3D Secure req      |
| `4000000000000002` | ❌ Generic decline    |
| `4000000000009995` | 💰 Insufficient funds |
| `4000000000004954` | 🚫 Lost/stolen card   |
| `4000000000000069` | 📅 Expired card       |
| `4000000000000127` | 🔢 Incorrect CVC      |
| `4000000000000119` | ⚠️ Processing error   |

```typescript
const intent = await this.stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  paymentMethod: 'pm_4000000000000002',
  confirm: true,
});
// intent.status === 'failed'
```

Use the sandbox client directly:

```typescript
import { StripeSandboxClient } from '@os.io/nest-kit/infra/stripe';
const sandbox = new StripeSandboxClient();
const pi = await sandbox.paymentIntents.create({ amount: 1000, currency: 'usd' });
// pi.id === 'pi_sandbox_1'
```

---

## ACID Transaction Store

Extend `PaymentStore` to persist payment lifecycle to any database:

```typescript
import { PaymentStore, PaymentIntentRecord, RefundRecord } from '@os.io/nest-kit/infra/stripe';

class MyPaymentStore extends PaymentStore {
  async createPaymentIntent(data: Omit<PaymentIntentRecord, 'createdAt' | 'updatedAt'>) {
    // INSERT into database
  }
  async updatePaymentIntentStatus(stripeId: string, status: string) {
    // UPDATE status WHERE stripe_id = stripeId
  }
  async getPaymentIntent(stripeId: string) {
    // SELECT ... WHERE stripe_id = stripeId
  }
  async listPaymentIntents(customerId?: string) {
    // SELECT ... WHERE ...
  }
  async createRefund(data: Omit<RefundRecord, 'createdAt' | 'updatedAt'>) {
    // INSERT into database
  }
  async updateRefundStatus(stripeId: string, status: string) {
    // UPDATE status
  }
  async getRefund(stripeId: string) {
    // SELECT
  }
  async listRefunds(paymentIntentId?: string) {
    // SELECT
  }
  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    // Distributed lock for webhook deduplication
  }
  async releaseLock(key: string): Promise<void> {
    // Release lock
  }
}

StripeModule.forRoot({
  apiKey: process.env.STRIPE_SECRET_KEY,
  PaymentStore: MyPaymentStore,
});
```

When the store is active, `assertValidTransition()` is called before every mutation and the state machine enforces legal status transitions.

---

## API

### `StripeModule`

| Method                  | Description                    |
| ----------------------- | ------------------------------ |
| `forRoot(options)`      | Configure synchronously        |
| `forRootAsync(options)` | Configure async via useFactory |

### `StripeModuleOptions`

| Option            | Type                            | Default   | Description                       |
| ----------------- | ------------------------------- | --------- | --------------------------------- |
| `apiKey`          | `string`                        | —         | Stripe secret key                 |
| `webhookSecret`   | `string`                        | —         | Webhook signing secret            |
| `defaultCurrency` | `string`                        | `'usd'`   | Default currency                  |
| `metadata`        | `Record<string, string>`        | —         | Static metadata on every object   |
| `idempotencyTtl`  | `number`                        | `3600000` | Idempotency key TTL (ms)          |
| `PaymentStore`    | `new (...args) => PaymentStore` | —         | Optional persistence class        |
| `sandbox`         | `boolean`                       | —         | Enable sandbox mode (mock client) |
| `webhookHandlers` | `StripeWebhookHandler[]`        | —         | Webhook event handlers            |

### `StripeService`

| Property         | Type                    | Description                  |
| ---------------- | ----------------------- | ---------------------------- |
| `paymentIntents` | `PaymentIntentsService` | Payment Intents API          |
| `refunds`        | `RefundsService`        | Refunds API                  |
| `paymentMethods` | `PaymentMethodsService` | Payment Methods API          |
| `customers`      | `CustomersService`      | Customers API                |
| `subscriptions`  | `SubscriptionsService`  | Subscriptions API            |
| `checkout`       | `CheckoutService`       | Checkout Sessions API        |
| `billingPortal`  | `BillingPortalService`  | Billing Portal API           |
| `webhooks`       | `WebhooksService`       | Webhooks API                 |
| `products`       | `ProductsService`       | Products & Prices API        |
| `getInvoices()`  | method                  | List invoices for a customer |

### `PaymentIntentsService`

| Method                        | Returns                           | Description             |
| ----------------------------- | --------------------------------- | ----------------------- |
| `create(options)`             | `Promise<Stripe.PaymentIntent>`   | Create a payment intent |
| `retrieve(id)`                | `Promise<Stripe.PaymentIntent>`   | Retrieve by ID          |
| `confirm(id, options?)`       | `Promise<Stripe.PaymentIntent>`   | Confirm                 |
| `capture(id, options?)`       | `Promise<Stripe.PaymentIntent>`   | Capture (manual)        |
| `cancel(id, idempotencyKey?)` | `Promise<Stripe.PaymentIntent>`   | Cancel                  |
| `update(id, options)`         | `Promise<Stripe.PaymentIntent>`   | Update                  |
| `list(limit?)`                | `Promise<Stripe.PaymentIntent[]>` | List                    |

### `RefundsService`

| Method                        | Returns                    | Description            |
| ----------------------------- | -------------------------- | ---------------------- |
| `create(options)`             | `Promise<Stripe.Refund>`   | Full or partial refund |
| `retrieve(id)`                | `Promise<Stripe.Refund>`   | Retrieve by ID         |
| `list(limit?)`                | `Promise<Stripe.Refund[]>` | List refunds           |
| `cancel(id, idempotencyKey?)` | `Promise<Stripe.Refund>`   | Cancel (pending only)  |

### `PaymentMethodsService`

| Method                          | Returns                           | Description           |
| ------------------------------- | --------------------------------- | --------------------- |
| `list(customer, type?, limit?)` | `Promise<Stripe.PaymentMethod[]>` | List customer methods |
| `attach(options)`               | `Promise<Stripe.PaymentMethod>`   | Attach to customer    |
| `detach(paymentMethod)`         | `Promise<Stripe.PaymentMethod>`   | Detach from customer  |

### `CustomersService`

| Method            | Returns                    | Description    |
| ----------------- | -------------------------- | -------------- |
| `create(options)` | `Promise<Stripe.Customer>` | Create         |
| `retrieve(id)`    | `Promise<Stripe.Customer>` | Retrieve by ID |

### `SubscriptionsService`

| Method                 | Returns                          | Description                  |
| ---------------------- | -------------------------------- | ---------------------------- |
| `create(options)`      | `Promise<Stripe.Subscription>`   | Create                       |
| `update(id, options)`  | `Promise<Stripe.Subscription>`   | Update                       |
| `cancel(id, options?)` | `Promise<Stripe.Subscription>`   | Cancel (at end or immediate) |
| `retrieve(id)`         | `Promise<Stripe.Subscription>`   | Retrieve by ID               |
| `list(limit?)`         | `Promise<Stripe.Subscription[]>` | List                         |

### `CheckoutService`

| Method            | Returns                            | Description        |
| ----------------- | ---------------------------------- | ------------------ |
| `create(options)` | `Promise<Stripe.Checkout.Session>` | Create hosted page |
| `retrieve(id)`    | `Promise<Stripe.Checkout.Session>` | Retrieve by ID     |

### `BillingPortalService`

| Method            | Returns                                 | Description           |
| ----------------- | --------------------------------------- | --------------------- |
| `create(options)` | `Promise<Stripe.BillingPortal.Session>` | Create portal session |

### `WebhooksService`

| Method                            | Returns                 | Description                          |
| --------------------------------- | ----------------------- | ------------------------------------ |
| `constructEvent(body, sigHeader)` | `Stripe.Event`          | Validate and construct webhook event |
| `toPayload(event)`                | `StripeEventPayload<T>` | Type-safe event payload wrapper      |

### `ProductsService`

| Method                   | Returns                     | Description    |
| ------------------------ | --------------------------- | -------------- |
| `listProducts(options?)` | `Promise<Stripe.Product[]>` | List products  |
| `retrieveProduct(id)`    | `Promise<Stripe.Product>`   | Retrieve by ID |
| `listPrices(options?)`   | `Promise<Stripe.Price[]>`   | List prices    |
| `retrievePrice(id)`      | `Promise<Stripe.Price>`     | Retrieve by ID |

---

## Constants

| Export                          | Description                              |
| ------------------------------- | ---------------------------------------- |
| `STRIPE_MODULE_OPTIONS`         | DI token for module options              |
| `STRIPE_CLIENT`                 | DI token for raw Stripe SDK instance     |
| `PAYMENT_STORE`                 | DI token for PaymentStore implementation |
| `STRIPE_WEBHOOK_HANDLERS`       | DI token for webhook handlers            |
| `VALID_TRANSITIONS`             | State machine transition map             |
| `PAYMENT_INTENT_FINAL_STATUSES` | Terminal statuses array                  |
| `SANDBOX_TEST_CARDS`            | Sandbox test card number constants       |
| `PaymentStore`                  | Abstract persistence class               |

## Exported Types

| Type                           | Description                        |
| ------------------------------ | ---------------------------------- |
| `StripeModuleOptions`          | Module configuration               |
| `CreatePaymentIntentOptions`   | Payment intent creation params     |
| `ConfirmPaymentIntentOptions`  | Payment intent confirmation params |
| `CapturePaymentIntentOptions`  | Payment intent capture params      |
| `UpdatePaymentIntentOptions`   | Payment intent update params       |
| `CreateRefundOptions`          | Refund creation params             |
| `CreateCustomerOptions`        | Customer creation params           |
| `CreateSubscriptionOptions`    | Subscription creation params       |
| `UpdateSubscriptionOptions`    | Subscription update params         |
| `CreateCheckoutSessionOptions` | Checkout session params            |
| `CreateBillingPortalOptions`   | Billing portal params              |
| `AttachPaymentMethodOptions`   | Payment method attach params       |
| `PaymentIntentStatus`          | Status union for state machine     |
| `PaymentIntentRecord`          | Persisted payment intent record    |
| `RefundRecord`                 | Persisted refund record            |
| `StripeEventPayload<T>`        | Typed webhook event payload        |
| `StripeSDK`                    | Stripe SDK type                    |
| `StripeError`                  | Stripe API error type              |
| `RefundStatus`                 | Refund status union                |
| `StripeWebhookHandler`         | Webhook event handler type         |
| `PaymentIntentResult`          | Normalized payment intent result   |
| `RefundResult`                 | Normalized refund result           |
| `PaymentMethodResult`          | Normalized payment method result   |
| `SubscriptionStatus`           | Normalized subscription status     |
| `InvoiceResult`                | Normalized invoice result          |
