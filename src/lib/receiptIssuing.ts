import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { BUSINESS } from '@/config/business';
import {
  RECEIPT_TEMPLATE_VERSION,
  buildReceiptNumber,
  businessSnapshotFromSettings,
  lagosMoment,
  nextSequence,
  normalizeReceiptSettings,
  paymentMethodLabel,
  receiptPaymentStatus,
  salePaymentStatus,
  variationNameForVariant,
} from '@/lib/receipts';
import type { LagosMoment } from '@/lib/receipts';
import type {
  ReceiptBusinessSnapshot,
  ReceiptCustomerSnapshot,
  ReceiptItem,
  ReceiptPaymentLine,
  ReceiptSettings,
} from '@/types';

const BUSINESS_ID = BUSINESS.id;
const DEFAULT_WALK_IN_CUSTOMER = 'Walk-in Customer';

interface StaffProfile {
  id?: string;
  uid?: string;
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
  permissions?: string[];
  active?: boolean;
}

export interface ReceiptConfiguration {
  settings: ReceiptSettings;
  snapshot: ReceiptBusinessSnapshot;
}

export interface CreateSaleInput {
  idempotencyKey: string;
  items: Array<{
    productId: string;
    productName: string;
    variantId: string;
    variantName: string;
    unit: string;
    quantity: number;
    unitSellingPrice: number;
  }>;
  amountPaid: number;
  paymentMethod: string;
  customerId?: string;
  customerName?: string;
  employeeId: string;
  employeeName: string;
  notes?: string;
}

export interface CreateSaleReceiptResult {
  ok: boolean;
  duplicate: boolean;
  sale: {
    saleId: string;
    receiptId?: string;
    receiptNumber?: string;
    total?: number;
    balanceDue?: number;
    paymentStatus?: string;
  };
}

export interface RecordSalePaymentInput {
  idempotencyKey: string;
  saleId: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
}

export interface PaymentReceiptResult {
  ok: boolean;
  duplicate: boolean;
  receiptId: string;
  receiptNumber: string;
  paymentId?: string;
  saleId: string;
  amountPaid?: number;
  balanceDue?: number;
  paymentStatus?: string;
}

export interface ReturnReceiptInput {
  idempotencyKey: string;
  saleId: string;
  items: Array<{ productId: string; variantId: string; quantity: number }>;
  reason: string;
  refundMethod?: string;
  notes?: string;
}

export interface ReturnReceiptResult {
  ok: boolean;
  duplicate: boolean;
  receiptId: string;
  receiptNumber: string;
  saleId: string;
  totalRefunded?: number;
  balanceDue?: number;
}

export interface VoidReceiptInput {
  idempotencyKey: string;
  saleId: string;
  reason: string;
  notes?: string;
}

export interface VoidReceiptResult {
  ok: boolean;
  duplicate: boolean;
  receiptId: string;
  receiptNumber: string;
  saleId: string;
  originalReceiptId?: string | null;
}

type PlainRecord = Record<string, any>;

const money = (value: number) => Math.round(value);

function cleanUndefined<T>(value: T): T {
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

function safeDocId(value: string) {
  return String(value).replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 120);
}

function staffDisplayName(profile: StaffProfile): string {
  const name = String(profile.name || profile.displayName || '').trim();
  if (name) return name;
  return profile.role === 'owner' ? 'Business Owner' : 'Staff';
}

function hasAnyPermission(profile: StaffProfile, permissions: string[]) {
  if (profile.role === 'owner') return true;
  const granted = Array.isArray(profile.permissions) ? profile.permissions : [];
  return permissions.some((permission) => granted.includes(permission));
}

async function requireStaff(permissions: string[]): Promise<StaffProfile> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Sign in first.');
  }

  const snap = await getDoc(
    doc(db, `businesses/${BUSINESS_ID}/users/${currentUser.uid}`),
  );
  if (!snap.exists() || snap.data()?.active !== true) {
    throw new Error('An active staff account is required.');
  }

  const profile = { id: snap.id, uid: snap.id, ...snap.data() } as StaffProfile;
  if (!hasAnyPermission(profile, permissions)) {
    throw new Error('You do not have permission to perform this action.');
  }
  return profile;
}

function staffUserId(profile: StaffProfile) {
  return String(profile.uid || profile.id || '');
}

export async function loadReceiptConfiguration(): Promise<ReceiptConfiguration> {
  const snap = await getDoc(doc(db, `businesses/${BUSINESS_ID}/settings/main`));
  const data = snap.exists() ? snap.data() : undefined;
  const settings = normalizeReceiptSettings(data?.receipt, data?.general);
  return { settings, snapshot: businessSnapshotFromSettings(settings) };
}

interface ReceiptBaseInput {
  receiptId: string;
  receiptNumber: string;
  receiptType: 'sale' | 'payment' | 'return' | 'void';
  issued: LagosMoment;
  businessSnapshot: ReceiptBusinessSnapshot;
  processedBy: StaffProfile;
  paymentStatus: string;
  customer?: ReceiptCustomerSnapshot;
  saleId?: string;
  saleReceiptNumber?: string;
  originalReceiptId?: string;
  originalReceiptNumber?: string;
  notes?: string;
}

