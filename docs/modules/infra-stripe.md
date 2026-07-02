# Infra / Stripe

> Stripe payment processing for NestJS — payment intents, refunds, payment methods, customers, subscriptions, checkout, webhooks, products/prices, and optional ACID transaction store.

```
@os.io/nest-kit/infra/stripe
```

---

## Installation

```bash
npm install @os.io/nest-kit stripe
```

`stripe` is an **optional peer dependency** — safe to import without it; errors are thrown only on use.

---

## Quick Start

Register the module globally:

```typescript
import { StripeModule } from '@os.io/nest-kit/infra/stripe';

@Module({
  imports: [
    StripeModule.forRoot({
      apiKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    }),
  ],
})
export class AppModule {}
```

Inject `StripeService` anywhere:

```typescript
import { StripeService } from '@os.io/nest-kit/infra/stripe';

@Injectable()
export class PaymentService {
  constructor(private readonly stripe: StripeService) {}

  async charge(amount: number, currency: string) {
    return this.stripe.paymentIntents.create({ amount, currency });
  }
}
```

---

## Configuration

### Synchronous

```typescript
StripeModule.forRoot({
  apiKey: 'sk_test_...',
  webhookSecret: 'whsec_...', // optional, required for webhooks
  defaultCurrency: 'usd', // optional, defaults to 'usd'
  idempotencyTtl: 3_600_000, // optional, 1 hour default
  PaymentStore: MyPaymentStore, // optional, for ACID persistence
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

Create, confirm, capture, cancel, retrieve, and list payment intents.

```typescript
// Create
const intent = await this.stripe.paymentIntents.create({
  amount: 2000, // $20.00 in cents
  currency: 'usd',
  paymentMethod: 'pm_card_visa',
  confirm: true,
});

// Confirm
await this.stripe.paymentIntents.confirm(intent.id, {
  paymentMethod: 'pm_card_visa',
});

// Capture (manual capture)
await this.stripe.paymentIntents.capture(intent.id, {
  amountToCapture: 1000,
});

// Cancel
await this.stripe.paymentIntents.cancel(intent.id);

// Retrieve
const pi = await this.stripe.paymentIntents.retrieve('pi_xxx');

// List
const intents = await this.stripe.paymentIntents.list(5);

// Update
await this.stripe.paymentIntents.update('pi_xxx', {
  description: 'Updated order #123',
});
```

**Multi-currency:** Pass `currency` in any method — overrides `defaultCurrency`.

**Idempotency:** Auto-generated keys with configurable TTL. Pass a custom `idempotencyKey` to override.

---

## Refunds

Full and partial refunds.

```typescript
// Full refund
await this.stripe.refunds.create({ paymentIntent: 'pi_xxx' });

// Partial refund
await this.stripe.refunds.create({
  paymentIntent: 'pi_xxx',
  amount: 500,
  reason: 'requested_by_customer',
});

// List
const refunds = await this.stripe.refunds.list();

// Cancel (pending refunds only)
await this.stripe.refunds.cancel('ref_xxx');
```

---

## Payment Methods

List, attach, and detach payment methods for a customer.

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

Supports all 56+ Stripe payment method types.

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
// Create
const sub = await this.stripe.subscriptions.create({
  customer: 'cus_xxx',
  items: [{ price: 'price_monthly_10' }],
  trialPeriodDays: 14,
});

// Update
await this.stripe.subscriptions.update(sub.id, {
  items: [{ price: 'price_monthly_20' }],
});

// Cancel (at period end)
await this.stripe.subscriptions.cancel(sub.id);

// Cancel immediately
await this.stripe.subscriptions.cancel(sub.id, { cancelAtPeriodEnd: false });

// List
const subs = await this.stripe.subscriptions.list();
```

---

## Checkout Sessions

Create hosted Stripe Checkout pages.

```typescript
const session = await this.stripe.checkout.create({
  mode: 'payment',
  lineItems: [{ price: 'price_xxx', quantity: 2 }],
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  allowPromotionCodes: true,
});

// Redirect customer to session.url
```

---

## Billing Portal

