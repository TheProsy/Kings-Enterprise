export function formatMoney(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(naira);
}

export function toDateValue(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toMillis(value: any): number {
  return toDateValue(value)?.getTime() ?? 0;
}

export function formatDate(date: any): string {
  const d = toDateValue(date);
  if (!d) return '-';
  return d.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: any): string {
  const d = toDateValue(date);
  if (!d) return '-';
  return d.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPhone(phone: string): string {
  return phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
}

export function toKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function fromKobo(kobo: number): number {
  return kobo / 100;
}

export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function generateId(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
