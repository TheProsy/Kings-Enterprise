import type { ProductVariant } from '@/types';

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

/** Normalises the store-wide fallback reorder level. */
export function normalizeLowStockThreshold(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_LOW_STOCK_THRESHOLD;
  return Math.floor(parsed);
}

/**
 * The reorder level for an item: its own minimum stock when set, otherwise the
 * store-wide default from Settings.
 */
export function effectiveMinimumStock(
  item: Pick<ProductVariant, 'minimumStock'>,
  defaultThreshold: number,
): number {
  const own = Number(item.minimumStock ?? 0);
  if (Number.isFinite(own) && own > 0) return Math.floor(own);
  return normalizeLowStockThreshold(defaultThreshold);
}

export type StockStatus = 'out' | 'low' | 'ok';

export function stockStatus(
  item: Pick<ProductVariant, 'minimumStock' | 'quantityOnHand' | 'active'>,
  defaultThreshold: number,
): StockStatus {
  if (!item.active) return 'ok';
  if (item.quantityOnHand <= 0) return 'out';
  if (item.quantityOnHand <= effectiveMinimumStock(item, defaultThreshold)) {
    return 'low';
  }
  return 'ok';
}

export function isLowStock(
  item: Pick<ProductVariant, 'minimumStock' | 'quantityOnHand' | 'active'>,
  defaultThreshold: number,
): boolean {
  return stockStatus(item, defaultThreshold) !== 'ok';
}
