import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const BUSINESS_ID = 'default-business';
export const RECEIPT_TEMPLATE_VERSION = 1;

export type PaymentStatus = 'paid' | 'partially_paid' | 'unpaid' | 'refunded';

export interface StaffProfile {
  id: string;
  uid: string;
  name?: string;
  email?: string;
  role?: string;
  permissions?: string[];
  active?: boolean;
}

export interface ReceiptSettings {
  businessName: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  email?: string;
  tagline?: string;
  footerMessage?: string;
  primaryColor: string;
  showLogo: boolean;
  showCustomerDetails: boolean;
  showEmployeeName: boolean;
  receiptPrefix: string;
  paymentPrefix: string;
  returnPrefix: string;
  voidPrefix: string;
  paperFormat: 'a4' | 'thermal80';
  registrationNumber?: string;
  taxId?: string;
}

export interface BusinessSnapshot {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  email?: string;
  tagline?: string;
  footerMessage?: string;
  primaryColor: string;
  showLogo: boolean;
  showCustomerDetails: boolean;
  showEmployeeName: boolean;
  registrationNumber?: string;
  taxId?: string;
}

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  businessName: 'Kings Building Materials',
  address: 'Lokoja, Kogi State, Nigeria',
  phone: '+234 800 000 0000',
  email: 'info@kingsbuildingmaterials.com',
  tagline: 'Quality Building Materials',
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

export const money = (value: number) => Math.round(value);

export function cleanUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((entry) => cleanUndefined(entry))
      .filter((entry) => entry !== undefined) as unknown as T;
  }

  if (
    value &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const output: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      if (entry !== undefined) {
        output[key] = cleanUndefined(entry);
      }
    });
    return output as T;
  }

  return value;
}

export async function loadStaff(uid: string): Promise<StaffProfile> {
  const snap = await db.doc(`businesses/${BUSINESS_ID}/users/${uid}`).get();
  if (!snap.exists || snap.data()?.active !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Active staff account required.',
    );
  }
  return { id: snap.id, uid, ...(snap.data() as Record<string, unknown>) } as StaffProfile;
}

export async function requireStaff(
  uid: string,
  permissions: string[],
): Promise<StaffProfile> {
  const profile = await loadStaff(uid);

  if (profile.role === 'owner') return profile;

  const granted = Array.isArray(profile.permissions) ? profile.permissions : [];
  if (!permissions.some((permission) => granted.includes(permission))) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You do not have permission to perform this action.',
    );
  }

  return profile;
}

export function staffDisplayName(profile: StaffProfile): string {
  const name = String(profile.name || '').trim();
  if (name) return name;
  return profile.role === 'owner' ? 'Business Owner' : 'Staff';
}

export function receiptAccessAllowed(
  profile: StaffProfile,
  receipt: Record<string, any> | undefined | null,
): boolean {
  if (!profile || profile.active !== true) return false;
  if (profile.role === 'owner') return true;

  const granted = Array.isArray(profile.permissions) ? profile.permissions : [];
  if (granted.includes('receipts:view_all')) return true;

  const canViewOwn =
    granted.includes('receipts:view') ||
    granted.includes('sales:view') ||
    granted.includes('sales:create');
  if (!canViewOwn) return false;

  const ownerId = receipt?.processedBy?.userId;
  return Boolean(ownerId && (ownerId === profile.uid || ownerId === profile.id));
}

export function assertReceiptAccess(
  profile: StaffProfile,
  receipt: Record<string, any> | undefined | null,
) {
  if (!receiptAccessAllowed(profile, receipt)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You do not have permission to access this receipt.',
    );
  }
}

export function idempotencyDocumentId(key: string): string {
  return `idem_${createHash('sha256').update(key).digest('hex').slice(0, 40)}`;
}

export function normalizePrefix(value: unknown, fallback: string): string {
  const cleaned = String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);
  return cleaned || fallback;
}

export function buildReceiptNumber(
  prefix: string,
  year: number,
  sequence: number,
): string {
  return `${prefix}-${year}-${String(sequence).padStart(6, '0')}`;
}

export function receiptCounterRef(year: number) {
  return db.doc(`businesses/${BUSINESS_ID}/receiptCounters/${year}`);
}