```typescript
const portal = await this.stripe.billingPortal.create({
  customer: 'cus_xxx',
  returnUrl: 'https://example.com/account',
});

// Redirect customer to portal.url
```

---

## Webhooks

Construct and validate Stripe webhook events.

```typescript
import { Controller, Post, Headers, Req } from '@nestjs/common';
import { StripeService } from '@os.io/nest-kit/infra/stripe';

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

Typed payload helper:

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

// List prices
const prices = await this.stripe.products.listPrices({ product: 'prod_xxx' });

// Retrieve individual
const product = await this.stripe.products.retrieveProduct('prod_xxx');
const price = await this.stripe.products.retrievePrice('price_xxx');
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
             │   canceled   │ │requires_│ │requires_ │
             │ (terminal)   │ │confirma-│ │ action   │
             │              │ │tion     │ │          │
             └──────────────┘ └────┬─────┘ └────┬─────┘
                                   │            │
                           ┌───────┘     ┌──────┘
                           ▼             ▼
                     ┌──────────┐ ┌──────────┐
                     │ succeeded│ │processing│
                     │(terminal)│ └─────┬────┘
                     └──────────┘       │
                                 ┌──────┘
                                 ▼
                           ┌──────────┐
                           │  failed  │
                           │(terminal)│
                           └──────────┘
```

**Key:** `succeeded`, `failed`, and `canceled` are terminal — no further transitions allowed.

### Standard One-Time Payment Flow

```
Client (Frontend)          Your Server                 Stripe
      │                        │                        │
      │  1. Request checkout   │                        │
      │───────────────────────►│                        │
      │                        │  2. createPaymentIntent│
      │                        │───────────────────────►│
      │                        │◄───────────────────────│
      │  3. Return clientSecret│                        │
      │◄───────────────────────│                        │
      │                        │                        │
      │  4. Confirm via        │                        │
      │     Stripe.js          │                        │
      │────────────────────────────────────────────────►│
      │                        │                        │
      │                        │  5. Webhook:           │
      │                        │  payment_intent.       │
      │◄───────────────────────│  succeeded              │
      │                        │◄───────────────────────│
```

### Two-Phase (Manual Capture) Flow

```
Client (Frontend)          Your Server                 Stripe
      │                        │                        │
      │  1. Authorize payment  │                        │
      │───────────────────────►│                        │
      │                        │  2. createPaymentIntent│
      │                        │     (captureMethod:    │
      │                        │      'manual')         │
      │                        │───────────────────────►│
      │                        │◄───────────────────────│
      │◄───────────────────────│                        │
      │                        │                        │
      │  3. Ship goods         │                        │
      │  4. Capture amount     │                        │
      │───────────────────────►│                        │
      │                        │  5. capturePaymentIntent│
      │                        │───────────────────────►│
      │                        │◄───────────────────────│
      │◄───────────────────────│                        │
```

### Save Card & Charge Later Flow

```
Client (Frontend)          Your Server                 Stripe
      │                        │                        │
      │  1. Create customer    │                        │
      │───────────────────────►│                        │
      │                        │  2. createCustomer     │
      │                        │───────────────────────►│
      │                        │◄───────────────────────│
      │◄───────────────────────│                        │
      │                        │                        │
      │  3. Collect card       │                        │
      │     via Stripe.js      │                        │
      │────────────────────────────────────────────────►│
      │                        │                        │
      │  4. Attach payment     │                        │
      │     method to customer │                        │
      │───────────────────────►│───────────────────────►│
      │                        │                        │
      │  5. Charge later       │                        │
      │───────────────────────►│  6. createPaymentIntent│
      │                        │     (customer + saved  │
      │                        │      payment method)   │
      │                        │───────────────────────►│
      │                        │◄───────────────────────│
      │◄───────────────────────│                        │
```

### Subscription Lifecycle Flow

