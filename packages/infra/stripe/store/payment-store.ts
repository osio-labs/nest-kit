/**
 * Re-export of the `PaymentStore` abstract class.
 *
 * This file exists so consumers can import `PaymentStore` from a stable path
 * without deep import chains. The actual definition lives in `stripe.types.ts`
 * alongside the related record types.
 */
export { PaymentStore } from '../stripe.types';
