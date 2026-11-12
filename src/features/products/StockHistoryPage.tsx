import { useCallback, useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { DeleteRecordButton } from '@/components/common/DeleteRecordButton';
import { stockService } from '@/services';
import { formatDateTime } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import { ROLES } from '@/constants';
import { useAuth } from '@/features/auth';
import type { StockMovement } from '@/types';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

type MovementBadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

export function StockHistoryPage() {
  const { user } = useAuth();
  const canDelete = user?.role === ROLES.OWNER;
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await stockService.listMovements();
      setMovements(data);
    } catch (err) {
      console.error(err);
      toast('Could not load stock history. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const removeMovement = async (movement: StockMovement) => {
    await stockService.remove(movement.id);
    setMovements((current) => current.filter((entry) => entry.id !== movement.id));
  };

  const typeLabels: Record<string, string> = {
    Purchase: 'Stock In',
    Sale: 'Stock Out',
    'Customer Return': 'Return',
    Damage: 'Damage',
    Adjustment: 'Adjustment',
    'Opening Stock': 'Opening',
  };

  const typeVariants: Record<string, MovementBadgeVariant> = {
    Purchase: 'success',
    Sale: 'danger',
    'Customer Return': 'warning',
    Damage: 'danger',
    Adjustment: 'info',
    'Opening Stock': 'outline',
  };

  const columns: Column<StockMovement>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (m) => (
        <span className="whitespace-nowrap text-xs text-text-secondary">
          {formatDateTime(m.createdAt)}
        </span>
      ),
    },
    {
      key: 'product',
      header: 'Material / Variant',
      render: (m) => (
        <div>
          <p className="text-sm font-semibold text-text-primary">{m.productName}</p>
          {m.variantName && (
            <p className="text-xs text-text-muted">{m.variantName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'movementType',
      header: 'Movement Type',
      render: (m) => (
        <Badge variant={typeVariants[m.movementType] ?? 'default'}>
          {typeLabels[m.movementType] ?? m.movementType}
        </Badge>
      ),
    },
    {
      key: 'quantityChange',
      header: 'Change',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (m) => (
        <span
          className={`inline-flex items-center gap-1 text-sm font-bold tabular-nums ${
            m.quantityChange > 0 ? 'text-success' : 'text-danger'
          }`}
        >
          {m.quantityChange > 0 ? (
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
        </span>
      ),
    },
    {
      key: 'quantityBefore',
      header: 'Previous',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (m) => (
        <span className="text-xs tabular-nums text-text-secondary">{m.quantityBefore}</span>
      ),
    },
    {
      key: 'quantityAfter',
      header: 'New Total',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (m) => (
        <span className="text-xs font-semibold tabular-nums text-text-primary">
          {m.quantityAfter}
        </span>
      ),
    },
  ];

  if (canDelete) {
    columns.push({
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (m) => (
        <DeleteRecordButton
          entityLabel="Stock history record"
          recordLabel={`${typeLabels[m.movementType] ?? m.movementType} — ${m.productName}`}
          description="Only this history entry is removed. Current stock levels and linked sales or purchases are unchanged."
          showLabel={false}
          onDelete={() => removeMovement(m)}
        />
      ),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movement History"
        description="Every stock change, in and out. Only the store owner can delete a history entry."
      />

      <DataTable
        columns={columns}
        data={movements}
        loading={loading}
        searchPlaceholder="Search by material, movement type or reference..."
        emptyTitle="No stock movements yet"
        emptyDescription="Stock receipts, sales deductions and adjustments will appear here as they happen."
        caption="Stock movement audit log"
        mobileCardRender={(m) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {m.productName}
                </p>
                {m.variantName && (
                  <p className="truncate text-xs text-text-muted">{m.variantName}</p>
                )}
              </div>
              <Badge variant={typeVariants[m.movementType] ?? 'default'}>
                {typeLabels[m.movementType] ?? m.movementType}
              </Badge>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-text-secondary">
              <span>{formatDateTime(m.createdAt)}</span>
              <span
                className={`font-bold tabular-nums ${
                  m.quantityChange > 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
              </span>
            </div>
            {canDelete && (
              <div className="flex justify-end border-t border-border/60 pt-2">
                <DeleteRecordButton
                  entityLabel="Stock history record"
                  recordLabel={`${typeLabels[m.movementType] ?? m.movementType} — ${m.productName}`}
                  description="Only this history entry is removed. Current stock levels and linked sales or purchases are unchanged."
                  onDelete={() => removeMovement(m)}
                />
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
}
