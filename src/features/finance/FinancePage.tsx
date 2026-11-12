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
import { toast } from '@/lib/toast';
import {
  amountPaidAtSale,
  isActiveInflowPayment,
  saleLinkedPaymentTotals,
} from '@/lib/payments';
import { ROUTES } from '@/constants';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Building2, Users, ChevronRight, BookOpen, TrendingUp } from 'lucide-react';
import { FinanceTabs } from './FinanceTabs';

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

      const supplierPayments = payments
        .filter((payment) => payment.direction === 'out')
        .reduce((sum, payment) => sum + payment.amount, 0);

      const linkedPaymentTotals = saleLinkedPaymentTotals(payments);
      const salesById = new Map(sales.map((sale) => [sale.id, sale]));
      const moneyReceived =
        sales
          .filter((sale) => sale.status === 'completed')
          .reduce(
            (sum, sale) => sum + amountPaidAtSale(sale, linkedPaymentTotals),
            0,
          ) +
        payments
          .filter((payment) => isActiveInflowPayment(payment, salesById))
          .reduce((sum, payment) => sum + payment.amount, 0);
      const moneySpent =
        purchases
          .filter((purchase) => purchase.status !== 'cancelled')
          .reduce((sum, purchase) => sum + purchase.amountPaid, 0) +
        expenses.reduce((sum, expense) => sum + expense.amount, 0) +
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
    } catch (error) {
      console.error(error);
      toast('Could not load the finance overview.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const ledgerLinks = [
    {
      title: 'Money Received',
      description: 'Sales receipts and customer debt collections',
      route: ROUTES.APP_FINANCE_MONEY_RECEIVED,
      icon: ArrowDownLeft,
      iconClassName: 'bg-success-soft text-success-fg',
    },
    {
      title: 'Money Spent',
      description: 'Purchases, supplier payments and expenses',
      route: ROUTES.APP_FINANCE_MONEY_SPENT,
      icon: ArrowUpRight,
      iconClassName: 'bg-danger-soft text-danger-fg',
    },
    {
      title: 'General Cashbook',
      description: 'Complete chronological log of money in and out',
      route: ROUTES.APP_FINANCE_CASHBOOK,
      icon: BookOpen,
      iconClassName: 'bg-brand-soft text-brand',
    },
    {
      title: 'Customer Debts',
      description: 'Credit receivables and collection follow-up',
      route: ROUTES.APP_FINANCE_CUSTOMER_DEBTS,
      icon: Users,
      iconClassName: 'bg-warning-soft text-warning-fg',
    },
    {
      title: 'Supplier Debts',
      description: 'Outstanding balances owed to suppliers',
      route: ROUTES.APP_FINANCE_SUPPLIER_DEBTS,
      icon: Building2,
      iconClassName: 'bg-danger-soft text-danger-fg',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Money & Finance"
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

      <FinanceTabs />

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
                Finance Ledgers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-2 space-y-2.5">
              {ledgerLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.route}
                    to={link.route}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-surface border border-border/80 hover:border-brand-soft-border hover:bg-surface-3/70 transition-all shadow-xs group"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${link.iconClassName}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-text-primary group-hover:text-brand transition-colors">
                          {link.title}
                        </p>
                        <p className="text-xs text-text-muted">{link.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-text-muted group-hover:translate-x-0.5 transition-transform" />
                  </NavLink>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