function receiptBase(input: ReceiptBaseInput) {
  const now = serverTimestamp();
  return cleanUndefined({
    id: input.receiptId,
    businessId: BUSINESS_ID,
    receiptNumber: input.receiptNumber,
    receiptType: input.receiptType,
    documentStatus: 'active',
    paymentStatus: input.paymentStatus,
    templateVersion: RECEIPT_TEMPLATE_VERSION,
    businessSnapshot: input.businessSnapshot,
    processedBy: {
      userId: staffUserId(input.processedBy),
      displayName: staffDisplayName(input.processedBy),
      role: input.processedBy.role || 'salesperson',
    },
    customerSnapshot: input.customer,
    saleId: input.saleId,
    saleReceiptNumber: input.saleReceiptNumber,
    originalReceiptId: input.originalReceiptId,
    originalReceiptNumber: input.originalReceiptNumber,
    notes: input.notes,
    issuedAt: serverTimestamp(),
    issuedDateLabel: input.issued.dateLabel,
    issuedTimeLabel: input.issued.timeLabel,
    issuedIsoDate: input.issued.isoDate,
    issuedYear: input.issued.year,
    createdAt: now,
    updatedAt: now,
  });
}

interface SaleItemLike {
  productId?: string;
  productName?: string;
  variantId?: string;
  variantName?: string;
  variationName?: string;
  unit?: string;
  quantity?: number;
  unitSellingPrice?: number;
  unitPriceKobo?: number;
  lineTotal?: number;
  lineTotalKobo?: number;
  costBasis?: number;
  costBasisKobo?: number;
}

function receiptItemsFromSaleItems(items: SaleItemLike[]): ReceiptItem[] {
  return items.map((item) => {
    const unitPriceKobo = Number(item.unitSellingPrice ?? item.unitPriceKobo ?? 0);
    return cleanUndefined({
      productId: String(item.productId ?? ''),
      productName: String(item.productName ?? 'Item'),
      variantId: String(item.variantId ?? ''),
      variationName: String(
        item.variationName || item.variantName || 'Standard',
      ),
      unit: String(item.unit ?? 'unit'),
      quantity: Number(item.quantity ?? 0),
      unitPriceKobo,
      unitSellingPrice: Number(item.unitSellingPrice ?? unitPriceKobo),
      lineTotalKobo: Number(item.lineTotal ?? item.lineTotalKobo ?? 0),
      lineTotal: Number(item.lineTotal ?? item.lineTotalKobo ?? 0),
      costBasisKobo: Number(item.costBasis ?? item.costBasisKobo ?? 0),
    }) as ReceiptItem;
  });
}

function saleCustomerSnapshot(
  input: CreateSaleInput,
  customer: PlainRecord | null,
): ReceiptCustomerSnapshot {
  return cleanUndefined({
    name: String(
      customer?.name || input.customerName || DEFAULT_WALK_IN_CUSTOMER,
    ),
    phone: customer?.phone ? String(customer.phone) : undefined,
    address: customer?.address ? String(customer.address) : undefined,
  });
}

function customerFromSale(sale: PlainRecord): ReceiptCustomerSnapshot {
  const snapshot = sale.customerSnapshot || {};
  return cleanUndefined({
    name: String(
      snapshot.name || sale.customerName || DEFAULT_WALK_IN_CUSTOMER,
    ),
    phone: snapshot.phone ? String(snapshot.phone) : undefined,
    address: snapshot.address ? String(snapshot.address) : undefined,
  });
}

