/**
 * Unit tests for the Store Service.
 *
 * These tests verify the utility functions used for store operations,
 * including price conversions and data normalization.
 */

import { describe, it, expect } from 'vitest';
import { usdToGuincoin, GUINCOIN_PER_USD, normalizeStoreProduct } from './storeService';

describe('storeService', () => {
  describe('GUINCOIN_PER_USD', () => {
    it('should be 10 Guincoins per USD', () => {
      expect(GUINCOIN_PER_USD).toBe(10);
    });
  });

  describe('usdToGuincoin', () => {
    it('should convert whole dollar amounts correctly', () => {
      expect(usdToGuincoin(1)).toBe(10);
      expect(usdToGuincoin(10)).toBe(100);
      expect(usdToGuincoin(25)).toBe(250);
    });

    it('should convert decimal amounts correctly', () => {
      expect(usdToGuincoin(9.99)).toBe(99.9);
      expect(usdToGuincoin(19.95)).toBe(199.5);
    });

    it('should handle zero', () => {
      expect(usdToGuincoin(0)).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      // 1.234 * 10 = 12.34
      expect(usdToGuincoin(1.234)).toBe(12.34);
      // 1.999 * 10 = 19.99
      expect(usdToGuincoin(1.999)).toBe(19.99);
    });
  });

  describe('normalizeStoreProduct', () => {
    // Helper to create a mock Prisma Decimal that works with Number()
    const mockDecimal = (value: number) => ({
      toNumber: () => value,
      toString: () => value.toString(),
      valueOf: () => value,
      [Symbol.toPrimitive]: () => value,
    });

    it('should convert Decimal fields to numbers', () => {
      const mockProduct = {
        id: 'test-id',
        name: 'Test Product',
        description: 'A test product',
        priceUsd: mockDecimal(9.99),
        priceGuincoin: mockDecimal(99.9),
        imageUrls: ['https://example.com/image.jpg'],
        source: 'custom' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        externalUrl: null,
        externalId: null,
      };

      const normalized = normalizeStoreProduct(mockProduct as any);

      expect(typeof normalized.priceUsd).toBe('number');
      expect(typeof normalized.priceGuincoin).toBe('number');
      expect(normalized.priceUsd).toBe(9.99);
      expect(normalized.priceGuincoin).toBe(99.9);
    });

    it('should handle null priceUsd', () => {
      const mockProduct = {
        id: 'test-id',
        name: 'Test Product',
        description: null,
        priceUsd: null,
        priceGuincoin: mockDecimal(100),
        imageUrls: [],
        source: 'custom' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        externalUrl: null,
        externalId: null,
      };

      const normalized = normalizeStoreProduct(mockProduct as any);

      expect(normalized.priceUsd).toBeNull();
      expect(normalized.priceGuincoin).toBe(100);
    });

    it('should preserve other fields unchanged', () => {
      const mockProduct = {
        id: 'test-id',
        name: 'Test Product',
        description: 'Description',
        priceUsd: null,
        priceGuincoin: mockDecimal(100),
        imageUrls: ['img1.jpg', 'img2.jpg'],
        source: 'amazon' as const,
        isActive: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        amazonUrl: 'https://amazon.com/product',
        amazonAsin: 'ASIN123',
      };

      const normalized = normalizeStoreProduct(mockProduct as any);

      expect(normalized.id).toBe('test-id');
      expect(normalized.name).toBe('Test Product');
      expect(normalized.description).toBe('Description');
      expect(normalized.imageUrls).toEqual(['img1.jpg', 'img2.jpg']);
      expect(normalized.source).toBe('amazon');
      expect(normalized.isActive).toBe(false);
      expect(normalized.amazonUrl).toBe('https://amazon.com/product');
      expect(normalized.amazonAsin).toBe('ASIN123');
    });
  });
});
