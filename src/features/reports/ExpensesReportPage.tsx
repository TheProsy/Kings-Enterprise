import { useCallback, useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { expenseService } from '@/services';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { Expense } from '@/types';
import { Receipt, FolderTree, FileSpreadsheet, Printer, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants';

interface CategoryRow {
  category: string;
  count: number;
  total: number;
}

export function ExpensesReportPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const data = await expenseService.list();
      setExpenses(data);
      setTotal(data.reduce((sum, e) => sum + (e.amount || 0), 0));
    } catch (err) {
      console.error('Failed to load expenses report:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const byCategory: CategoryRow[] = Array.from(new Set(expenses.map((expense) => expense.category)))
    .map((category) => {
      const categoryExpenses = expenses.filter((expense) => expense.category === category);
      return {
        category,
        count: categoryExpenses.length,
        total: categoryExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0),
      };
    })
    .sort((a, b) => b.total - a.total);

  const columns: Column<CategoryRow>[] = [
    {
      header: 'Expense Category',
      accessor: (cat) => (
        <span className="font-semibold text-text-primary capitalize">{cat.category}</span>
      ),
      searchKey: 'category',
      sortable: true,
    },
    {
      header: 'Recorded Entries',
      accessor: (cat) => (
        <span className="text-sm text-text-secondary">{cat.count} payments</span>
      ),
      sortable: true,
    },
    {
      header: 'Total Expenditure',
      accessor: (cat) => (
        <span className="font-bold text-text-primary">{formatMoney(cat.total)}</span>
      ),
      sortable: true,
    },
    {
      header: 'Share of Overhead',
      accessor: (cat) => {
        const pct = total > 0 ? (cat.total / total) * 100 : 0;
        return (
          <div className="flex items-center gap-3 w-48">
            <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-500"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className="text-xs font-mono font-semibold text-text-secondary min-w-[3rem]">
              {pct.toFixed(1)}%
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Operating Expenses Report"
          description="Analysis of overhead expenditures categorized by utility, operations, salaries, and maintenance."
          breadcrumbs={[
            { label: 'Reports', href: ROUTES.APP_REPORTS },
            { label: 'Expenses Report' },
          ]}
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="secondary" size="sm" asChild>
            <Link to={ROUTES.APP_REPORTS}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              All Reports
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" />
            Print Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Operating Expenses"
          value={formatMoney(total)}
          icon={<Receipt className="w-5 h-5" />}
          description="Cumulative overhead spending"
        />
        <StatCard
          label="Total Payment Entries"
          value={expenses.length.toString()}
          icon={<FileSpreadsheet className="w-5 h-5" />}
          description="Logged expense transactions"
        />
        <StatCard
          label="Expense Categories"
          value={byCategory.length.toString()}
          icon={<FolderTree className="w-5 h-5" />}
          description="Cost distribution centers"
        />
      </div>

      {/* Categorized Breakdown Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-text-primary">Category Breakdown</h3>
        <DataTable
          columns={columns}
          data={byCategory}
          loading={loading}
          searchPlaceholder="Search category..."
          emptyTitle="No expenses found"
          emptyDescription="There are no expense records to analyze."
          mobileCardRender={(cat) => {
            const pct = total > 0 ? (cat.total / total) * 100 : 0;
            return (
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-text-primary capitalize">{cat.category}</h4>
                  <span className="font-bold text-text-primary">{formatMoney(cat.total)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>{cat.count} entries</span>
                  <span>{pct.toFixed(1)}% of total</span>
                </div>
              </div>
            );
          }}
        />
      </div>

      {/* Recent Expense Entries */}
      <Card variant="soft">
        <CardHeader>
          <CardTitle>Recent 10 Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <div className="divide-y divide-border/60">
              {expenses.slice(0, 10).map((e) => (
                <div key={e.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-text-primary">{e.description || e.category}</p>
                    <p className="text-xs text-text-secondary capitalize">
                      {e.category} · {formatDate(e.createdAt)}
                    </p>
                  </div>
                  <span className="font-bold text-danger">-{formatMoney(e.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary py-4 text-center">No expense entries recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
