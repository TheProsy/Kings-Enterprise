import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { ReportPeriodSelect } from '@/components/forms/ReportPeriodSelect';
import { customerService, expenseService, paymentService, saleService } from '@/services';
import { formatMoney, formatDate } from '@/lib/formatters';
import {
  amountPaidAtSale,
  isActiveInflowPayment,
  saleLinkedPaymentTotals,
} from '@/lib/payments';
import {
  bucketKey,
  bucketLabel,
  customerIdentity,
  filterByPeriod,
  getPeriodRange,
  netSaleTotal,
  saleCogs,
  type ReportPeriod,
} from '@/lib/reporting';
import { toast } from '@/lib/toast';
import { ROUTES } from '@/constants';
import {
  ArrowDownLeft,
  ArrowLeft,
  DollarSign,
  Printer,
  Receipt,
  ShoppingCart,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import type { Customer, Expense, Payment, Sale } from '@/types';

interface LedgerRow {
  key: string;
  label: string;
  salesCount: number;
  revenue: number;
  cogs: number;
  expenses: number;
  netIncome: number;
}

interface CategoryRow {
  category: string;
  count: number;
  total: number;
}

export function IncomeReportPage() {
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [salesList, expenseList, paymentList, customerList] = await Promise.all([
        saleService.list(),
        expenseService.list(),
        paymentService.list(),
        customerService.list(),
      ]);
      setSales(salesList.filter((sale) => sale.status === 'completed'));
      setExpenses(expenseList);
      setPayments(paymentList);
      setCustomers(customerList);
    } catch (error) {
      console.error(error);
      toast('Could not load the income report.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const range = useMemo(() => getPeriodRange(period), [period]);
  const periodSales = useMemo(
    () => filterByPeriod(sales, (sale) => sale.createdAt, range),
    [sales, range],
  );
  const periodExpenses = useMemo(
    () => filterByPeriod(expenses, (expense) => expense.createdAt, range),
    [expenses, range],
  );
  const salesById = useMemo(() => new Map(sales.map((sale) => [sale.id, sale])), [sales]);
  const periodPayments = useMemo(
    () =>
      filterByPeriod(
        payments.filter((payment) => isActiveInflowPayment(payment, salesById)),
        (payment) => payment.createdAt,
        range,
      ),
    [payments, salesById, range],
  );
  const newCustomers = useMemo(
    () => filterByPeriod(customers, (customer) => customer.createdAt, range),
    [customers, range],
  );

  const revenue = periodSales.reduce((sum, sale) => sum + netSaleTotal(sale), 0);
  const cogs = periodSales.reduce((sum, sale) => sum + saleCogs(sale), 0);
  const grossProfit = revenue - cogs;
  const expenseTotal = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netIncome = grossProfit - expenseTotal;
  const linkedPaymentTotals = saleLinkedPaymentTotals(payments);
  const cashReceived =
    periodSales.reduce(
      (sum, sale) => sum + amountPaidAtSale(sale, linkedPaymentTotals),
      0,
    ) + periodPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const itemsSold = periodSales.reduce(
    (sum, sale) =>
      sum +
      (sale.items ?? []).reduce((lineSum, item) => {
        const returned = Number(
          sale.returnedQuantities?.[`${item.productId}:${item.variantId}`] ?? 0,
        );
        return lineSum + Math.max(0, item.quantity - returned);
      }, 0),
    0,
  );
  const customersServed = new Set(
    periodSales
      .map((sale) => customerIdentity(sale))
      .filter((identity): identity is string => Boolean(identity)),
  ).size;
  const averageSale = periodSales.length > 0 ? revenue / periodSales.length : 0;

  const ledgerRows = useMemo<LedgerRow[]>(() => {
    const rows = new Map<string, LedgerRow>();
    const ensure = (key: string) => {
      let row = rows.get(key);
      if (!row) {
        row = {
          key,
          label: bucketLabel(key, period),
          salesCount: 0,
          revenue: 0,
          cogs: 0,
          expenses: 0,
          netIncome: 0,
        };
        rows.set(key, row);
      }
      return row;
    };

    periodSales.forEach((sale) => {
      const row = ensure(bucketKey(sale.createdAt, period));
      row.salesCount += 1;
      row.revenue += netSaleTotal(sale);
      row.cogs += saleCogs(sale);
    });
    periodExpenses.forEach((expense) => {
      ensure(bucketKey(expense.createdAt, period)).expenses += expense.amount;
    });
    rows.forEach((row) => {
      row.netIncome = row.revenue - row.cogs - row.expenses;
    });
    return [...rows.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [periodSales, periodExpenses, period]);

  const categoryRows = useMemo<CategoryRow[]>(() => {
    const rows = new Map<string, CategoryRow>();
    periodExpenses.forEach((expense) => {
      const row = rows.get(expense.category) ?? {
        category: expense.category,
        count: 0,
        total: 0,
      };
      row.count += 1;
      row.total += expense.amount;
      rows.set(expense.category, row);
    });
    return [...rows.values()].sort((a, b) => b.total - a.total);
  }, [periodExpenses]);

  const ledgerColumns: Column<LedgerRow>[] = [
    {
      header: 'Period',
      accessor: (row) => (
        <span className="font-semibold text-text-primary">{row.label}</span>
      ),
      searchKey: 'label',
      sortable: true,
    },
    {
      header: 'Sales',
      accessor: (row) => <span className="text-text-secondary">{row.salesCount}</span>,
      sortable: true,
    },
    {
      header: 'Revenue',
      accessor: (row) => (
        <span className="font-semibold text-text-primary">{formatMoney(row.revenue)}</span>
      ),
      sortable: true,
    },
    {
      header: 'COGS',
      accessor: (row) => (
        <span className="text-text-secondary">{formatMoney(row.cogs)}</span>
      ),
      sortable: true,
    },
    {
      header: 'Expenses',
      accessor: (row) => (
        <span className="text-danger-fg">{formatMoney(row.expenses)}</span>
      ),
      sortable: true,
    },
    {
      header: 'Net Income',
      accessor: (row) => (
        <span
          className={`font-bold ${row.netIncome >= 0 ? 'text-success-fg' : 'text-danger-fg'}`}
        >
          {formatMoney(row.netIncome)}
        </span>
      ),
      sortable: true,
    },
  ];

  const customerColumns: Column<Customer>[] = [
    {
      header: 'Customer',
      accessor: (customer) => (
        <span className="font-semibold text-text-primary">{customer.name}</span>
      ),
      searchKey: 'name',
      sortable: true,
    },
    {
      header: 'Phone',
      accessor: (customer) => (
        <span className="text-text-secondary">{customer.phone || '—'}</span>
      ),
      searchKey: 'phone',
    },
    {
      header: 'Date added',
      accessor: (customer) => (
        <span className="text-text-secondary">{formatDate(customer.createdAt)}</span>
      ),
    },
    {
      header: 'Lifetime purchases',
      accessor: (customer) => (
        <span className="font-semibold text-text-primary">
          {formatMoney(customer.totalPurchases)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income Report"
        description="Income statement and activity ledger for the selected day, week, month or year, including customer acquisition."
        breadcrumbs={[
          { label: 'Reports', href: ROUTES.APP_REPORTS },
          { label: 'Income Report' },
        ]}
        action={
          <>
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
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportPeriodSelect value={period} onChange={setPeriod} />
        <p className="text-xs text-text-muted">
          {range.label} · {periodSales.length} sale{periodSales.length === 1 ? '' : 's'} ·{' '}
          {periodExpenses.length} expense{periodExpenses.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Net Income"
          value={formatMoney(netIncome)}
          subtitle="Gross profit minus expenses"
          icon={<TrendingUp className="h-5 w-5" />}
          tone={netIncome >= 0 ? 'success' : 'danger'}
        />
        <StatCard
          label="Sales Revenue"
          value={formatMoney(revenue)}
          subtitle={`${periodSales.length} completed sales`}
          icon={<DollarSign className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Operating Expenses"
          value={formatMoney(expenseTotal)}
          subtitle={`${periodExpenses.length} recorded expenses`}
          icon={<Receipt className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label="New Customers"
          value={newCustomers.length}
          subtitle={`${customersServed} customers served`}
          icon={<UserPlus className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Cash Collected"
          value={formatMoney(cashReceived)}
          subtitle="Sales receipts + debt payments"
          icon={<ArrowDownLeft className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Gross Profit"
          value={formatMoney(grossProfit)}
          subtitle={`COGS ${formatMoney(cogs)}`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Items Sold"
          value={itemsSold}
          subtitle={`Average sale ${formatMoney(averageSale)}`}
          icon={<ShoppingCart className="h-5 w-5" />}
          tone="neutral"
        />
        <StatCard
          label="Customers Served"
          value={customersServed}
          subtitle="Unique named or registered buyers"
          icon={<Users className="h-5 w-5" />}
          tone="neutral"
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-text-primary">Income Ledger</h3>
        <DataTable
          columns={ledgerColumns}
          data={ledgerRows}
          loading={loading}
          searchPlaceholder="Search period..."
          emptyTitle="No activity in this period"
          emptyMessage="Sales and expenses recorded in the selected period will appear here."
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border px-4 py-3">
            <CardTitle className="text-base">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {categoryRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-secondary">
                No expenses recorded in this period.
              </p>
            ) : (
              <div className="space-y-3">
                {categoryRows.map((row) => {
                  const share = expenseTotal > 0 ? (row.total / expenseTotal) * 100 : 0;
                  return (
                    <div key={row.category} className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-medium capitalize text-text-primary">
                          {row.category}
                        </span>
                        <span className="shrink-0 font-bold tabular-nums text-text-primary">
                          {formatMoney(row.total)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${Math.min(share, 100)}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-2xs text-text-muted">
                          {share.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border px-4 py-3">
            <CardTitle className="text-base">Customer Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-xs uppercase tracking-wide text-text-secondary">
                  New customers
                </p>
                <p className="mt-1 text-2xl font-bold text-text-primary">
                  {newCustomers.length}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-xs uppercase tracking-wide text-text-secondary">
                  Customers served
                </p>
                <p className="mt-1 text-2xl font-bold text-text-primary">
                  {customersServed}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-xs uppercase tracking-wide text-text-secondary">
                  Registered customers
                </p>
                <p className="mt-1 text-2xl font-bold text-text-primary">
                  {customers.length}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-xs uppercase tracking-wide text-text-secondary">
                  Average sale
                </p>
                <p className="mt-1 text-lg font-bold text-text-primary">
                  {formatMoney(averageSale)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-text-primary">
          Customers Acquired ({range.label})
        </h3>
        <DataTable
          columns={customerColumns}
          data={newCustomers}
          loading={loading}
          searchPlaceholder="Search new customers..."
          emptyTitle="No new customers"
          emptyMessage="Customers added during the selected period will appear here."
          mobileCardRender={(customer) => (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-bold text-text-primary">
                  {customer.name}
                </p>
                <span className="shrink-0 text-sm font-semibold text-text-primary">
                  {formatMoney(customer.totalPurchases)}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                {customer.phone || 'No phone'} · Added {formatDate(customer.createdAt)}
              </p>
            </div>
          )}
        />
      </div>
    </div>
  );
}
