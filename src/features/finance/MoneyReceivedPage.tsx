import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { paymentService, saleService } from '@/services';
import { formatMoney, formatDate } from '@/lib/formatters';
import {
  amountPaidAtSale,
  isActiveInflowPayment,
  saleLinkedPaymentTotals,
} from '@/lib/payments';
import { toast } from '@/lib/toast';
import { ROUTES } from '@/constants';
import { ArrowDownLeft, ChevronLeft, TrendingUp, Users } from 'lucide-react';
import type { Payment, Sale } from '@/types';
import { FinanceTabs } from './FinanceTabs';

function paymentStatusVariant(status: Sale['paymentStatus']) {
  return status === 'paid' ? 'success' : status === 'partial' ? 'warning' : 'danger';
}

export function MoneyReceivedPage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([saleService.list(), paymentService.list()])
      .then(([salesList, paymentList]) => {
        if (!active) return;
        const salesById = new Map(salesList.map((sale) => [sale.id, sale]));
        setSales(salesList.filter((sale) => sale.status === 'completed'));
        setPayments(
          paymentList.filter((payment) =>
            isActiveInflowPayment(payment, salesById),
          ),
        );
      })
      .catch((error) => {
        console.error(error);
        toast('Could not load money received.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const linkedPaymentTotals = useMemo(
    () => saleLinkedPaymentTotals(payments),
    [payments],
  );
  const salesReceived = sales.reduce(
    (sum, sale) => sum + amountPaidAtSale(sale, linkedPaymentTotals),
    0,
  );
  const debtReceived = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const total = salesReceived + debtReceived;
  const transactionCount =
    sales.filter((sale) => amountPaidAtSale(sale, linkedPaymentTotals) > 0).length +
    payments.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Money Received"
        description="Sales receipts and customer debt payments collected by the business."
        breadcrumbs={[
          { label: 'Money & Finance', href: ROUTES.APP_FINANCE },
          { label: 'Money Received' },
        ]}
        action={
          <Button variant="secondary" onClick={() => navigate(ROUTES.APP_FINANCE)}>
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Finance Overview
          </Button>
        }
      />

      <FinanceTabs />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Transactions"
          value={transactionCount}
          subtitle="Sales receipts and collections"
          icon={<Users className="h-5 w-5" />}
          tone="neutral"
        />
        <StatCard
          label="Total Received"
          value={formatMoney(total)}
          subtitle="All money collected"
          icon={<ArrowDownLeft className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Average per Transaction"
          value={formatMoney(transactionCount > 0 ? total / transactionCount : 0)}
          subtitle="Mean collection value"
          icon={<TrendingUp className="h-5 w-5" />}
          tone="brand"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-4 py-3">
          <CardTitle className="text-base">Sales Receipts</CardTitle>
          <Badge variant="neutral">{sales.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-text-secondary">Loading...</div>
          ) : sales.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-text-secondary">
              No completed sales recorded yet.
            </div>
          ) : (
            <>
              <div className="divide-y divide-border/60 md:hidden">
                {sales.map((sale) => {
                  const paid = amountPaidAtSale(sale, linkedPaymentTotals);
                  return (
                    <div key={sale.id} className="space-y-2.5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-primary">
                            #{sale.receiptNumber}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-text-secondary">
                            {sale.customerName ||
                              (sale.customerId ? 'Customer' : 'Walk-in')}{' '}
                            · {formatDate(sale.createdAt)}
                          </p>
                        </div>
                        <Badge variant={paymentStatusVariant(sale.paymentStatus)}>
                          {sale.paymentStatus}
                        </Badge>
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <p className="text-xs capitalize text-text-muted">
                          {sale.paymentMethod}
                        </p>
                        <div className="text-right">
                          <p className="text-base font-bold tabular-nums text-success-fg">
                            {formatMoney(paid)}
                          </p>
                          <p className="text-2xs text-text-muted">
                            of {formatMoney(sale.total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-canvas">
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-text-secondary">Date</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-text-secondary">Receipt</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-text-secondary">Customer</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-text-secondary text-right">Total</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-text-secondary text-right">Paid at Sale</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-text-secondary">Method</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-text-secondary">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="transition-colors hover:bg-surface-hover">
                        <td className="px-4 py-3 text-sm text-text-secondary">{formatDate(sale.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-text-primary">#{sale.receiptNumber}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {sale.customerName || (sale.customerId ? 'Customer' : 'Walk-in')}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-primary">{formatMoney(sale.total)}</td>
                        <td className="px-4 py-3 text-sm text-text-primary">
                          {formatMoney(amountPaidAtSale(sale, linkedPaymentTotals))}
                        </td>
                        <td className="px-4 py-3 text-sm capitalize text-text-secondary">{sale.paymentMethod}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={paymentStatusVariant(sale.paymentStatus)}>
                            {sale.paymentStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-4 py-3">
          <CardTitle className="text-base">Customer Debt Payments</CardTitle>
          <Badge variant="neutral">{payments.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-text-secondary">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-text-secondary">
              No debt payments recorded yet.
            </div>
          ) : (
            <>
              <div className="divide-y divide-border/60 md:hidden">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {payment.partyName || payment.customerId || 'Customer'}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {formatDate(payment.createdAt)} ·{' '}
                        <span className="capitalize">{payment.paymentMethod}</span>
                      </p>
                    </div>
                    <p className="shrink-0 text-base font-bold tabular-nums text-success-fg">
                      {formatMoney(payment.amount)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-canvas">
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-text-secondary">Date</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-text-secondary">Customer</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-text-secondary text-right">Amount</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-text-secondary">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="transition-colors hover:bg-surface-hover">
                        <td className="px-4 py-3 text-sm text-text-secondary">{formatDate(payment.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-text-primary">
                          {payment.partyName || payment.customerId || '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-text-primary">
                          {formatMoney(payment.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm capitalize text-text-secondary">
                          {payment.paymentMethod}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
