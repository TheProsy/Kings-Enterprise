import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { PanelSkeleton } from '@/components/ui/Skeleton';
import { Package, CreditCard, Palette, Lock, History, Check, Building2, Receipt, Sun, Moon } from 'lucide-react';
import { authService, settingsService } from '@/services';
import { BUSINESS } from '@/config/business';
import { ROUTES } from '@/constants';
import { DEFAULT_RECEIPT_SETTINGS, normalizeReceiptSettings } from '@/lib/receipts';
import { toast } from '@/lib/toast';
import { useTheme } from '@/contexts/useTheme';
import { cn } from '@/lib/utilities';
import type { ReceiptSettings as ReceiptConfig } from '@/types';

type SettingsTab = 'business' | 'receipt' | 'inventory' | 'payments' | 'appearance' | 'security';

interface GeneralSettings {
  name: string;
  phone: string;
  address: string;
  email: string;
  logoUrl: string;
}

interface InventorySettings {
  currency: string;
  lowStockThreshold: number;
  autoDeactivate: boolean;
}

interface PaymentSettings {
  cash: boolean;
  transfer: boolean;
  pos: boolean;
  mixed: boolean;
}

const DEFAULT_GENERAL: GeneralSettings = {
  name: BUSINESS.name,
  phone: BUSINESS.phone,
  address: BUSINESS.address,
  email: BUSINESS.email,
  logoUrl: '',
};

const DEFAULT_RECEIPT: ReceiptConfig = DEFAULT_RECEIPT_SETTINGS;

const DEFAULT_INVENTORY: InventorySettings = {
  currency: 'NGN',
  lowStockThreshold: 5,
  autoDeactivate: false,
};

