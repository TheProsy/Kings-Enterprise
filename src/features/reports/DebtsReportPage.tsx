import { useCallback, useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { StatsSkeleton } from '@/components/ui/Skeleton';
import { customerService, supplierService } from '@/services';
import { formatMoney } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import { useAuth } from '@/features/auth';
import { Users, Truck, ArrowUpRight, ArrowDownRight, Scale, Printer, ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES, PERMISSIONS, buildRoute } from '@/constants';

export function DebtsReportPage() {
  const { hasPermission } = useAuth();
  const canViewSuppliers = hasPermission(PERMISSIONS.SUPPLIERS_VIEW);
  const canViewFinance = hasPermission(PERMISSIONS.FINANCE_VIEW);
  const [customerDebts, setCustomerDebts] = useState(0);
  const [supplierDebts, setSupplierDebts] = useState(0);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [custs, sups] = await Promise.all([
        customerService.list(),
        supplierService.list(),
      ]);
      const custWithDebts = custs.filter((c) => (c.balanceDue || 0) > 0);
      const supWithDebts = sups.filter((s) => (s.balanceDue || 0) > 0);
      setCustomers(custWithDebts);
      setSuppliers(supWithDebts);
      setCustomerDebts(custWithDebts.reduce((sum, c) => sum + (c.balanceDue || 0), 0));
      setSupplierDebts(supWithDebts.reduce((sum, s) => sum + (s.balanceDue || 0), 0));
    } catch (err) {
      console.error('Failed to load debts report:', err);
      toast('Could not load the debts report.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const netPosition = customerDebts - supplierDebts;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Debts Report"
        description="Consolidated overview of outstanding customer credit accounts and vendor trade payables."
        breadcrumbs={[
          { label: 'Reports', href: ROUTES.APP_REPORTS },
          { label: 'Debts Report' },
        ]}
        action={
          <>
            <Button variant="secondary" size="sm" asChild>
              <Link to={ROUTES.APP_REPORTS}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                All Reports
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1.5" />
              Print Statement
            </Button>
          </>
        }
      />

      {/* KPI Cards */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Customer Receivables"
            value={formatMoney(customerDebts)}
            icon={<ArrowDownRight className="w-5 h-5 text-warning" />}
            variant="warning"
            description={`${customers.length} debtor(s) owe payments`}
          />
          <StatCard
            label="Supplier Payables"
            value={formatMoney(supplierDebts)}
            icon={<ArrowUpRight className="w-5 h-5 text-danger" />}
            variant="danger"
            description={`${suppliers.length} vendor(s) owed for materials`}
          />
          <StatCard
            label="Net Balance Position"
            value={formatMoney(Math.abs(netPosition))}
            icon={<Scale className="w-5 h-5" />}
            variant={netPosition >= 0 ? 'success' : 'danger'}
            description={
              netPosition > 0
                ? 'Store is in net surplus (owed more)'
                : netPosition < 0
                  ? 'Store owes more in vendor payables'
                  : 'Debts and receivables are even'
            }
          />
        </div>
      )}

      {/* Side-by-side Ledger Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Receivables */}
        <Card variant="soft" className="p-5">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-warning" />
              Customer Receivables ({customers.length})
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to={ROUTES.APP_FINANCE_CUSTOMER_DEBTS}>
                Ledger <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {customers.length > 0 ? (
              <div className="divide-y divide-border/60">
                {customers.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 py-3.5">
                    <div className="min-w-0">
                      <Link
                        to={buildRoute(ROUTES.APP_CUSTOMER_DETAIL, { customerId: c.id })}
                        className="block truncate text-sm font-bold text-text-primary transition-colors hover:text-brand"
                      >
                        {c.name}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-text-secondary">
                        {c.phone || 'No phone'} · Sales: {formatMoney(c.totalPurchases || 0)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-bold text-warning text-sm block">
                        {formatMoney(c.balanceDue)}
                      </span>
                      <StatusBadge status="Owing" variant="warning" size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-text-secondary">
                No outstanding customer debts. All customer invoices are settled.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supplier Payables */}
        <Card variant="soft" className="p-5">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-5 w-5 text-danger" />
              Supplier Payables ({suppliers.length})
            </CardTitle>
            {canViewFinance && (
              <Button variant="ghost" size="sm" asChild>
                <Link to={ROUTES.APP_FINANCE_SUPPLIER_DEBTS}>
                  Ledger <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {suppliers.length > 0 ? (
              <div className="divide-y divide-border/60">
                {suppliers.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-3.5">
                    <div className="min-w-0">
                      {canViewSuppliers ? (
                        <Link
                          to={buildRoute(ROUTES.APP_SUPPLIER_DETAIL, { supplierId: s.id })}
                          className="block truncate text-sm font-bold text-text-primary transition-colors hover:text-brand"
                        >
                          {s.name}
                        </Link>
                      ) : (
                        <p className="block truncate text-sm font-bold text-text-primary">
                          {s.name}
                        </p>
                      )}
                      <p className="mt-0.5 truncate text-xs text-text-secondary">
                        {s.contactPerson ? `${s.contactPerson} · ` : ''}{s.phone || 'No phone'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-bold text-danger text-sm block">
                        {formatMoney(s.balanceDue)}
                      </span>
                      <StatusBadge status="Unsettled" variant="danger" size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-text-secondary">
                No outstanding vendor debts. All supplier invoices are fully paid.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