```
Client (Frontend)          Your Server                 Stripe
      │                        │                        │
      │  1. Subscribe          │                        │
      │───────────────────────►│                        │
      │                        │  2. createSubscription │
      │                        │───────────────────────►│
      │                        │◄───────────────────────│
      │◄───────────────────────│                        │
      │                        │                        │
      │                        │  3. Webhook:           │
      │                        │  invoice.payment_      │
      │                        │  succeeded (recurring) │
      │◄───────────────────────│◄───────────────────────│
      │                        │                        │
      │  4. Upgrade/downgrade  │                        │
      │───────────────────────►│  5. updateSubscription │
      │                        │───────────────────────►│
      │◄───────────────────────│◄───────────────────────│
      │                        │                        │
      │  6. Cancel at period   │                        │
      │     end                │                        │
      │───────────────────────►│  7. cancelSubscription │
      │                        │───────────────────────►│
```

### Checkout Session (Hosted Page) Flow

```
Client (Browser)             Your Server                 Stripe
      │                        │                        │
      │  1. Request checkout   │                        │
      │───────────────────────►│                        │
      │                        │  2. createCheckout     │
      │                        │     Session            │
      │                        │───────────────────────►│
      │                        │◄───────────────────────│
      │  3. Redirect to        │                        │
      │     session.url        │                        │
      │◄───────────────────────│                        │
      │                        │                        │
      │  4. Customer pays on   │                        │
      │     Stripe hosted page │                        │
      │────────────────────────────────────────────────►│
      │                        │                        │
      │  5. Redirect to        │                        │
      │     successUrl         │                        │
      │◄────────────────────────────────────────────────│
      │                        │                        │
      │                        │  6. Webhook:           │
      │                        │  checkout.session.     │
      │                        │  completed             │
      │                        │◄───────────────────────│
```

---

## ACID Transaction Store & State Machine

Optionally provide a `PaymentStore` implementation to persist payment lifecycle data to a database:

```typescript
import { PaymentStore, PaymentIntentRecord, RefundRecord } from '@os.io/nest-kit/infra/stripe';

class MyPaymentStore extends PaymentStore {
  async createPaymentIntent(data: Omit<PaymentIntentRecord, 'createdAt' | 'updatedAt'>) {
    // INSERT into your database
  }
  async updatePaymentIntentStatus(stripeId: string, status: string) {
    // UPDATE status WHERE stripe_id = stripeId
  }
  async getPaymentIntent(stripeId: string) {
    // SELECT ... WHERE stripe_id = stripeId
  }
  // ... refund methods
}
```

When a `PaymentStore` is active, the `VALID_TRANSITIONS` state machine enforces legal payment intent status transitions:

```
requires_payment_method
  → requires_confirmation | requires_action | processing | canceled
requires_confirmation
  → requires_action | processing | succeeded | failed | canceled
requires_action
  → processing | succeeded | failed | canceled
processing
  → succeeded | failed | requires_payment_method | canceled
succeeded → (terminal)
failed → (terminal)
canceled → (terminal)
```

Use the state machine directly:

```typescript
import { VALID_TRANSITIONS, assertValidTransition } from '@os.io/nest-kit/infra/stripe';

assertValidTransition('requires_payment_method', 'processing'); // OK
assertValidTransition('succeeded', 'processing'); // throws Error
```

---

## API

### `StripeModule`

| Method                  | Description                    |
| ----------------------- | ------------------------------ |
| `forRoot(options)`      | Configure synchronously        |
| `forRootAsync(options)` | Configure async via useFactory |

---

## REST Controller

When the module is registered (non-sandbox mode), a `StripeController` is automatically registered at `/stripe`:

| Endpoint                                    | Description                     |
| ------------------------------------------- | ------------------------------- |
| `POST /stripe/payment-intents`              | Create payment intent           |
| `POST /stripe/payment-intents/:id/confirm`  | Confirm a payment intent        |
| `POST /stripe/payment-intents/:id/capture`  | Capture a manual payment intent |
| `POST /stripe/payment-intents/:id/cancel`   | Cancel a payment intent         |
| `GET /stripe/payment-intents/:id`           | Retrieve a payment intent       |
| `GET /stripe/payment-intents`               | List payment intents            |
| `POST /stripe/refunds`                      | Create a refund                 |
| `GET /stripe/refunds`                       | List refunds                    |
| `POST /stripe/refunds/:id/cancel`           | Cancel a pending refund         |
| `GET /stripe/customers/:id/payment-methods` | List customer's payment methods |
| `POST /stripe/payment-methods/:id/attach`   | Attach payment method           |
| `POST /stripe/payment-methods/:id/detach`   | Detach payment method           |
| `POST /stripe/customers`                    | Create a customer               |
| `GET /stripe/customers/:id`                 | Get customer by ID              |
| `POST /stripe/subscriptions`                | Create a subscription           |
| `GET /stripe/subscriptions/:id`             | Get subscription                |
| `POST /stripe/subscriptions/:id/cancel`     | Cancel a subscription           |
| `PATCH /stripe/subscriptions/:id`           | Update a subscription           |
| `POST /stripe/checkout`                     | Create a checkout session       |
| `POST /stripe/billing-portal`               | Create billing portal session   |
| `GET /stripe/products`                      | List active products            |
| `GET /stripe/prices`                        | List active prices              |
| `POST /stripe/webhook`                      | Receive Stripe webhook events   |

---

## Webhook Handlers

Register event handlers directly in module config instead of creating a separate controller:

```typescript
StripeModule.forRoot({
  apiKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  webhookHandlers: [
    {
      event: 'payment_intent.succeeded',
      handler: async (event) => {
        // Fulfill order, update database, send email
      },
    },
    {
      event: 'payment_intent.payment_failed',
      handler: async (event) => {
        const pi = event.data.object;
        // Notify customer, retry or offer alternative method
      },
    },
    {
      event: 'checkout.session.completed',
      handler: async (event) => {
        const session = event.data.object;
        // Grant access, provision account
      },
    },
  ],
});
```

All handlers receive the raw Stripe event and run in parallel via `Promise.all`.

---

## Sandbox Mode

Enable sandbox for development, CI, and integration tests — no API calls are made:

```typescript
StripeModule.forRoot({
  apiKey: 'sk_test_...', // still required but not used
  sandbox: true,
});
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

Simulate a declined card:

```typescript
const intent = await this.stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  paymentMethod: 'pm_4000000000000002',
  confirm: true,
});
// intent.status === 'failed'
// intent.lastPaymentError === 'Your card was declined.'
```

Use the sandbox client directly:

```typescript
import { StripeSandboxClient } from '@os.io/nest-kit/infra/stripe';

const sandbox = new StripeSandboxClient();
const pi = await sandbox.paymentIntents.create({ amount: 1000, currency: 'usd' });
// pi.id === 'pi_sandbox_1'
```

---

## Invoices

List invoices for a customer:

```typescript
const invoices = await this.stripe.getInvoices('cus_xxx', 10);
// Returns: InvoiceResult[]
// { id, number, amountPaid, amountDue, currency, status, pdfUrl, paidAt, lines }
```

---

## Default Metadata

Static metadata merged into every Stripe object (payment intents, refunds, customers, subscriptions):

```typescript
StripeModule.forRoot({
  apiKey: 'sk_test_...',
  metadata: { app: 'my-app', env: 'production' },
});
```

Per-request metadata is merged on top (overriding static keys):

```typescript
await this.stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  metadata: { orderId: 'ord_123' }, // merged with { app: 'my-app', env: 'production' }
});
```

---

## `StripeModuleOptions`

| Option            | Type                             | Default   | Description                       |
| ----------------- | -------------------------------- | --------- | --------------------------------- |
| `apiKey`          | `string`                         | —         | Stripe secret key                 |
| `webhookSecret`   | `string`                         | —         | Webhook signing secret            |
| `defaultCurrency` | `string`                         | `'usd'`   | Default currency                  |
| `metadata`        | `Record<string, string>`         | —         | Static metadata on every object   |
| `idempotencyTtl`  | `number`                         | `3600000` | Idempotency key TTL (ms)          |
| `PaymentStore`    | `new (...args) => PaymentStore`  | —         | Optional persistence class        |
| `sandbox`         | `boolean`                        | —         | Enable sandbox mode (mock client) |
| `webhookHandlers` | `{event: string, handler: fn}[]` | —         | Webhook event handlers            |

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
| `getInvoices()`  | `(customerId, limit)`   | List invoices for a customer |

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

### Constants

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

### Exported Types

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
