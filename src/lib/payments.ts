import type { Payment, Purchase, Sale } from '@/types';
import { toMillis } from '@/lib/formatters';

export function saleLinkedPaymentTotals(payments: Payment[]): Map<string, number> {
  const totals = new Map<string, number>();
  payments.forEach((payment) => {
    if (payment.direction !== 'in' || payment.referenceType !== 'sale') return;
    const amount = Number(payment.amount || 0);
    totals.set(payment.referenceId, (totals.get(payment.referenceId) ?? 0) + amount);
  });
  return totals;
}

export function amountPaidAtSale(
  sale: Sale,
  linkedTotals: Map<string, number>,
): number {
  const linked = linkedTotals.get(sale.id) ?? 0;
  return Math.max(0, Number(sale.amountPaid || 0) - linked);
}

export function isActiveInflowPayment(
  payment: Payment,
  salesById: Map<string, Sale>,
): boolean {
  if (payment.direction !== 'in') return false;
  if (payment.referenceType !== 'sale') return true;
  const sale = salesById.get(payment.referenceId);
  return !sale || sale.status === 'completed';
}

export function purchaseBalancesAfterPayments(
  purchases: Purchase[],
  payments: Payment[],
): Map<string, number> {
  const paidBySupplier = new Map<string, number>();
  payments.forEach((payment) => {
    if (payment.direction !== 'out') return;
    const supplierId = payment.referenceId || payment.supplierId;
    if (!supplierId) return;
    paidBySupplier.set(
      supplierId,
      (paidBySupplier.get(supplierId) ?? 0) + Number(payment.amount || 0),
    );
  });

  const purchasesBySupplier = new Map<string, Purchase[]>();
  purchases.forEach((purchase) => {
    if (purchase.status === 'cancelled') return;
    const list = purchasesBySupplier.get(purchase.supplierId) ?? [];
    list.push(purchase);
    purchasesBySupplier.set(purchase.supplierId, list);
  });

  const balances = new Map<string, number>();
  purchasesBySupplier.forEach((list, supplierId) => {
    let remaining = paidBySupplier.get(supplierId) ?? 0;
    list
      .slice()
      .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt))
      .forEach((purchase) => {
        const due = Math.max(0, Number(purchase.balanceDue || 0));
        const applied = Math.min(remaining, due);
        balances.set(purchase.id, due - applied);
        remaining -= applied;
      });
  });
  return balances;
}
