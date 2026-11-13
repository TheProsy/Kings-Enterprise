import { toDateValue, toMillis } from '@/lib/formatters';

export type ReportPeriod = 'today' | 'week' | 'month' | 'year' | 'all';

export const REPORT_PERIOD_OPTIONS: Array<{ value: ReportPeriod; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

export interface PeriodRange {
  start: number | null;
  end: number;
  label: string;
}

export function getPeriodRange(period: ReportPeriod, now = new Date()): PeriodRange {
  const end = now.getTime();
  switch (period) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return { start, end, label: 'Today' };
    }
    case 'week': {
      const mondayOffset = (now.getDay() + 6) % 7;
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - mondayOffset,
      ).getTime();
      return { start, end, label: 'This Week' };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return { start, end, label: 'This Month' };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1).getTime();
      return { start, end, label: 'This Year' };
    }
    default:
      return { start: null, end, label: 'All Time' };
  }
}

export function isInPeriod(value: unknown, range: PeriodRange): boolean {
  const ms = toMillis(value);
  if (!ms) return range.start === null;
  return (range.start === null || ms >= range.start) && ms <= range.end;
}

export function filterByPeriod<T>(
  items: T[],
  getValue: (item: T) => unknown,
  range: PeriodRange,
): T[] {
  return items.filter((item) => isInPeriod(getValue(item), range));
}

export function dayKey(value: unknown): string {
  const date = toDateValue(value);
  if (!date) return 'Unknown';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export function monthKey(value: unknown): string {
  const date = toDateValue(value);
  if (!date) return 'Unknown';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function bucketKey(value: unknown, period: ReportPeriod): string {
  return period === 'year' || period === 'all' ? monthKey(value) : dayKey(value);
}

export function bucketLabel(key: string, period: ReportPeriod): string {
  if (key === 'Unknown') return key;
  if (period === 'year' || period === 'all') {
    const [year, month] = key.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-NG', {
      month: 'short',
      year: 'numeric',
    });
  }
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function netSaleTotal(sale: {
  total?: number;
  returnedTotalKobo?: number;
}): number {
  return Math.max(0, Number(sale.total ?? 0) - Number(sale.returnedTotalKobo ?? 0));
}

export function saleCogs(sale: {
  items?: Array<{
    productId?: string;
    variantId?: string;
    quantity?: number;
    costBasis?: number;
  }>;
  returnedQuantities?: Record<string, number>;
}): number {
  return (sale.items ?? []).reduce((sum, item) => {
    const returned = Number(
      sale.returnedQuantities?.[`${item.productId}:${item.variantId}`] ?? 0,
    );
    const soldQuantity = Math.max(0, Number(item.quantity ?? 0) - returned);
    return sum + Number(item.costBasis ?? 0) * soldQuantity;
  }, 0);
}

export function customerIdentity(value: {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
}): string | null {
  if (value.customerId) return `id:${value.customerId}`;
  const phone = value.customerPhone?.trim();
  if (phone) return `phone:${phone.toLowerCase()}`;
  const name = value.customerName?.trim().toLowerCase();
  if (name && name !== 'walk-in customer') return `name:${name}`;
  return null;
}
