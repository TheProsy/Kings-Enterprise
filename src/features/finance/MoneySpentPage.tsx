import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { PageHeader } from '@/components/ui/PageHeader';
import { purchaseService, expenseService, paymentService } from '@/services';
import { formatMoney, formatDate } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import type { Expense, Payment, Purchase } from '@/types';

export function MoneySpentPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([purchaseService.list(), expenseService.list(), paymentService.list()])
      .then(([purchaseList, expenseList, paymentList]) => {
        if (!active) return;
        setPurchases(purchaseList);
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
        description="Purchases, expenses and supplier debt payments."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Purchases</p>
            <MoneyDisplay amount={purchaseTotal} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Expenses</p>
            <MoneyDisplay amount={expenseTotal} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Supplier Payments</p>
            <MoneyDisplay amount={debtTotal} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Total Spent</p>
            <MoneyDisplay amount={total} size="lg" />
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="px-8 py-8 text-center text-text-secondary">Loading...</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {purchases.length > 0 ? (
                <div className="space-y-3">
                  {purchases.map((purchase) => (
                    <div
                      key={purchase.id}
                      className="p-3 border border-border rounded-input bg-surface"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            #{purchase.purchaseNumber || purchase.id.slice(0, 6)}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {purchase.supplierName || 'Supplier payment'}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-text-primary">
                          {formatMoney(purchase.amountPaid)}
                        </p>
                      </div>
                      <div className="text-xs text-text-secondary mt-1">
                        {formatDate(purchase.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-4 text-center text-text-secondary">No purchase payments.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expense Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length > 0 ? (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="p-3 border border-border rounded-input bg-surface"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-text-primary">{expense.description}</p>
                          <p className="text-xs text-text-secondary">{expense.category}</p>
                        </div>
                        <p className="text-sm font-bold text-text-primary">
                          {formatMoney(expense.amount)}
                        </p>
                      </div>
                      <div className="text-xs text-text-secondary mt-1">
                        {formatDate(expense.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-4 text-center text-text-secondary">No expenses recorded.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supplier Debt Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {supplierPayments.length > 0 ? (
                <div className="space-y-3">
                  {supplierPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="p-3 border border-border rounded-input bg-surface"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {payment.partyName || 'Supplier'}
                          </p>
                          <p className="text-xs text-text-secondary capitalize">
                            {payment.paymentMethod}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-text-primary">
                          {formatMoney(payment.amount)}
                        </p>
                      </div>
                      <div className="text-xs text-text-secondary mt-1">
                        {formatDate(payment.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-4 text-center text-text-secondary">
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
