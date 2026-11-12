import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/forms/SearchInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ProductCard } from '@/components/common/ProductCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { DeleteRecordButton } from '@/components/common/DeleteRecordButton';
import { ProductForm } from '@/features/products/ProductForm';
import { catalogueService, productService, type CatalogueItem } from '@/services';
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  effectiveMinimumStock,
  isLowStock,
} from '@/lib/stock';
import { toast } from '@/lib/toast';
import { Pencil, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatMoney } from '@/lib/formatters';
import { StatusBadge } from '@/components/ui/Badge';
import { useAuth } from '@/features/auth';
import { PERMISSIONS } from '@/constants';

export function ProductsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(PERMISSIONS.PRODUCTS_CREATE);
  const canEdit = hasPermission(PERMISSIONS.PRODUCTS_EDIT);
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [lowStockThreshold, setLowStockThreshold] = useState(
    DEFAULT_LOW_STOCK_THRESHOLD,
  );
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CatalogueItem | null>(null);
  const [editProductId, setEditProductId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const catalogue = await catalogueService.list({ fresh: true });
      setItems(catalogue.items);
      setCategories(catalogue.categories);
      setLowStockThreshold(catalogue.lowStockThreshold);
    } catch (error) {
      console.error(error);
      toast('Could not load products. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('q', value);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const term = search.toLowerCase();
        const matchesSearch =
          item.productName.toLowerCase().includes(term) ||
          (item.brand && item.brand.toLowerCase().includes(term));
        const matchesCategory = !categoryFilter || item.categoryId === categoryFilter;
        return matchesSearch && matchesCategory;
      }),
    [items, search, categoryFilter],
  );

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All Categories', count: items.length },
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
        count: items.filter((item) => item.categoryId === category.id).length,
      })),
    ],
    [categories, items],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products & Inventory"
        description="Search, monitor stock levels, and manage your building materials catalogue."
        action={
          canCreate ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add New Product
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-xs">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Search cement, iron rods, roofing sheets, pipes…"
          ariaLabel="Search products"
        />

        {categoryOptions.length > 1 && (
          <SegmentedControl
            options={categoryOptions}
            value={categoryFilter}
            onChange={setCategoryFilter}
            size="sm"
            ariaLabel="Filter by category"
          />
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((key) => (
            <div
              key={key}
              className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs"
            >
              <Skeleton className="h-32 w-full rounded-none" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <ProductCard
              key={item.id}
              name={item.productName}
              brand={item.brand}
              price={item.sellingPrice}
              stock={item.quantityOnHand}
              unit={item.unit}
              lowStock={isLowStock(item, lowStockThreshold)}
              category={item.categoryName}
              onPress={() => setSelectedProduct(item)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-8 shadow-xs">
          <EmptyState
            title="No materials found"
            description={
              search || categoryFilter
                ? 'No products matched your search or category filter. Try clearing filters.'
                : 'Your catalogue is empty. Add your first product to record your inventory.'
            }
            action={
              search || categoryFilter ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleSearch('');
                    setCategoryFilter('');
                  }}
                >
                  Clear Filters
                </Button>
              ) : canCreate ? (
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add First Product
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add New Product"
        description="Add a building material and set up its primary variations, pricing, and stock."
        size="lg"
      >
        <ProductForm onClose={() => setFormOpen(false)} onSuccess={loadData} />
      </Modal>

      {selectedProduct && (
        <Modal
          open={Boolean(selectedProduct)}
          onClose={() => setSelectedProduct(null)}
          title={selectedProduct.productName}
          description={
            selectedProduct.brand
              ? `Brand: ${selectedProduct.brand}`
              : 'Material Specifications'
          }
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <DeleteRecordButton
                entityLabel="Product"
                recordLabel={selectedProduct.productName}
                description="All of its variations and stock records are removed. Past sales keep their receipt history."
                size="sm"
                onDelete={async () => {
                  await productService.remove(selectedProduct.productId);
                  catalogueService.invalidate();
                  setSelectedProduct(null);
                  await loadData();
                }}
              />
              {canEdit && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditProductId(selectedProduct.productId);
                    setSelectedProduct(null);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit Product
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setSelectedProduct(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-surface-2 p-3.5">
                <span className="block text-2xs font-semibold uppercase tracking-wide text-text-muted">
                  Selling Price
                </span>
                <span className="mt-1 block text-xl font-bold tabular-nums text-text-primary">
                  {formatMoney(selectedProduct.sellingPrice)}
                  <span className="ml-1 text-xs font-normal text-text-secondary">
                    /{selectedProduct.unit}
                  </span>
                </span>
              </div>
              <div className="rounded-xl border border-border bg-surface-2 p-3.5">
                <span className="block text-2xs font-semibold uppercase tracking-wide text-text-muted">
                  Current Stock
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xl font-bold tabular-nums text-text-primary">
                    {selectedProduct.quantityOnHand} {selectedProduct.unit}
                  </span>
                  <StatusBadge
                    status={
                      selectedProduct.quantityOnHand <= 0
                        ? 'Out of Stock'
                        : selectedProduct.quantityOnHand <=
                            effectiveMinimumStock(selectedProduct, lowStockThreshold)
                          ? 'Low Stock'
                          : 'In Stock'
                    }
                    size="sm"
                  />
                </div>
              </div>
            </div>

            <dl className="space-y-2 rounded-xl border border-border bg-surface p-4 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-text-secondary">Minimum Stock Threshold</dt>
                <dd className="font-semibold text-text-primary">
                  {effectiveMinimumStock(selectedProduct, lowStockThreshold)}{' '}
                  {selectedProduct.unit}
                  {selectedProduct.minimumStock <= 0 && (
                    <span className="ml-1 text-xs font-normal text-text-muted">
                      (store default)
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-text-secondary">Cost Price (Purchase)</dt>
                <dd className="font-semibold tabular-nums text-text-primary">
                  {formatMoney(selectedProduct.costPrice)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Expected Profit / Unit</dt>
                <dd className="font-semibold tabular-nums text-success">
                  {formatMoney(
                    Math.max(0, selectedProduct.sellingPrice - selectedProduct.costPrice),
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </Modal>
      )}
      <Modal
        open={Boolean(editProductId)}
        onClose={() => setEditProductId(null)}
        title="Edit Product"
        description="Update the product details, pricing, stock levels and variations."
        size="lg"
      >
        {editProductId && (
          <ProductForm
            productId={editProductId}
            onClose={() => setEditProductId(null)}
            onSuccess={loadData}
          />
        )}
      </Modal>
    </div>
  );
}
