import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Input';
import { PriceInput } from '@/components/ui/PriceInput';
import { PageHeader } from '@/components/ui/PageHeader';
import { BUSINESS_ID, expenseService } from '@/services';
import { EXPENSE_CATEGORIES, ROUTES } from '@/constants';
import { toKobo } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import { useAuth } from '@/features/auth';
import { Wallet, CreditCard, Phone, Check } from 'lucide-react';
import { cn } from '@/lib/utilities';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Wallet },
  { value: 'transfer', label: 'Bank Transfer', icon: CreditCard },
  { value: 'pos', label: 'POS', icon: Phone },
] as const;

export function NewExpensePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'pos'>('cash');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!description.trim() || amount <= 0) {
      toast('Please enter a description and an amount greater than zero.', 'warning');
      return;
    }

    setSaving(true);
    try {
      await expenseService.create({
        businessId: BUSINESS_ID,
        description: description.trim(),
        category,
        amount: toKobo(amount),
        paymentMethod,
        recordedBy: user?.uid || user?.id || 'unknown',
        createdAt: new Date(`${date}T12:00:00`),
      });
      toast('Expense recorded successfully.', 'success');
      navigate(ROUTES.APP_EXPENSES);
    } catch (error) {
      console.error(error);
      toast('Could not record the expense. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Record Business Expense"
        description="Log operational costs, logistics, driver fees, or store supplies."
        breadcrumb={
          <NavLink to={ROUTES.APP_EXPENSES} className="hover:underline">
            ← Back to Expenses
          </NavLink>
        }
      />

      <Card variant="soft" className="p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Textarea
            label="Description *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Fuel for delivery truck / Offloading cement from trailer"
            rows={2}
            required
          />

          <Select
            label="Expense Category *"
            options={EXPENSE_CATEGORIES.map((entry) => ({ value: entry, label: entry }))}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <PriceInput
            label="Expense Amount *"
            value={amount}
            onChange={setAmount}
            placeholder="0.00"
          />

          {/* Payment Method Pills */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary block uppercase tracking-wider">
              Payment Method *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {PAYMENT_METHODS.map((m) => {
                const isSelected = paymentMethod === m.value;
                const Icon = m.icon;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className={cn(
                      'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all btn-press',
                      isSelected
                        ? 'bg-brand text-white border-transparent shadow-xs'
                        : 'bg-surface text-text-secondary border-border/80 hover:bg-surface-3 hover:text-text-primary',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary block uppercase tracking-wider">
              Transaction Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-surface-3 text-sm font-medium text-text-primary shadow-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(ROUTES.APP_EXPENSES)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              className="shadow-xs font-semibold"
            >
              <Check className="h-4 w-4 mr-1.5" />
              Save Expense
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
