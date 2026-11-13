import { useCallback, useMemo, useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { StatsSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ReportPeriodSelect } from '@/components/forms/ReportPeriodSelect';
import { saleService, expenseService } from '@/services';
import { formatMoney } from '@/lib/formatters';
import {
  filterByPeriod,
  getPeriodRange,
  netSaleTotal,
  saleCogs,
  type ReportPeriod,
} from '@/lib/reporting';
import { toast } from '@/lib/toast';
import { TrendingUp, DollarSign, ArrowDownRight, ArrowUpRight, Printer, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants';
import type { Expense, Sale } from '@/types';

export function ProfitReportPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [salesList, expenseList] = await Promise.all([
        saleService.list(),
        expenseService.list(),
      ]);
      setSales(salesList.filter((sale) => sale.status === 'completed'));
      setExpenses(expenseList);
    } catch (err) {
      console.error('Failed to load profit statistics:', err);
      toast('Could not load the profit report.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const range = useMemo(() => getPeriodRange(period), [period]);
  const stats = useMemo(() => {
    const periodSales = filterByPeriod(sales, (sale) => sale.createdAt, range);
    const periodExpenses = filterByPeriod(expenses, (expense) => expense.createdAt, range);
    const totalSalesRevenue = periodSales.reduce((sum, sale) => sum + netSaleTotal(sale), 0);
    const totalCOGS = periodSales.reduce((sum, sale) => sum + saleCogs(sale), 0);
    const totalExpenses = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const grossProfit = totalSalesRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;

    return {
      totalSalesRevenue,
      totalCOGS,
      totalExpenses,
      grossProfit,
      netProfit,
      grossMargin: totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0,
      netMargin: totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0,
      transactionCount: periodSales.length,
      expenseCount: periodExpenses.length,
    };
  }, [sales, expenses, range]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit & Loss"
        description="Detailed breakdown of revenue, cost of goods sold, operating expenses, and net profit margins."
        breadcrumbs={[
          { label: 'Reports', href: ROUTES.APP_REPORTS },
          { label: 'Profit & Loss' },
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
              Print P&L
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportPeriodSelect value={period} onChange={setPeriod} />
        <p className="text-xs text-text-muted">
          {range.label} · {stats.transactionCount} sale
          {stats.transactionCount === 1 ? '' : 's'} · {stats.expenseCount} expense
          {stats.expenseCount === 1 ? '' : 's'}
        </p>
      </div>

      {/* Primary KPI Stats */}
      {loading ? (
        <StatsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Revenue"
            value={formatMoney(stats.totalSalesRevenue || 0)}
            icon={<DollarSign className="w-5 h-5" />}
            description={`${stats.transactionCount || 0} completed sales`}
            tone="brand"
          />
          <StatCard
            label="Cost of Goods Sold"
            value={formatMoney(stats.totalCOGS || 0)}
            icon={<ArrowDownRight className="w-5 h-5" />}
            description="Direct material costs"
            tone="danger"
          />
          <StatCard
            label="Gross Profit"
            value={formatMoney(stats.grossProfit || 0)}
            icon={<TrendingUp className="w-5 h-5" />}
            variant={(stats.grossProfit || 0) >= 0 ? 'success' : 'danger'}
            description={`${(stats.grossMargin || 0).toFixed(1)}% gross margin`}
          />
          <StatCard
            label="Net Operating Profit"
            value={formatMoney(stats.netProfit || 0)}
            icon={<ArrowUpRight className="w-5 h-5" />}
            variant={(stats.netProfit || 0) >= 0 ? 'success' : 'danger'}
            description={`${(stats.netMargin || 0).toFixed(1)}% net margin`}
          />
        </div>
      )}

      {/* Financial Statement Structure Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gross Profit Calculation Card */}
        <Card variant="soft" className="p-5 space-y-4">
          <CardHeader>
            <CardTitle>Trading Account (Gross Profit)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2 text-sm py-2 border-b border-border/60">
              <span className="text-text-secondary font-medium">Total Sales Revenue</span>
              <span className="font-bold text-text-primary">{formatMoney(stats.totalSalesRevenue || 0)}</span>
            </div>
            <div className="flex flex-wrap justify-between items-center gap-2 text-sm py-2 border-b border-border/60">
              <span className="text-text-secondary font-medium">Less: Cost of Goods Sold (COGS)</span>
              <span className="font-semibold text-danger">-{formatMoney(stats.totalCOGS || 0)}</span>
            </div>
            <div className="bg-surface/80 rounded-lg p-4 border border-border/80 shadow-xs">
              <div className="flex flex-wrap justify-between items-center gap-2 text-base">
                <span className="font-bold text-text-primary">Gross Trading Profit</span>
                <span className={`text-xl font-bold ${(stats.grossProfit || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatMoney(stats.grossProfit || 0)}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Margin: {(stats.grossMargin || 0).toFixed(1)}% of total gross sales
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit Calculation Card */}
        <Card variant="soft" className="p-5 space-y-4">
          <CardHeader>
            <CardTitle>Operating Account (Net Profit)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2 text-sm py-2 border-b border-border/60">
              <span className="text-text-secondary font-medium">Gross Profit Brought Down</span>
              <span className="font-bold text-text-primary">{formatMoney(stats.grossProfit || 0)}</span>
            </div>
            <div className="flex flex-wrap justify-between items-center gap-2 text-sm py-2 border-b border-border/60">
              <span className="text-text-secondary font-medium">Less: Operating & Overhead Expenses</span>
              <span className="font-semibold text-danger">-{formatMoney(stats.totalExpenses || 0)}</span>
            </div>
            <div className="bg-surface/80 rounded-lg border border-border/80 shadow-xs p-4">
              <div className="flex flex-wrap justify-between items-center gap-2 text-base">
                <span className="font-bold text-text-primary">Net Clean Profit</span>
                <span className={`text-xl font-bold ${(stats.netProfit || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatMoney(stats.netProfit || 0)}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Net Margin: {(stats.netMargin || 0).toFixed(1)}% after all overhead expenses
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
