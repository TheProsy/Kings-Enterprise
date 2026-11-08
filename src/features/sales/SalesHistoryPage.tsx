import { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/forms/SearchInput';
import { DataTable } from '@/components/tables/DataTable';
import { Modal } from '@/components/ui/Modal';
import { saleService } from '@/services';
import { PERMISSIONS, ROUTES, buildRoute } from '@/constants';
import { useAuth } from '@/features/auth';
import { formatMoney, formatDate, formatDateTime } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import type { Sale } from '@/types';
import { Plus, Receipt, Eye } from 'lucide-react';

export function SalesHistoryPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(PERMISSIONS.SALES_CREATE);
  const [searchParams] = useSearchParams();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    let active = true;
    saleService
      .list()
      .then((data) => {
        if (active) setSales(data);
      })
      .catch((error) => {
        console.error(error);
        toast('Could not load sales history.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const q = search.toLowerCase();
      const receiptMatch = s.receiptNumber?.toString().toLowerCase().includes(q);
      const customerMatch = s.customerName?.toLowerCase().includes(q);
      return receiptMatch || customerMatch;
    });
  }, [sales, search]);

  const columns = [
    {
      key: 'createdAt',
      header: 'Date',
      render: (sale: Sale) => (
        <span className="text-xs text-text-secondary whitespace-nowrap">
          {formatDate(sale.createdAt)}
        </span>
      ),
    },
    {
      key: 'receipt',
      header: 'Receipt #',
      render: (sale: Sale) => (
        <div className="flex items-center gap-1.5 font-bold text-xs text-text-primary">
          <Receipt className="h-3.5 w-3.5 text-brand" />
          {sale.receiptId ? (
            <NavLink
              to={buildRoute(ROUTES.APP_RECEIPT_DETAIL, { receiptId: sale.receiptId })}
              onClick={(event) => event.stopPropagation()}
              className="hover:text-brand hover:underline"
            >
              #{sale.receiptNumber}
            </NavLink>
          ) : (
            <span>#{sale.receiptNumber}</span>
          )}
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (sale: Sale) => (
        <span className="text-xs text-text-secondary">
          {sale.customerName || (sale.customerId ? 'Registered Account' : 'Walk-in Customer')}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (sale: Sale) => (
        <span className="text-xs text-text-muted">
          {sale.items?.length || 0} product{sale.items?.length === 1 ? '' : 's'}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total Sale',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (sale: Sale) => (
        <span className="font-bold text-sm text-text-primary">{formatMoney(sale.total)}</span>
      ),
    },
    {
      key: 'paid',
      header: 'Amount Paid',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (sale: Sale) => (
        <span className="text-xs font-semibold text-success-fg">{formatMoney(sale.amountPaid)}</span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance Due',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (sale: Sale) => (
        <span
          className={`text-xs font-bold ${
            sale.balanceDue > 0 ? 'text-warning-fg' : 'text-success-fg'
          }`}
        >
          {sale.balanceDue > 0 ? formatMoney(sale.balanceDue) : 'Paid'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (sale: Sale) => (
        <Badge
          variant={
            sale.status === 'completed'
              ? 'success'
              : sale.status === 'cancelled'
              ? 'danger'
              : 'warning'
          }
        >
          {sale.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (sale: Sale) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSelectedSale(sale)}
          aria-label="View Receipt"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Records & Receipts"
        description="Search past sales receipts, monitor credit collections, and inspect itemized breakdown."
        action={
          canCreate ? (
            <Button asChild className="shadow-xs">
              <NavLink to={ROUTES.APP_SALES_NEW}>
                <Plus className="h-4 w-4 mr-1.5" />
                New Sale
              </NavLink>
            </Button>
          ) : undefined
        }
      />

      {/* Filter / Search Bar */}
      <div className="max-w-md">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Filter by receipt number or customer name..."
        />
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredSales}
        loading={loading}
        emptyTitle="No sales found"
        emptyMessage={
          search
            ? 'No recorded sales matched your search term.'
            : 'No customer sales recorded yet. Click "New Sale" to create your first receipt.'
        }
        onRowClick={(sale) => setSelectedSale(sale)}
        mobileCardRender={(sale) => (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-brand" />
                  #{sale.receiptNumber}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {sale.customerName || (sale.customerId ? 'Registered Customer' : 'Walk-in Customer')}
                </p>
              </div>
              <Badge
                variant={
                  sale.status === 'completed'
                    ? 'success'
                    : sale.status === 'cancelled'
                    ? 'danger'
                    : 'warning'
                }
              >
                {sale.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-border/60">
              <div>
                <span className="text-text-muted block">Total Amount:</span>
                <span className="font-bold text-sm text-text-primary">{formatMoney(sale.total)}</span>
              </div>
              <div className="text-right">
                <span className="text-text-muted block">Balance Due:</span>
                <span
                  className={`font-bold text-sm ${
                    sale.balanceDue > 0 ? 'text-warning-fg' : 'text-success-fg'
                  }`}
                >
                  {sale.balanceDue > 0 ? formatMoney(sale.balanceDue) : 'Paid in full'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-2xs text-text-muted pt-0.5">
              <span>{formatDate(sale.createdAt)}</span>
              <span className="text-brand font-semibold">Tap to view receipt →</span>
            </div>
          </div>
        )}
      />

      {/* Receipt Detail Modal */}
      {selectedSale && (
        <Modal
          open={Boolean(selectedSale)}
          onClose={() => setSelectedSale(null)}
          title={`Receipt #${selectedSale.receiptNumber}`}
          description={`Recorded on ${formatDateTime(selectedSale.createdAt)}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-surface-3 border border-border/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-2xs uppercase tracking-wider text-text-muted font-semibold block">
                  Customer
                </span>
                <span className="text-sm font-bold text-text-primary">
                  {selectedSale.customerName || (selectedSale.customerId ? 'Registered Customer' : 'Walk-in Customer')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xs uppercase tracking-wider text-text-muted font-semibold block">
                  Staff Served
                </span>
                <span className="text-xs font-semibold text-text-secondary">
                  {selectedSale.employeeName || 'Staff'}
                </span>
              </div>
            </div>

            {/* Line items list */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider block">
                Purchased Materials
              </span>
              <div className="divide-y divide-border/60 border border-border rounded-xl overflow-hidden bg-surface">
                {selectedSale.items?.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-text-primary">{item.productName}</p>
                      <p className="text-text-muted text-2xs">
                        {item.variantName} · {item.quantity} {item.unit} @ {formatMoney(item.unitSellingPrice)}
                      </p>
                    </div>
                    <span className="font-bold text-text-primary">
                      {formatMoney(item.quantity * item.unitSellingPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total computation */}
            <div className="p-3.5 rounded-xl bg-surface-3 border border-border/80 space-y-1.5 text-xs">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal:</span>
                <span className="font-semibold text-text-primary">{formatMoney(selectedSale.subtotal || selectedSale.total)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Amount Paid ({selectedSale.paymentMethod}):</span>
                <span className="font-semibold text-success-fg">{formatMoney(selectedSale.amountPaid)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-border/60 text-sm font-bold">
                <span>Total:</span>
                <span className="text-base text-brand">
                  {formatMoney(selectedSale.total)}
                </span>
              </div>
              {selectedSale.balanceDue > 0 && (
                <div className="flex justify-between text-xs font-bold text-warning-fg pt-1">
                  <span>Outstanding Credit:</span>
                  <span>{formatMoney(selectedSale.balanceDue)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {selectedSale.receiptId ? (
                <Button
                  size="sm"
                  onClick={() => {
                    const receiptId = selectedSale.receiptId;
                    setSelectedSale(null);
                    if (receiptId) {
                      navigate(buildRoute(ROUTES.APP_RECEIPT_DETAIL, { receiptId }));
                    }
                  }}
                >
                  <Receipt className="h-3.5 w-3.5" />
                  Open Receipt
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSale(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
