import { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatsSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ReportPeriodSelect } from '@/components/forms/ReportPeriodSelect';
import {
  customerService,
  saleService,
  purchaseService,
  expenseService,
  paymentService,
} from '@/services';
import { formatMoney } from '@/lib/formatters';
import {
  amountPaidAtSale,
  isActiveInflowPayment,
  saleLinkedPaymentTotals,
} from '@/lib/payments';
import {
  customerIdentity,
  filterByPeriod,
  getPeriodRange,
  netSaleTotal,
  saleCogs,
  type ReportPeriod,
} from '@/lib/reporting';
import { ROUTES } from '@/constants';
import { toast } from '@/lib/toast';
import { NavLink } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Package,
  CreditCard,
  Users,
  ChevronRight,
  BarChart3,
  Download,
  UserPlus,
  Wallet,
} from 'lucide-react';
import type { Customer, Expense, Payment, Purchase, Sale } from '@/types';

export function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      saleService.list(),
      purchaseService.list(),
      expenseService.list(),
      paymentService.list(),
      customerService.list(),
    ])
      .then(([salesList, purchaseList, expenseList, paymentList, customerList]) => {
        if (!active) return;
        setSales(salesList);
        setPurchases(purchaseList);
        setExpenses(expenseList);
        setPayments(paymentList);
        setCustomers(customerList);
      })
      .catch((error) => {
        console.error(error);
        toast('Could not load the reports summary.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const range = useMemo(() => getPeriodRange(period), [period]);

  const stats = useMemo(() => {
    const periodSales = filterByPeriod(
      sales.filter((sale) => sale.status === 'completed'),
      (sale) => sale.createdAt,
      range,
    );
    const periodExpenses = filterByPeriod(
      expenses,
      (expense) => expense.createdAt,
      range,
    );
    const periodPurchases = filterByPeriod(
      purchases.filter((purchase) => purchase.status !== 'cancelled'),
      (purchase) => purchase.createdAt,
      range,
    );
    const salesById = new Map(sales.map((sale) => [sale.id, sale]));
    const periodPayments = filterByPeriod(
      payments.filter((payment) => isActiveInflowPayment(payment, salesById)),
      (payment) => payment.createdAt,
      range,
    );
    const newCustomers = filterByPeriod(
      customers,
      (customer) => customer.createdAt,
      range,
    );

    const totalSales = periodSales.reduce((sum, sale) => sum + netSaleTotal(sale), 0);
    const linkedPaymentTotals = saleLinkedPaymentTotals(payments);
    const totalReceived =
      periodSales.reduce(
        (sum, sale) => sum + amountPaidAtSale(sale, linkedPaymentTotals),
        0,
      ) + periodPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalPurchases = periodPurchases.reduce((sum, purchase) => sum + purchase.total, 0);
    const totalExpenses = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const cogs = periodSales.reduce((sum, sale) => sum + saleCogs(sale), 0);
    const customersServed = new Set(
      periodSales
        .map((sale) => customerIdentity(sale))
        .filter((identity): identity is string => Boolean(identity)),
    ).size;

    return {
      totalSales,
      totalReceived,
      totalPurchases,
      totalExpenses,
      grossProfit: totalSales - cogs,
      netProfit: totalSales - cogs - totalExpenses,
      salesCount: periodSales.length,
      newCustomers: newCustomers.length,
      customersServed,
    };
  }, [sales, purchases, expenses, payments, customers, range]);

  const reportSections = [
    {
      title: 'Income & Customer Report',
      desc: 'Day, week, month or year income statement with sales, expenses, and customers acquired.',
      route: ROUTES.APP_REPORTS_INCOME,
      icon: Wallet,
      color: 'text-success-fg',
    },
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
        title="Reports"
        description="Comprehensive financial reporting, gross profit margins, and inventory performance."
        action={
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-1.5" />
            Print / Export Summary
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportPeriodSelect value={period} onChange={setPeriod} />
        <p className="text-xs text-text-muted">
          Showing {range.label.toLowerCase()} · {stats.salesCount} sale
          {stats.salesCount === 1 ? '' : 's'}
        </p>
      </div>

      {loading ? (
        <StatsSkeleton count={8} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Sales Revenue"
            value={formatMoney(stats.totalSales || 0)}
            subtitle={`${stats.salesCount} completed sales`}
            icon={<DollarSign className="h-5 w-5" />}
            tone="brand"
          />
          <StatCard
            label="Net Income"
            value={formatMoney(stats.netProfit || 0)}
            subtitle="Gross profit minus expenses"
            icon={<BarChart3 className="h-5 w-5" />}
            tone={(stats.netProfit || 0) >= 0 ? 'success' : 'danger'}
          />
          <StatCard
            label="Gross Profit"
            value={formatMoney(stats.grossProfit || 0)}
            subtitle="Sales revenue minus material costs"
            icon={<TrendingUp className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label="Cash Collected"
            value={formatMoney(stats.totalReceived || 0)}
            subtitle="Sales receipts and debt payments"
            icon={<DollarSign className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label="Material Purchases"
            value={formatMoney(stats.totalPurchases || 0)}
            subtitle="Supplier procurement cost"
            icon={<Package className="h-5 w-5" />}
            tone="brand"
          />
          <StatCard
            label="Operating Expenses"
            value={formatMoney(stats.totalExpenses || 0)}
            subtitle="Store overhead, transport & salaries"
            icon={<CreditCard className="h-5 w-5" />}
            tone="danger"
          />
          <StatCard
            label="New Customers"
            value={stats.newCustomers}
            subtitle="Accounts added in this period"
            icon={<UserPlus className="h-5 w-5" />}
            tone="warning"
          />
          <StatCard
            label="Customers Served"
            value={stats.customersServed}
            subtitle="Unique named or registered buyers"
            icon={<Users className="h-5 w-5" />}
            tone="neutral"
          />
        </div>
      )}

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
