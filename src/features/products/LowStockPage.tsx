import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/tables/DataTable';
import { catalogueService, type CatalogueItem } from '@/services';
import { formatMoney } from '@/lib/formatters';
import { ROUTES } from '@/constants';
import { Plus } from 'lucide-react';

export function LowStockPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    catalogueService
      .list()
      .then((catalogue) => {
        if (active) setItems(catalogue.items);
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const lowStock = items.filter((item) => item.quantityOnHand <= item.minimumStock);

  const columns = [
    {
      key: 'product',
      header: 'Product / Variation',
      render: (item: CatalogueItem) => (
        <div>
          <p className="font-semibold text-text-primary text-sm">{item.productName}</p>
          <p className="text-xs text-text-muted">{item.brand ? `Brand: ${item.brand}` : 'Standard variation'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Alert Level',
      render: (item: CatalogueItem) => (
        <Badge variant={item.quantityOnHand <= 0 ? 'danger' : 'warning'}>
          {item.quantityOnHand <= 0 ? 'Out of Stock' : 'Low Stock'}
        </Badge>
      ),
    },
    {
      key: 'stock',
      header: 'On Hand',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (item: CatalogueItem) => (
        <span className="font-bold text-sm text-danger-fg">
          {item.quantityOnHand} <span className="text-xs font-normal text-text-muted">{item.unit}</span>
        </span>
      ),
    },
    {
      key: 'minimum',
      header: 'Min Threshold',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (item: CatalogueItem) => (
        <span className="text-sm text-text-secondary">
          {item.minimumStock} <span className="text-xs text-text-muted">{item.unit}</span>
        </span>
      ),
    },
    {
      key: 'sellingPrice',
      header: 'Selling Price',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (item: CatalogueItem) => (
        <span className="font-semibold text-text-primary text-sm">{formatMoney(item.sellingPrice)}</span>
      ),
    },
    {
      key: 'action',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: () => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            navigate(ROUTES.APP_PURCHASES_NEW);
          }}
        >
          Reorder
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Low Stock Alerts"
        description="Materials requiring replenishment to avoid stockouts."
        action={
          <Button
            onClick={() => navigate(ROUTES.APP_PURCHASES_NEW)}
            className="shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Receive Stock
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={lowStock}
        loading={loading}
        emptyTitle="All inventory stocked up"
        emptyMessage="Every material currently meets or exceeds its minimum required stock threshold."
        mobileCardRender={(item) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-text-primary">{item.productName}</h4>
                <p className="text-xs text-text-secondary mt-0.5">{item.brand || 'Standard brand'}</p>
              </div>
              <Badge variant={item.quantityOnHand <= 0 ? 'danger' : 'warning'}>
                {item.quantityOnHand <= 0 ? 'Out of stock' : 'Low stock'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-border/60">
              <div>
                <span className="text-text-muted block">Remaining:</span>
                <span className="font-bold text-danger-fg text-sm">
                  {item.quantityOnHand} {item.unit}
                </span>
              </div>
              <div className="text-right">
                <span className="text-text-muted block">Min Threshold:</span>
                <span className="font-medium text-text-primary text-sm">
                  {item.minimumStock} {item.unit}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-text-primary">{formatMoney(item.sellingPrice)}</span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => navigate(ROUTES.APP_PURCHASES_NEW)}
              >
                Reorder Stock
              </Button>
            </div>
          </div>
        )}
      />
    </div>
  );
}