export function nextSequence(counter: Record<string, any> | undefined, field: string) {
  return Math.max(0, Number(counter?.[field] ?? 0)) + 1;
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
  const numericParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .split('-');

  const year = Number(get('year')) || date.getFullYear();
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');
  const dayPeriod = get('dayPeriod').toUpperCase();

  return {
    year,
    dateLabel: `${day} ${month} ${year}`,
    timeLabel: `${hour}:${minute} ${dayPeriod}`.trim(),
    isoDate: numericParts.length === 3 ? numericParts.join('-') : date.toISOString().slice(0, 10),
  };
}

export function formatNaira(kobo: number): string {
  return `\u20A6${new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(kobo || 0) / 100)}`;
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

export function receiptPaymentStatus(
  amountPaidKobo: number,
  totalKobo: number,
): PaymentStatus {
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

export function normalizeReceiptSettings(
  receiptData?: Record<string, any> | null,
  generalData?: Record<string, any> | null,
): ReceiptSettings {
  const receipt = receiptData || {};
  const general = generalData || {};
  return {
    businessName:
      String(receipt.businessName ?? '').trim() ||
      String(general.name ?? '').trim() ||
      DEFAULT_RECEIPT_SETTINGS.businessName,
    logoUrl: String(receipt.logoUrl ?? general.logoUrl ?? '').trim() || undefined,
    address:
      String(receipt.address ?? general.address ?? '').trim() ||
      DEFAULT_RECEIPT_SETTINGS.address,
    phone:
      String(receipt.phone ?? general.phone ?? '').trim() ||
      DEFAULT_RECEIPT_SETTINGS.phone,
    whatsapp:
      String(receipt.whatsapp ?? general.whatsapp ?? '').trim() || undefined,
    website: String(receipt.website ?? general.website ?? '').trim() || undefined,
    email:
      String(receipt.email ?? general.email ?? '').trim() ||
      DEFAULT_RECEIPT_SETTINGS.email,
    tagline:
      String(receipt.tagline ?? general.tagline ?? '').trim() ||
      DEFAULT_RECEIPT_SETTINGS.tagline,
    footerMessage:
      String(receipt.footerMessage ?? '').trim() || undefined,
    primaryColor:
      String(receipt.primaryColor ?? '').trim() || DEFAULT_RECEIPT_SETTINGS.primaryColor,
    showLogo: receipt.showLogo !== false,
    showCustomerDetails: receipt.showCustomerDetails !== false,
    showEmployeeName: receipt.showEmployeeName !== false,
    receiptPrefix: normalizePrefix(
      receipt.receiptPrefix,
      DEFAULT_RECEIPT_SETTINGS.receiptPrefix,
    ),
    paymentPrefix: normalizePrefix(
      receipt.paymentPrefix,
      DEFAULT_RECEIPT_SETTINGS.paymentPrefix,
    ),
    returnPrefix: normalizePrefix(
      receipt.returnPrefix,
      DEFAULT_RECEIPT_SETTINGS.returnPrefix,
    ),
    voidPrefix: normalizePrefix(
      receipt.voidPrefix,
      DEFAULT_RECEIPT_SETTINGS.voidPrefix,
    ),
    paperFormat: receipt.paperFormat === 'thermal80' ? 'thermal80' : 'a4',
    registrationNumber:
      String(receipt.registrationNumber ?? '').trim() || undefined,
    taxId: String(receipt.taxId ?? '').trim() || undefined,
  };
}

export function businessSnapshotFromSettings(
  settings: ReceiptSettings,
): BusinessSnapshot {
  return cleanUndefined({
    name: settings.businessName || 'Business',
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
  });
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
  const parts = [includeBrand ? brand : '', attributeText].filter(Boolean);
  return parts.join(' \u00B7 ') || 'Standard';
}

export function receiptFileName(receiptNumber: string): string {
  const safe = String(receiptNumber || 'receipt').replace(/[^A-Za-z0-9._-]/g, '-');
  return `Receipt-${safe}.pdf`;
}

export function receiptStoragePath(
  receiptId: string,
  templateVersion: number,
): string {
  return `businesses/${BUSINESS_ID}/receipts/${receiptId}/receipt-v${templateVersion}.pdf`;
}
