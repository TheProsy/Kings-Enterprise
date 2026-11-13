import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { customerService } from '@/services';
import { formatMoney } from '@/lib/formatters';
import { ROUTES, PERMISSIONS, buildRoute } from '@/constants';
import { useAuth } from '@/features/auth';
import { toast } from '@/lib/toast';
import type { Customer } from '@/types';
import { AlertCircle, Building2, User } from 'lucide-react';

export function CustomerDebtsPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canViewFinance = hasPermission(PERMISSIONS.FINANCE_VIEW);
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
        title="Customer Debts"
        description="Monitor outstanding receivables from contractors and customers on credit."
        breadcrumbs={[
          { label: 'Customers', href: ROUTES.APP_CUSTOMERS },
          { label: 'Debtors List' },
        ]}
        action={
          canViewFinance ? (
            <Button
              variant="secondary"
              onClick={() => navigate(ROUTES.APP_FINANCE_SUPPLIER_DEBTS)}
            >
              <Building2 className="mr-1.5 h-4 w-4" />
              Supplier Debts
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Uncollected Debt"
          value={formatMoney(total)}
          subtitle="Receivable across all credit customers"
          icon={<AlertCircle className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Debtor Accounts"
          value={customers.length}
          subtitle="Customers with an active balance"
          icon={<User className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Average Balance"
          value={formatMoney(customers.length > 0 ? total / customers.length : 0)}
          subtitle="Mean amount owed per debtor"
          icon={<AlertCircle className="h-5 w-5" />}
          tone="neutral"
        />
      </div>

      <DataTable
        columns={columns}
        data={customers}
        loading={loading}
        searchPlaceholder="Search customers by name or phone..."
        emptyTitle="All customer debts settled!"
        emptyMessage="There are currently no customers with outstanding balances due to the store."
        onRowClick={(c) => navigate(buildRoute(ROUTES.APP_CUSTOMER_DETAIL, { customerId: c.id }))}
        mobileCardRender={(c) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-text-primary">{c.name}</p>
                {c.phone && <p className="truncate text-xs text-text-muted">{c.phone}</p>}
              </div>
              <Badge variant="warning">Owes Store</Badge>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
              <span className="text-text-muted">Balance due</span>
              <span className="text-sm font-bold tabular-nums text-warning-fg">
                {formatMoney(c.balanceDue || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Purchases {formatMoney(c.totalPurchases || 0)}</span>
              <span>Paid {formatMoney(c.totalPaid || 0)}</span>
            </div>
          </div>
        )}
      />
    </div>
  );
}
