import { useCallback, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PriceInput } from '@/components/ui/PriceInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { customerService, saleService, checkoutService, receiptService } from '@/services';
import { ROUTES, PERMISSIONS } from '@/constants';
import { NavLink, useParams } from 'react-router-dom';
import { formatMoney, formatDate, toKobo, generateId } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import { useAuth } from '@/features/auth';
import type { Customer, Sale } from '@/types';
import { Check, AlertTriangle } from 'lucide-react';

export function CustomerDetailPage() {
  const { customerId } = useParams();
  const { user, hasPermission } = useAuth();
  const canRecordPayment = hasPermission(PERMISSIONS.FINANCE_RECORD_PAYMENT);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'pos'>('cash');
  const [savingPayment, setSavingPayment] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [customers, salesList] = await Promise.all([
        customerService.list(),
        saleService.list(),
      ]);
      setCustomer(customers.find((entry) => entry.id === customerId) ?? null);
      setSales(
        salesList
          .filter((sale) => sale.customerId === customerId)
          .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime()),
      );
    } catch (error) {
      console.error(error);
      toast('Could not load customer details.', 'error');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const recordPayment = async () => {
    if (!customer) return;
    const amountKobo = toKobo(paymentAmount);
    if (amountKobo <= 0 || amountKobo > (customer.balanceDue || 0)) {
      toast('Enter a valid payment amount not exceeding total debt.', 'warning');
      return;
    }

    setSavingPayment(true);
    try {
      const outstandingSales = sales
        .filter(
          (sale) =>
            sale.status === 'completed' && Number(sale.balanceDue || 0) > 0,
        )
        .sort(
          (a, b) =>
            new Date(a.createdAt as any).getTime() -
            new Date(b.createdAt as any).getTime(),
        );

      let remaining = amountKobo;
      let receiptsIssued = 0;

      for (const sale of outstandingSales) {
        if (remaining <= 0) break;
        const due = Math.max(0, Number(sale.balanceDue || 0));
        if (due <= 0) continue;
        const payment = Math.min(remaining, due);
        await receiptService.recordPayment({
          idempotencyKey: generateId(),
          saleId: sale.id,
          amount: payment,
          paymentMethod,
        });
        remaining -= payment;
        receiptsIssued += 1;
      }

      if (remaining > 0) {
        await checkoutService.recordPayment({
          idempotencyKey: generateId(),
          partyType: 'customer',
          partyId: customer.id,
          amount: remaining,
          paymentMethod,
          recordedBy: user?.uid || user?.id || 'unknown',
        });
      }

      toast(
        `${formatMoney(amountKobo - remaining)} collected${
          receiptsIssued > 0
            ? ` across ${receiptsIssued} sale receipt${receiptsIssued === 1 ? '' : 's'}`
            : ''
        }.`,
        'success',
      );
      setPaymentAmount(0);
      await loadData();
    } catch (error) {
      console.error(error);
      await loadData();
      toast('Could not record the payment. Please try again.', 'error');
    } finally {
      setSavingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-text-secondary">
        Loading customer ledger...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <EmptyState
          title="Customer not found"
          description="This customer account does not exist or may have been removed."
        />
      </div>
    );
  }

  const columns = [
    {
      key: 'createdAt',
      header: 'Date',
      render: (s: Sale) => (
        <span className="text-xs text-text-secondary">{formatDate(s.createdAt)}</span>
      ),
    },
    {
      key: 'receipt',
      header: 'Receipt #',
      render: (s: Sale) => (
        <span className="font-bold text-xs text-text-primary">#{s.receiptNumber}</span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (s: Sale) => (
        <span className="text-xs text-text-muted">{s.items?.length || 0} items</span>
      ),
    },
    {
      key: 'total',
      header: 'Total Sale',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (s: Sale) => (
        <span className="font-bold text-xs text-text-primary">{formatMoney(s.total)}</span>
      ),
    },
    {
      key: 'paid',
      header: 'Amount Paid',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (s: Sale) => (
        <span className="text-xs font-semibold text-success-fg">{formatMoney(s.amountPaid)}</span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance Due',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (s: Sale) => (
        <span
          className={`text-xs font-bold ${
            s.balanceDue > 0 ? 'text-warning-fg' : 'text-success-fg'
          }`}
        >
          {s.balanceDue > 0 ? formatMoney(s.balanceDue) : 'Settled'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s: Sale) => (
        <Badge variant={s.status === 'completed' ? 'success' : 'warning'}>
          {s.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description="Customer ledger, credit status, and chronological transaction receipts."
        breadcrumb={
          <NavLink to={ROUTES.APP_CUSTOMERS} className="hover:underline">
            ← Back to Customers
          </NavLink>
        }
      />

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Outstanding debt card with clear warning styling */}
        <Card
          className={`p-5 ${
            (customer.balanceDue || 0) > 0
              ? 'bg-warning-soft/40 border-warning/30 dark:bg-warning/10'
              : 'variant-soft'
          }`}
        >
          <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted block">
            Outstanding Customer Debt
          </span>
          <p
            className={`text-2xl font-bold mt-1 tracking-tight ${
              (customer.balanceDue || 0) > 0 ? 'text-warning-fg' : 'text-success-fg'
            }`}
          >
            {formatMoney(customer.balanceDue || 0)}
          </p>
          <span className="text-xs text-text-muted mt-1 block">
            {(customer.balanceDue || 0) > 0
              ? 'Overdue balance owed to the store'
              : 'Account fully settled'}
          </span>
        </Card>

        <Card variant="soft" className="p-5">
          <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted block">
            Total Sales Invoiced
          </span>
          <p className="text-2xl font-bold text-text-primary mt-1 tracking-tight">
            {formatMoney(customer.totalPurchases || 0)}
          </p>
          <span className="text-xs text-text-muted mt-1 block">Lifetime purchase value</span>
        </Card>

        <Card variant="soft" className="p-5">
          <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted block">
            Customer Information
          </span>
          <p className="text-sm font-semibold text-text-primary mt-1">
            {customer.phone || 'No phone recorded'}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">{customer.address || 'No address on file'}</p>
        </Card>
      </div>

      {/* Collect Debt Payment Form */}
      {canRecordPayment && (customer.balanceDue || 0) > 0 && (
        <Card className="p-5 border-warning/30 bg-warning-soft/20 dark:bg-warning/10 shadow-xs">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-bold text-text-primary flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-warning-fg" />
              Collect Outstanding Debt
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <PriceInput
                  label="Amount Collected"
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  placeholder="0.00"
                />
              </div>
              <div className="w-full sm:w-48">
                <label className="text-xs font-semibold text-text-primary block uppercase tracking-wider mb-1.5">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border/80 bg-surface text-sm text-text-primary shadow-xs outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="transfer">Bank Transfer</option>
                  <option value="pos">POS</option>
                </select>
              </div>
              <Button
                variant="primary"
                onClick={recordPayment}
                disabled={paymentAmount <= 0 || savingPayment}
                isLoading={savingPayment}
                className="w-full sm:w-auto shadow-xs font-semibold"
              >
                <Check className="h-4 w-4 mr-1.5" />
                Record Collection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chronological Transaction History */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-text-primary tracking-tight">
          Sales & Credit History with {customer.name}
        </h3>
        <DataTable
          columns={columns}
          data={sales}
          loading={loading}
          emptyTitle="No purchases recorded"
          emptyMessage="This customer has not completed any purchases under their account yet."
        />
      </div>
    </div>
  );
}
