import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchInput } from '@/components/forms/SearchInput';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/Badge';
import { BUSINESS_ID, supplierService } from '@/services';
import { ROUTES, buildRoute } from '@/constants';
import { useNavigate } from 'react-router-dom';
import { formatMoney } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import type { Supplier } from '@/types';
import { Plus, Building2, Phone, ChevronRight } from 'lucide-react';

export function SuppliersPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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
      const data = await supplierService.list();
      setSuppliers(data);
    } catch (error) {
      console.error(error);
      toast('Could not load suppliers.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await supplierService.create({
        businessId: BUSINESS_ID,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        totalPurchases: 0,
        totalPaid: 0,
        balanceDue: 0,
      });
      toast('Supplier added successfully.', 'success');
      setShowForm(false);
      setName('');
      setPhone('');
      setAddress('');
      await loadData();
    } catch (error) {
      console.error(error);
      toast('Could not add the supplier.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(search.toLowerCase()) ||
      (supplier.phone ? supplier.phone.includes(search) : false),
  );

  const columns = [
    {
      key: 'name',
      header: 'Supplier Company',
      render: (s: Supplier) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-surface-3 border border-border/80 shadow-xs flex items-center justify-center text-brand">
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
      key: 'address',
      header: 'Location / Address',
      render: (s: Supplier) => (
        <span className="text-xs text-text-secondary">{s.address || '—'}</span>
      ),
    },
    {
      key: 'totalPurchases',
      header: 'Total Volume',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (s: Supplier) => (
        <span className="font-medium text-xs text-text-primary">{formatMoney(s.totalPurchases || 0)}</span>
      ),
    },
    {
      key: 'balanceDue',
      header: 'We Owe (Payable)',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (s: Supplier) => (
        <span
          className={`font-bold text-xs ${
            (s.balanceDue || 0) > 0 ? 'text-danger-fg' : 'text-success-fg'
          }`}
        >
          {formatMoney(s.balanceDue || 0)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (s: Supplier) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(buildRoute(ROUTES.APP_SUPPLIER_DETAIL, { supplierId: s.id }))}
        >
          View Statement
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers Directory"
        description="Manage building material distributors, factories, and trade accounts."
        action={
          <Button onClick={() => setShowForm(true)} className="shadow-xs">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Supplier
          </Button>
        }
      />

      <div className="max-w-md">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search suppliers by name or phone..."
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyTitle="No suppliers listed"
        emptyMessage={
          search
            ? 'No suppliers match your query.'
            : 'Click "Add Supplier" to record your vendors and wholesale distributors.'
        }
        onRowClick={(s) => navigate(buildRoute(ROUTES.APP_SUPPLIER_DETAIL, { supplierId: s.id }))}
        mobileCardRender={(s) => (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-sm text-text-primary">{s.name}</p>
                {s.phone && (
                  <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" />
                    {s.phone}
                  </p>
                )}
              </div>
              <Badge variant={(s.balanceDue || 0) > 0 ? 'danger' : 'success'}>
                {(s.balanceDue || 0) > 0 ? 'Balance Owed' : 'Settled'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-border/60">
              <div>
                <span className="text-text-muted block">Purchases Total:</span>
                <span className="font-medium text-text-primary">{formatMoney(s.totalPurchases || 0)}</span>
              </div>
              <div className="text-right">
                <span className="text-text-muted block">Amount We Owe:</span>
                <span
                  className={`font-bold text-sm ${
                    (s.balanceDue || 0) > 0 ? 'text-danger-fg' : 'text-success-fg'
                  }`}
                >
                  {formatMoney(s.balanceDue || 0)}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <span className="text-xs font-semibold text-brand flex items-center">
                View Statement <ChevronRight className="h-3 w-3 ml-0.5" />
              </span>
            </div>
          </div>
        )}
      />

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add New Supplier"
        description="Register a building materials supplier or distributor account."
        size="sm"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Company / Vendor Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dangote Cement Depot Lokoja"
            required
          />
          <Input
            label="Contact Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 08012345678"
          />
          <Input
            label="Physical Address / Depot"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Ganaja Junction, Lokoja"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Add Supplier
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
