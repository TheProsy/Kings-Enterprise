import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Input';
import { PriceInput } from '@/components/ui/PriceInput';
import { QuantityInput } from '@/components/ui/QuantityInput';
import { Modal } from '@/components/ui/Modal';
import { PAYMENT_METHODS } from '@/constants';
import { formatMoney, fromKobo, toKobo } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import { purchaseService } from '@/services';
import type { Purchase, PurchaseItem } from '@/types';
import { Trash2 } from 'lucide-react';

interface EditPurchaseModalProps {
  purchase: Purchase | null;
  onClose: () => void;
  onSaved: (purchase: Purchase) => void;
}

interface DraftItem {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  unit: string;
  quantity: number;
  unitCostPrice: number;
}

export function EditPurchaseModal({ purchase, onClose, onSaved }: EditPurchaseModalProps) {
  const [items, setItems] = useState<DraftItem[]>([]);
  const [additionalCosts, setAdditionalCosts] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!purchase) return;
    setItems(
      (purchase.items ?? []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        variantName: item.variantName,
        unit: item.unit,
        quantity: item.quantity,
        unitCostPrice: item.unitCostPrice,
      })),
    );
    setAdditionalCosts(fromKobo(purchase.additionalCosts ?? 0));
    setAmountPaid(fromKobo(purchase.amountPaid ?? 0));
    setPaymentMethod(purchase.paymentMethod || 'cash');
    setNotes(purchase.notes || '');
  }, [purchase]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitCostPrice, 0),
    [items],
  );
  const additionalCostsKobo = Math.max(0, toKobo(additionalCosts));
  const total = subtotal + additionalCostsKobo;
  const amountPaidKobo = Math.max(0, toKobo(amountPaid));
  const balanceDue = Math.max(0, total - Math.min(amountPaidKobo, total));

  const updateItem = (variantId: string, patch: Partial<DraftItem>) => {
    setItems((current) =>
      current.map((item) => (item.variantId === variantId ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (variantId: string) => {
    setItems((current) => current.filter((item) => item.variantId !== variantId));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!purchase) return;
    if (items.length === 0) {
      toast('A purchase must contain at least one item.', 'warning');
      return;
    }
    if (items.some((item) => item.quantity < 1)) {
      toast('Every item must have a quantity of at least one.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const nextItems: PurchaseItem[] = items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        variantName: item.variantName,
        unit: item.unit,
        quantity: item.quantity,
        unitCostPrice: item.unitCostPrice,
        lineTotal: item.quantity * item.unitCostPrice,
      }));
      const paid = Math.min(amountPaidKobo, total);
      await purchaseService.update(purchase.id, {
        items: nextItems,
        additionalCosts: additionalCostsKobo,
        amountPaid: paid,
        paymentMethod,
        notes: notes.trim() || undefined,
      });
      onSaved({
        ...purchase,
        items: nextItems,
        subtotal,
        additionalCosts: additionalCostsKobo,
        total,
        amountPaid: paid,
        balanceDue: Math.max(0, total - paid),
        paymentStatus: paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
        paymentMethod,
        notes: notes.trim() || undefined,
      });
      toast('Purchase updated. Stock, costs, and the supplier ledger were reconciled.', 'success');
      onClose();
    } catch (error) {
      console.error(error);
      toast(
        error instanceof Error && error.message
          ? error.message
          : 'Could not update the purchase. Please try again.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(purchase)}
      onClose={onClose}
      title="Edit purchase"
      description="Correct quantities, unit costs, delivery fees, or payments. Stock and the supplier balance are adjusted automatically."
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-text-primary">
            Total {formatMoney(total)}
          </span>
          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="edit-purchase-form" isLoading={saving}>
              Save changes
            </Button>
          </div>
        </div>
      }
    >
      <form id="edit-purchase-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-border bg-surface-2 px-3.5 py-3 text-sm">
          <p className="font-semibold text-text-primary">
            #{purchase?.purchaseNumber || purchase?.id.slice(0, 8)}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {purchase?.supplierName || 'Unknown supplier'} · {items.length} item
            {items.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.variantId}
              className="space-y-2 rounded-lg border border-border bg-surface-2 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {item.productName}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {item.variantName} ({item.unit})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.variantId)}
                  className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                  aria-label={`Remove ${item.productName}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-text-muted">
                    Quantity
                  </span>
                  <QuantityInput
                    value={item.quantity}
                    onChange={(value) => updateItem(item.variantId, { quantity: value })}
                    ariaLabel={`Quantity of ${item.productName}`}
                  />
                </div>
                <div className="w-36">
                  <PriceInput
                    label="Unit cost"
                    value={fromKobo(item.unitCostPrice)}
                    onChange={(value) =>
                      updateItem(item.variantId, { unitCostPrice: toKobo(value) })
                    }
                  />
                </div>
                <div className="pb-2 text-right">
                  <span className="block text-2xs font-semibold uppercase tracking-wider text-text-muted">
                    Line total
                  </span>
                  <span className="text-sm font-bold tabular-nums text-text-primary">
                    {formatMoney(item.quantity * item.unitCostPrice)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PriceInput
            label="Delivery / offloading fees"
            value={additionalCosts}
            onChange={setAdditionalCosts}
            placeholder="0.00"
          />
          <PriceInput
            label="Amount paid to supplier"
            value={amountPaid}
            onChange={setAmountPaid}
            placeholder="0.00"
            helper={
              balanceDue > 0
                ? `Outstanding after this edit: ${formatMoney(balanceDue)}`
                : 'Purchase will be fully settled.'
            }
          />
        </div>

        <Select
          label="Payment method"
          options={PAYMENT_METHODS.map((entry) => ({ value: entry.value, label: entry.label }))}
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
        />

        <Textarea
          label="Notes (optional)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
        />
      </form>
    </Modal>
  );
}
