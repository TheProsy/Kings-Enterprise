import { useCallback, useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { StatsSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { saleService, expenseService } from '@/services';
import { formatMoney } from '@/lib/formatters';
import { TrendingUp, DollarSign, ArrowDownRight, ArrowUpRight, Printer, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants';

export function ProfitReportPage() {
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const [sales, exps] = await Promise.all([
        saleService.list(),
        expenseService.list(),
      ]);

      const completedSales = sales.filter((sale) => sale.status === 'completed');
      const totalSalesRevenue = completedSales.reduce((sum, s) => sum + (s.total || 0), 0);
      const totalCOGS = completedSales.reduce(
        (sum, sale) =>
          sum +
          (sale.items || []).reduce(
            (lineTotal: number, item: any) => lineTotal + ((item.costBasis || 0) * (item.quantity || 0)),
            0,
          ),
        0,
      );
      const totalExpenses = exps.reduce((sum, e) => sum + (e.amount || 0), 0);

      const grossProfit = totalSalesRevenue - totalCOGS;
      const netProfit = grossProfit - totalExpenses;
      const grossMargin = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;
      const netMargin = totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0;

      setStats({
        totalSalesRevenue,
        totalCOGS,
        totalExpenses,
        grossProfit,
        netProfit,
        grossMargin,
        netMargin,
        transactionCount: completedSales.length,
        expenseCount: exps.length,
      });
    } catch (err) {
      console.error('Failed to load profit statistics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Profit & Loss Statement"
          description="Detailed breakdown of revenue, cost of goods sold, operating expenses, and net profit margins."
          breadcrumbs={[
            { label: 'Reports', href: ROUTES.APP_REPORTS },
            { label: 'Profit & Loss' },
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
            Print P&L
          </Button>
        </div>
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
          />
          <StatCard
            label="Cost of Goods Sold"
            value={formatMoney(stats.totalCOGS || 0)}
            icon={<ArrowDownRight className="w-5 h-5" />}
            description="Direct material costs"
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
        <Card variant="soft" className="space-y-4">
          <CardHeader>
            <CardTitle>Trading Account (Gross Profit)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm py-2 border-b border-border/60">
              <span className="text-text-secondary font-medium">Total Sales Revenue</span>
              <span className="font-bold text-text-primary">{formatMoney(stats.totalSalesRevenue || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-sm py-2 border-b border-border/60">
              <span className="text-text-secondary font-medium">Less: Cost of Goods Sold (COGS)</span>
              <span className="font-semibold text-danger">-{formatMoney(stats.totalCOGS || 0)}</span>
            </div>
            <div className="bg-surface/80 rounded-lg p-4 border border-border/80 shadow-xs">
              <div className="flex justify-between items-center text-base">
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
        <Card variant="soft" className="space-y-4">
          <CardHeader>
            <CardTitle>Operating Account (Net Profit)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm py-2 border-b border-border/60">
              <span className="text-text-secondary font-medium">Gross Profit Brought Down</span>
              <span className="font-bold text-text-primary">{formatMoney(stats.grossProfit || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-sm py-2 border-b border-border/60">
              <span className="text-text-secondary font-medium">Less: Operating & Overhead Expenses</span>
              <span className="font-semibold text-danger">-{formatMoney(stats.totalExpenses || 0)}</span>
            </div>
            <div className="bg-surface/80 rounded-lg p-4 border border-border/80 shadow-xs">
              <div className="flex justify-between items-center text-base">
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