export async function createSaleReceipt(
  input: CreateSaleInput,
): Promise<CreateSaleReceiptResult> {
  if (!input.idempotencyKey || !input.items?.length) {
    throw new Error('idempotencyKey and items are required.');
  }

  const variantKeys = input.items.map(
    (item) => `${item.productId}:${item.variantId}`,
  );
  if (new Set(variantKeys).size !== variantKeys.length) {
    throw new Error('Each product variant may only appear once per sale.');
  }
  for (const item of input.items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error(`Invalid quantity for ${item.productName}.`);
    }
  }

  const profile = await requireStaff(['sales:create']);
  const issued = lagosMoment();
  const configuration = await loadReceiptConfiguration();

  const saleRef = doc(collection(db, `businesses/${BUSINESS_ID}/sales`));
  const receiptRef = doc(collection(db, `businesses/${BUSINESS_ID}/receipts`));
  const counterRef = doc(
    db,
    `businesses/${BUSINESS_ID}/receiptCounters/${issued.year}`,
  );
  const idempotencyRef = doc(
    db,
    `businesses/${BUSINESS_ID}/idempotency/${safeDocId(input.idempotencyKey)}`,
  );
  const customerRef = input.customerId
    ? doc(db, `businesses/${BUSINESS_ID}/customers/${input.customerId}`)
    : null;
  const variantRefs = input.items.map((item) =>
    doc(
      db,
      `businesses/${BUSINESS_ID}/products/${item.productId}/variants/${item.variantId}`,
    ),
  );

  return runTransaction(db, async (tx) => {
    const idempotencySnap = await tx.get(idempotencyRef);
    if (idempotencySnap.exists()) {
      const data = idempotencySnap.data();
      return {
        ok: true,
        duplicate: true,
        sale: {
          saleId: String(data.saleId ?? ''),
          receiptId: data.receiptId ? String(data.receiptId) : undefined,
          receiptNumber: data.receiptNumber
            ? String(data.receiptNumber)
            : undefined,
        },
      };
    }

    const variantSnaps = await Promise.all(
      variantRefs.map((ref) => tx.get(ref)),
    );
    const customerSnap = customerRef ? await tx.get(customerRef) : null;
    const counterSnap = await tx.get(counterRef);

    const lineItems: PlainRecord[] = [];
    let subtotal = 0;

    variantSnaps.forEach((snap, index) => {
      const item = input.items[index];
      if (!snap.exists()) {
        throw new Error(`Variant ${item.variantId} not found.`);
      }
      const variant = snap.data() as PlainRecord;
      const quantityOnHand = Number(variant.quantityOnHand ?? 0);
      if (quantityOnHand < item.quantity) {
        throw new Error(`Not enough stock for ${item.productName}.`);
      }

      const unitSellingPrice = Number(variant.sellingPrice ?? 0);
      if (!Number.isFinite(unitSellingPrice) || unitSellingPrice < 0) {
        throw new Error(`Invalid selling price for ${item.productName}.`);
      }

      const variationName = variationNameForVariant(
        variant,
        item.productName,
      );
      const lineTotal = money(item.quantity * unitSellingPrice);
      subtotal += lineTotal;
      lineItems.push({
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        variantName: variationName,
        variationName,
        brand: variant.brand,
        unit: item.unit,
        quantity: item.quantity,
        unitSellingPrice,
        costBasis: Number(variant.costPrice ?? 0),
        lineTotal,
        variantRef: snap.ref,
        previousQuantity: quantityOnHand,
        newQuantity: quantityOnHand - item.quantity,
      });
    });

    const total = subtotal;
    const amountPaid = Math.max(
      0,
      Math.min(money(Number(input.amountPaid) || 0), total),
    );
    const balanceDue = Math.max(0, total - amountPaid);
    const newSalePaymentStatus = salePaymentStatus(amountPaid, total);
    const receiptStatus = receiptPaymentStatus(amountPaid, total);
    const sequence = nextSequence(counterSnap.data(), 'receipt');
    const receiptNumber = buildReceiptNumber(
      configuration.settings.receiptPrefix,
      issued.year,
      sequence,
    );
    const now = serverTimestamp();

    const customerData = customerSnap?.exists()
      ? (customerSnap.data() as PlainRecord)
      : null;
    const customerName = String(
      customerData?.name || input.customerName || DEFAULT_WALK_IN_CUSTOMER,
    );
    const receiptItems = receiptItemsFromSaleItems(lineItems);

    const salePayload = cleanUndefined({
      id: saleRef.id,
      businessId: BUSINESS_ID,
      receiptId: receiptRef.id,
      receiptNumber,
      employeeId: staffUserId(profile) || input.employeeId,
      employeeName: staffDisplayName(profile),
      customerId: input.customerId,
      customerName,
      items: lineItems.map(
        ({
          variantRef: _variantRef,
          previousQuantity: _previousQuantity,
          newQuantity: _newQuantity,
          ...rest
        }) => rest,
      ),
      subtotal,
      discount: 0,
      total,
      amountPaid,
      balanceDue,
      paymentStatus: newSalePaymentStatus,
      paymentMethod: input.paymentMethod,
      status: 'completed',
      idempotencyKey: input.idempotencyKey,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    });
    tx.set(saleRef, salePayload);

    const receiptPayload = cleanUndefined({
      ...receiptBase({
        receiptId: receiptRef.id,
        receiptNumber,
        receiptType: 'sale',
        issued,
        businessSnapshot: configuration.snapshot,
        processedBy: profile,
        paymentStatus: receiptStatus,
        customer: saleCustomerSnapshot(input, customerData),
        saleId: saleRef.id,
        saleReceiptNumber: receiptNumber,
        notes: input.notes,
      }),
      saleId: saleRef.id,
      customerId: input.customerId,
      items: receiptItems,
      itemCount: receiptItems.reduce(
        (sum, item) => sum + Number(item.quantity ?? 0),
        0,
      ),
      subtotalKobo: subtotal,
      discountKobo: 0,
      additionalChargesKobo: 0,
      taxKobo: 0,
      totalKobo: total,
      amountPaidKobo: amountPaid,
      balanceDueKobo: balanceDue,
      paymentMethod: input.paymentMethod,
      paymentMethods:
        amountPaid > 0
          ? [
              {
                method: input.paymentMethod,
                label: paymentMethodLabel(input.paymentMethod),
                amountKobo: amountPaid,
              } satisfies ReceiptPaymentLine,
            ]
          : [],
    });
    tx.set(receiptRef, receiptPayload);

    tx.set(idempotencyRef, {
      saleId: saleRef.id,
      receiptId: receiptRef.id,
      receiptNumber,
      createdAt: now,
    });
    tx.set(counterRef, { receipt: sequence, updatedAt: now }, { merge: true });

    lineItems.forEach((lineItem) => {
      tx.update(lineItem.variantRef, {
        quantityOnHand: lineItem.newQuantity,
        updatedAt: now,
      });
      tx.set(doc(collection(db, `businesses/${BUSINESS_ID}/stockMovements`)), {
        businessId: BUSINESS_ID,
        variantId: lineItem.variantId,
        productName: lineItem.productName,
        variantName: lineItem.variantName,
        movementType: 'Sale',
        quantityChange: -lineItem.quantity,
        quantityBefore: lineItem.previousQuantity,
        quantityAfter: lineItem.newQuantity,
        referenceType: 'sale',
        referenceId: saleRef.id,
        reason: `Sale receipt #${receiptNumber}`,
        performedBy: staffUserId(profile) || input.employeeId,
        createdAt: now,
      });
    });

    if (customerRef && customerSnap?.exists()) {
      const totalPurchases = Number(customerData?.totalPurchases ?? 0) + total;
      const totalPaid = Number(customerData?.totalPaid ?? 0) + amountPaid;
      tx.update(customerRef, {
        totalPurchases,
        totalPaid,
        balanceDue: Math.max(0, totalPurchases - totalPaid),
        updatedAt: now,
      });
    }

    return {
      ok: true,
      duplicate: false,
      sale: {
        saleId: saleRef.id,
        receiptId: receiptRef.id,
        receiptNumber,
        total,
        balanceDue,
        paymentStatus: newSalePaymentStatus,
      },
    };
  });
}

