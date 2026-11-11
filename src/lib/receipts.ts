import { BUSINESS } from '@/config/business';
import type {
  Receipt,
  ReceiptBusinessSnapshot,
  ReceiptPaymentStatus,
  ReceiptSettings,
} from '@/types';

export const RECEIPT_TEMPLATE_VERSION = 1;

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  businessName: BUSINESS.name,
  address: BUSINESS.address,
  phone: BUSINESS.phone,
  email: BUSINESS.email || undefined,
  tagline: BUSINESS.tagline,
  footerMessage: 'Thank you for your patronage! Goods are checked at the point of sale.',
  primaryColor: '#172b4d',
  showLogo: true,
  showCustomerDetails: true,
  showEmployeeName: true,
  receiptPrefix: 'BMS',
  paymentPrefix: 'PAY',
  returnPrefix: 'RET',
  voidPrefix: 'VOID',
  paperFormat: 'a4',
};

export function normalizePrefix(value: unknown, fallback: string): string {
  const cleaned = String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);
  return cleaned || fallback;
}

export function normalizeReceiptSettings(
  receipt?: Record<string, any> | null,
  general?: Record<string, any> | null,
): ReceiptSettings {
  const section = receipt || {};
  const profile = general || {};
  const text = (value: unknown) => String(value ?? '').trim();

  return {
    businessName:
      text(section.businessName) ||
      text(profile.name) ||
      DEFAULT_RECEIPT_SETTINGS.businessName,
    logoUrl: text(section.logoUrl) || text(profile.logoUrl) || undefined,
    address:
      text(section.address) ||
      text(profile.address) ||
      DEFAULT_RECEIPT_SETTINGS.address,
    phone:
      text(section.phone) ||
      text(profile.phone) ||
      DEFAULT_RECEIPT_SETTINGS.phone,
    whatsapp: text(section.whatsapp) || text(profile.whatsapp) || undefined,
    website: text(section.website) || text(profile.website) || undefined,
    email:
      text(section.email) ||
      text(profile.email) ||
      DEFAULT_RECEIPT_SETTINGS.email,
    tagline:
      text(section.tagline) ||
      text(profile.tagline) ||
      DEFAULT_RECEIPT_SETTINGS.tagline,
    footerMessage: text(section.footerMessage) || DEFAULT_RECEIPT_SETTINGS.footerMessage,
    primaryColor: text(section.primaryColor) || DEFAULT_RECEIPT_SETTINGS.primaryColor,
    showLogo: section.showLogo !== false,
    showCustomerDetails: section.showCustomerDetails !== false,
    showEmployeeName: section.showEmployeeName !== false,
    receiptPrefix: normalizePrefix(
      section.receiptPrefix,
      DEFAULT_RECEIPT_SETTINGS.receiptPrefix,
    ),
    paymentPrefix: normalizePrefix(
      section.paymentPrefix,
      DEFAULT_RECEIPT_SETTINGS.paymentPrefix,
    ),
    returnPrefix: normalizePrefix(
      section.returnPrefix,
      DEFAULT_RECEIPT_SETTINGS.returnPrefix,
    ),
    voidPrefix: normalizePrefix(
      section.voidPrefix,
      DEFAULT_RECEIPT_SETTINGS.voidPrefix,
    ),
    paperFormat: section.paperFormat === 'thermal80' ? 'thermal80' : 'a4',
    registrationNumber: text(section.registrationNumber) || undefined,
    taxId: text(section.taxId) || undefined,
  };
}

export function businessSnapshotFromSettings(
  settings: ReceiptSettings,
): ReceiptBusinessSnapshot {
  return {
    name: settings.businessName || BUSINESS.name,
    logoUrl: settings.logoUrl,
    address: settings.address,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    website: settings.website,
    email: settings.email,
    tagline: settings.tagline,
    footerMessage: settings.footerMessage,
    primaryColor: settings.primaryColor,
    showLogo: settings.showLogo,
    showCustomerDetails: settings.showCustomerDetails,
    showEmployeeName: settings.showEmployeeName,
    registrationNumber: settings.registrationNumber,
    taxId: settings.taxId,
  };
}

export interface LagosMoment {
  year: number;
  dateLabel: string;
  timeLabel: string;
  isoDate: string;
}

export function lagosMoment(date = new Date()): LagosMoment {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  const numeric = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .split('-');

  return {
    year: Number(get('year')) || date.getFullYear(),
    dateLabel: `${get('day')} ${get('month')} ${get('year')}`,
    timeLabel: `${get('hour')}:${get('minute')} ${get('dayPeriod').toUpperCase()}`.trim(),
    isoDate: numeric.length === 3 ? numeric.join('-') : date.toISOString().slice(0, 10),
  };
}

export function buildReceiptNumber(
  prefix: string,
  year: number,
  sequence: number,
): string {
  return `${prefix}-${year}-${String(sequence).padStart(6, '0')}`;
}

export function nextSequence(
  counter: Record<string, any> | undefined,
  field: string,
): number {
  return Math.max(0, Number(counter?.[field] ?? 0)) + 1;
}

export function receiptPaymentStatus(
  amountPaidKobo: number,
  totalKobo: number,
): ReceiptPaymentStatus {
  if (totalKobo <= 0) return amountPaidKobo > 0 ? 'paid' : 'unpaid';
  if (amountPaidKobo >= totalKobo) return 'paid';
  if (amountPaidKobo > 0) return 'partially_paid';
  return 'unpaid';
}

export function salePaymentStatus(
  amountPaidKobo: number,
  totalKobo: number,
): 'paid' | 'partial' | 'unpaid' {
  const status = receiptPaymentStatus(amountPaidKobo, totalKobo);
  return status === 'partially_paid' ? 'partial' : status === 'refunded' ? 'unpaid' : status;
}

export function paymentMethodLabel(method: unknown): string {
  const value = String(method ?? '').toLowerCase();
  const labels: Record<string, string> = {
    cash: 'Cash',
    transfer: 'Bank Transfer',
    bank_transfer: 'Bank Transfer',
    pos: 'POS',
    mixed: 'Mixed Payment',
    card: 'Card',
    cheque: 'Cheque',
    mobile_money: 'Mobile Money',
  };
  return labels[value] || String(method ?? 'Payment');
}

export function paymentStatusLabel(status: unknown): string {
  const labels: Record<string, string> = {
    paid: 'PAID',
    partially_paid: 'PARTIALLY PAID',
    unpaid: 'UNPAID',
    refunded: 'REFUNDED',
  };
  return labels[String(status ?? '')] || String(status ?? '').toUpperCase();
}

export function receiptTypeLabel(type: unknown): string {
  switch (type) {
    case 'payment':
      return 'Payment Receipt';
    case 'return':
      return 'Return Receipt';
    case 'void':
      return 'Void Receipt';
    default:
      return 'Sales Receipt';
  }
}

export function receiptItemCount(receipt: Pick<Receipt, 'itemCount' | 'items'>): number {
  if (typeof receipt.itemCount === 'number') return receipt.itemCount;
  return (receipt.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

export function variationNameForVariant(
  variant: Record<string, any>,
  productName: string,
): string {
  const brand = String(variant.brand ?? '').trim();
  const attributes = (variant.attributes || {}) as Record<string, unknown>;
  const attributeText = Object.values(attributes)
    .map((entry) => String(entry ?? '').trim())
    .filter(Boolean)
    .join(', ');
  const includeBrand =
    brand && !String(productName).toLowerCase().includes(brand.toLowerCase());
  return [includeBrand ? brand : '', attributeText].filter(Boolean).join(' · ') || 'Standard';
}
