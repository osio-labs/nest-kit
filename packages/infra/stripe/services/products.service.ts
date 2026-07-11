import { Inject, Injectable } from '@nestjs/common';
import type { Stripe } from 'stripe';
import { STRIPE_CLIENT } from '../stripe.constants.js';
import type { ListProductsOptions, ListPricesOptions } from '../stripe.types.js';

/**
 * Service for Stripe Products & Prices.
 *
 * Provides methods to list products and prices from the Stripe catalog.
 */
@Injectable()
export class ProductsService {
  constructor(
    @Inject(STRIPE_CLIENT)
    private readonly stripe: Stripe,
  ) {}

  /**
   * List products.
   */
  async listProducts(options?: ListProductsOptions): Promise<Stripe.Product[]> {
    const params: Stripe.ProductListParams = {
      limit: options?.limit ?? 100,
      active: options?.active,
    };
    const response = await this.stripe.products.list(params);
    return response.data;
  }

  /**
   * Retrieve a product by its Stripe ID.
   */
  async retrieveProduct(id: string): Promise<Stripe.Product> {
    return this.stripe.products.retrieve(id);
  }

  /**
   * List prices.
   */
  async listPrices(options?: ListPricesOptions): Promise<Stripe.Price[]> {
    const params: Stripe.PriceListParams = {
      limit: options?.limit ?? 100,
      active: options?.active,
      product: options?.product,
      currency: options?.currency,
    };
    const response = await this.stripe.prices.list(params);
    return response.data;
  }

  /**
   * Retrieve a price by its Stripe ID.
   */
  async retrievePrice(id: string): Promise<Stripe.Price> {
    return this.stripe.prices.retrieve(id);
  }
}
