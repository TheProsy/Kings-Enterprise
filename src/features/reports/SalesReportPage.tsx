import { useCallback, useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { saleService } from '@/services';
import { formatMoney, formatDate } from '@/lib/formatters';
import { ShoppingCart, TrendingUp, DollarSign, Printer, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants';

export function SalesReportPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const data = await saleService.list();
      const completedSales = data.filter((sale) => sale.status === 'completed');
      setSales(completedSales);
      setTotal(
        completedSales.reduce(
          (sum, sale) =>
            sum + Math.max(0, (sale.total || 0) - (sale.returnedTotalKobo || 0)),
          0,
        ),
      );
    } catch (err) {
      console.error('Failed to load sales report data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const averageSale = sales.length > 0 ? total / sales.length : 0;

  const columns: Column<any>[] = [
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
          {formatMoney(s.total)}
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Sales Performance Report"
          description="Comprehensive audit of all store transactions, revenue generation, and payment settlement statuses."
          breadcrumbs={[
            { label: 'Reports', href: ROUTES.APP_REPORTS },
            { label: 'Sales Report' },
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Completed Sales"
          value={sales.length.toString()}
          icon={<ShoppingCart className="w-5 h-5" />}
          description="Transactions recorded"
        />
        <StatCard
          label="Total Revenue Generated"
          value={formatMoney(total)}
          icon={<DollarSign className="w-5 h-5" />}
          description="Gross invoiced volume"
        />
        <StatCard
          label="Average Ticket Size"
          value={formatMoney(averageSale)}
          icon={<TrendingUp className="w-5 h-5" />}
          description="Revenue per transaction"
        />
      </div>

      {/* Transactions Data Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-text-primary">Transaction Log</h3>
        <DataTable
          columns={columns}
          data={sales}
          loading={loading}
          searchPlaceholder="Search by receipt or customer..."
          emptyTitle="No sales found"
          emptyDescription="There are no sales transactions matching the criteria."
          mobileCardRender={(s) => (
            <div className="p-4 space-y-2.5">
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
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-text-primary">
                  {s.customerName || 'Walk-in Customer'}
                </span>
                <span className="font-bold text-text-primary">{formatMoney(s.total)}</span>
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
