import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { customerService } from '@/services';
import { formatMoney } from '@/lib/formatters';
import { ROUTES, buildRoute } from '@/constants';
import { toast } from '@/lib/toast';
import type { Customer } from '@/types';
import { AlertCircle, User } from 'lucide-react';

export function CustomerDebtsPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    customerService
      .list()
      .then((data) => {
        if (!active) return;
        setCustomers(
          data
            .filter((customer) => (customer.balanceDue || 0) > 0)
            .sort((a, b) => (b.balanceDue || 0) - (a.balanceDue || 0)),
        );
      })
      .catch((error) => {
        console.error(error);
        toast('Could not load customer debts.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const total = customers.reduce((sum, customer) => sum + (customer.balanceDue || 0), 0);

  const columns = [
    {
      key: 'name',
      header: 'Debtor Name',
      render: (c: Customer) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-warning-soft dark:bg-warning/15 text-warning-fg flex items-center justify-center font-bold text-xs">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-text-primary text-sm">{c.name}</p>
            {c.phone && <p className="text-xs text-text-muted">{c.phone}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone Number',
      render: (c: Customer) => (
        <span className="text-xs text-text-secondary">{c.phone || '—'}</span>
      ),
    },
    {
      key: 'totalPurchases',
      header: 'Total Purchases',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (c: Customer) => (
        <span className="text-xs font-medium text-text-primary">{formatMoney(c.totalPurchases || 0)}</span>
      ),
    },
    {
      key: 'totalPaid',
      header: 'Total Paid',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (c: Customer) => (
        <span className="text-xs font-semibold text-success-fg">{formatMoney(c.totalPaid || 0)}</span>
      ),
    },
    {
      key: 'balanceDue',
      header: 'Outstanding Balance',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (c: Customer) => (
        <span className="text-sm font-bold text-warning-fg">
          {formatMoney(c.balanceDue || 0)}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (c: Customer) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(buildRoute(ROUTES.APP_CUSTOMER_DETAIL, { customerId: c.id }))}
        >
          Collect
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Debts & Receivables"
        description="Monitor outstanding receivables from contractors and customers on credit."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
        <StatCard
          label="Total Uncollected Debt"
          value={formatMoney(total)}
          subtitle="Receivable across all credit customers"
          icon={<AlertCircle className="h-5 w-5 text-warning-fg" />}
        />
        <StatCard
          label="Debtor Accounts"
          value={customers.length}
          subtitle="Customers with active balance due"
          icon={<User className="h-5 w-5 text-brand" />}
        />
      </div>

      <DataTable
        columns={columns}
        data={customers}
        loading={loading}
        emptyTitle="All customer debts settled!"
        emptyMessage="There are currently no customers with outstanding balances due to the store."
        onRowClick={(c) => navigate(buildRoute(ROUTES.APP_CUSTOMER_DETAIL, { customerId: c.id }))}
        mobileCardRender={(c) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-sm text-text-primary">{c.name}</p>
                {c.phone && <p className="text-xs text-text-muted">{c.phone}</p>}
              </div>
              <Badge variant="warning">Owes Store</Badge>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
              <span className="text-text-muted">Balance Due:</span>
              <span className="font-bold text-sm text-warning-fg">{formatMoney(c.balanceDue || 0)}</span>
            </div>
          </div>
        )}
      />
    </div>
  );
}
