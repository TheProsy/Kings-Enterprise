import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { catalogueService, type CatalogueItem } from '@/services';
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  effectiveMinimumStock,
  isLowStock,
  stockStatus,
} from '@/lib/stock';
import { formatMoney } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import { Package, AlertTriangle, Layers, DollarSign, Printer, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants';

export function StockReportPage() {
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [threshold, setThreshold] = useState(DEFAULT_LOW_STOCK_THRESHOLD);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    catalogueService
      .list({ fresh: true })
      .then((catalogue) => {
        if (active) {
          setItems(catalogue.items);
          setThreshold(catalogue.lowStockThreshold);
        }
      })
      .catch((error) => {
        console.error(error);
        toast('Could not load the stock report.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const productCount = new Set(items.map((item) => item.productId)).size;
  const totalStockValue = items.reduce(
    (sum, item) => sum + item.costPrice * item.quantityOnHand,
    0,
  );
  const lowStockItems = items.filter((item) => isLowStock(item, threshold));

  const columns: Column<CatalogueItem>[] = [
    {
      header: 'Product',
      accessor: (item) => (
        <div>
          <span className="font-semibold text-text-primary block">{item.productName}</span>
          {item.brand && <span className="text-xs text-text-secondary">{item.brand}</span>}
        </div>
      ),
      searchKey: 'productName',
      sortable: true,
    },
    {
      header: 'Variation',
      accessor: (item) => (
        <span className="text-sm text-text-secondary">
          {item.brand ||
            Object.entries(item.attributes || {})
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ') ||
            'Standard'}
        </span>
      ),
    },
    {
      header: 'Stock left',
      accessor: (item) => (
        <span className="text-sm font-bold text-text-primary">
          {item.quantityOnHand} <span className="text-xs font-normal text-text-secondary">{item.unit}</span>
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Reorder level',
      accessor: (item) => (
        <span className="text-sm text-text-secondary font-mono">
          {effectiveMinimumStock(item, threshold)} {item.unit}
        </span>
      ),
    },
    {
      header: 'Value (cost)',
      accessor: (item) => (
        <span className="text-sm font-bold text-text-primary">
          {formatMoney(item.costPrice * item.quantityOnHand)}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Status',
      accessor: (item) => {
        const status = stockStatus(item, threshold);
        const variant = !item.active
          ? 'neutral'
          : status === 'out'
            ? 'danger'
            : status === 'low'
              ? 'warning'
              : 'success';
        const label = !item.active
          ? 'Inactive'
          : status === 'out'
            ? 'Out of Stock'
            : status === 'low'
              ? 'Low Stock'
              : 'In Stock';
        return <StatusBadge status={label} variant={variant} />;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Stock Report"
          description="See what you have in stock, what needs reordering, and what your inventory is worth."
          breadcrumbs={[
            { label: 'Reports', href: ROUTES.APP_REPORTS },
            { label: 'Stock Report' },
          ]}
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="secondary" size="sm" asChild>
            <Link to={ROUTES.APP_REPORTS}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              All Reports
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" />
            Print Report
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Products"
          value={productCount.toString()}
          icon={<Package className="w-5 h-5" />}
          description="Product lines in your catalogue"
        />
        <StatCard
          label="Stock items"
          value={items.length.toString()}
          icon={<Layers className="w-5 h-5" />}
          description="Variations you currently sell"
        />
        <StatCard
          label="Low stock"
          value={lowStockItems.length.toString()}
          icon={<AlertTriangle className="w-5 h-5" />}
          variant={lowStockItems.length > 0 ? 'warning' : 'default'}
          description="Items at or below their reorder level"
        />
        <StatCard
          label="Inventory value"
          value={formatMoney(totalStockValue)}
          icon={<DollarSign className="w-5 h-5" />}
          description="Based on cost price"
        />
      </div>

      {/* Inventory Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-text-primary">All inventory</h3>
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
          searchPlaceholder="Search by product name or brand…"
          emptyTitle="No stock items found"
          emptyDescription="Your catalogue is empty. Add products to start tracking stock."
          mobileCardRender={(item) => {
            const status = stockStatus(item, threshold);
            return (
              <div className="p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-text-primary text-sm">{item.productName}</h4>
                    {item.brand && <p className="text-xs text-text-secondary">{item.brand}</p>}
                  </div>
                  <StatusBadge
                    status={
                      !item.active
                        ? 'Inactive'
                        : status === 'out'
                          ? 'Out of Stock'
                          : status === 'low'
                            ? 'Low Stock'
                            : 'In Stock'
                    }
                    variant={
                      !item.active
                        ? 'neutral'
                        : status === 'out'
                          ? 'danger'
                          : status === 'low'
                            ? 'warning'
                            : 'success'
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/40 pt-2">
                  <div>
                    <span className="text-text-secondary block">On Hand:</span>
                    <span className="font-bold text-text-primary">
                      {item.quantityOnHand} {item.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary block">Valuation:</span>
                    <span className="font-bold text-text-primary">
                      {formatMoney(item.costPrice * item.quantityOnHand)}
                    </span>
                  </div>
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
