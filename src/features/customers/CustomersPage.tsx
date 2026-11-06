import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchInput } from '@/components/forms/SearchInput';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/Badge';
import { BUSINESS_ID, customerService } from '@/services';
import { ROUTES, buildRoute } from '@/constants';
import { formatMoney } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import type { Customer } from '@/types';
import { Plus, User, Phone, ChevronRight, AlertCircle } from 'lucide-react';

export function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await customerService.list();
      setCustomers(data);
    } catch (error) {
      console.error(error);
      toast('Could not load customers.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await customerService.create({
        businessId: BUSINESS_ID,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        totalPurchases: 0,
        totalPaid: 0,
        balanceDue: 0,
      });
      toast('Customer added successfully.', 'success');
      setShowForm(false);
      setName('');
      setPhone('');
      setAddress('');
      await loadData();
    } catch (error) {
      console.error(error);
      toast('Could not add the customer.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      (customer.phone ? customer.phone.includes(search) : false),
  );

  const columns = [
    {
      key: 'name',
      header: 'Customer',
      render: (c: Customer) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-surface-3 border border-border/80 shadow-xs flex items-center justify-center text-brand">
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
        <span className="font-semibold text-xs text-text-primary">{formatMoney(c.totalPurchases || 0)}</span>
      ),
    },
    {
      key: 'totalPaid',
      header: 'Amount Paid',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (c: Customer) => (
        <span className="text-xs font-semibold text-success-fg">{formatMoney(c.totalPaid || 0)}</span>
      ),
    },
    {
      key: 'balanceDue',
      header: 'Outstanding Debt',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (c: Customer) => (
        <span
          className={`font-bold text-xs ${
            (c.balanceDue || 0) > 0 ? 'text-warning-fg' : 'text-success-fg'
          }`}
        >
          {formatMoney(c.balanceDue || 0)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (c: Customer) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(buildRoute(ROUTES.APP_CUSTOMER_DETAIL, { customerId: c.id }))}
        >
          View Account
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Management"
        description="Directory of building contractors, artisans, and walk-in trade accounts."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(ROUTES.APP_CUSTOMER_DEBTS)}
            >
              <AlertCircle className="h-3.5 w-3.5 mr-1 text-warning-fg" />
              Debtors List
            </Button>
            <Button onClick={() => setShowForm(true)} className="shadow-xs">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Customer
            </Button>
          </div>
        }
      />

      <div className="max-w-md">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by customer name or telephone..."
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyTitle="No customers on file"
        emptyMessage={
          search
            ? 'No customers match your search.'
            : 'Add customer profiles to start recording personalized credit sales and delivery orders.'
        }
        onRowClick={(c) => navigate(buildRoute(ROUTES.APP_CUSTOMER_DETAIL, { customerId: c.id }))}
        mobileCardRender={(c) => (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-sm text-text-primary">{c.name}</p>
                {c.phone && (
                  <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" />
                    {c.phone}
                  </p>
                )}
              </div>
              <Badge variant={(c.balanceDue || 0) > 0 ? 'warning' : 'success'}>
                {(c.balanceDue || 0) > 0 ? 'Owes Debt' : 'Clear'}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs py-2 border-y border-border/60">
              <div>
                <span className="text-text-muted block text-3xs">Purchases</span>
                <span className="font-bold text-text-primary">{formatMoney(c.totalPurchases || 0)}</span>
              </div>
              <div>
                <span className="text-text-muted block text-3xs">Paid</span>
                <span className="font-semibold text-success-fg">{formatMoney(c.totalPaid || 0)}</span>
              </div>
              <div className="text-right">
                <span className="text-text-muted block text-3xs">Owes Store</span>
                <span
                  className={`font-bold ${
                    (c.balanceDue || 0) > 0 ? 'text-warning-fg' : 'text-success-fg'
                  }`}
                >
                  {formatMoney(c.balanceDue || 0)}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <span className="text-xs font-semibold text-brand flex items-center">
                View Account <ChevronRight className="h-3 w-3 ml-0.5" />
              </span>
            </div>
          </div>
        )}
      />

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add New Customer"
        description="Register a customer for sales invoices, receipt issuance, and credit tracking."
        size="sm"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Customer / Company Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chief Ibrahim Suleiman"
            required
          />
          <Input
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 08023456789"
          />
          <Input
            label="Site / Delivery Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Phase 2 Site, Lokongoma"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Add Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
