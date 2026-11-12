import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { DataTable } from '@/components/tables/DataTable';
import { authService } from '@/services';
import {
  PERMISSIONS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  ROLES,
  ROUTES,
} from '@/constants';
import { toast } from '@/lib/toast';
import { getAuthErrorMessage } from '@/features/auth/authErrors';
import { useAuth } from '@/features/auth';
import type { User } from '@/types';
import { Plus, Shield, KeyRound, UserX } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: ROLES.SALESPERSON, label: 'Salesperson' },
  { value: ROLES.STOCK_MANAGER, label: 'Stock Manager' },
  { value: ROLES.OWNER, label: 'Store Owner' },
];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export function EmployeesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = user?.role === ROLES.OWNER;
  const [employees, setEmployees] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deactivatingEmployee, setDeactivatingEmployee] = useState<User | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<string>(ROLES.SALESPERSON);
  const [permissions, setPermissions] = useState<string[]>(
    ROLE_PERMISSIONS[ROLES.SALESPERSON] as unknown as string[],
  );

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await authService.getEmployees();
      setEmployees(data);
    } catch (error) {
      console.error(error);
      toast('Could not load employees.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const changeRole = (nextRole: string) => {
    setRole(nextRole);
    setPermissions(
      (ROLE_PERMISSIONS[nextRole as keyof typeof ROLE_PERMISSIONS] || []) as unknown as string[],
    );
  };

  const togglePermission = (permission: string) => {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((entry) => entry !== permission)
        : [...current, permission],
    );
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 6) {
      toast('Enter a name, email and a password of at least 6 characters.', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      toast('The two passwords do not match.', 'warning');
      return;
    }

    setSaving(true);
    try {
      await authService.createEmployee(
        email.trim(),
        password,
        name.trim(),
        role,
        permissions,
      );
      toast('Employee login created. They can now sign in with this email and password.', 'success');
      setShowForm(false);
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      changeRole(ROLES.SALESPERSON);
      await loadData();
    } catch (error) {
      console.error(error);
      toast(getAuthErrorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivation = async () => {
    if (!deactivatingEmployee) return;
    try {
      await authService.deactivateEmployee(deactivatingEmployee.id);
      toast(`Staff member ${deactivatingEmployee.name} deactivated.`, 'success');
      setDeactivatingEmployee(null);
      await loadData();
    } catch (error) {
      console.error(error);
      toast('Could not deactivate the employee.', 'error');
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (employee: User) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-surface-3 border border-border/80 shadow-xs flex items-center justify-center font-bold text-xs text-brand">
            {employee.name?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="font-semibold text-text-primary text-sm">{employee.name}</p>
            <p className="text-xs text-text-muted">{employee.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Assigned Role',
      render: (employee: User) => (
        <Badge variant={employee.role === 'owner' ? 'info' : 'neutral'}>
          <Shield className="h-3 w-3 mr-1" />
          {ROLE_LABELS[employee.role as keyof typeof ROLE_LABELS] || employee.role}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Account Status',
      render: (employee: User) => (
        <Badge variant={employee.active ? 'success' : 'danger'}>
          {employee.active ? 'Active' : 'Deactivated'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (employee: User) => (
        <div className="flex items-center justify-end gap-2">
          {isOwner && employee.role !== 'owner' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  navigate(
                    `${ROUTES.APP_EMPLOYEE_PERMISSIONS}?employee=${employee.id}`,
                  )
                }
              >
                <KeyRound className="h-3 w-3 mr-1" />
                Permissions
              </Button>
              {employee.active && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeactivatingEmployee(employee)}
                  className="text-danger-fg hover:bg-danger-soft dark:hover:bg-danger/15"
                >
                  <UserX className="h-3.5 w-3.5 mr-1" />
                  Deactivate
                </Button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Manage cashier logins, role assignments, and feature permissions."
        action={
          isOwner ? (
            <Button onClick={() => setShowForm(true)} className="shadow-xs">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Staff Member
            </Button>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={employees}
        loading={loading}
        searchPlaceholder="Search staff by name or email..."
        emptyTitle="No staff accounts on file"
        emptyMessage="Click 'Add Staff Member' to register staff users for POS sales and stock receiving."
        mobileCardRender={(employee) => (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-text-primary">{employee.name}</p>
                <p className="truncate text-xs text-text-muted">{employee.email}</p>
              </div>
              <Badge variant={employee.active ? 'success' : 'danger'}>
                {employee.active ? 'Active' : 'Deactivated'}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
              <Badge variant={employee.role === 'owner' ? 'info' : 'neutral'}>
                {ROLE_LABELS[employee.role as keyof typeof ROLE_LABELS] || employee.role}
              </Badge>
              {isOwner && employee.role !== 'owner' && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate(
                        `${ROUTES.APP_EMPLOYEE_PERMISSIONS}?employee=${employee.id}`,
                      )
                    }
                  >
                    Permissions
                  </Button>
                  {employee.active && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeactivatingEmployee(employee)}
                      className="text-danger-fg"
                    >
                      Deactivate
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      />

      {/* Add Staff Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add New Staff Member"
        description="Create credentials and assign initial operational permissions."
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Full Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Samuel Adebayo"
            required
          />
          <Input
            label="Login Email Address *"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="samuel@buildstore.ng"
            autoComplete="off"
            helper="This creates a real Firebase login account for the staff member."
            required
          />
          <Input
            label="Initial Password *"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            minLength={6}
            required
          />
          <Input
            label="Confirm Password *"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter the password"
            autoComplete="new-password"
            minLength={6}
            required
          />
          <Select
            label="Assigned System Role *"
            options={ROLE_OPTIONS}
            value={role}
            onChange={(e) => changeRole(e.target.value)}
          />

          {role !== ROLES.OWNER && (
            <div className="pt-2">
              <label className="text-xs font-semibold text-text-primary block uppercase tracking-wider mb-2">
                Granular Permissions ({permissions.length} granted)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 rounded-xl bg-surface-3 border border-border shadow-xs">
                {ALL_PERMISSIONS.map((perm) => (
                  <label
                    key={perm}
                    className="flex items-center gap-2 text-xs text-text-primary cursor-pointer hover:text-brand"
                  >
                    <input
                      type="checkbox"
                      checked={permissions.includes(perm)}
                      onChange={() => togglePermission(perm)}
                      className="rounded border-border text-brand focus:ring-brand"
                    />
                    <span className="truncate">
                      {PERMISSION_LABELS[perm as keyof typeof PERMISSION_LABELS] || perm}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving} className="shadow-xs">
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Deactivation */}
      <ConfirmModal
        open={Boolean(deactivatingEmployee)}
        onClose={() => setDeactivatingEmployee(null)}
        onConfirm={confirmDeactivation}
        title="Confirm Account Deactivation"
        message={`Are you sure you want to deactivate ${deactivatingEmployee?.name}? They will immediately be signed out and unable to access the system.`}
        confirmText="Deactivate Staff"
        variant="danger"
      />
    </div>
  );
}
