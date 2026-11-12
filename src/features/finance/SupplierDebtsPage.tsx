import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { supplierService } from '@/services';
import { formatMoney } from '@/lib/formatters';
import { ROUTES, buildRoute } from '@/constants';
import { toast } from '@/lib/toast';
import type { Supplier } from '@/types';
import { AlertCircle, Building2, Users } from 'lucide-react';

export function SupplierDebtsPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supplierService
      .list()
      .then((data) => {
        if (!active) return;
        setSuppliers(
          data
            .filter((supplier) => (supplier.balanceDue || 0) > 0)
            .sort((a, b) => (b.balanceDue || 0) - (a.balanceDue || 0)),
        );
      })
      .catch((error) => {
        console.error(error);
        toast('Could not load supplier debts.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const total = suppliers.reduce((sum, supplier) => sum + (supplier.balanceDue || 0), 0);

  const columns = [
    {
      key: 'name',
      header: 'Supplier / Vendor',
      render: (s: Supplier) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-danger-soft text-danger-fg flex items-center justify-center font-bold text-xs">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-text-primary text-sm">{s.name}</p>
            {s.phone && <p className="text-xs text-text-muted">{s.phone}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact',
      render: (s: Supplier) => (
        <span className="text-xs text-text-secondary">{s.phone || '—'}</span>
      ),
    },
    {
      key: 'totalPurchases',
      header: 'Total Invoiced',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (s: Supplier) => (
        <span className="text-xs font-medium text-text-primary">{formatMoney(s.totalPurchases || 0)}</span>
      ),
    },
    {
      key: 'balanceDue',
      header: 'Payable Debt (We Owe)',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (s: Supplier) => (
        <span className="text-sm font-bold text-danger-fg">
          {formatMoney(s.balanceDue || 0)}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (s: Supplier) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(buildRoute(ROUTES.APP_SUPPLIER_DETAIL, { supplierId: s.id }))}
        >
          Pay Supplier
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Debts"
        description="Monitor outstanding vendor obligations, invoices, and payment schedules."
        breadcrumbs={[
          { label: 'Money & Finance', href: ROUTES.APP_FINANCE },
          { label: 'Supplier Debts' },
        ]}
        action={
          <Button
            variant="secondary"
            onClick={() => navigate(ROUTES.APP_FINANCE_CUSTOMER_DEBTS)}
          >
            <Users className="mr-1.5 h-4 w-4" />
            Customer Debts
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Supplier Debt"
          value={formatMoney(total)}
          subtitle="Payable obligation across all suppliers"
          icon={<Building2 className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label="Creditor Suppliers"
          value={suppliers.length}
          subtitle="Suppliers with outstanding balances"
          icon={<Building2 className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Average Payable"
          value={formatMoney(suppliers.length > 0 ? total / suppliers.length : 0)}
          subtitle="Mean amount owed per supplier"
          icon={<AlertCircle className="h-5 w-5" />}
          tone="neutral"
        />
      </div>

      <DataTable
        columns={columns}
        data={suppliers}
        loading={loading}
        searchPlaceholder="Search suppliers by name or phone..."
        emptyTitle="All supplier invoices settled!"
        emptyMessage="There are currently no unpaid supplier balances on record."
        onRowClick={(s) => navigate(buildRoute(ROUTES.APP_SUPPLIER_DETAIL, { supplierId: s.id }))}
        mobileCardRender={(s) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-text-primary">{s.name}</p>
                {s.phone && <p className="truncate text-xs text-text-muted">{s.phone}</p>}
              </div>
              <Badge variant="danger">Payable</Badge>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
              <span className="text-text-muted">Balance we owe</span>
              <span className="text-sm font-bold tabular-nums text-danger-fg">
                {formatMoney(s.balanceDue || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Invoiced {formatMoney(s.totalPurchases || 0)}</span>
            </div>
          </div>
        )}
      />
    </div>
  );
}
