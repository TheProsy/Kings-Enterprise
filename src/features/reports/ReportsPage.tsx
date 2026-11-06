import { useCallback, useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatsSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { saleService, purchaseService, expenseService } from '@/services';
import { formatMoney } from '@/lib/formatters';
import { ROUTES } from '@/constants';
import { NavLink } from 'react-router-dom';
import { TrendingUp, DollarSign, Package, CreditCard, Users, ChevronRight, BarChart3, Download } from 'lucide-react';

export function ReportsPage() {
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const [sales, purchs, exps] = await Promise.all([
        saleService.list(),
        purchaseService.list(),
        expenseService.list(),
      ]);

      const completedSales = sales.filter((sale) => sale.status === 'completed');
      const totalSales = completedSales.reduce((sum, s) => sum + s.total, 0);
      const totalReceived = completedSales.reduce((sum, s) => sum + s.amountPaid, 0);
      const totalPurchases = purchs.reduce((sum, p) => sum + p.total, 0);
      const totalExpenses = exps.reduce((sum, e) => sum + e.amount, 0);
      const cogs = completedSales.reduce(
        (sum, sale) =>
          sum +
          sale.items.reduce(
            (lineTotal, item) => lineTotal + item.costBasis * item.quantity,
            0,
          ),
        0,
      );

      setStats({
        totalSales,
        totalReceived,
        totalPurchases,
        totalExpenses,
        grossProfit: totalSales - cogs,
        netProfit: totalSales - cogs - totalExpenses,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const reportSections = [
    {
      title: 'Sales Performance',
      desc: 'Daily, weekly and monthly sales trends, volume by material, and top-grossing items.',
      route: ROUTES.APP_REPORTS_SALES,
      icon: TrendingUp,
      color: 'text-brand',
    },
    {
      title: 'Inventory & Stock Valuation',
      desc: 'Real-time stock valuation at cost and retail, stockout velocity, and reorder alerts.',
      route: ROUTES.APP_REPORTS_STOCK,
      icon: Package,
      color: 'text-success-fg',
    },
    {
      title: 'Profit & Margins Analysis',
      desc: 'Gross margin by product line, Cost of Goods Sold (COGS), and net store earnings.',
      route: ROUTES.APP_REPORTS_PROFIT,
      icon: DollarSign,
      color: 'text-success-fg',
    },
    {
      title: 'Operating Expenses Breakdown',
      desc: 'Categorical distribution of driver logistics, fuel, loading, repairs, and overhead.',
      route: ROUTES.APP_REPORTS_EXPENSES,
      icon: CreditCard,
      color: 'text-danger-fg',
    },
    {
      title: 'Debts & Credit Exposure',
      desc: 'Contractor aging receivables alongside supplier payables and aging analysis.',
      route: ROUTES.APP_REPORTS_DEBTS,
      icon: Users,
      color: 'text-warning-fg',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics Hub"
        description="Comprehensive financial reporting, gross profit margins, and inventory performance."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Print / Export Summary
          </Button>
        }
      />

      {/* Primary Financial Metric Summary Cards */}
      {loading ? (
        <StatsSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total Revenue Generated"
            value={formatMoney(stats.totalSales || 0)}
            subtitle="All completed sales transactions"
            icon={<DollarSign className="h-5 w-5 text-brand" />}
          />
          <StatCard
            label="Estimated Gross Profit"
            value={formatMoney(stats.grossProfit || 0)}
            subtitle="Sales revenue minus material costs"
            icon={<TrendingUp className="h-5 w-5 text-success-fg" />}
          />
          <StatCard
            label="Net Operating Profit"
            value={formatMoney(stats.netProfit || 0)}
            subtitle="After deducting business expenses"
            icon={<BarChart3 className="h-5 w-5 text-brand" />}
          />
          <StatCard
            label="Collected Payments"
            value={formatMoney(stats.totalReceived || 0)}
            subtitle="Verified incoming cash & bank transfers"
            icon={<DollarSign className="h-5 w-5 text-success-fg" />}
          />
          <StatCard
            label="Material Purchases"
            value={formatMoney(stats.totalPurchases || 0)}
            subtitle="Total supplier procurement cost"
            icon={<Package className="h-5 w-5 text-brand" />}
          />
          <StatCard
            label="Operational Expenses"
            value={formatMoney(stats.totalExpenses || 0)}
            subtitle="Store overhead, transport & salaries"
            icon={<CreditCard className="h-5 w-5 text-danger-fg" />}
          />
        </div>
      )}

      {/* Specialized Reports Cards Grid */}
      <div>
        <h3 className="text-base font-bold text-text-primary tracking-tight mb-3">
          Detailed Analytics & Reports
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportSections.map((rep) => {
            const Icon = rep.icon;
            return (
              <Card
                key={rep.title}
                variant="soft"
                className="p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-surface-3 border border-border/80 shadow-xs flex items-center justify-center mb-3">
                    <Icon className={`h-5 w-5 ${rep.color}`} />
                  </div>
                  <h4 className="font-bold text-sm text-text-primary group-hover:text-brand transition-colors">
                    {rep.title}
                  </h4>
                  <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                    {rep.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                  <NavLink
                    to={rep.route}
                    className="text-xs font-semibold text-brand inline-flex items-center gap-1 group-hover:underline"
                  >
                    <span>Open Detailed Report</span>
                    <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </NavLink>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
