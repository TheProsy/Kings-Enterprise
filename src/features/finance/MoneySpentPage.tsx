import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { purchaseService, expenseService, paymentService } from '@/services';
import { formatMoney, formatDate } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import { ROUTES } from '@/constants';
import { ArrowUpRight, ChevronLeft, Receipt, ShoppingCart } from 'lucide-react';
import type { Expense, Payment, Purchase } from '@/types';
import { FinanceTabs } from './FinanceTabs';

export function MoneySpentPage() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([purchaseService.list(), expenseService.list(), paymentService.list()])
      .then(([purchaseList, expenseList, paymentList]) => {
        if (!active) return;
        setPurchases(
          purchaseList.filter((purchase) => purchase.status !== 'cancelled'),
        );
        setExpenses(expenseList);
        setSupplierPayments(paymentList.filter((payment) => payment.direction === 'out'));
      })
      .catch((error) => {
        console.error(error);
        toast('Could not load money spent.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const purchaseTotal = purchases.reduce((sum, purchase) => sum + purchase.amountPaid, 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const debtTotal = supplierPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const total = purchaseTotal + expenseTotal + debtTotal;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Money Spent"
        description="Purchases, store expenses and supplier debt payments."
        breadcrumbs={[
          { label: 'Money & Finance', href: ROUTES.APP_FINANCE },
          { label: 'Money Spent' },
        ]}
        action={
          <Button variant="secondary" onClick={() => navigate(ROUTES.APP_FINANCE)}>
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Finance Overview
          </Button>
        }
      />

      <FinanceTabs />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Purchases"
          value={formatMoney(purchaseTotal)}
          subtitle="Paid on stock received"
          icon={<ShoppingCart className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Expenses"
          value={formatMoney(expenseTotal)}
          subtitle="Operational spending"
          icon={<Receipt className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Supplier Payments"
          value={formatMoney(debtTotal)}
          subtitle="Debt settlements"
          icon={<ArrowUpRight className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label="Total Spent"
          value={formatMoney(total)}
          subtitle="All money paid out"
          icon={<ArrowUpRight className="h-5 w-5" />}
          tone="neutral"
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="px-6 py-10 text-center text-sm text-text-secondary">
            Loading...
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader className="border-b border-border px-4 py-3">
              <CardTitle className="text-base">Purchase Payments</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {purchases.length > 0 ? (
                <div className="space-y-3">
                  {purchases.map((purchase) => (
                    <div
                      key={purchase.id}
                      className="rounded-input border border-border bg-surface p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">
                            #{purchase.purchaseNumber || purchase.id.slice(0, 6)}
                          </p>
                          <p className="truncate text-xs text-text-secondary">
                            {purchase.supplierName || 'Supplier payment'}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold tabular-nums text-text-primary">
                          {formatMoney(purchase.amountPaid)}
                        </p>
                      </div>
                      <div className="mt-1 text-xs text-text-secondary">
                        {formatDate(purchase.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-2 py-6 text-center text-sm text-text-secondary">
                  No purchase payments.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border px-4 py-3">
              <CardTitle className="text-base">Expense Payments</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {expenses.length > 0 ? (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="rounded-input border border-border bg-surface p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">
                            {expense.description}
                          </p>
                          <p className="truncate text-xs text-text-secondary">{expense.category}</p>
                        </div>
                        <p className="shrink-0 text-sm font-bold tabular-nums text-text-primary">
                          {formatMoney(expense.amount)}
                        </p>
                      </div>
                      <div className="mt-1 text-xs text-text-secondary">
                        {formatDate(expense.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-2 py-6 text-center text-sm text-text-secondary">
                  No expenses recorded.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border px-4 py-3">
              <CardTitle className="text-base">Supplier Debt Payments</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {supplierPayments.length > 0 ? (
                <div className="space-y-3">
                  {supplierPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-input border border-border bg-surface p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">
                            {payment.partyName || 'Supplier'}
                          </p>
                          <p className="text-xs capitalize text-text-secondary">
                            {payment.paymentMethod}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold tabular-nums text-text-primary">
                          {formatMoney(payment.amount)}
                        </p>
                      </div>
                      <div className="mt-1 text-xs text-text-secondary">
                        {formatDate(payment.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-2 py-6 text-center text-sm text-text-secondary">
                  No supplier debt payments.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
