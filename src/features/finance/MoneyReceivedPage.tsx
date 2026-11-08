import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { PageHeader } from '@/components/ui/PageHeader';
import { paymentService, saleService } from '@/services';
import { formatMoney, formatDate } from '@/lib/formatters';
import {
  amountPaidAtSale,
  isActiveInflowPayment,
  saleLinkedPaymentTotals,
} from '@/lib/payments';
import { toast } from '@/lib/toast';
import type { Payment, Sale } from '@/types';

export function MoneyReceivedPage() {
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
        description="Sales receipts and customer debt payments."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Transactions</p>
            <p className="text-lg font-bold text-text-primary">{transactionCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Total Received</p>
            <MoneyDisplay amount={total} size="lg" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Average per Transaction</p>
            <MoneyDisplay amount={transactionCount > 0 ? total / transactionCount : 0} size="lg" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-8 py-8 text-center text-text-secondary">Loading...</div>
            ) : sales.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-canvas border-b border-border">
                    <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Receipt</th>
                    <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Customer</th>
                    <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase text-right">Total</th>
                    <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase text-right">Paid at Sale</th>
                    <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Method</th>
                    <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-3 text-sm text-text-secondary">{formatDate(sale.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-text-primary">#{sale.receiptNumber}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {sale.customerName || (sale.customerId ? 'Customer' : 'Walk-in')}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary">{formatMoney(sale.total)}</td>
                      <td className="px-4 py-3 text-sm text-text-primary">{formatMoney(amountPaidAtSale(sale, linkedPaymentTotals))}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary capitalize">{sale.paymentMethod}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge
                          variant={
                            sale.paymentStatus === 'paid'
                              ? 'success'
                              : sale.paymentStatus === 'partial'
                                ? 'warning'
                                : 'danger'
                          }
                        >
                          {sale.paymentStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-8 py-8 text-center text-text-secondary">No sales recorded yet.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">Customer Debt Payments</h2>
          </div>
          <div className="overflow-x-auto">
            {payments.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-canvas border-b border-border">
                    <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Customer</th>
                    <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase text-right">Amount</th>
                    <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-3 text-sm text-text-secondary">{formatDate(payment.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-text-primary">
                        {payment.partyName || payment.customerId || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary text-right">
                        {formatMoney(payment.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary capitalize">
                        {payment.paymentMethod}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-8 py-8 text-center text-text-secondary">
                No debt payments recorded yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
