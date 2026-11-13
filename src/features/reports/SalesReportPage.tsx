import { useCallback, useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { ReportPeriodSelect } from '@/components/forms/ReportPeriodSelect';
import { customerService, saleService } from '@/services';
import { formatMoney, formatDate } from '@/lib/formatters';
import {
  customerIdentity,
  filterByPeriod,
  getPeriodRange,
  netSaleTotal,
  type ReportPeriod,
} from '@/lib/reporting';
import { toast } from '@/lib/toast';
import {
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Printer,
  ArrowLeft,
  UserPlus,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants';
import type { Customer, Sale } from '@/types';

export function SalesReportPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [salesList, customerList] = await Promise.all([
        saleService.list(),
        customerService.list(),
      ]);
      setSales(salesList.filter((sale) => sale.status === 'completed'));
      setCustomers(customerList);
    } catch (err) {
      console.error('Failed to load sales report data:', err);
      toast('Could not load the sales report.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const range = useMemo(() => getPeriodRange(period), [period]);
  const periodSales = useMemo(
    () => filterByPeriod(sales, (sale) => sale.createdAt, range),
    [sales, range],
  );
  const newCustomers = useMemo(
    () => filterByPeriod(customers, (customer) => customer.createdAt, range),
    [customers, range],
  );

  const total = periodSales.reduce((sum, sale) => sum + netSaleTotal(sale), 0);
  const averageSale = periodSales.length > 0 ? total / periodSales.length : 0;
  const customersServed = new Set(
    periodSales
      .map((sale) => customerIdentity(sale))
      .filter((identity): identity is string => Boolean(identity)),
  ).size;

  const columns: Column<Sale>[] = [
    {
      header: 'Date',
      accessor: (s) => (
        <span className="text-sm font-medium text-text-primary">
          {formatDate(s.createdAt)}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Receipt #',
      accessor: (s) => (
        <span className="font-mono text-sm font-semibold text-brand">
          #{s.receiptNumber}
        </span>
      ),
      searchKey: 'receiptNumber',
    },
    {
      header: 'Customer',
      accessor: (s) => (
        <div>
          <p className="text-sm font-medium text-text-primary">
            {s.customerName || (s.customerId ? 'Registered Customer' : 'Walk-in Customer')}
          </p>
          {s.customerPhone && (
            <p className="text-xs text-text-secondary">{s.customerPhone}</p>
          )}
        </div>
      ),
      searchKey: 'customerName',
    },
    {
      header: 'Items',
      accessor: (s) => (
        <span className="text-sm text-text-secondary">
          {s.items?.length || 0} line {s.items?.length === 1 ? 'item' : 'items'}
        </span>
      ),
    },
    {
      header: 'Total Value',
      accessor: (s) => (
        <span className="text-sm font-bold text-text-primary">
          {formatMoney(netSaleTotal(s))}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Status',
      accessor: (s) => {
        const variant =
          s.paymentStatus === 'paid'
            ? 'success'
            : s.paymentStatus === 'partial'
              ? 'warning'
              : 'danger';
        return <StatusBadge status={s.paymentStatus} variant={variant} />;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Report"
        description="Comprehensive audit of all store transactions, revenue generation, and payment settlement statuses."
        breadcrumbs={[
          { label: 'Reports', href: ROUTES.APP_REPORTS },
          { label: 'Sales Report' },
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
          {range.label} · {periodSales.length} completed sale
          {periodSales.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Completed Sales"
          value={periodSales.length.toString()}
          icon={<ShoppingCart className="w-5 h-5" />}
          description="Transactions recorded"
          tone="brand"
        />
        <StatCard
          label="Sales Revenue"
          value={formatMoney(total)}
          icon={<DollarSign className="w-5 h-5" />}
          description="Net invoiced volume"
          tone="success"
        />
        <StatCard
          label="Average Ticket"
          value={formatMoney(averageSale)}
          icon={<TrendingUp className="w-5 h-5" />}
          description="Revenue per transaction"
          tone="warning"
        />
        <StatCard
          label="Customers Served"
          value={customersServed.toString()}
          icon={<Users className="w-5 h-5" />}
          description="Unique named buyers"
          tone="neutral"
        />
        <StatCard
          label="New Customers"
          value={newCustomers.length.toString()}
          icon={<UserPlus className="w-5 h-5" />}
          description="Accounts added in period"
          tone="brand"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-text-primary">Transaction Log</h3>
        <DataTable
          columns={columns}
          data={periodSales}
          loading={loading}
          searchPlaceholder="Search by receipt or customer..."
          emptyTitle="No sales found"
          emptyDescription="There are no sales transactions matching the criteria."
          mobileCardRender={(s) => (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-brand">
                  #{s.receiptNumber}
                </span>
                <StatusBadge
                  status={s.paymentStatus}
                  variant={
                    s.paymentStatus === 'paid'
                      ? 'success'
                      : s.paymentStatus === 'partial'
                        ? 'warning'
                        : 'danger'
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-text-primary">
                  {s.customerName || 'Walk-in Customer'}
                </span>
                <span className="font-bold text-text-primary">
                  {formatMoney(netSaleTotal(s))}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-text-secondary border-t border-border/40 pt-2">
                <span>{formatDate(s.createdAt)}</span>
                <span>{s.items?.length || 0} items</span>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
