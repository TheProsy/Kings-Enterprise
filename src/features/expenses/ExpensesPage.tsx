import { useCallback, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/forms/SearchInput';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { DeleteRecordButton } from '@/components/common/DeleteRecordButton';
import { StatCard } from '@/components/ui/StatCard';
import { expenseService } from '@/services';
import { EXPENSE_CATEGORIES, PERMISSIONS, ROUTES } from '@/constants';
import { useAuth } from '@/features/auth';
import { formatMoney, formatDate } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import type { Expense } from '@/types';
import { Plus, CreditCard, Receipt, Tag, Pencil } from 'lucide-react';
import { EditExpenseModal } from './EditExpenseModal';

export function ExpensesPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(PERMISSIONS.EXPENSES_CREATE);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await expenseService.list();
      setExpenses(data);
    } catch (error) {
      console.error(error);
      toast('Could not load expenses.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const removeExpense = async (expense: Expense) => {
    await expenseService.remove(expense.id);
    setExpenses((current) => current.filter((entry) => entry.id !== expense.id));
  };

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch = e.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !categoryFilter || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, search, categoryFilter]);

  const totalFiltered = filtered.reduce((sum, e) => sum + e.amount, 0);
  const totalAll = expenses.reduce((sum, e) => sum + e.amount, 0);

  const columns = [
    {
      key: 'createdAt',
      header: 'Date',
      render: (e: Expense) => (
        <span className="text-xs text-text-secondary whitespace-nowrap">
          {formatDate(e.createdAt)}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (e: Expense) => (
        <div>
          <p className="font-semibold text-text-primary text-xs">{e.description}</p>
          {e.notes && <p className="text-2xs text-text-muted">{e.notes}</p>}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (e: Expense) => (
        <Badge variant="neutral">
          <Tag className="h-3 w-3 mr-1" />
          {e.category}
        </Badge>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      render: (e: Expense) => (
        <span className="text-xs text-text-secondary capitalize">{e.paymentMethod || 'cash'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (e: Expense) => (
        <span className="font-bold text-sm text-danger-fg">{formatMoney(e.amount)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (e: Expense) => (
        <div className="flex items-center justify-end gap-1">
          {canCreate && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(e)}
              aria-label={`Edit ${e.description}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <DeleteRecordButton
            entityLabel="Expense"
            recordLabel={e.description}
            onDelete={() => removeExpense(e)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track overhead, driver logistics, electricity, wages, and operating costs."
        action={
          canCreate ? (
            <Button
              onClick={() => navigate(ROUTES.APP_EXPENSES_NEW)}
              className="shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Record Expense
            </Button>
          ) : undefined
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Total Operating Expenses"
          value={formatMoney(totalAll)}
          subtitle="Cumulative expenditures recorded"
          icon={<CreditCard className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label="Filtered Expenses"
          value={formatMoney(totalFiltered)}
          subtitle={`${filtered.length} matching transaction${filtered.length === 1 ? '' : 's'}`}
          icon={<Receipt className="h-5 w-5" />}
          tone="brand"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search expense description..."
          className="flex-1"
        />
        <div className="w-full sm:w-64">
          <Select
            options={[
              { value: '', label: 'All Expense Categories' },
              ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyTitle="No expenses recorded"
        emptyMessage={
          search || categoryFilter
            ? 'No expenses matched your search or category filter.'
            : 'Click "Record Expense" to track your first business expenditure.'
        }
        mobileCardRender={(e) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-text-primary">{e.description}</p>
                <p className="truncate text-xs capitalize text-text-muted">
                  {formatDate(e.createdAt)} · {e.paymentMethod || 'cash'}
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums text-danger-fg">
                {formatMoney(e.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <Badge variant="neutral">{e.category}</Badge>
              <div className="flex items-center gap-1">
                {canCreate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(e)}
                    aria-label={`Edit ${e.description}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                <DeleteRecordButton
                  entityLabel="Expense"
                  recordLabel={e.description}
                  onDelete={() => removeExpense(e)}
                />
              </div>
            </div>
          </div>
        )}
      />

      <EditExpenseModal
        expense={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) =>
          setExpenses((current) =>
            current.map((entry) => (entry.id === updated.id ? updated : entry)),
          )
        }
      />
    </div>
  );
}
