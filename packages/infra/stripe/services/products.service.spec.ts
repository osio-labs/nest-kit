import { STRIPE_CLIENT } from '../stripe.constants.js';
import { ProductsService } from './products.service.js';
import type { Stripe } from 'stripe';

const mockProductsList = jest.fn();
const mockProductsRetrieve = jest.fn();
const mockPricesList = jest.fn();
const mockPricesRetrieve = jest.fn();

const mockStripe = {
  products: { list: mockProductsList, retrieve: mockProductsRetrieve },
  prices: { list: mockPricesList, retrieve: mockPricesRetrieve },
} as unknown as Stripe;

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService(mockStripe);
  });

  describe('listProducts', () => {
    it('should list products', async () => {
      mockProductsList.mockResolvedValue({ data: [{ id: 'prod_1', name: 'Product 1' }] });

      const result = await service.listProducts({ limit: 50, active: true });

      expect(mockProductsList).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, active: true }),
      );
      expect(result).toHaveLength(1);
    });

    it('should default to 100 items', async () => {
      mockProductsList.mockResolvedValue({ data: [] });

      await service.listProducts();

      expect(mockProductsList).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }));
    });
  });

  describe('retrieveProduct', () => {
    it('should retrieve a product', async () => {
      mockProductsRetrieve.mockResolvedValue({ id: 'prod_1', name: 'Product 1' });

      const result = await service.retrieveProduct('prod_1');

      expect(mockProductsRetrieve).toHaveBeenCalledWith('prod_1');
      expect(result.id).toBe('prod_1');
    });
  });

  describe('listPrices', () => {
    it('should list prices', async () => {
      mockPricesList.mockResolvedValue({ data: [{ id: 'price_1', unit_amount: 999 }] });

      const result = await service.listPrices({ limit: 50, active: true, product: 'prod_1' });

      expect(mockPricesList).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, active: true, product: 'prod_1' }),
      );
      expect(result).toHaveLength(1);
    });

    it('should filter by currency', async () => {
      mockPricesList.mockResolvedValue({ data: [] });

      await service.listPrices({ currency: 'eur' });

      expect(mockPricesList).toHaveBeenCalledWith(expect.objectContaining({ currency: 'eur' }));
    });
  });

  describe('retrievePrice', () => {
    it('should retrieve a price', async () => {
      mockPricesRetrieve.mockResolvedValue({ id: 'price_1', unit_amount: 999 });

      const result = await service.retrievePrice('price_1');

      expect(mockPricesRetrieve).toHaveBeenCalledWith('price_1');
      expect(result.id).toBe('price_1');
    });
  });
});
