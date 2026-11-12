import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { SearchInput } from '@/components/forms/SearchInput';
import { DateRangeFilter } from '@/components/forms/DateRangeFilter';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { DataTable } from '@/components/tables/DataTable';
import { DeleteRecordButton } from '@/components/common/DeleteRecordButton';
import { receiptService } from '@/services';
import { buildRoute, PERMISSIONS, ROLES, ROUTES } from '@/constants';
import { formatDateTime, formatMoney, toMillis } from '@/lib/formatters';
import {
  paymentStatusLabel,
  receiptItemCount,
  receiptTypeLabel,
} from '@/lib/receipts';
import { useAuth } from '@/features/auth';
import { toast } from '@/lib/toast';
import type { Receipt, ReceiptType } from '@/types';
import { AlertCircle, FileText, Plus, Receipt as ReceiptIcon, Wallet } from 'lucide-react';

type TypeFilter = 'all' | ReceiptType;
type StatusFilter = 'all' | Receipt['paymentStatus'];

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  paid: 'success',
  partially_paid: 'warning',
  unpaid: 'danger',
  refunded: 'info',
};

export function ReceiptsPage() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const canViewAll =
    user?.role === ROLES.OWNER || hasPermission(PERMISSIONS.RECEIPTS_VIEW_ALL);

  useEffect(() => {
    let active = true;
    setLoading(true);
    receiptService
      .list({ userId: user?.uid, canViewAll })
      .then((rows) => {
        if (active) setReceipts(rows);
      })
      .catch((error) => {
        console.error(error);
        toast('Could not load receipts. Check your permissions or connection.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.uid, canViewAll]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return receipts.filter((receipt) => {
      if (typeFilter !== 'all' && receipt.receiptType !== typeFilter) return false;
      if (statusFilter !== 'all' && receipt.paymentStatus !== statusFilter) return false;

      if (startDate || endDate) {
        const stamp = toMillis(receipt.issuedAt || receipt.createdAt);
        if (startDate && stamp < startDate.getTime()) return false;
        if (endDate && stamp >= endDate.getTime() + 86_400_000) return false;
      }

      if (!term) return true;
      return [
        receipt.receiptNumber,
        receipt.customerSnapshot?.name,
        receipt.customerName,
        receipt.saleReceiptNumber,
        receipt.originalReceiptNumber,
        receipt.processedBy?.displayName,
        receipt.voidReason,
        receipt.returnReason,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [receipts, search, typeFilter, statusFilter, startDate, endDate]);

  const stats = useMemo(() => {
    const latestBySale = new Map<string, Receipt>();
    receipts.forEach((receipt) => {
      if (receipt.documentStatus === 'voided' || !receipt.saleId) return;
      const stamp = toMillis(receipt.issuedAt || receipt.createdAt);
      const existing = latestBySale.get(receipt.saleId);
      const existingStamp = existing
        ? toMillis(existing.issuedAt || existing.createdAt)
        : -1;
      if (!existing || stamp > existingStamp) {
        latestBySale.set(receipt.saleId, receipt);
      }
    });

    return {
      collected: receipts.reduce((sum, receipt) => {
        if (receipt.documentStatus === 'voided') return sum;
        if (receipt.receiptType !== 'sale' && receipt.receiptType !== 'payment') {
          return sum;
        }
        return sum + Number(receipt.amountPaidKobo || 0);
      }, 0),
      outstanding: Array.from(latestBySale.values()).reduce(
        (sum, receipt) => sum + Number(receipt.balanceDueKobo || 0),
        0,
      ),
    };
  }, [receipts]);

  const typeOptions: Array<{ value: TypeFilter; label: string; count?: number }> = [
    { value: 'all', label: 'All', count: receipts.length },
    { value: 'sale', label: 'Sales', count: receipts.filter((r) => r.receiptType === 'sale').length },
    { value: 'payment', label: 'Payments', count: receipts.filter((r) => r.receiptType === 'payment').length },
    { value: 'return', label: 'Returns', count: receipts.filter((r) => r.receiptType === 'return').length },
    { value: 'void', label: 'Voids', count: receipts.filter((r) => r.receiptType === 'void').length },
  ];

  const openReceipt = (receipt: Receipt) => {
    navigate(buildRoute(ROUTES.APP_RECEIPT_DETAIL, { receiptId: receipt.id }));
  };

  const removeReceipt = async (receipt: Receipt) => {
    await receiptService.remove(receipt.id);
    setReceipts((current) => current.filter((entry) => entry.id !== receipt.id));
  };

  const columns = [
    {
      key: 'issuedAt',
      header: 'Issued',
      render: (receipt: Receipt) => (
        <span className="whitespace-nowrap text-xs text-text-secondary">
          {formatDateTime(receipt.issuedAt || receipt.createdAt)}
        </span>
      ),
    },
    {
      key: 'receiptNumber',
      header: 'Receipt',
      render: (receipt: Receipt) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
            <ReceiptIcon className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
            <span className="truncate">{receipt.receiptNumber}</span>
          </p>
          <p className="mt-0.5 text-2xs text-text-muted">
            {receiptTypeLabel(receipt.receiptType)}
            {receipt.saleReceiptNumber && receipt.receiptType !== 'sale'
              ? ` · Sale ${receipt.saleReceiptNumber}`
              : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (receipt: Receipt) => (
        <span className="text-xs text-text-secondary">
          {receipt.customerSnapshot?.name ||
            receipt.customerName ||
            'Walk-in Customer'}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (receipt: Receipt) => (
        <span className="text-xs text-text-muted">
          {receiptItemCount(receipt)} item{receiptItemCount(receipt) === 1 ? '' : 's'}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (receipt: Receipt) => (
        <span className="text-sm font-bold text-text-primary">
          {formatMoney(receipt.totalKobo || 0)}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (receipt: Receipt) => (
        <span
          className={`text-xs font-bold ${
            Number(receipt.balanceDueKobo || 0) > 0 ? 'text-warning-fg' : 'text-success-fg'
          }`}
        >
          {Number(receipt.balanceDueKobo || 0) > 0
            ? formatMoney(receipt.balanceDueKobo || 0)
            : 'Settled'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (receipt: Receipt) => (
        <div className="flex flex-col items-start gap-1">
          <Badge variant={STATUS_VARIANT[receipt.paymentStatus] || 'neutral'} size="sm">
            {paymentStatusLabel(receipt.paymentStatus)}
          </Badge>
          {receipt.documentStatus === 'voided' ? (
            <Badge variant="danger" size="sm">
              Voided
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (receipt: Receipt) => (
        <div className="flex items-center justify-end gap-1">
          <DeleteRecordButton
            entityLabel="Receipt"
            recordLabel={receipt.receiptNumber}
            description="Only this document is removed; the linked sale, payments and stock records are kept."
            showLabel={false}
            onDelete={() => removeReceipt(receipt)}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              openReceipt(receipt);
            }}
          >
            Open
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipts"
        description="Search every sales, payment, return and void receipt issued by your business."
        action={
          hasPermission(PERMISSIONS.SALES_CREATE) ? (
            <Button asChild>
              <NavLink to={ROUTES.APP_SALES_NEW}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                New Sale
              </NavLink>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          value={receipts.length}
          label="Documents"
          icon={<FileText className="h-4 w-4" />}
          subtitle={canViewAll ? 'All receipts' : 'Receipts you processed'}
        />
        <StatCard
          value={receipts.filter((r) => r.receiptType === 'sale').length}
          label="Sales Receipts"
          icon={<ReceiptIcon className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          value={formatMoney(stats.collected)}
          label="Collected"
          icon={<Wallet className="h-4 w-4" />}
          subtitle="On visible receipts"
        />
        <StatCard
          value={formatMoney(stats.outstanding)}
          label="Outstanding"
          icon={<AlertCircle className="h-4 w-4" />}
          tone={stats.outstanding > 0 ? 'warning' : 'neutral'}
        />
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search receipt no, customer, staff or reason..."
            ariaLabel="Search receipts"
          />
        </div>
        <div className="lg:col-span-7">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onChange={(range) => {
              setStartDate(range.start);
              setEndDate(range.end);
            }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <SegmentedControl
          options={typeOptions}
          value={typeFilter}
          onChange={setTypeFilter}
          ariaLabel="Filter receipts by type"
        />
        <SegmentedControl
          size="sm"
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'paid', label: 'Paid' },
            { value: 'partially_paid', label: 'Part paid' },
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'refunded', label: 'Refunded' },
          ]}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
          ariaLabel="Filter receipts by payment status"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyTitle="No receipts found"
        emptyMessage={
          search || typeFilter !== 'all' || statusFilter !== 'all' || startDate || endDate
            ? 'No receipts matched the selected filters.'
            : 'Complete a sale to issue your first receipt.'
        }
        onRowClick={openReceipt}
        mobileCardRender={(receipt) => (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
                  <ReceiptIcon className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                  <span className="truncate">{receipt.receiptNumber}</span>
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {receipt.customerSnapshot?.name || receipt.customerName || 'Walk-in Customer'}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[receipt.paymentStatus] || 'neutral'} size="sm">
                {paymentStatusLabel(receipt.paymentStatus)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 border-y border-border/60 py-2 text-xs">
              <div>
                <span className="block text-text-muted">{receiptTypeLabel(receipt.receiptType)}</span>
                <span className="font-bold text-text-primary">
                  {formatMoney(receipt.totalKobo || 0)}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-text-muted">Balance</span>
                <span
                  className={`font-bold ${
                    Number(receipt.balanceDueKobo || 0) > 0
                      ? 'text-warning-fg'
                      : 'text-success-fg'
                  }`}
                >
                  {Number(receipt.balanceDueKobo || 0) > 0
                    ? formatMoney(receipt.balanceDueKobo || 0)
                    : 'Settled'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-2xs text-text-muted">
              <span>{formatDateTime(receipt.issuedAt || receipt.createdAt)}</span>
              <span className="font-semibold text-brand">Tap to open →</span>
            </div>

            <div className="flex justify-end">
              <DeleteRecordButton
                entityLabel="Receipt"
                recordLabel={receipt.receiptNumber}
                description="Only this document is removed; the linked sale, payments and stock records are kept."
                onDelete={() => removeReceipt(receipt)}
              />
            </div>
          </div>
        )}
      />
    </div>
  );
}
