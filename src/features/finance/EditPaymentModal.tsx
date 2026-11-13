import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { PriceInput } from '@/components/ui/PriceInput';
import { Modal } from '@/components/ui/Modal';
import { PAYMENT_METHODS } from '@/constants';
import { fromKobo, toKobo } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import { paymentService } from '@/services';
import type { Payment } from '@/types';

interface EditPaymentModalProps {
  payment: Payment | null;
  onClose: () => void;
  onSaved: (payment: Payment) => void;
}

const REFERENCE_LABELS: Record<string, string> = {
  sale: 'Sale receipt payment',
  customer: 'Customer debt collection',
  supplier: 'Supplier debt payment',
  purchase: 'Purchase payment',
};

export function EditPaymentModal({ payment, onClose, onSaved }: EditPaymentModalProps) {
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!payment) return;
    setAmount(fromKobo(payment.amount));
    setPaymentMethod(payment.paymentMethod || 'cash');
  }, [payment]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!payment) return;
    if (amount <= 0) {
      toast('Enter an amount greater than zero.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const amountKobo = toKobo(amount);
      await paymentService.update(payment.id, {
        amount: amountKobo,
        paymentMethod,
      });
      onSaved({ ...payment, amount: amountKobo, paymentMethod });
      toast('Payment updated. The linked balance has been reconciled.', 'success');
      onClose();
    } catch (error) {
      console.error(error);
      toast(
        error instanceof Error && error.message
          ? error.message
          : 'Could not update the payment. Please try again.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(payment)}
      onClose={onClose}
      title="Edit payment"
      description="Correct the recorded amount or payment method. The linked sale, customer, or supplier balance is adjusted by the difference."
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-payment-form" isLoading={saving}>
            Save changes
          </Button>
        </div>
      }
    >
      <form id="edit-payment-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-border bg-surface-2 px-3.5 py-3 text-sm">
          <p className="font-semibold text-text-primary">
            {payment?.partyName || 'Customer / supplier'}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {REFERENCE_LABELS[payment?.referenceType ?? ''] ?? 'Recorded payment'} ·{' '}
            {payment?.direction === 'in' ? 'Money in' : 'Money out'}
          </p>
        </div>

        <PriceInput
          label="Amount received / paid"
          value={amount}
          onChange={setAmount}
          placeholder="0.00"
        />

        <Select
          label="Payment method"
          options={PAYMENT_METHODS.map((entry) => ({ value: entry.value, label: entry.label }))}
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
        />
      </form>
    </Modal>
  );
}