export async function recordSalePayment(
  input: RecordSalePaymentInput,
): Promise<PaymentReceiptResult> {
  if (!input.idempotencyKey || !input.saleId) {
    throw new Error('idempotencyKey and saleId are required.');
  }

  const amount = money(Number(input.amount) || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be greater than zero.');
  }

  const profile = await requireStaff([
    'finance:record_payment',
    'sales:create',
    'receipts:create',
  ]);
  const issued = lagosMoment();
  const configuration = await loadReceiptConfiguration();
  const paymentMethod = input.paymentMethod || 'cash';

  const saleRef = doc(db, `businesses/${BUSINESS_ID}/sales/${input.saleId}`);
  const receiptRef = doc(collection(db, `businesses/${BUSINESS_ID}/receipts`));
  const counterRef = doc(
    db,
    `businesses/${BUSINESS_ID}/receiptCounters/${issued.year}`,
  );
  const idempotencyRef = doc(
    db,
    `businesses/${BUSINESS_ID}/idempotency/${safeDocId(`payment-${input.idempotencyKey}`)}`,
  );
  const paymentRef = doc(collection(db, `businesses/${BUSINESS_ID}/payments`));

  return runTransaction(db, async (tx) => {
    const idempotencySnap = await tx.get(idempotencyRef);
    if (idempotencySnap.exists()) {
      const data = idempotencySnap.data();
      return {
        ok: true,
        duplicate: true,
        receiptId: String(data.receiptId ?? ''),
        receiptNumber: String(data.receiptNumber ?? ''),
        paymentId: data.paymentId ? String(data.paymentId) : undefined,
        saleId: input.saleId,
        balanceDue: data.balanceDue,
      };
    }

    const saleSnap = await tx.get(saleRef);
    if (!saleSnap.exists()) {
      throw new Error('Sale not found.');
    }
    const sale = saleSnap.data() as PlainRecord;
    if (sale.status !== 'completed') {
      throw new Error('Payments can only be recorded against completed sales.');
    }

    const outstanding = Math.max(0, Number(sale.balanceDue ?? 0));
    if (outstanding <= 0) {
      throw new Error('This sale has already been fully paid.');
    }
    if (amount > outstanding) {
      throw new Error('Payment exceeds the outstanding balance on this sale.');
    }

    const customerRef = sale.customerId
      ? doc(db, `businesses/${BUSINESS_ID}/customers/${sale.customerId}`)
      : null;
    const customerSnap = customerRef ? await tx.get(customerRef) : null;
    const counterSnap = await tx.get(counterRef);

    const total = Number(sale.total ?? 0);
    const newAmountPaid = Number(sale.amountPaid ?? 0) + amount;
    const newBalance = Math.max(0, total - newAmountPaid);
    const newSalePaymentStatus = salePaymentStatus(newAmountPaid, total);
    const receiptStatus = receiptPaymentStatus(newAmountPaid, total);
    const sequence = nextSequence(counterSnap.data(), 'payment');
    const receiptNumber = buildReceiptNumber(
      configuration.settings.paymentPrefix,
      issued.year,
      sequence,
    );
    const now = serverTimestamp();

    tx.update(saleRef, {
      amountPaid: newAmountPaid,
      balanceDue: newBalance,
      paymentStatus: newSalePaymentStatus,
      lastPaymentAt: now,
      updatedAt: now,
    });

    if (customerRef && customerSnap?.exists()) {
      const customer = customerSnap.data() as PlainRecord;
      const totalPurchases = Number(customer.totalPurchases ?? 0);
      const totalPaid = Number(customer.totalPaid ?? 0) + amount;
      tx.update(customerRef, {
        totalPaid,
        balanceDue: Math.max(0, totalPurchases - totalPaid),
        updatedAt: now,
      });
    }

    tx.set(
      paymentRef,
      cleanUndefined({
        id: paymentRef.id,
        businessId: BUSINESS_ID,
        referenceType: 'sale',
        referenceId: input.saleId,
        customerId: sale.customerId,
        partyName: sale.customerName || DEFAULT_WALK_IN_CUSTOMER,
        amount,
        paymentMethod,
        reference: input.reference,
        direction: 'in',
        recordedBy: staffUserId(profile),
        receiptId: receiptRef.id,
        receiptNumber,
        idempotencyKey: input.idempotencyKey,
        createdAt: now,
      }),
    );

    tx.set(
      receiptRef,
      cleanUndefined({
        ...receiptBase({
          receiptId: receiptRef.id,
          receiptNumber,
          receiptType: 'payment',
          issued,
          businessSnapshot: configuration.snapshot,
          processedBy: profile,
          paymentStatus: receiptStatus,
          customer: customerFromSale(sale),
          saleId: input.saleId,
          saleReceiptNumber: sale.receiptNumber,
          originalReceiptId: sale.receiptId,
          originalReceiptNumber: sale.receiptNumber,
          notes: input.notes,
        }),
        saleId: input.saleId,
        customerId: sale.customerId,
        saleTotalKobo: total,
        totalKobo: total,
        amountPaidKobo: amount,
        balanceDueKobo: newBalance,
        itemCount: 0,
        items: [],
        paymentMethod,
        paymentReference: input.reference,
        paymentMethods: [
          {
            method: paymentMethod,
            label: paymentMethodLabel(paymentMethod),
            amountKobo: amount,
            reference: input.reference,
          },
        ],
        originalProcessedByName: sale.employeeName || '',
      }),
    );

    tx.set(counterRef, { payment: sequence, updatedAt: now }, { merge: true });
    tx.set(idempotencyRef, {
      receiptId: receiptRef.id,
      receiptNumber,
      paymentId: paymentRef.id,
      saleId: input.saleId,
      balanceDue: newBalance,
      createdAt: now,
    });
    tx.set(doc(collection(db, `businesses/${BUSINESS_ID}/auditLogs`)), {
      businessId: BUSINESS_ID,
      userId: staffUserId(profile),
      action: 'receipt.payment_recorded',
      entityType: 'sale',
      entityId: input.saleId,
      details: { receiptNumber, amount, paymentMethod, balanceDue: newBalance },
      createdAt: now,
    });

    return {
      ok: true,
      duplicate: false,
      receiptId: receiptRef.id,
      receiptNumber,
      paymentId: paymentRef.id,
      saleId: input.saleId,
      amountPaid: newAmountPaid,
      balanceDue: newBalance,
      paymentStatus: newSalePaymentStatus,
    };
  });
}

