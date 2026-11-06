import { useCallback, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { StatsSkeleton } from '@/components/ui/Skeleton';
import {
  saleService,
  purchaseService,
  expenseService,
  customerService,
  supplierService,
  paymentService,
} from '@/services';
import { formatMoney } from '@/lib/formatters';
import { ROUTES } from '@/constants';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Building2, Users, ChevronRight, BookOpen, TrendingUp } from 'lucide-react';

export function FinancePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const [sales, purchases, expenses, customers, suppliers, payments] =
        await Promise.all([
          saleService.list(),
          purchaseService.list(),
          expenseService.list(),
          customerService.list(),
          supplierService.list(),
          paymentService.list(),
        ]);

      const customerPayments = payments
        .filter((payment) => payment.direction === 'in')
        .reduce((sum, payment) => sum + payment.amount, 0);
      const supplierPayments = payments
        .filter((payment) => payment.direction === 'out')
        .reduce((sum, payment) => sum + payment.amount, 0);

      const moneyReceived =
        sales.reduce((sum, s) => sum + s.amountPaid, 0) + customerPayments;
      const moneySpent =
        purchases.reduce((sum, p) => sum + p.amountPaid, 0) +
        expenses.reduce((sum, e) => sum + e.amount, 0) +
        supplierPayments;
      const customerDebts = customers.reduce((sum, c) => sum + (c.balanceDue || 0), 0);
      const supplierDebts = suppliers.reduce((sum, s) => sum + (s.balanceDue || 0), 0);

      setStats({
        moneyReceived,
        moneySpent,
        customerDebts,
        supplierDebts,
        netPosition: moneyReceived - moneySpent,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Money & Finance Overview"
        description="Monitor cash inflows, operational outflows, liquidity, and receivables."
        action={
          <Button
            variant="primary"
            onClick={() => navigate(ROUTES.APP_FINANCE_CASHBOOK)}
            className="shadow-xs"
          >
            <BookOpen className="h-4 w-4 mr-1.5" />
            Open Cashbook
          </Button>
        }
      />

      {/* 4 Core Financial Summary Cards */}
      {loading ? (
        <StatsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Inflows (Received)"
            value={formatMoney(stats.moneyReceived || 0)}
            subtitle="Cash & bank collections"
            icon={<ArrowDownLeft className="h-5 w-5 text-success-fg" />}
          />
          <StatCard
            label="Total Outflows (Spent)"
            value={formatMoney(stats.moneySpent || 0)}
            subtitle="Purchases, payroll & expenses"
            icon={<ArrowUpRight className="h-5 w-5 text-danger-fg" />}
          />
          <StatCard
            label="Customer Debt (Receivables)"
            value={formatMoney(stats.customerDebts || 0)}
            subtitle="Owed to store by customers"
            icon={<Users className="h-5 w-5 text-warning-fg" />}
          />
          <StatCard
            label="Supplier Debt (Payables)"
            value={formatMoney(stats.supplierDebts || 0)}
            subtitle="Owed to suppliers by store"
            icon={<Building2 className="h-5 w-5 text-brand" />}
          />
        </div>
      )}

      {/* Net Liquidity & Quick Navigation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Net Cash Position (6 cols) */}
        <div className="lg:col-span-6">
          <Card variant="soft" className="p-6 shadow-sm">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <TrendingUp className="h-4 w-4 text-brand" />
                Net Cash Flow Position
              </CardTitle>
              <CardDescription>
                Net liquid surplus or deficit calculated from verified receipts minus disbursements.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-2 text-center">
              <div className="py-6 px-4 rounded-xl bg-surface-3 border border-border/80 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-1">
                  Cash In Hand & Bank Position
                </span>
                <span
                  className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
                    (stats.netPosition || 0) >= 0 ? 'text-success-fg' : 'text-danger-fg'
                  }`}
                >
                  {formatMoney(stats.netPosition || 0)}
                </span>
                <p className="text-xs font-semibold text-text-secondary mt-2">
                  {(stats.netPosition || 0) >= 0
                    ? '✓ Positive operating cash balance'
                    : '⚠ Outflows exceed collected revenues'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Ledgers Navigation (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <Card variant="soft" className="p-5 shadow-sm">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                Finance & Ledger Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-2 space-y-2.5">
              <NavLink
                to={ROUTES.APP_FINANCE_CASHBOOK}
                className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-border/80 hover:border-brand-soft-border hover:bg-surface-3/70 transition-all shadow-xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center font-bold text-xs">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-text-primary group-hover:text-brand transition-colors">
                      General Cashbook
                    </p>
                    <p className="text-xs text-text-muted">Complete audit log of all money in & out</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted group-hover:translate-x-0.5 transition-transform" />
              </NavLink>

              <NavLink
                to={ROUTES.APP_CUSTOMER_DEBTS}
                className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-border/80 hover:border-brand-soft-border hover:bg-surface-3/70 transition-all shadow-xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-warning-soft text-warning-fg flex items-center justify-center font-bold text-xs">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-text-primary group-hover:text-brand transition-colors">
                      Customer Debts Ledger
                    </p>
                    <p className="text-xs text-text-muted">Track credit receivables and collections</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted group-hover:translate-x-0.5 transition-transform" />
              </NavLink>

              <NavLink
                to={ROUTES.APP_FINANCE_SUPPLIER_DEBTS}
                className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-border/80 hover:border-brand-soft-border hover:bg-surface-3/70 transition-all shadow-xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-danger-soft text-danger-fg flex items-center justify-center font-bold text-xs">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-text-primary group-hover:text-brand transition-colors">
                      Supplier Payables Ledger
                    </p>
                    <p className="text-xs text-text-muted">Outstanding vendor balance obligations</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted group-hover:translate-x-0.5 transition-transform" />
              </NavLink>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
