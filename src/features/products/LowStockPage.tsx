import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/tables/DataTable';
import { catalogueService, type CatalogueItem } from '@/services';
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  effectiveMinimumStock,
  isLowStock,
} from '@/lib/stock';
import { PERMISSIONS, ROUTES } from '@/constants';
import { useAuth } from '@/features/auth';
import { toast } from '@/lib/toast';
import { AlertTriangle, RefreshCw, Truck } from 'lucide-react';

function variantLabel(item: CatalogueItem) {
  const attributeLabel = Object.entries(item.attributes || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
  return item.brand || attributeLabel || 'Standard';
}

export function LowStockPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canReorder = hasPermission(PERMISSIONS.PURCHASES_CREATE);
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [threshold, setThreshold] = useState(DEFAULT_LOW_STOCK_THRESHOLD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (fresh = false) => {
    try {
      const catalogue = await catalogueService.list({ fresh });
      setItems(catalogue.items);
      setThreshold(catalogue.lowStockThreshold);
    } catch (error) {
      console.error(error);
      toast('Could not load stock levels. Check your connection and try again.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  useEffect(() => {
    const onFocus = () => loadData(true);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadData]);

  const lowStockItems = useMemo(
    () =>
      items
        .filter((item) => isLowStock(item, threshold))
        .sort((left, right) => {
          const leftOut = left.quantityOnHand <= 0 ? 0 : 1;
          const rightOut = right.quantityOnHand <= 0 ? 0 : 1;
          if (leftOut !== rightOut) return leftOut - rightOut;

          const leftLimit = effectiveMinimumStock(left, threshold);
          const rightLimit = effectiveMinimumStock(right, threshold);
          const leftRatio = leftLimit > 0 ? left.quantityOnHand / leftLimit : 0;
          const rightRatio = rightLimit > 0 ? right.quantityOnHand / rightLimit : 0;
          return leftRatio - rightRatio;
        }),
    [items, threshold],
  );

  const outOfStockCount = lowStockItems.filter((item) => item.quantityOnHand <= 0).length;
  const runningLowCount = lowStockItems.length - outOfStockCount;

  const restock = (item: CatalogueItem) => {
    const quantity = Math.max(
      effectiveMinimumStock(item, threshold) - item.quantityOnHand,
      1,
    );
    navigate(ROUTES.APP_PURCHASES_NEW, {
      state: { reorder: { variantId: item.id, quantity } },
    });
  };

  const reorderLevelCopy = (item: CatalogueItem) => {
    const level = effectiveMinimumStock(item, threshold);
    return level > 0
      ? `Reorder at ${level} ${item.unit}`
      : 'No reorder level set';
  };

  const columns = [
    {
      key: 'productName',
      header: 'Item',
      sortable: true,
      render: (item: CatalogueItem) => (
        <div>
          <p className="text-sm font-semibold text-text-primary">{item.productName}</p>
          <p className="text-xs text-text-muted">{variantLabel(item)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: CatalogueItem) => (
        <Badge variant={item.quantityOnHand <= 0 ? 'danger' : 'warning'}>
          {item.quantityOnHand <= 0 ? 'Out of stock' : 'Low stock'}
        </Badge>
      ),
    },
    {
      key: 'quantityOnHand',
      header: 'Stock left',
      sortable: true,
      render: (item: CatalogueItem) => (
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {item.quantityOnHand} {item.unit}
          </p>
          <p className="text-xs text-text-muted">{reorderLevelCopy(item)}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (item: CatalogueItem) =>
        canReorder ? (
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              restock(item);
            }}
          >
            Restock
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Low Stock"
        description="Items that are out of stock or at their reorder level. Restock them before they run out."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRefreshing(true);
                loadData(true);
              }}
              isLoading={refreshing}
              aria-label="Refresh stock levels"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Refresh
            </Button>
            {canReorder && (
              <Button
                onClick={() => navigate(ROUTES.APP_PURCHASES_NEW)}
                className="shadow-xs"
              >
                <Truck className="h-4 w-4 mr-1.5" aria-hidden="true" />
                Receive Stock
              </Button>
            )}
          </div>
        }
      />

      {!loading && lowStockItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-warning/30 bg-warning-soft/50 px-4 py-3 text-sm text-text-primary">
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
          <span>
            <strong>{outOfStockCount}</strong> out of stock
          </span>
          <span className="text-text-muted" aria-hidden="true">
            &middot;
          </span>
          <span>
            <strong>{runningLowCount}</strong> running low
          </span>
          <span className="ml-auto hidden text-xs text-text-muted sm:inline">
            Restock opens a purchase with the item already added.
          </span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={lowStockItems}
        loading={loading}
        searchPlaceholder="Search items by name or brand…"
        caption="Items at or below their reorder level"
        emptyTitle={items.length === 0 ? 'No products yet' : 'Everything is in stock'}
        emptyMessage={
          items.length === 0
            ? 'Add products with their stock levels to start getting low-stock alerts.'
            : 'No items are at or below their reorder level right now. They will appear here when stock runs low.'
        }
        mobileCardRender={(item) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-text-primary">{item.productName}</h4>
                <p className="mt-0.5 text-xs text-text-secondary">{variantLabel(item)}</p>
              </div>
              <Badge variant={item.quantityOnHand <= 0 ? 'danger' : 'warning'}>
                {item.quantityOnHand <= 0 ? 'Out of stock' : 'Low stock'}
              </Badge>
            </div>

            <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-text-primary">
              <span className="font-bold">
                {item.quantityOnHand} {item.unit}
              </span>{' '}
              left &middot; {reorderLevelCopy(item).toLowerCase()}
            </p>

            {canReorder && (
              <Button size="sm" variant="outline" onClick={() => restock(item)} className="w-full">
                Restock this item
              </Button>
            )}
          </div>
        )}
      />
    </div>
  );
}
