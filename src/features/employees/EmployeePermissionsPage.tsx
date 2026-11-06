import { useCallback, useState, useEffect, useMemo } from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/Modal';
import { PanelSkeleton } from '@/components/ui/Skeleton';
import { authService } from '@/services';
import { PERMISSIONS, ROLE_PERMISSIONS, ROUTES } from '@/constants';
import { toast } from '@/lib/toast';
import type { User } from '@/types';
import { Shield, Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utilities';

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const GROUP_LABELS: Record<string, string> = {
  products: 'Products & Stock',
  sales: 'Sales & POS',
  receipts: 'Receipts & Documents',
  purchases: 'Purchases & Stock Intake',
  suppliers: 'Suppliers Directory',
  customers: 'Customer Accounts',
  expenses: 'Operating Expenses',
  finance: 'Finance & Cashbook',
  reports: 'Reports & Analytics',
  employees: 'Staff Management',
  settings: 'System Settings',
};

export function EmployeePermissionsPage() {
  const [searchParams] = useSearchParams();
  const requestedEmployeeId = searchParams.get('employee');
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await authService.getEmployees();
      setEmployees(data);
      const initial =
        data.find((employee) => employee.id === requestedEmployeeId) ||
        data.find((employee) => employee.role !== 'owner');
      if (initial) {
        setSelectedId(initial.id);
        setPermissions(initial.permissions || []);
      }
    } catch (error) {
      console.error(error);
      toast('Could not load employees.', 'error');
    } finally {
      setLoading(false);
    }
  }, [requestedEmployeeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedEmployee = employees.find((employee) => employee.id === selectedId) || null;

  const grouped = useMemo(() => {
    const groups = new Map<string, string[]>();
    ALL_PERMISSIONS.forEach((permission) => {
      const group = permission.split(':')[0];
      groups.set(group, [...(groups.get(group) || []), permission]);
    });
    return Array.from(groups.entries());
  }, []);

  const selectEmployee = (employeeId: string) => {
    setSelectedId(employeeId);
    const employee = employees.find((entry) => entry.id === employeeId);
    setPermissions(employee?.permissions || []);
  };

  const togglePermission = (permission: string) => {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((entry) => entry !== permission)
        : [...current, permission],
    );
  };

  const resetToRoleDefaults = () => {
    if (!selectedEmployee) return;
    const defaults = ROLE_PERMISSIONS[selectedEmployee.role] || [];
    setPermissions([...defaults]);
    toast('Permissions reset to standard role defaults.', 'info');
  };

  const executeSave = async () => {
    if (!selectedEmployee) return;
    setSaving(true);
    setConfirmModalOpen(false);
    try {
      await authService.updateEmployeePermissions(selectedEmployee.id, permissions);
      toast(`Permissions updated for ${selectedEmployee.name}.`, 'success');
    } catch (error) {
      console.error(error);
      toast('Could not save permissions.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permission Management"
        description="Fine-tune feature access and capabilities per staff member."
        breadcrumb={
          <NavLink to={ROUTES.APP_EMPLOYEES} className="hover:underline">
            ← Back to Employees
          </NavLink>
        }
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetToRoleDefaults}
              disabled={!selectedEmployee || saving}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Role Defaults
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setConfirmModalOpen(true)}
              disabled={!selectedEmployee || saving}
              isLoading={saving}
              className="shadow-xs"
            >
              <Check className="h-4 w-4 mr-1" />
              Save Permissions
            </Button>
          </div>
        }
      />

      {loading ? (
        <PanelSkeleton rows={6} />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Staff Selector (4 cols) */}
        <div className="lg:col-span-4 space-y-2">
          <Card variant="soft" className="p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
              Select Staff Account
            </p>
            <div className="space-y-1.5">
              {employees.map((emp) => {
                const isSelected = emp.id === selectedId;
                return (
                  <button
                    key={emp.id}
                    onClick={() => selectEmployee(emp.id)}
                    className={cn(
                      'w-full p-3 rounded-xl text-left transition-all flex items-center justify-between border btn-press',
                      isSelected
                        ? 'bg-brand text-white border-transparent shadow-xs'
                        : 'bg-surface text-text-primary border-border/80 hover:bg-surface-3',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate">{emp.name}</p>
                      <p className={cn('text-2xs truncate', isSelected ? 'text-white/80' : 'text-text-muted')}>
                        {emp.email}
                      </p>
                    </div>
                    <Badge variant={isSelected ? 'outline' : 'neutral'} className={isSelected ? 'text-white border-white/30' : ''}>
                      {emp.role}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Permission Matrix (8 cols) */}
        <div className="lg:col-span-8">
          {selectedEmployee ? (
            <Card variant="soft" className="p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div>
                  <h3 className="font-bold text-base text-text-primary">
                    Permissions for {selectedEmployee.name}
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {permissions.length} total privileges enabled for this user.
                  </p>
                </div>
                <Badge variant="info">
                  <Shield className="h-3.5 w-3.5 mr-1" />
                  Role: {selectedEmployee.role}
                </Badge>
              </div>

              {/* Grouped Permission Checkboxes */}
              <div className="space-y-5">
                {grouped.map(([group, groupPerms]) => (
                  <div key={group} className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                      {GROUP_LABELS[group] || group}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {groupPerms.map((perm) => {
                        const checked = permissions.includes(perm);
                        return (
                          <label
                            key={perm}
                            className={cn(
                              'flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all select-none',
                              checked
                                ? 'bg-surface border-brand shadow-xs text-text-primary font-semibold'
                                : 'bg-surface-3/50 border-border/60 text-text-secondary hover:bg-surface-3',
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(perm)}
                              className="rounded border-border text-brand focus:ring-brand"
                            />
                            <span className="truncate">{perm}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <EmptyState
              title="No staff member selected"
              description="Choose an employee from the left panel to configure their permissions."
            />
          )}
        </div>
      </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmModal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={executeSave}
        title="Confirm Permission Changes"
        message={`Save updated access permissions for ${selectedEmployee?.name}? These changes will immediately take effect for their active sessions.`}
        confirmText="Save Access Rules"
        variant="primary"
      />
    </div>
  );
}
