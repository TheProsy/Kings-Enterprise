import { useCallback, useMemo, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/forms/SearchInput';
import { DataTable } from '@/components/tables/DataTable';
import { DeleteRecordButton } from '@/components/common/DeleteRecordButton';
import { purchaseService, paymentService } from '@/services';
import { formatMoney, formatDate } from '@/lib/formatters';
import { purchaseBalancesAfterPayments } from '@/lib/payments';
import { PERMISSIONS, ROUTES } from '@/constants';
import { useAuth } from '@/features/auth';
import { toast } from '@/lib/toast';
import type { Payment, Purchase } from '@/types';
import { Plus, Truck } from 'lucide-react';

export function PurchasesPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(PERMISSIONS.PURCHASES_CREATE);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [data, paymentList] = await Promise.all([
        purchaseService.list(),
        paymentService.list(),
      ]);
      setPurchases(data);
      setPayments(paymentList.filter((payment) => payment.direction === 'out'));
    } catch (error) {
      console.error(error);
      toast('Could not load purchases.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const purchaseBalances = useMemo(
    () => purchaseBalancesAfterPayments(purchases, payments),
    [purchases, payments],
  );

  const removePurchase = async (purchase: Purchase) => {
    await purchaseService.remove(purchase.id);
    await loadData();
  };

  const filteredPurchases = purchases.filter((p) => {
    const q = search.toLowerCase();
    const refMatch = (p.purchaseNumber || p.id).toLowerCase().includes(q);
    const supplierMatch = (p.supplierName || '').toLowerCase().includes(q);
    return refMatch || supplierMatch;
  });

  const columns = [
    {
      key: 'createdAt',
      header: 'Date',
      render: (p: Purchase) => (
        <span className="text-xs text-text-secondary whitespace-nowrap">
          {formatDate(p.createdAt)}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'Purchase #',
      render: (p: Purchase) => (
        <div className="flex items-center gap-1.5 font-bold text-xs text-text-primary">
          <Truck className="h-3.5 w-3.5 text-brand" />
          <span>#{p.purchaseNumber || p.id.slice(0, 8)}</span>
        </div>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (p: Purchase) => (
        <span className="font-semibold text-xs text-text-primary">
          {p.supplierName || 'Unknown Supplier'}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (p: Purchase) => (
        <span className="text-xs text-text-muted">
          {p.items?.length || 0} product{p.items?.length === 1 ? '' : 's'}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Purchase Cost',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (p: Purchase) => (
        <span className="font-bold text-sm text-text-primary">{formatMoney(p.total)}</span>
      ),
    },
    {
      key: 'paid',
      header: 'Paid to Supplier',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (p: Purchase) => (
        <span className="text-xs font-semibold text-success-fg">{formatMoney(p.amountPaid)}</span>
      ),
    },
    {
      key: 'balance',
      header: 'Supplier Debt',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (p: Purchase) => {
        const balance = purchaseBalances.get(p.id) ?? p.balanceDue;
        return (
          <span
            className={`text-xs font-bold ${
              balance > 0 ? 'text-danger-fg' : 'text-success-fg'
            }`}
          >
            {balance > 0 ? formatMoney(balance) : 'Settled'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (p: Purchase) => (
        <Badge
          variant={
            p.status === 'received' || p.status === 'completed'
              ? 'success'
              : p.status === 'ordered'
              ? 'info'
              : 'warning'
          }
        >
          {p.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (p: Purchase) => (
        <DeleteRecordButton
          entityLabel="Purchase"
          recordLabel={p.purchaseNumber || p.id.slice(0, 8)}
          description="The received stock is deducted from inventory and the supplier balance is reduced."
          onDelete={() => removePurchase(p)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Purchases & Stock Intake"
        description="Track incoming bulk inventory, shipments from suppliers, and payment obligations."
        action={
          canCreate ? (
            <Button asChild className="shadow-xs">
              <NavLink to={ROUTES.APP_PURCHASES_NEW}>
                <Plus className="h-4 w-4 mr-1.5" />
                New Purchase
              </NavLink>
            </Button>
          ) : undefined
        }
      />

      <div className="max-w-md">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Filter by supplier or purchase number..."
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredPurchases}
        loading={loading}
        emptyTitle="No purchases recorded"
        emptyMessage={
          search
            ? 'No purchases match your search.'
            : 'No inventory intake records found. Click "New Purchase" to receive stock from a supplier.'
        }
        mobileCardRender={(p) => {
          const balance = purchaseBalances.get(p.id) ?? p.balanceDue;
          return (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-brand" />
                  #{p.purchaseNumber || p.id.slice(0, 8)}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">{p.supplierName || 'Unknown Supplier'}</p>
              </div>
              <Badge
                variant={
                  p.status === 'received' || p.status === 'completed'
                    ? 'success'
                    : 'info'
                }
              >
                {p.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-border/60">
              <div>
                <span className="text-text-muted block">Purchase Cost:</span>
                <span className="font-bold text-sm text-text-primary">{formatMoney(p.total)}</span>
              </div>
              <div className="text-right">
                <span className="text-text-muted block">Owed to Supplier:</span>
                <span
                  className={`font-bold text-sm ${
                    balance > 0 ? 'text-danger-fg' : 'text-success-fg'
                  }`}
                >
                  {balance > 0 ? formatMoney(balance) : 'Fully settled'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-2xs text-text-muted pt-0.5">
              <span>{formatDate(p.createdAt)}</span>
              <span>{p.items?.length || 0} material variants</span>
            </div>

            <div className="flex justify-end">
              <DeleteRecordButton
                entityLabel="Purchase"
                recordLabel={p.purchaseNumber || p.id.slice(0, 8)}
                description="The received stock is deducted from inventory and the supplier balance is reduced."
                onDelete={() => removePurchase(p)}
              />
            </div>
          </div>
          );
        }}
      />
    </div>
  );
}
