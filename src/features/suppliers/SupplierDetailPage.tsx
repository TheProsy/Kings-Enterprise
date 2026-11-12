import { useCallback, useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PriceInput } from '@/components/ui/PriceInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { supplierService, purchaseService, checkoutService, paymentService } from '@/services';
import { ROUTES, PERMISSIONS } from '@/constants';
import { NavLink, useParams } from 'react-router-dom';
import { formatMoney, formatDate, toKobo, generateId } from '@/lib/formatters';
import { purchaseBalancesAfterPayments } from '@/lib/payments';
import { toast } from '@/lib/toast';
import { useAuth } from '@/features/auth';
import type { Payment, Purchase, Supplier } from '@/types';
import { Plus, Check } from 'lucide-react';

export function SupplierDetailPage() {
  const { supplierId } = useParams();
  const { user, hasPermission } = useAuth();
  const canRecordPayment = hasPermission(PERMISSIONS.FINANCE_RECORD_PAYMENT);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<Payment[]>([]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'pos'>('transfer');
  const [savingPayment, setSavingPayment] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [suppliers, purchaseList, paymentList] = await Promise.all([
        supplierService.list(),
        purchaseService.list(),
        paymentService.list(),
      ]);
      setSupplier(suppliers.find((entry) => entry.id === supplierId) ?? null);
      setPurchases(purchaseList.filter((purchase) => purchase.supplierId === supplierId));
      setSupplierPayments(
        paymentList.filter((payment) => payment.direction === 'out'),
      );
    } catch (error) {
      console.error(error);
      toast('Could not load supplier details.', 'error');
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const purchaseBalances = useMemo(
    () => purchaseBalancesAfterPayments(purchases, supplierPayments),
    [purchases, supplierPayments],
  );

  const recordPayment = async () => {
    if (!supplier) return;
    const amountKobo = toKobo(paymentAmount);
    if (amountKobo <= 0 || amountKobo > (supplier.balanceDue || 0)) return;

    setSavingPayment(true);
    try {
      const result = await checkoutService.recordPayment({
        idempotencyKey: generateId(),
        partyType: 'supplier',
        partyId: supplier.id,
        amount: amountKobo,
        paymentMethod,
        recordedBy: user?.uid || user?.id || 'unknown',
      });
      toast(
        `Supplier payment recorded! Remaining balance: ${formatMoney(result.balanceDue)}`,
        'success',
      );
      setPaymentAmount(0);
      await loadData();
    } catch (error) {
      console.error(error);
      toast('Could not record the payment. Please try again.', 'error');
    } finally {
      setSavingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-text-secondary">
        Loading supplier account...
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-6">
        <EmptyState
          title="Supplier not found"
          description="This supplier record may have been removed or does not exist."
        />
      </div>
    );
  }

  const columns = [
    {
      key: 'createdAt',
      header: 'Date',
      render: (p: Purchase) => (
        <span className="text-xs text-text-secondary">{formatDate(p.createdAt)}</span>
      ),
    },
    {
      key: 'ref',
      header: 'Purchase #',
      render: (p: Purchase) => (
        <span className="font-bold text-xs text-text-primary">
          #{p.purchaseNumber || p.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (p: Purchase) => (
        <span className="text-xs text-text-muted">{p.items?.length || 0} variants</span>
      ),
    },
    {
      key: 'total',
      header: 'Total Cost',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (p: Purchase) => (
        <span className="font-bold text-xs text-text-primary">{formatMoney(p.total)}</span>
      ),
    },
    {
      key: 'paid',
      header: 'Amount Paid',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (p: Purchase) => (
        <span className="text-xs font-semibold text-success-fg">{formatMoney(p.amountPaid)}</span>
      ),
    },
    {
      key: 'balance',
      header: 'Debt Remaining',
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
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        description="Vendor ledger, invoices, and debt settlements."
        breadcrumbs={[
          { label: 'Suppliers', href: ROUTES.APP_SUPPLIERS },
          { label: supplier.name },
        ]}
        action={
          <Button asChild className="shadow-xs">
            <NavLink to={ROUTES.APP_PURCHASES_NEW}>
              <Plus className="h-4 w-4 mr-1.5" />
              Receive New Stock
            </NavLink>
          </Button>
        }
      />

      {/* Supplier Overview & Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="soft" className="p-5">
          <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted block">
            We Owe Supplier (Payable)
          </span>
          <p
            className={`text-2xl font-bold mt-1 tracking-tight ${
              (supplier.balanceDue || 0) > 0 ? 'text-danger-fg' : 'text-success-fg'
            }`}
          >
            {formatMoney(supplier.balanceDue || 0)}
          </p>
          <span className="text-xs text-text-muted mt-1 block">
            {(supplier.balanceDue || 0) > 0 ? 'Outstanding invoice debt' : 'No pending payments'}
          </span>
        </Card>

        <Card variant="soft" className="p-5">
          <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted block">
            Total Invoices Billed
          </span>
          <p className="text-2xl font-bold text-text-primary mt-1 tracking-tight">
            {formatMoney(supplier.totalPurchases || 0)}
          </p>
          <span className="text-xs text-text-muted mt-1 block">Lifetime purchase orders</span>
        </Card>

        <Card variant="soft" className="p-5">
          <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted block">
            Contact & Location
          </span>
          <p className="text-sm font-semibold text-text-primary mt-1">
            {supplier.phone || 'No phone recorded'}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">{supplier.address || 'No address specified'}</p>
        </Card>
      </div>

      {/* Settle Debt Panel */}
      {canRecordPayment && (supplier.balanceDue || 0) > 0 && (
        <Card className="p-5 border-danger-soft-border bg-danger-soft/30 dark:bg-danger/10">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-bold text-text-primary">
              Record Supplier Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <PriceInput
                  label="Payment Amount"
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  placeholder="0.00"
                />
              </div>
              <div className="w-full sm:w-48">
                <label className="text-xs font-semibold text-text-primary block uppercase tracking-wider mb-1.5">
                  Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border/80 bg-surface text-sm text-text-primary shadow-xs outline-none"
                >
                  <option value="transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="pos">POS</option>
                </select>
              </div>
              <Button
                variant="primary"
                onClick={recordPayment}
                disabled={paymentAmount <= 0 || savingPayment}
                isLoading={savingPayment}
                className="w-full sm:w-auto shadow-xs"
              >
                <Check className="h-4 w-4 mr-1.5" />
                Submit Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase History for this supplier */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-text-primary tracking-tight">
          Purchase History with {supplier.name}
        </h3>
        <DataTable
          columns={columns}
          data={purchases}
          loading={loading}
          searchPlaceholder="Search purchases by number, status or date..."
          emptyTitle="No purchases on file"
          emptyMessage="No stock receiving records have been linked to this supplier yet."
          mobileCardRender={(purchase) => {
            const balance = purchaseBalances.get(purchase.id) ?? purchase.balanceDue;
            return (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-text-primary">
                      #{purchase.purchaseNumber || purchase.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatDate(purchase.createdAt)} · {purchase.items?.length || 0} variants
                    </p>
                  </div>
                  <Badge variant={balance > 0 ? 'danger' : 'success'}>
                    {balance > 0 ? 'Owing' : 'Settled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                  <span className="text-text-muted">Total {formatMoney(purchase.total)}</span>
                  <span className="font-semibold text-success-fg">
                    Paid {formatMoney(purchase.amountPaid)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Debt remaining</span>
                  <span
                    className={`font-bold ${
                      balance > 0 ? 'text-danger-fg' : 'text-success-fg'
                    }`}
                  >
                    {balance > 0 ? formatMoney(balance) : 'Settled'}
                  </span>
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
