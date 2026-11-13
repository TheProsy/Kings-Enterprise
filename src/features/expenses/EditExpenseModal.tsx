import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { PriceInput } from '@/components/ui/PriceInput';
import { Modal } from '@/components/ui/Modal';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/constants';
import { fromKobo, toDateValue, toKobo } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import { expenseService } from '@/services';
import type { Expense } from '@/types';

interface EditExpenseModalProps {
  expense: Expense | null;
  onClose: () => void;
  onSaved: (expense: Expense) => void;
}

function dateInputValue(value: unknown): string {
  const date = toDateValue(value) ?? new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function EditExpenseModal({ expense, onClose, onSaved }: EditExpenseModalProps) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!expense) return;
    setDescription(expense.description);
    setCategory(expense.category);
    setAmount(fromKobo(expense.amount));
    setPaymentMethod(expense.paymentMethod || 'cash');
    setDate(dateInputValue(expense.createdAt));
  }, [expense]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!expense) return;
    if (!description.trim() || amount <= 0) {
      toast('Enter a description and an amount greater than zero.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const amountKobo = toKobo(amount);
      const createdAt = new Date(`${date}T12:00:00`);
      await expenseService.update(expense.id, {
        description: description.trim(),
        category,
        amount: amountKobo,
        paymentMethod,
        createdAt,
      });
      onSaved({
        ...expense,
        description: description.trim(),
        category,
        amount: amountKobo,
        paymentMethod,
        createdAt,
      });
      toast('Expense updated. Reports and cashbook now reflect the change.', 'success');
      onClose();
    } catch (error) {
      console.error(error);
      toast('Could not update the expense. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(expense)}
      onClose={onClose}
      title="Edit expense"
      description="Correct the amount, category, date, or payment method. Reports and the cashbook update automatically."
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-expense-form" isLoading={saving}>
            Save changes
          </Button>
        </div>
      }
    >
      <form id="edit-expense-form" onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          required
        />

        <Select
          label="Category"
          options={EXPENSE_CATEGORIES.map((entry) => ({ value: entry, label: entry }))}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PriceInput
            label="Amount"
            value={amount}
            onChange={setAmount}
            placeholder="0.00"
          />
          <div className="space-y-1.5">
            <label
              htmlFor="edit-expense-date"
              className="block text-xs font-semibold uppercase tracking-wider text-text-secondary"
            >
              Transaction date
            </label>
            <Input
              id="edit-expense-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
        </div>

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
