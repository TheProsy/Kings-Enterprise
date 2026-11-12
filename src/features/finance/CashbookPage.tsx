import { useEffect, useState, useMemo } from 'react';

import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/tables/DataTable';
import { saleService, purchaseService, expenseService, paymentService } from '@/services';
import { formatMoney, formatDate, toMillis } from '@/lib/formatters';
import {
  amountPaidAtSale,
  isActiveInflowPayment,
  saleLinkedPaymentTotals,
} from '@/lib/payments';
import { toast } from '@/lib/toast';
import { ArrowDownLeft, ArrowUpRight, BookOpen } from 'lucide-react';
import { ROUTES } from '@/constants';
import { FinanceTabs } from './FinanceTabs';

interface CashbookEntry {
  id: string;
  date: any;
  description: string;
  type: 'in' | 'out';
  amount: number;
  reference: string;
}

export function CashbookPage() {
  const [entries, setEntries] = useState<CashbookEntry[]>([]);
  const [balance, setBalance] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      saleService.list(),
      purchaseService.list(),
      expenseService.list(),
      paymentService.list(),
    ])
      .then(([sales, purchases, expenses, payments]) => {
        if (!active) return;

        const linkedPaymentTotals = saleLinkedPaymentTotals(payments);
        const salesById = new Map(sales.map((sale) => [sale.id, sale]));

        const allEntries: CashbookEntry[] = [
          ...sales
            .filter((sale) => sale.status === 'completed')
            .map((sale) => ({
              id: `sale-${sale.id}`,
              date: sale.createdAt,
              description: `Sale #${sale.receiptNumber} (${sale.customerName || 'Walk-in'})`,
              type: 'in' as const,
              amount: amountPaidAtSale(sale, linkedPaymentTotals),
              reference: sale.paymentMethod || 'cash',
            }))
            .filter((entry) => entry.amount > 0),
          ...purchases
            .filter(
              (purchase) =>
                purchase.status !== 'cancelled' && purchase.amountPaid > 0,
            )
            .map((purchase) => ({
              id: `purchase-${purchase.id}`,
              date: purchase.createdAt,
              description: `Purchase #${purchase.purchaseNumber || purchase.id.slice(0, 6)} - ${purchase.supplierName || 'Supplier'}`,
              type: 'out' as const,
              amount: purchase.amountPaid,
              reference: purchase.paymentMethod || 'cash',
            })),
          ...expenses.map((expense) => ({
            id: `expense-${expense.id}`,
            date: expense.createdAt,
            description: `Expense: ${expense.description} (${expense.category})`,
            type: 'out' as const,
            amount: expense.amount,
            reference: expense.paymentMethod || 'cash',
          })),
          ...payments
            .filter(
              (payment) =>
                payment.direction === 'out' ||
                isActiveInflowPayment(payment, salesById),
            )
            .map((payment) => ({
              id: `payment-${payment.id}`,
              date: payment.createdAt,
              description: payment.partyName
                ? `${payment.direction === 'in' ? 'Customer Collection' : 'Supplier Payment'} - ${payment.partyName}`
                : `${payment.direction === 'in' ? 'Customer Payment' : 'Supplier Payment'}`,
              type: payment.direction,
              amount: payment.amount,
              reference: payment.paymentMethod || 'cash',
            })),
        ];

        allEntries.sort((a, b) => toMillis(b.date) - toMillis(a.date));
        setEntries(allEntries);
        setBalance(
          allEntries.reduce(
            (sum, entry) => sum + (entry.type === 'in' ? entry.amount : -entry.amount),
            0,
          ),
        );
      })
      .catch((error) => {
        console.error(error);
        toast('Could not load the cashbook.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredEntries = useMemo(() => {
    if (filterType === 'all') return entries;
    return entries.filter((e) => e.type === filterType);
  }, [entries, filterType]);

  const totalIn = entries.filter((e) => e.type === 'in').reduce((s, e) => s + e.amount, 0);
  const totalOut = entries.filter((e) => e.type === 'out').reduce((s, e) => s + e.amount, 0);

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (e: CashbookEntry) => (
        <span className="text-xs text-text-secondary whitespace-nowrap">{formatDate(e.date)}</span>
      ),
    },
    {
      key: 'description',
      header: 'Particulars & Description',
      render: (e: CashbookEntry) => (
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
              e.type === 'in'
                ? 'bg-success-soft text-success-fg dark:bg-success/20'
                : 'bg-danger-soft text-danger-fg dark:bg-danger/20'
            }`}
          >
            {e.type === 'in' ? '↓' : '↑'}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-xs text-text-primary">{e.description}</p>
            <p className="text-2xs capitalize text-text-muted">{e.reference}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Flow',
      render: (e: CashbookEntry) => (
        <Badge variant={e.type === 'in' ? 'success' : 'danger'}>
          {e.type === 'in' ? 'Money In' : 'Money Out'}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (e: CashbookEntry) => (
        <span
          className={`font-bold text-sm ${
            e.type === 'in' ? 'text-success-fg' : 'text-danger-fg'
          }`}
        >
          {e.type === 'in' ? `+${formatMoney(e.amount)}` : `-${formatMoney(e.amount)}`}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cashbook"
        description="Unified chronological log of every cash and transfer transaction."
        breadcrumbs={[
          { label: 'Money & Finance', href: ROUTES.APP_FINANCE },
          { label: 'Cashbook' },
        ]}
      />

      <FinanceTabs />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Net Cashbook Balance"
          value={formatMoney(balance)}
          subtitle="Cumulative liquid position"
          icon={<BookOpen className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Total Money In"
          value={formatMoney(totalIn)}
          subtitle="Sales & debt collections"
          icon={<ArrowDownLeft className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Total Money Out"
          value={formatMoney(totalOut)}
          subtitle="Stock payments & expenses"
          icon={<ArrowUpRight className="h-5 w-5" />}
          tone="danger"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all btn-press ${
            filterType === 'all'
              ? 'bg-brand text-white shadow-xs'
              : 'bg-surface-3 text-text-secondary hover:text-text-primary border border-border/80'
          }`}
        >
          All ({entries.length})
        </button>
        <button
          onClick={() => setFilterType('in')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all btn-press ${
            filterType === 'in'
              ? 'bg-success text-white shadow-xs'
              : 'bg-surface-3 text-text-secondary hover:text-text-primary border border-border/80'
          }`}
        >
          Money In ({entries.filter((e) => e.type === 'in').length})
        </button>
        <button
          onClick={() => setFilterType('out')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all btn-press ${
            filterType === 'out'
              ? 'bg-danger text-white shadow-xs'
              : 'bg-surface-3 text-text-secondary hover:text-text-primary border border-border/80'
          }`}
        >
          Money Out ({entries.filter((e) => e.type === 'out').length})
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filteredEntries}
        loading={loading}
        emptyTitle="Cashbook is empty"
        emptyMessage="Financial transactions will be recorded automatically as sales and expenses happen."
        mobileCardRender={(e) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-text-primary">{e.description}</p>
                <p className="truncate text-xs text-text-muted">
                  {formatDate(e.date)} · <span className="capitalize">{e.reference}</span>
                </p>
              </div>
              <span
                className={`shrink-0 text-sm font-bold tabular-nums ${
                  e.type === 'in' ? 'text-success-fg' : 'text-danger-fg'
                }`}
              >
                {e.type === 'in' ? `+${formatMoney(e.amount)}` : `-${formatMoney(e.amount)}`}
              </span>
            </div>
          </div>
        )}
      />
    </div>
  );
}
