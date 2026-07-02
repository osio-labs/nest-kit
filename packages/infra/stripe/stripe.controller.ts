import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Headers,
  Req,
  Query,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { STRIPE_WEBHOOK_HANDLERS } from './stripe.constants';
import type { StripeWebhookHandler } from './stripe.types';

/**
 * REST controller exposing all Stripe operations as HTTP endpoints.
 *
 * @example
 * ```bash
 * curl -X POST http://localhost:3000/stripe/payment-intents \\
 *   -H "Content-Type: application/json" \\
 *   -d '{"amount": 1000, "currency": "usd"}'
 * ```
 */
@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    private readonly stripeService: StripeService,
    @Optional()
    @Inject(STRIPE_WEBHOOK_HANDLERS)
    private readonly webhookHandlers: StripeWebhookHandler[] = [],
  ) {}

  @Post('webhook')
  async handleWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    const rawBody = req.rawBody as string | Buffer | undefined;
    const payload: string | Buffer = rawBody ?? (req.body as string | Buffer);
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    if (!payload || !signature) {
      throw new Error('Missing webhook payload or signature');
    }

    const event = this.stripeService.webhooks.constructEvent(
      typeof payload === 'string' ? payload : JSON.stringify(payload),
      signature,
    );

    this.logger.log(`Webhook received: ${event.type}`);

    await Promise.all(this.webhookHandlers.map((handler) => Promise.resolve(handler(event))));

    return { received: true };
  }

  @Post('payment-intents')
  async createPaymentIntent(
    @Body()
    body: {
      amount: number;
      currency?: string;
      customer?: string;
      paymentMethod?: string;
      description?: string;
      metadata?: Record<string, string>;
      confirm?: boolean;
      captureMethod?: 'automatic' | 'manual';
      returnUrl?: string;
    },
  ) {
    return this.stripeService.paymentIntents.create(body);
  }

  @Post('payment-intents/:id/confirm')
  async confirmPaymentIntent(
    @Param('id') id: string,
    @Body() body: { paymentMethod?: string; returnUrl?: string },
  ) {
    return this.stripeService.paymentIntents.confirm(id, body);
  }

  @Post('payment-intents/:id/capture')
  async capturePaymentIntent(@Param('id') id: string, @Body() body: { amountToCapture?: number }) {
    return this.stripeService.paymentIntents.capture(id, body);
  }

  @Post('payment-intents/:id/cancel')
  async cancelPaymentIntent(@Param('id') id: string) {
    return this.stripeService.paymentIntents.cancel(id);
  }

  @Get('payment-intents/:id')
  async retrievePaymentIntent(@Param('id') id: string) {
    return this.stripeService.paymentIntents.retrieve(id);
  }

  @Get('payment-intents')
  async listPaymentIntents(@Query('limit') limit?: string) {
    return this.stripeService.paymentIntents.list(limit ? parseInt(limit, 10) : 10);
  }

  @Post('refunds')
  async createRefund(
    @Body()
    body: {
      paymentIntent: string;
      amount?: number;
      reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
      metadata?: Record<string, string>;
    },
  ) {
    return this.stripeService.refunds.create(body);
  }

  @Get('refunds')
  async listRefunds(@Query('limit') limit?: string) {
    return this.stripeService.refunds.list(limit ? parseInt(limit, 10) : 10);
  }

  @Post('refunds/:id/cancel')
  async cancelRefund(@Param('id') id: string) {
    return this.stripeService.refunds.cancel(id);
  }

  @Get('customers/:id/payment-methods')
  async listPaymentMethods(@Param('id') id: string, @Query('type') type?: string) {
    return this.stripeService.paymentMethods.list(id, type);
  }

  @Post('payment-methods/:id/attach')
  async attachPaymentMethod(@Param('id') id: string, @Body() body: { customer: string }) {
    return this.stripeService.paymentMethods.attach({ paymentMethod: id, customer: body.customer });
  }

  @Post('payment-methods/:id/detach')
  async detachPaymentMethod(@Param('id') id: string) {
    return this.stripeService.paymentMethods.detach(id);
  }

  @Post('customers')
  async createCustomer(@Body() body: { email?: string; name?: string; phone?: string }) {
    return this.stripeService.customers.create(body);
  }

  @Get('customers/:id')
  async getCustomer(@Param('id') id: string) {
    return this.stripeService.customers.retrieve(id);
  }

  @Post('subscriptions')
  async createSubscription(
    @Body()
    body: {
      customer: string;
      items: { price: string; quantity?: number }[];
      trialPeriodDays?: number;
      metadata?: Record<string, string>;
    },
  ) {
    return this.stripeService.subscriptions.create(body);
  }

  @Get('subscriptions/:id')
  async getSubscription(@Param('id') id: string) {
    return this.stripeService.subscriptions.retrieve(id);
  }

  @Post('subscriptions/:id/cancel')
  async cancelSubscription(@Param('id') id: string) {
    return this.stripeService.subscriptions.cancel(id);
  }

  @Patch('subscriptions/:id')
  async updateSubscription(
    @Param('id') id: string,
    @Body()
    body: {
      items?: { price: string; quantity?: number }[];
      metadata?: Record<string, string>;
      cancelAtPeriodEnd?: boolean;
    },
  ) {
    return this.stripeService.subscriptions.update(id, body);
  }

  @Post('checkout')
  async createCheckoutSession(
    @Body()
    body: {
      customer?: string;
      mode: 'payment' | 'setup' | 'subscription';
      lineItems: { price: string; quantity: number }[];
      successUrl: string;
      cancelUrl: string;
      metadata?: Record<string, string>;
      allowPromotionCodes?: boolean;
    },
  ) {
    return this.stripeService.checkout.create(body);
  }

  @Post('billing-portal')
  async createBillingPortalSession(@Body() body: { customer: string; returnUrl: string }) {
    return this.stripeService.billingPortal.create(body);
  }

  @Get('products')
  async listProducts() {
    return this.stripeService.products.listProducts({ active: true });
  }

  @Get('prices')
  async listPrices(@Query('product') product?: string) {
    return this.stripeService.products.listPrices({ product });
  }
}
