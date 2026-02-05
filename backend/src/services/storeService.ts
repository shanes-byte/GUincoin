import { StoreProduct } from '@prisma/client';

/**
 * Conversion rate: 1 USD = 10 Guincoins
 * Used when importing products with USD prices from external sources (e.g., Amazon)
 */
export const GUINCOIN_PER_USD = 10;

/**
 * Converts a USD amount to Guincoins.
 *
 * @param usd - The USD amount to convert
 * @returns The equivalent Guincoin amount (rounded to 2 decimal places)
 *
 * @example
 * usdToGuincoin(9.99) // Returns 99.9
 * usdToGuincoin(25) // Returns 250
 */
export const usdToGuincoin = (usd: number): number =>
  Math.round(usd * GUINCOIN_PER_USD * 100) / 100;

/**
 * Normalizes a StoreProduct by converting Prisma Decimal fields to JavaScript numbers.
 *
 * Prisma returns Decimal types as objects, which need to be converted for JSON serialization.
 *
 * @param product - The StoreProduct from Prisma
 * @returns Product with numeric price fields
 */
export const normalizeStoreProduct = (product: StoreProduct) => ({
  ...product,
  priceUsd: product.priceUsd ? Number(product.priceUsd) : null,
  priceGuincoin: Number(product.priceGuincoin),
});