export async function createSaleReturn(
  input: ReturnReceiptInput,
): Promise<ReturnReceiptResult> {
  if (!input.idempotencyKey || !input.saleId || !input.items?.length) {
    throw new Error('idempotencyKey, saleId and items are required.');
  }

  const reason = String(input.reason || '').trim();
  if (!reason) {
    throw new Error('A return reason is required.');
  }

  const returnKeys = input.items.map(
    (item) => `${item.productId}:${item.variantId}`,
  );
  if (new Set(returnKeys).size !== returnKeys.length) {
    throw new Error('Each returned variant may only appear once per return.');
  }

  const profile = await requireStaff([
    'sales:refund',
    'sales:edit',
    'receipts:refund',
  ]);
  const issued = lagosMoment();
  const configuration = await loadReceiptConfiguration();
  const refundMethod = input.refundMethod || 'cash';

  const saleRef = doc(db, `businesses/${BUSINESS_ID}/sales/${input.saleId}`);
  const receiptRef = doc(collection(db, `businesses/${BUSINESS_ID}/receipts`));
  const counterRef = doc(
    db,
    `businesses/${BUSINESS_ID}/receiptCounters/${issued.year}`,
  );
  const idempotencyRef = doc(
    db,
    `businesses/${BUSINESS_ID}/idempotency/${safeDocId(`return-${input.idempotencyKey}`)}`,
  );
  const variantRefs = input.items.map((item) =>
    doc(
      db,
      `businesses/${BUSINESS_ID}/products/${item.productId}/variants/${item.variantId}`,
    ),
  );

  return runTransaction(db, async (tx) => {
    const idempotencySnap = await tx.get(idempotencyRef);
    if (idempotencySnap.exists()) {
      const data = idempotencySnap.data();
      return {
        ok: true,
        duplicate: true,
        receiptId: String(data.receiptId ?? ''),
        receiptNumber: String(data.receiptNumber ?? ''),
        saleId: input.saleId,
        totalRefunded: data.totalRefunded,
      };
    }

    const saleSnap = await tx.get(saleRef);
    if (!saleSnap.exists()) {
      throw new Error('Sale not found.');
    }
    const sale = saleSnap.data() as PlainRecord;
    if (sale.status !== 'completed') {
      throw new Error('Returns can only be recorded against completed sales.');
    }

    const saleItems: PlainRecord[] = Array.isArray(sale.items) ? sale.items : [];
    const alreadyReturned = (sale.returnedQuantities || {}) as Record<
      string,
      number
    >;
    const variantSnaps = await Promise.all(
      variantRefs.map((ref) => tx.get(ref)),
    );
    const customerRef = sale.customerId
      ? doc(db, `businesses/${BUSINESS_ID}/customers/${sale.customerId}`)
      : null;
    const customerSnap = customerRef ? await tx.get(customerRef) : null;
    const counterSnap = await tx.get(counterRef);

    const returnLines: PlainRecord[] = [];
    const nextReturned = { ...alreadyReturned };
    let totalReturn = 0;

    input.items.forEach((requested, index) => {
      const key = `${requested.productId}:${requested.variantId}`;
      const saleItem = saleItems.find(
        (item) => `${item.productId}:${item.variantId}` === key,
      );
      if (!saleItem) {
        throw new Error('A returned item does not belong to this sale.');
      }

      const quantity = Number(requested.quantity);
      const soldQuantity = Number(saleItem.quantity ?? 0);
      const returnedQuantity = Number(nextReturned[key] ?? 0);
      if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        returnedQuantity + quantity > soldQuantity
      ) {
        throw new Error(
          `Cannot return more than the ${soldQuantity} sold for ${saleItem.productName}.`,
        );
      }

      const variantSnap = variantSnaps[index];
      if (!variantSnap.exists()) {
        throw new Error(`Variant ${requested.variantId} not found.`);
      }

      const unitPrice = Number(saleItem.unitSellingPrice ?? 0);
      const lineTotal = money(quantity * unitPrice);
      totalReturn += lineTotal;
      nextReturned[key] = returnedQuantity + quantity;

      returnLines.push({
        productId: saleItem.productId,
        productName: saleItem.productName,
        variantId: saleItem.variantId,
        variantName:
          saleItem.variationName || saleItem.variantName || 'Standard',
        unit: saleItem.unit,
        quantity,
        unitSellingPrice: unitPrice,
        costBasis: Number(saleItem.costBasis ?? 0),
        lineTotal,
        previousQuantity: Number(
          (variantSnap.data() as PlainRecord)?.quantityOnHand ?? 0,
        ),
      });
    });

    if (totalReturn <= 0) {
      throw new Error('The return has no monetary value.');
    }

    const sequence = nextSequence(counterSnap.data(), 'return');
    const receiptNumber = buildReceiptNumber(
      configuration.settings.returnPrefix,
      issued.year,
      sequence,
    );
    const now = serverTimestamp();
    const grossTotal = Number(sale.total ?? 0);
    const returnedTotal = Number(sale.returnedTotalKobo ?? 0) + totalReturn;
    const effectiveTotal = Math.max(0, grossTotal - returnedTotal);
    const newBalance = Math.max(
      0,
      effectiveTotal - Number(sale.amountPaid ?? 0),
    );
    const newSalePaymentStatus = salePaymentStatus(
      Number(sale.amountPaid ?? 0),
      effectiveTotal,
    );
    const fullyReturned = saleItems.every(
      (item) =>
        Number(nextReturned[`${item.productId}:${item.variantId}`] ?? 0) >=
        Number(item.quantity ?? 0),
    );

    tx.update(saleRef, {
      returnedQuantities: nextReturned,
      returnedTotalKobo: returnedTotal,
      returnStatus: fullyReturned ? 'returned' : 'partially_returned',
      balanceDue: newBalance,
      paymentStatus: newSalePaymentStatus,
      lastReturnAt: now,
      updatedAt: now,
    });

    returnLines.forEach((line, index) => {
      const newQuantity = Number(line.previousQuantity) + Number(line.quantity);
      tx.update(variantSnaps[index].ref, {
        quantityOnHand: newQuantity,
        updatedAt: now,
      });
      tx.set(doc(collection(db, `businesses/${BUSINESS_ID}/stockMovements`)), {
        businessId: BUSINESS_ID,
        variantId: line.variantId,
        productName: line.productName,
        variantName: line.variantName,
        movementType: 'Customer Return',
        quantityChange: line.quantity,
        quantityBefore: line.previousQuantity,
        quantityAfter: newQuantity,
        referenceType: 'return',
        referenceId: receiptRef.id,
        reason: `Return receipt #${receiptNumber} against #${sale.receiptNumber || input.saleId}`,
        performedBy: staffUserId(profile),
        createdAt: now,
      });
    });

    if (customerRef && customerSnap?.exists()) {
      const customer = customerSnap.data() as PlainRecord;
      const totalPurchases = Math.max(
        0,
        Number(customer.totalPurchases ?? 0) - totalReturn,
      );
      const totalPaid = Number(customer.totalPaid ?? 0);
      tx.update(customerRef, {
        totalPurchases,
        balanceDue: Math.max(0, totalPurchases - totalPaid),
        updatedAt: now,
      });
    }

    const receiptItems = returnLines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      variantId: line.variantId,
      variationName: line.variantName,
      unit: line.unit,
      quantity: line.quantity,
      unitPriceKobo: line.unitSellingPrice,
      unitSellingPrice: line.unitSellingPrice,
      lineTotalKobo: line.lineTotal,
      lineTotal: line.lineTotal,
      costBasisKobo: line.costBasis,
    }));

    tx.set(
      receiptRef,
      cleanUndefined({
        ...receiptBase({
          receiptId: receiptRef.id,
          receiptNumber,
          receiptType: 'return',
          issued,
          businessSnapshot: configuration.snapshot,
          processedBy: profile,
          paymentStatus: 'refunded',
          customer: customerFromSale(sale),
          saleId: input.saleId,
          saleReceiptNumber: sale.receiptNumber,
          originalReceiptId: sale.receiptId,
          originalReceiptNumber: sale.receiptNumber,
          notes: input.notes,
        }),
        saleId: input.saleId,
        customerId: sale.customerId,
        items: receiptItems,
        itemCount: receiptItems.reduce(
          (sum, item) => sum + Number(item.quantity ?? 0),
          0,
        ),
        subtotalKobo: totalReturn,
        discountKobo: 0,
        additionalChargesKobo: 0,
        taxKobo: 0,
        totalKobo: totalReturn,
        amountPaidKobo: totalReturn,
        balanceDueKobo: newBalance,
        paymentMethod: refundMethod,
        paymentMethods: [
          {
            method: refundMethod,
            label: paymentMethodLabel(refundMethod),
            amountKobo: totalReturn,
          },
        ],
        returnReason: reason,
      }),
    );

    tx.set(counterRef, { return: sequence, updatedAt: now }, { merge: true });
    tx.set(idempotencyRef, {
      receiptId: receiptRef.id,
      receiptNumber,
      saleId: input.saleId,
      totalRefunded: totalReturn,
      createdAt: now,
    });
    tx.set(doc(collection(db, `businesses/${BUSINESS_ID}/auditLogs`)), {
      businessId: BUSINESS_ID,
      userId: staffUserId(profile),
      action: 'receipt.return_recorded',
      entityType: 'sale',
      entityId: input.saleId,
      details: { receiptNumber, totalReturn, reason },
      createdAt: now,
    });

    return {
      ok: true,
      duplicate: false,
      receiptId: receiptRef.id,
      receiptNumber,
      saleId: input.saleId,
      totalRefunded: totalReturn,
      balanceDue: newBalance,
    };
  });
}

