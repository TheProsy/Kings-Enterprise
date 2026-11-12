import { useCallback, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ShoppingCart,
  Wallet,
  Package,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Plus,
  Truck,
  Receipt,
  PiggyBank,
} from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/formatters';
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  effectiveMinimumStock,
  isLowStock,
} from '@/lib/stock';
import { useAuth } from '@/features/auth';
import { ROUTES, PERMISSIONS, buildRoute } from '@/constants';
import { catalogueService, paymentService, saleService } from '@/services';
import {
  amountPaidAtSale,
  isActiveInflowPayment,
  saleLinkedPaymentTotals,
} from '@/lib/payments';
import { toast } from '@/lib/toast';
import type { CatalogueItem } from '@/services';
import type { Sale } from '@/types';

interface DailyPoint {
  day: string;
  count: number;
  total: number;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const [todaySales, setTodaySales] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [moneyReceived, setMoneyReceived] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStock, setLowStock] = useState<CatalogueItem[]>([]);
  const [lowStockThreshold, setLowStockThreshold] = useState(
    DEFAULT_LOW_STOCK_THRESHOLD,
  );
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [salesByDay, setSalesByDay] = useState<DailyPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [catalogue, sales, payments] = await Promise.all([
        catalogueService.list({ fresh: true }),
        saleService.list(),
        paymentService.list(),
      ]);

      const today = new Date().toDateString();
      const completedSales = sales.filter((sale) => sale.status === 'completed');
      const isToday = (value: unknown) => toDate(value)?.toDateString() === today;

      const todaysSales = completedSales.filter((sale) => isToday(sale.createdAt));
      const todaysPayments = payments.filter(
        (payment) => payment.direction === 'in' && isToday(payment.createdAt),
      );

      const revenue = todaysSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
      const linkedPaymentTotals = saleLinkedPaymentTotals(payments);
      const salesById = new Map(sales.map((sale) => [sale.id, sale]));
      const received =
        todaysSales.reduce(
          (sum, sale) => sum + amountPaidAtSale(sale, linkedPaymentTotals),
          0,
        ) +
        todaysPayments
          .filter((payment) => isActiveInflowPayment(payment, salesById))
          .reduce((sum, payment) => sum + payment.amount, 0);

      setTodaySales(todaysSales.length);
      setTodayRevenue(revenue);
      setMoneyReceived(received);
      setTotalProducts(new Set(catalogue.items.map((item) => item.productId)).size);
      setLowStockThreshold(catalogue.lowStockThreshold);
      setLowStock(
        catalogue.items.filter((item) => isLowStock(item, catalogue.lowStockThreshold)),
      );
      setRecentSales(sales.slice(0, 6));

      const days: DailyPoint[] = [];
      for (let offset = 6; offset >= 0; offset -= 1) {
        const day = new Date();
        day.setDate(day.getDate() - offset);
        const dayKey = day.toDateString();
        const shortName = day.toLocaleDateString(undefined, { weekday: 'short' });
        const daySales = completedSales.filter(
          (sale) => toDate(sale.createdAt)?.toDateString() === dayKey,
        );
        days.push({
          day: shortName,
          count: daySales.length,
          total: daySales.reduce((acc, sale) => acc + (sale.total || 0), 0),
        });
      }
      setSalesByDay(days);
    } catch (error) {
      console.error(error);
      toast('Could not load the dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Dashboard" description="Loading your business overview…" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((key) => (
            <div key={key} className="rounded-xl border border-border bg-surface p-5 shadow-xs">
              <div className="space-y-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const maxDailyTotal = Math.max(...salesByDay.map((point) => point.total), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.name || 'Owner'}. Here is today's summary for your building materials business.`}
        action={
          <div className="flex items-center gap-2.5">
            {hasPermission(PERMISSIONS.SALES_CREATE) && (
              <Button onClick={() => navigate(ROUTES.APP_SALES_NEW)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                New Sale
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(ROUTES.APP_REPORTS)}>
              Reports
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          value={formatMoney(todayRevenue)}
          label="Today's Revenue"
          subtitle={`${todaySales} transaction${todaySales === 1 ? '' : 's'} completed`}
          tone="brand"
          icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          value={formatMoney(moneyReceived)}
          label="Money Received"
          subtitle="Cash, transfers and POS"
          tone="success"
          icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          value={totalProducts}
          label="Catalogue Products"
          subtitle="Distinct materials stocked"
          tone="neutral"
          icon={<Package className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          value={lowStock.length}
          label="Low Stock Alerts"
          tone="warning"
          icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
          trend={
            lowStock.length > 0
              ? { label: `${lowStock.length} to reorder`, positive: false }
              : { label: 'Stock levels healthy', positive: true }
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
            <div className="flex items-start justify-between gap-4 pb-5">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
                  <TrendingUp className="h-4 w-4 text-brand" aria-hidden="true" />
                  7-Day Sales Activity
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Revenue recorded over the last 7 calendar days
                </p>
              </div>
              <Badge variant="info">Live</Badge>
            </div>

            <div
              className="flex h-48 items-end justify-between gap-2 border-b border-border px-1"
              role="img"
              aria-label={`Seven day sales trend. Highest day ${formatMoney(
                Math.max(...salesByDay.map((point) => point.total)),
              )}.`}
            >
              {salesByDay.map((point, index) => {
                const heightPercent = Math.max(
                  6,
                  Math.round((point.total / maxDailyTotal) * 100),
                );
                return (
                  <div key={index} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="pointer-events-none whitespace-nowrap rounded border border-border bg-surface px-1.5 py-0.5 text-2xs font-semibold text-text-primary opacity-0 shadow-xs transition-opacity group-hover:opacity-100">
                      {formatMoney(point.total)}
                    </span>
                    <div className="flex h-36 w-full max-w-[40px] items-end overflow-hidden rounded-t-md bg-surface-2">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full rounded-t-md bg-brand transition-all duration-300 group-hover:bg-brand-hover"
                      />
                    </div>
                    <span className="pb-2 text-xs font-medium text-text-secondary">{point.day}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
            <div className="flex items-start justify-between gap-4 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Recent Sales</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Latest customer receipts recorded
                </p>
              </div>
              <NavLink
                to={ROUTES.APP_SALES}
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
              >
                View All
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </NavLink>
            </div>

            {recentSales.length > 0 ? (
              <ul className="divide-y divide-border">
                {recentSales.map((sale) => (
                  <li key={sale.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (sale.receiptId) {
                          navigate(
                            buildRoute(ROUTES.APP_RECEIPT_DETAIL, {
                              receiptId: sale.receiptId,
                            }),
                          );
                        } else {
                          navigate(
                            `${ROUTES.APP_SALES}?search=${encodeURIComponent(
                              sale.receiptNumber || '',
                            )}`,
                          );
                        }
                      }}
                      className="group flex w-full items-center justify-between gap-3 px-2 py-3 text-left transition-colors hover:bg-surface-2"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-text-muted transition-colors group-hover:text-brand">
                          <Receipt className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="text-sm font-bold text-text-primary">
                              #{sale.receiptNumber}
                            </span>
                            <Badge
                              variant={sale.status === 'completed' ? 'success' : 'neutral'}
                              size="sm"
                            >
                              {sale.status}
                            </Badge>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-text-secondary">
                            {sale.customerName ||
                              (sale.customerId ? 'Registered Customer' : 'Walk-in Customer')}
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-bold tabular-nums text-text-primary">
                          {formatMoney(sale.total)}
                        </span>
                        <span className="block text-xs text-text-muted">
                          {formatDate(sale.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No sales yet"
                description="Start ringing up customer orders to populate your transaction feed."
                action={
                  hasPermission(PERMISSIONS.SALES_CREATE) ? (
                    <Button size="sm" onClick={() => navigate(ROUTES.APP_SALES_NEW)}>
                      Create First Sale
                    </Button>
                  ) : undefined
                }
              />
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-5 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wide text-text-secondary">
              Quick Actions
            </h2>
            <div className="mt-3 space-y-2">
              {hasPermission(PERMISSIONS.SALES_CREATE) && (
                <Button
                  onClick={() => navigate(ROUTES.APP_SALES_NEW)}
                  className="w-full justify-start"
                >
                  <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                  New POS Sale
                </Button>
              )}
              {hasPermission(PERMISSIONS.PURCHASES_CREATE) && (
                <Button
                  variant="secondary"
                  onClick={() => navigate(ROUTES.APP_PURCHASES_NEW)}
                  className="w-full justify-start"
                >
                  <Truck className="h-4 w-4" aria-hidden="true" />
                  Record Supplier Purchase
                </Button>
              )}
              {hasPermission(PERMISSIONS.PRODUCTS_CREATE) && (
                <Button
                  variant="outline"
                  onClick={() => navigate(ROUTES.APP_PRODUCTS_NEW)}
                  className="w-full justify-start"
                >
                  <Package className="h-4 w-4" aria-hidden="true" />
                  Add New Product
                </Button>
              )}
              {hasPermission(PERMISSIONS.EXPENSES_CREATE) && (
                <Button
                  variant="outline"
                  onClick={() => navigate(ROUTES.APP_EXPENSES_NEW)}
                  className="w-full justify-start"
                >
                  <PiggyBank className="h-4 w-4" aria-hidden="true" />
                  Record Business Expense
                </Button>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5 shadow-xs">
            <div className="flex items-start justify-between gap-3 pb-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
                <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
                Low stock
              </h2>
              <NavLink
                to={ROUTES.APP_PRODUCT_LOW_STOCK}
                className="text-sm font-semibold text-brand hover:underline"
              >
                All ({lowStock.length})
              </NavLink>
            </div>

            {lowStock.length > 0 ? (
              <ul className="divide-y divide-border">
                {lowStock.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => navigate(ROUTES.APP_PRODUCT_LOW_STOCK)}
                      className="flex w-full items-center justify-between gap-3 px-1 py-3 text-left transition-colors hover:bg-surface-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-text-primary">
                          {item.productName}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-text-muted">
                          {item.brand ? `${item.brand} · ` : ''}
                          {item.quantityOnHand} {item.unit} left
                          {effectiveMinimumStock(item, lowStockThreshold) > 0
                            ? ` · reorder at ${effectiveMinimumStock(item, lowStockThreshold)} ${item.unit}`
                            : ''}
                        </span>
                      </span>
                      <Badge
                        variant={item.quantityOnHand <= 0 ? 'danger' : 'warning'}
                        size="sm"
                      >
                        {item.quantityOnHand <= 0 ? 'Out of stock' : 'Low stock'}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-6 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-text-primary">Inventory in good shape</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  No products are at or below their reorder level right now.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