const DEFAULT_PAYMENTS: PaymentSettings = {
  cash: true,
  transfer: true,
  pos: true,
  mixed: false,
};

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('business');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [general, setGeneral] = useState<GeneralSettings>(DEFAULT_GENERAL);
  const [receipt, setReceipt] = useState<ReceiptConfig>(DEFAULT_RECEIPT);
  const [inventory, setInventory] = useState<InventorySettings>(DEFAULT_INVENTORY);
  const [payments, setPayments] = useState<PaymentSettings>(DEFAULT_PAYMENTS);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let active = true;
    settingsService
      .get()
      .then((data) => {
        if (!active || !data) return;
        if (data.general) setGeneral({ ...DEFAULT_GENERAL, ...data.general });
        if (data.receipt || data.general) {
          setReceipt(normalizeReceiptSettings(data.receipt, data.general));
        }
        if (data.inventory) setInventory({ ...DEFAULT_INVENTORY, ...data.inventory });
        if (data.payments) setPayments({ ...DEFAULT_PAYMENTS, ...data.payments });
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const saveSettings = async (section: string, payload: any) => {
    setSaving(true);
    try {
      await settingsService.update({ [section]: payload });
      toast('Settings saved successfully.', 'success');
    } catch (error) {
      console.error(error);
      toast('Could not save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast('New password must be at least 6 characters.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('New passwords do not match.', 'warning');
      return;
    }

    setSaving(true);
    try {
      await authService.updatePassword(currentPassword, newPassword);
      toast('Password updated successfully.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(error);
      toast('Could not update password. Verify current password.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: any }> = [
    { id: 'business', label: 'Store Information', icon: Building2 },
    { id: 'receipt', label: 'Receipt Template', icon: Receipt },
    { id: 'inventory', label: 'Stock Thresholds', icon: Package },
    { id: 'payments', label: 'Accepted Payments', icon: CreditCard },
    { id: 'appearance', label: 'Theme & Appearance', icon: Palette },
    { id: 'security', label: 'Account Security', icon: Lock },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Preferences"
        description="Configure store profile, thermal receipt formatting, and operational rules."
        action={
          <Button variant="outline" size="sm" asChild>
            <NavLink to={ROUTES.APP_SETTINGS_AUDIT_LOGS}>
              <History className="h-3.5 w-3.5 mr-1" />
              Security Audit Logs
            </NavLink>
          </Button>
        }
      />

      {loading ? (
        <PanelSkeleton rows={5} />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Settings Navigation Tabs (4 cols) */}
        <div className="lg:col-span-4 space-y-1">
          <Card variant="soft" className="p-2 shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all text-left btn-press select-none',
                    isSelected
                      ? 'bg-brand text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-3',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </Card>
        </div>

        {/* Settings Content Area (8 cols) */}
        <div className="lg:col-span-8">
          {/* Tab 1: Business Profile */}
          {activeTab === 'business' && (
            <Card variant="soft" className="p-6 shadow-sm space-y-5">
              <CardHeader className="p-0 pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold text-text-primary">
                  Store Business Profile
                </CardTitle>
                <CardDescription>
                  Details displayed on public storefront, quotes, and customer receipts.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <Input
                  label="Registered Business Name"
                  value={general.name}
                  onChange={(e) => setGeneral({ ...general, name: e.target.value })}
                />
                <Input
                  label="Official Contact Phone"
                  value={general.phone}
                  onChange={(e) => setGeneral({ ...general, phone: e.target.value })}
                />
                <Input
                  label="Store Email"
                  type="email"
                  value={general.email}
                  onChange={(e) => setGeneral({ ...general, email: e.target.value })}
                />
                <Textarea
                  label="Physical Depot Address"
                  value={general.address}
                  onChange={(e) => setGeneral({ ...general, address: e.target.value })}
                  rows={2}
                />
                <div className="flex justify-end pt-3 border-t border-border/60">
                  <Button
                    variant="primary"
                    onClick={() => saveSettings('general', general)}
                    isLoading={saving}
                    className="shadow-xs font-semibold"
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab 2: Receipt Template */}
          {activeTab === 'receipt' && (
            <Card variant="soft" className="p-6 shadow-sm space-y-5">
              <CardHeader className="p-0 pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold text-text-primary">
                  Receipt Branding & Documents
                </CardTitle>
                <CardDescription>
                  Printed on every sales, payment, return and void receipt. Details are
                  snapshotted at issue time so historic receipts never change.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Business Name on Receipt"
                    value={receipt.businessName}
                    onChange={(e) => setReceipt({ ...receipt, businessName: e.target.value })}
                  />
                  <Input
                    label="Receipt Hotline"
                    value={receipt.phone || ''}
                    onChange={(e) => setReceipt({ ...receipt, phone: e.target.value })}
                  />
                </div>
                <Input
                  label="Tagline / Motto"
                  value={receipt.tagline || ''}
                  onChange={(e) => setReceipt({ ...receipt, tagline: e.target.value })}
                  placeholder="Building materials you can trust"
                />
                <Textarea
                  label="Depot Address"
                  value={receipt.address || ''}
                  onChange={(e) => setReceipt({ ...receipt, address: e.target.value })}
                  rows={2}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Email"
                    type="email"
                    value={receipt.email || ''}
                    onChange={(e) => setReceipt({ ...receipt, email: e.target.value })}
                  />
                  <Input
                    label="WhatsApp Number"
                    value={receipt.whatsapp || ''}
                    onChange={(e) => setReceipt({ ...receipt, whatsapp: e.target.value })}
                    placeholder="+234 800 000 0000"
                  />
                  <Input
                    label="Website"
                    value={receipt.website || ''}
                    onChange={(e) => setReceipt({ ...receipt, website: e.target.value })}
                    placeholder="www.example.com"
                  />
                  <Input
                    label="Logo URL"
                    value={receipt.logoUrl || ''}
                    onChange={(e) => setReceipt({ ...receipt, logoUrl: e.target.value })}
                    placeholder="https://.../logo.png"
                    helper="PNG or JPG up to 1.5MB; embedded into each PDF."
                  />
                  <Input
                    label="Registration Number (optional)"
                    value={receipt.registrationNumber || ''}
                    onChange={(e) =>
                      setReceipt({ ...receipt, registrationNumber: e.target.value })
                    }
                  />
                  <Input
                    label="Tax ID (optional)"
                    value={receipt.taxId || ''}
                    onChange={(e) => setReceipt({ ...receipt, taxId: e.target.value })}
                  />
                </div>
                <Textarea
                  label="Receipt Footer Message"
                  value={receipt.footerMessage || ''}
                  onChange={(e) => setReceipt({ ...receipt, footerMessage: e.target.value })}
                  rows={2}
                  helper="Displayed below the thank-you line on every receipt."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="receipt-primary-color"
                      className="mb-1.5 block text-xs font-semibold text-text-secondary"
                    >
                      Brand Colour
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="receipt-primary-color"
                        type="color"
                        value={/^#[0-9a-f]{6}$/i.test(receipt.primaryColor) ? receipt.primaryColor : '#172b4d'}
                        onChange={(e) =>
                          setReceipt({ ...receipt, primaryColor: e.target.value })
                        }
                        className="h-11 w-14 cursor-pointer rounded-lg border border-border-strong bg-surface p-1"
                      />
                      <input
                        value={receipt.primaryColor}
                        onChange={(e) =>
                          setReceipt({ ...receipt, primaryColor: e.target.value })
                        }
                        className="h-11 w-full rounded-lg border border-border-strong bg-surface px-3.5 text-sm text-text-primary outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                      />
                    </div>
                  </div>
                  <Select
                    label="Preferred Preview Layout"
                    options={[
                      { value: 'a4', label: 'A4 invoice' },
                      { value: 'thermal80', label: '80mm thermal' },
                    ]}
                    value={receipt.paperFormat}
                    onChange={(e) =>
                      setReceipt({
                        ...receipt,
                        paperFormat: e.target.value === 'thermal80' ? 'thermal80' : 'a4',
                      })
                    }
                  />
                </div>

                <fieldset className="space-y-2">
                  <legend className="mb-1.5 text-xs font-semibold text-text-secondary">
                    Show on Receipt
                  </legend>
                  {[
                    { key: 'showLogo' as const, label: 'Business logo', hint: 'Requires a logo URL' },
                    {
                      key: 'showCustomerDetails' as const,
                      label: 'Customer details',
                      hint: 'Name, phone and address',
                    },
                    {
                      key: 'showEmployeeName' as const,
                      label: 'Staff who served the customer',
                      hint: 'Processed-by name in the footer',
                    },
                  ].map((option) => (
                    <label
                      key={option.key}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-surface p-3.5"
                    >
                      <span>
                        <span className="block text-sm font-bold text-text-primary">
                          {option.label}
                        </span>
                        <span className="block text-xs text-text-muted">{option.hint}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={receipt[option.key]}
                        onChange={(e) =>
                          setReceipt({ ...receipt, [option.key]: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-border text-brand"
                      />
                    </label>
                  ))}
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-4">
                  <Input
                    label="Sale Prefix"
                    value={receipt.receiptPrefix}
                    onChange={(e) => setReceipt({ ...receipt, receiptPrefix: e.target.value })}
                    maxLength={10}
                  />
                  <Input
                    label="Payment Prefix"
                    value={receipt.paymentPrefix}
                    onChange={(e) => setReceipt({ ...receipt, paymentPrefix: e.target.value })}
                    maxLength={10}
                  />
                  <Input
                    label="Return Prefix"
                    value={receipt.returnPrefix}
                    onChange={(e) => setReceipt({ ...receipt, returnPrefix: e.target.value })}
                    maxLength={10}
                  />
                  <Input
                    label="Void Prefix"
                    value={receipt.voidPrefix}
                    onChange={(e) => setReceipt({ ...receipt, voidPrefix: e.target.value })}
                    maxLength={10}
                  />
                </div>
                <p className="text-xs text-text-muted">
                  Prefixes allow letters and numbers only (max 10). Numbers reset each year,
                  for example BMS-2026-000001. Changes apply to new receipts only.
                </p>

                <div className="flex justify-end pt-3 border-t border-border/60">
                  <Button
                    variant="primary"
                    onClick={() =>
                      saveSettings('receipt', {
                        ...receipt,
                        receiptPrefix: receipt.receiptPrefix.toUpperCase(),
                        paymentPrefix: receipt.paymentPrefix.toUpperCase(),
                        returnPrefix: receipt.returnPrefix.toUpperCase(),
                        voidPrefix: receipt.voidPrefix.toUpperCase(),
                      })
                    }
                    isLoading={saving}
                    className="shadow-xs font-semibold"
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Save Receipt Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab 3: Inventory Rules */}
          {activeTab === 'inventory' && (
            <Card variant="soft" className="p-6 shadow-sm space-y-5">
              <CardHeader className="p-0 pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold text-text-primary">
                  Inventory & Stock Thresholds
                </CardTitle>
                <CardDescription>
                  Define standard reorder thresholds and stock policies.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <Input
                  label="Default Minimum Stock Alert Threshold"
                  type="number"
                  min="0"
                  value={inventory.lowStockThreshold}
                  onChange={(e) =>
                    setInventory({
                      ...inventory,
                      lowStockThreshold: parseInt(e.target.value) || 0,
                    })
                  }
                  helper="Items with stock at or below this value trigger low-stock alerts."
                />
                <div className="flex justify-end pt-3 border-t border-border/60">
                  <Button
                    variant="primary"
                    onClick={() => saveSettings('inventory', inventory)}
                    isLoading={saving}
                    className="shadow-xs font-semibold"
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Save Inventory Rules
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab 4: Accepted Payments */}
          {activeTab === 'payments' && (
            <Card variant="soft" className="p-6 shadow-sm space-y-5">
              <CardHeader className="p-0 pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold text-text-primary">
                  Payment Channels
                </CardTitle>
                <CardDescription>
                  Enable or disable payment options available during checkout.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface cursor-pointer">
                  <div>
                    <p className="font-bold text-sm text-text-primary">Cash Payments</p>
                    <p className="text-xs text-text-muted">Accept cash tender at the counter</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={payments.cash}
                    onChange={(e) => setPayments({ ...payments, cash: e.target.checked })}
                    className="rounded border-border text-brand h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface cursor-pointer">
                  <div>
                    <p className="font-bold text-sm text-text-primary">Bank Transfers</p>
                    <p className="text-xs text-text-muted">Direct commercial bank deposits</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={payments.transfer}
                    onChange={(e) => setPayments({ ...payments, transfer: e.target.checked })}
                    className="rounded border-border text-brand h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface cursor-pointer">
                  <div>
                    <p className="font-bold text-sm text-text-primary">POS Terminal</p>
                    <p className="text-xs text-text-muted">Debit card swipe / chip transactions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={payments.pos}
                    onChange={(e) => setPayments({ ...payments, pos: e.target.checked })}
                    className="rounded border-border text-brand h-4 w-4"
                  />
                </label>

                <div className="flex justify-end pt-3 border-t border-border/60">
                  <Button
                    variant="primary"
                    onClick={() => saveSettings('payments', payments)}
                    isLoading={saving}
                    className="shadow-xs font-semibold"
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Save Payment Options
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab 5: Appearance */}
          {activeTab === 'appearance' && (
            <Card variant="soft" className="p-6 shadow-sm space-y-5">
              <CardHeader className="p-0 pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold text-text-primary">
                  Theme & Visual System
                </CardTitle>
                <CardDescription>
                  BuildStore premium Soft Neumorphism + Glassmorphism mode.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={cn(
                      'p-4 rounded-xl border text-center transition-all btn-press flex flex-col items-center gap-2',
                      theme === 'light'
                        ? 'border-brand ring-2 ring-brand/20 bg-brand-soft/40 shadow-xs font-bold text-text-primary'
                        : 'border-border bg-surface hover:bg-surface-3 text-text-secondary',
                    )}
                  >
                    <Sun className="h-6 w-6 text-warning" />
                    <span className="text-xs">Light Mode (Clean UI)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={cn(
                      'p-4 rounded-xl border text-center transition-all btn-press flex flex-col items-center gap-2',
                      theme === 'dark'
                        ? 'border-brand ring-2 ring-brand/20 bg-brand-900 shadow-xs font-bold text-white'
                        : 'border-border bg-surface hover:bg-surface-3 text-text-secondary',
                    )}
                  >
                    <Moon className="h-6 w-6 text-brand" />
                    <span className="text-xs">Dark Mode (Deep Navy)</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab 6: Security */}
          {activeTab === 'security' && (
            <Card variant="soft" className="p-6 shadow-sm space-y-5">
              <CardHeader className="p-0 pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold text-text-primary">
                  Password & Account Security
                </CardTitle>
                <CardDescription>
                  Update your account credentials to keep business records safe.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <Input
                    label="Current Password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <Input
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <div className="flex justify-end pt-3 border-t border-border/60">
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={saving}
                      className="shadow-xs font-semibold"
                    >
                      Update Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