export async function voidSale(
  input: VoidReceiptInput,
): Promise<VoidReceiptResult> {
  if (!input.idempotencyKey || !input.saleId) {
    throw new Error('idempotencyKey and saleId are required.');
  }

  const reason = String(input.reason || '').trim();
  if (!reason) {
    throw new Error('A void reason is required.');
  }

  const profile = await requireStaff(['sales:cancel', 'receipts:void']);
  const issued = lagosMoment();
  const configuration = await loadReceiptConfiguration();

  const saleRef = doc(db, `businesses/${BUSINESS_ID}/sales/${input.saleId}`);
  const receiptRef = doc(collection(db, `businesses/${BUSINESS_ID}/receipts`));
  const counterRef = doc(
    db,
    `businesses/${BUSINESS_ID}/receiptCounters/${issued.year}`,
  );
  const idempotencyRef = doc(
    db,
    `businesses/${BUSINESS_ID}/idempotency/${safeDocId(`void-${input.idempotencyKey}`)}`,
  );

  return runTransaction(db, async (tx) => {
    const idempotencySnap = await tx.get(idempotencyRef);
    if (idempotencySnap.exists()) {
      const data = idempotencySnap.data();
      return {
        ok: true,
        duplicate: true,
        receiptId: String(data.receiptId ?? ''),
        receiptNumber: String(data.receiptNumber ?? ''),
        saleId: input.saleId,
        originalReceiptId: data.originalReceiptId ?? null,
      };
    }

    const saleSnap = await tx.get(saleRef);
    if (!saleSnap.exists()) {
      throw new Error('Sale not found.');
    }
    const sale = saleSnap.data() as PlainRecord;
    if (sale.status === 'cancelled' || sale.voided === true) {
      throw new Error('This sale has already been voided.');
    }
    if (sale.status !== 'completed') {
      throw new Error('Only completed sales can be voided.');
    }
    if (Number(sale.returnedTotalKobo ?? 0) > 0) {
      throw new Error(
        'This sale has recorded returns. Record additional returns instead of voiding it.',
      );
    }

    const saleItems: PlainRecord[] = Array.isArray(sale.items) ? sale.items : [];
    const variantRefs = saleItems.map((item) =>
      doc(
        db,
        `businesses/${BUSINESS_ID}/products/${item.productId}/variants/${item.variantId}`,
      ),
    );
    const variantSnaps = variantRefs.length
      ? await Promise.all(variantRefs.map((ref) => tx.get(ref)))
      : [];
    const customerRef = sale.customerId
      ? doc(db, `businesses/${BUSINESS_ID}/customers/${sale.customerId}`)
      : null;
    const customerSnap = customerRef ? await tx.get(customerRef) : null;
    const originalReceiptRef = sale.receiptId
      ? doc(db, `businesses/${BUSINESS_ID}/receipts/${sale.receiptId}`)
      : null;
    const originalReceiptSnap = originalReceiptRef
      ? await tx.get(originalReceiptRef)
      : null;
    const counterSnap = await tx.get(counterRef);

    const sequence = nextSequence(counterSnap.data(), 'void');
    const receiptNumber = buildReceiptNumber(
      configuration.settings.voidPrefix,
      issued.year,
      sequence,
    );
    const now = serverTimestamp();

    variantSnaps.forEach((snap, index) => {
      const saleItem = saleItems[index];
      if (!snap.exists()) {
        throw new Error(`Variant ${saleItem.variantId} no longer exists.`);
      }
      const previousQuantity = Number(
        (snap.data() as PlainRecord)?.quantityOnHand ?? 0,
      );
      const newQuantity = previousQuantity + Number(saleItem.quantity ?? 0);
      tx.update(snap.ref, { quantityOnHand: newQuantity, updatedAt: now });
      tx.set(doc(collection(db, `businesses/${BUSINESS_ID}/stockMovements`)), {
        businessId: BUSINESS_ID,
        variantId: saleItem.variantId,
        productName: saleItem.productName,
        variantName: saleItem.variationName || saleItem.variantName,
        movementType: 'Void',
        quantityChange: Number(saleItem.quantity ?? 0),
        quantityBefore: previousQuantity,
        quantityAfter: newQuantity,
        referenceType: 'sale',
        referenceId: input.saleId,
        reason: `Void receipt #${receiptNumber} — ${reason}`,
        performedBy: staffUserId(profile),
        createdAt: now,
      });
    });

    tx.update(saleRef, {
      status: 'cancelled',
      voided: true,
      voidedAt: now,
      voidReason: reason,
      voidReceiptId: receiptRef.id,
      voidReceiptNumber: receiptNumber,
      balanceDue: 0,
      updatedAt: now,
    });

    if (customerRef && customerSnap?.exists()) {
      const customer = customerSnap.data() as PlainRecord;
      const totalPurchases = Math.max(
        0,
        Number(customer.totalPurchases ?? 0) - Number(sale.total ?? 0),
      );
      const totalPaid = Math.max(
        0,
        Number(customer.totalPaid ?? 0) - Number(sale.amountPaid ?? 0),
      );
      tx.update(customerRef, {
        totalPurchases,
        totalPaid,
        balanceDue: Math.max(0, totalPurchases - totalPaid),
        updatedAt: now,
      });
    }

    if (originalReceiptRef && originalReceiptSnap?.exists()) {
      tx.update(originalReceiptRef, {
        documentStatus: 'voided',
        voidedAt: now,
        voidReason: reason,
        voidReceiptId: receiptRef.id,
        voidReceiptNumber: receiptNumber,
        updatedAt: now,
      });
    }

    tx.set(
      receiptRef,
      cleanUndefined({
        ...receiptBase({
          receiptId: receiptRef.id,
          receiptNumber,
          receiptType: 'void',
          issued,
          businessSnapshot: configuration.snapshot,
          processedBy: profile,
          paymentStatus: 'refunded',
          customer: customerFromSale(sale),
          saleId: input.saleId,
          saleReceiptNumber: sale.receiptNumber,
          originalReceiptId: sale.receiptId,
          originalReceiptNumber: sale.receiptNumber,
          notes: input.notes,
        }),
        saleId: input.saleId,
        customerId: sale.customerId,
        items: receiptItemsFromSaleItems(saleItems),
        itemCount: 0,
        subtotalKobo: Number(sale.subtotal ?? sale.total ?? 0),
        discountKobo: Number(sale.discount ?? 0),
        additionalChargesKobo: 0,
        taxKobo: 0,
        totalKobo: Number(sale.total ?? 0),
        amountPaidKobo: Number(sale.amountPaid ?? 0),
        balanceDueKobo: 0,
        paymentMethod: sale.paymentMethod || 'cash',
        paymentMethods: [],
        voidReason: reason,
        originalProcessedByName: sale.employeeName || '',
      }),
    );

    tx.set(counterRef, { void: sequence, updatedAt: now }, { merge: true });
    tx.set(idempotencyRef, {
      receiptId: receiptRef.id,
      receiptNumber,
      saleId: input.saleId,
      originalReceiptId: sale.receiptId || null,
      createdAt: now,
    });
    tx.set(doc(collection(db, `businesses/${BUSINESS_ID}/auditLogs`)), {
      businessId: BUSINESS_ID,
      userId: staffUserId(profile),
      action: 'receipt.sale_voided',
      entityType: 'sale',
      entityId: input.saleId,
      details: { receiptNumber, voidNumber: receiptNumber, reason },
      createdAt: now,
    });

    return {
      ok: true,
      duplicate: false,
      receiptId: receiptRef.id,
      receiptNumber,
      saleId: input.saleId,
      originalReceiptId: sale.receiptId || null,
    };
  });
}
