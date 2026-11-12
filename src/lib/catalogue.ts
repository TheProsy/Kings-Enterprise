import type { CatalogueItem } from '@/services';
import { getSpecEntries } from '@/lib/catalogue-content';

export interface CatalogueGroup {
  productId: string;
  productName: string;
  productDescription?: string;
  categoryId?: string;
  categoryName?: string;
  imageUrl?: string;
  variants: CatalogueItem[];
  minimumPrice: number;
  maximumPrice: number;
  totalStock: number;
  inStock: boolean;
}

export function describeVariant(
  item: Pick<CatalogueItem, 'brand' | 'attributes'>,
): string {
  const specs = getSpecEntries(item.attributes).map(
    (entry) => `${entry.label}: ${entry.value}`,
  );
  const brand = item.brand?.trim();
  return [brand, ...specs].filter(Boolean).join(' · ') || 'Standard';
}

export function catalogueItemSearchText(item: CatalogueItem): string {
  const specs = getSpecEntries(item.attributes).flatMap((entry) => [
    entry.label,
    entry.value,
  ]);
  return [
    item.productName,
    item.brand,
    item.categoryName,
    item.unit,
    ...specs,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function groupCatalogueItems(items: CatalogueItem[]): CatalogueGroup[] {
  const groups = new Map<string, CatalogueGroup>();

  for (const item of items) {
    let group = groups.get(item.productId);
    if (!group) {
      group = {
        productId: item.productId,
        productName: item.productName,
        productDescription: item.productDescription,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        imageUrl: item.imageUrl,
        variants: [],
        minimumPrice: 0,
        maximumPrice: 0,
        totalStock: 0,
        inStock: false,
      };
      groups.set(item.productId, group);
    }
    group.variants.push(item);
    group.totalStock += Math.max(0, item.quantityOnHand ?? 0);
    if ((item.quantityOnHand ?? 0) > 0) group.inStock = true;
  }

  const result = Array.from(groups.values());
  result.sort((left, right) => left.productName.localeCompare(right.productName));

  for (const group of result) {
    const prices = group.variants
      .map((variant) => variant.sellingPrice)
      .filter((price) => Number.isFinite(price) && price > 0);
    group.minimumPrice = prices.length > 0 ? Math.min(...prices) : 0;
    group.maximumPrice = prices.length > 0 ? Math.max(...prices) : 0;

    group.variants.sort((left, right) => {
      const leftStock = (left.quantityOnHand ?? 0) > 0;
      const rightStock = (right.quantityOnHand ?? 0) > 0;
      if (leftStock !== rightStock) return leftStock ? -1 : 1;

      const leftPrice = left.sellingPrice > 0 ? left.sellingPrice : Infinity;
      const rightPrice = right.sellingPrice > 0 ? right.sellingPrice : Infinity;
      if (leftPrice !== rightPrice) return leftPrice < rightPrice ? -1 : 1;

      return describeVariant(left).localeCompare(describeVariant(right));
    });
  }

  return result;
}

export function groupSearchText(group: CatalogueGroup): string {
  return group.variants.map(catalogueItemSearchText).join(' ');
}
