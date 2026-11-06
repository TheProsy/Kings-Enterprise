import * as functions from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import {
  BUSINESS_ID,
  RECEIPT_TEMPLATE_VERSION,
  assertReceiptAccess,
  buildReceiptNumber,
  businessSnapshotFromSettings,
  cleanUndefined,
  db,
  idempotencyDocumentId,
  lagosMoment,
  money,
  nextSequence,
  normalizeReceiptSettings,
  paymentMethodLabel,
  receiptCounterRef,
  receiptFileName,
  receiptPaymentStatus,
  requireStaff,
  salePaymentStatus,
  staffDisplayName,
  variationNameForVariant,
  type BusinessSnapshot,
  type LagosMoment,
  type ReceiptSettings,
  type StaffProfile,
} from './receiptShared';
import { generateReceiptPdfInternal } from './receiptPdf';

const DEFAULT_WALK_IN_CUSTOMER = 'Walk-in Customer';

interface ReceiptConfiguration {
  settings: ReceiptSettings;
  snapshot: BusinessSnapshot;
}

async function loadReceiptConfiguration(): Promise<ReceiptConfiguration> {
  const snap = await db.doc(`businesses/${BUSINESS_ID}/settings/main`).get();
  const data = snap.data();
  const settings = normalizeReceiptSettings(data?.receipt, data?.general);
  return { settings, snapshot: businessSnapshotFromSettings(settings) };
}

interface ReceiptCustomer {
  name: string;
  phone?: string;
  address?: string;
}

interface ReceiptBaseInput {
  receiptId: string;
  receiptNumber: string;
  receiptType: 'sale' | 'payment' | 'return' | 'void';
  issued: LagosMoment;
  businessSnapshot: BusinessSnapshot;
  processedBy: StaffProfile;
  paymentStatus: string;
  customer?: ReceiptCustomer;
  saleId?: string;
  saleReceiptNumber?: string;
  originalReceiptId?: string;
  originalReceiptNumber?: string;
  notes?: string;
}

function receiptBase(input: ReceiptBaseInput) {
  const now = admin.firestore.FieldValue.serverTimestamp();
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
      userId: input.processedBy.uid || input.processedBy.id,
      displayName: staffDisplayName(input.processedBy),
      role: input.processedBy.role || 'salesperson',
    },
    customerSnapshot: input.customer,
    saleId: input.saleId,
    saleReceiptNumber: input.saleReceiptNumber,
    originalReceiptId: input.originalReceiptId,
    originalReceiptNumber: input.originalReceiptNumber,
    notes: input.notes,
    issuedAt: admin.firestore.FieldValue.serverTimestamp(),
    issuedDateLabel: input.issued.dateLabel,
    issuedTimeLabel: input.issued.timeLabel,
    issuedIsoDate: input.issued.isoDate,
    issuedYear: input.issued.year,
    pdfStatus: 'pending',
    pdfAttempts: 0,
    createdAt: now,
    updatedAt: now,
  });
}

function receiptCollectionRef() {
  return db.collection(`businesses/${BUSINESS_ID}/receipts`);
}

function receiptDocumentRef(receiptId: string) {
  return db.doc(`businesses/${BUSINESS_ID}/receipts/${receiptId}`);
}

async function loadReceiptForCaller(
  profile: StaffProfile,
  receiptId: string,
): Promise<Record<string, any>> {
  const snap = await receiptDocumentRef(receiptId).get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Receipt not found.');
  }
  const receipt = { id: snap.id, ...(snap.data() as Record<string, any>) };
  assertReceiptAccess(profile, receipt);
  return receipt;
}

async function signedReceiptUrl(storagePath?: string): Promise<string | null> {
  if (!storagePath) return null;
  try {
    const [url] = await admin.storage().bucket().file(storagePath).getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    });
    return url;
  } catch (error) {
    functions.logger.warn('Could not create a signed receipt URL.', error);
    return null;
  }
}

function receiptItemsFromSaleItems(items: any[]) {
  return items.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    variantId: item.variantId,
    variationName: item.variationName || item.variantName,
    unit: item.unit,
    quantity: Number(item.quantity ?? 0),
    unitPriceKobo: Number(item.unitSellingPrice ?? item.unitPriceKobo ?? 0),
    unitSellingPrice: Number(item.unitSellingPrice ?? item.unitPriceKobo ?? 0),
    lineTotalKobo: Number(item.lineTotal ?? item.lineTotalKobo ?? 0),
    lineTotal: Number(item.lineTotal ?? item.lineTotalKobo ?? 0),
    costBasisKobo: Number(item.costBasis ?? item.costBasisKobo ?? 0),
  }));
}

function saleCustomerSnapshot(input: CreateSaleInput, customer: Record<string, any> | null): ReceiptCustomer {
  return cleanUndefined({
    name: String(customer?.name || input.customerName || DEFAULT_WALK_IN_CUSTOMER),
    phone: customer?.phone ? String(customer.phone) : undefined,
    address: customer?.address ? String(customer.address) : undefined,
  });
}

/**
 * Callable: bootstrap the first owner profile for the signed-in user.
 * Idempotent: re-running just ensures the caller is marked owner.
 */
export const bootstrapOwner = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  }

  const name = typeof request.data?.name === 'string' ? request.data.name : '';
  const uid = request.auth.uid;
  const userRef = db.collection(`businesses/${BUSINESS_ID}/users`).doc(uid);

  // Owner bootstrap is only allowed when no other owner exists.
  const existingOwner = await db
    .collection(`businesses/${BUSINESS_ID}/users`)
    .where('role', '==', 'owner')
    .limit(1)
    .get();
  if (!existingOwner.empty && existingOwner.docs[0].id !== uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'This business already has an owner account.',
    );
  }

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const payload = {
      id: uid,
      uid,
      businessId: BUSINESS_ID,
      name: name || request.auth?.token?.name || 'Owner',
      email: request.auth?.token?.email || '',
      role: 'owner',
      permissions: Object.values({
        PRODUCTS_VIEW: 'products:view',
        PRODUCTS_CREATE: 'products:create',
        PRODUCTS_EDIT: 'products:edit',
        PRODUCTS_DELETE: 'products:delete',
        PRODUCTS_MANAGE_STOCK: 'products:manage_stock',
        SALES_VIEW: 'sales:view',
        SALES_CREATE: 'sales:create',
        SALES_EDIT: 'sales:edit',
        SALES_CANCEL: 'sales:cancel',
        SALES_REFUND: 'sales:refund',
        PURCHASES_VIEW: 'purchases:view',
        PURCHASES_CREATE: 'purchases:create',
        SUPPLIERS_VIEW: 'suppliers:view',
        SUPPLIERS_CREATE: 'suppliers:create',
        SUPPLIERS_EDIT: 'suppliers:edit',
        CUSTOMERS_VIEW: 'customers:view',
        CUSTOMERS_CREATE: 'customers:create',
        CUSTOMERS_EDIT: 'customers:edit',
        EXPENSES_VIEW: 'expenses:view',
        EXPENSES_CREATE: 'expenses:create',
        FINANCE_VIEW: 'finance:view',
        FINANCE_RECORD_PAYMENT: 'finance:record_payment',
        REPORTS_VIEW: 'reports:view',
        EMPLOYEES_VIEW: 'employees:view',
        EMPLOYEES_CREATE: 'employees:create',
        EMPLOYEES_EDIT: 'employees:edit',
        EMPLOYEES_DEACTIVATE: 'employees:deactivate',
        SETTINGS_VIEW: 'settings:view',
        SETTINGS_EDIT: 'settings:edit',
      }),
      active: true,
      createdAt: snap.exists ? snap.data()?.createdAt : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    tx.set(userRef, payload, { merge: true });
  });

  return { ok: true, uid };
});

interface SaleItemInput {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  unit: string;
  quantity: number;
  unitSellingPrice: number;
}

interface CreateSaleInput {
  idempotencyKey: string;
  items: SaleItemInput[];
  amountPaid: number;
  paymentMethod: string;
  customerId?: string;
  customerName?: string;
  employeeId: string;
  employeeName: string;
  notes?: string;
}

/**
 * Callable: record a sale atomically.
 * Verifies stock, deducts inventory, writes the sale + stock movements,
 * and updates customer debt — all inside one Firestore transaction.
 */
export const createSale = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  }

  const profile = await requireStaff(request.auth.uid, ['sales:create']);

  const input = request.data as CreateSaleInput;
  if (!input.idempotencyKey || !input.items?.length) {
    throw new functions.https.HttpsError('invalid-argument', 'idempotencyKey and items are required.');
  }

  const variantKeys = input.items.map((item) => `${item.productId}:${item.variantId}`);
  if (new Set(variantKeys).size !== variantKeys.length) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Each product variant may only appear once per sale.',
    );
  }
  for (const item of input.items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Invalid quantity for ${item.productName}.`,
      );
    }
  }

  const idempotencyRef = db
    .collection(`businesses/${BUSINESS_ID}/idempotency`)
    .doc(input.idempotencyKey);

  const issued = lagosMoment();
  const configuration = await loadReceiptConfiguration();
  const saleId = `sale-${Date.now()}`;
  const saleRef = db.collection(`businesses/${BUSINESS_ID}/sales`).doc(saleId);
  const receiptId = receiptCollectionRef().doc().id;
  const receiptRef = receiptDocumentRef(receiptId);
  const counterRef = receiptCounterRef(issued.year);
  const customerRef = input.customerId
    ? db.collection(`businesses/${BUSINESS_ID}/customers`).doc(input.customerId)
    : null;

  const result = await db.runTransaction(async (tx) => {
    const idempotencySnap = await tx.get(idempotencyRef);
    if (idempotencySnap.exists) {
      const data = idempotencySnap.data();
      return {
        duplicate: true,
        saleId: data?.saleId,
        receiptId: data?.receiptId,
        receiptNumber: data?.receiptNumber,
      };
    }

    // Lock + read all variants in one batch
    const variantRefs = input.items.map((i) =>
      db.collection(`businesses/${BUSINESS_ID}/products/${i.productId}/variants`).doc(i.variantId)
    );
    const variantSnaps = await tx.getAll(...variantRefs);
    const customerSnap = customerRef ? await tx.get(customerRef) : null;
    const counterSnap = await tx.get(counterRef);

    const lineItems: any[] = [];
    let subtotal = 0;

    variantSnaps.forEach((snap, i) => {
      const item = input.items[i];
      if (!snap.exists) {
        throw new functions.https.HttpsError('not-found', `Variant ${item.variantId} not found.`);
      }
      const v = snap.data() as any;
      const qtyOnHand = Number(v.quantityOnHand ?? 0);
      if (qtyOnHand < item.quantity) {
        throw new functions.https.HttpsError('failed-precondition', `Not enough stock for ${item.productName}.`);
      }
      // Always sell at the catalogue price; never trust a client-supplied price.
      const unitSellingPrice = Number(v.sellingPrice ?? 0);
      if (!Number.isFinite(unitSellingPrice) || unitSellingPrice < 0) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Invalid selling price for ${item.productName}.`,
        );
      }
      const lineTotal = money(item.quantity * unitSellingPrice);
      subtotal += lineTotal;
      lineItems.push({
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        variantName: variationNameForVariant(v, item.productName),
        variationName: variationNameForVariant(v, item.productName),
        brand: v.brand,
        unit: item.unit,
        quantity: item.quantity,
        unitSellingPrice,
        costBasis: Number(v.costPrice ?? 0),
        lineTotal,
        variantRef: snap.ref,
        previousQuantity: qtyOnHand,
        newQuantity: qtyOnHand - item.quantity,
      });
    });

    const total = subtotal;
    const amountPaid = Math.max(0, Math.min(money(Number(input.amountPaid) || 0), total));
    const balanceDue = Math.max(0, total - amountPaid);
    const saleStatus = salePaymentStatus(amountPaid, total);
    const receiptStatus = receiptPaymentStatus(amountPaid, total);
    const sequence = nextSequence(counterSnap.data(), 'receipt');
    const receiptNumber = buildReceiptNumber(
      configuration.settings.receiptPrefix,
      issued.year,
      sequence,
    );
    const now = admin.firestore.FieldValue.serverTimestamp();

    const customerData = customerSnap?.exists ? (customerSnap.data() as any) : null;
    const customerName = String(
      customerData?.name || input.customerName || DEFAULT_WALK_IN_CUSTOMER,
    );
    const receiptItems = receiptItemsFromSaleItems(lineItems);

    tx.set(saleRef, cleanUndefined({
      id: saleId,
      businessId: BUSINESS_ID,
      receiptId,
      receiptNumber,
      employeeId: profile.uid || input.employeeId,
      employeeName: staffDisplayName(profile),
      customerId: input.customerId,
      customerName,
      items: lineItems.map(({ variantRef: _variantRef, previousQuantity: _previousQuantity, newQuantity: _newQuantity, ...rest }) => rest),
      subtotal,
      discount: 0,
      total,
      amountPaid,
      balanceDue,
      paymentStatus: saleStatus,
      paymentMethod: input.paymentMethod,
      status: 'completed',
      idempotencyKey: input.idempotencyKey,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    }));

    tx.set(receiptRef, cleanUndefined({
      ...receiptBase({
        receiptId,
        receiptNumber,
        receiptType: 'sale',
        issued,
        businessSnapshot: configuration.snapshot,
        processedBy: profile,
        paymentStatus: receiptStatus,
        customer: saleCustomerSnapshot(input, customerData),
        saleId,
        saleReceiptNumber: receiptNumber,
        notes: input.notes,
      }),
      saleId,
      customerId: input.customerId,
      items: receiptItems,
      itemCount: receiptItems.reduce((sum, item) => sum + item.quantity, 0),
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
              },
            ]
          : [],
    }));

    tx.set(idempotencyRef, {
      saleId,
      receiptId,
      receiptNumber,
      createdAt: now,
    });
    tx.set(counterRef, { receipt: sequence, updatedAt: now }, { merge: true });

    // Deduct stock + log movements
    lineItems.forEach((li) => {
      tx.update(li.variantRef, {
        quantityOnHand: li.newQuantity,
        updatedAt: now,
      });
      tx.create(db.collection(`businesses/${BUSINESS_ID}/stockMovements`).doc(), {
        businessId: BUSINESS_ID,
        variantId: li.variantId,
        productName: li.productName,
        variantName: li.variantName,
        movementType: 'Sale',
        quantityChange: -li.quantity,
        quantityBefore: li.previousQuantity,
        quantityAfter: li.newQuantity,
        referenceType: 'sale',
        referenceId: saleId,
        reason: `Sale receipt #${receiptNumber}`,
        performedBy: profile.uid || input.employeeId,
        createdAt: now,
      });
    });

    // Customer debt
    if (customerRef && customerSnap?.exists) {
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
      duplicate: false,
      saleId,
      receiptId,
      receiptNumber,
      total,
      balanceDue,
      paymentStatus: saleStatus,
    };
  });

  if (result.duplicate) {
    return { ok: true, duplicate: true, sale: result };
  }
  return { ok: true, duplicate: false, sale: result };
});

interface ReceiveStockItemInput {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  unit: string;
  quantity: number;
  unitCostPrice: number;
}

interface ReceiveStockInput {
  idempotencyKey: string;
  items: ReceiveStockItemInput[];
  supplierId: string;
  supplierName: string;
  additionalCosts: number;
  amountPaid: number;
  paymentMethod: string;
  employeeId: string;
  employeeName: string;
  notes?: string;
}

/**
 * Callable: receive stock atomically (purchase).
 * Adds stock, writes the purchase, logs movements, updates supplier balance.
 */
export const receiveStock = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  }

  await requireStaff(request.auth.uid, ['purchases:create']);

  const input = request.data as ReceiveStockInput;
  if (!input.idempotencyKey || !input.items?.length) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'idempotencyKey and items are required.',
    );
  }
  if (!input.supplierId) {
    throw new functions.https.HttpsError('invalid-argument', 'supplierId is required.');
  }

  const variantKeys = input.items.map((item) => `${item.productId}:${item.variantId}`);
  if (new Set(variantKeys).size !== variantKeys.length) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Each product variant may only appear once per purchase.',
    );
  }

  const idempotencyRef = db
    .collection(`businesses/${BUSINESS_ID}/idempotency`)
    .doc(input.idempotencyKey);

  const result = await db.runTransaction(async (tx) => {
    const idempotencySnap = await tx.get(idempotencyRef);
    if (idempotencySnap.exists) {
      return { duplicate: true, purchaseId: idempotencySnap.data()?.purchaseId };
    }

    const variantRefs = input.items.map((item) =>
      db
        .collection(`businesses/${BUSINESS_ID}/products/${item.productId}/variants`)
        .doc(item.variantId),
    );
    const variantSnaps = await tx.getAll(...variantRefs);

    const lineItems: any[] = [];
    let subtotal = 0;

    variantSnaps.forEach((snap, index) => {
      const item = input.items[index];
      if (!snap.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          `Variant ${item.variantId} not found.`,
        );
      }
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Invalid quantity for ${item.productName}.`,
        );
      }
      if (!Number.isFinite(item.unitCostPrice) || item.unitCostPrice < 0) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Invalid cost price for ${item.productName}.`,
        );
      }

      const variant = snap.data() as any;
      const previousQuantity = Number(variant.quantityOnHand ?? 0);
      const lineTotal = money(item.quantity * item.unitCostPrice);
      subtotal += lineTotal;

      lineItems.push({
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        variantName: item.variantName,
        brand: variant.brand,
        unit: item.unit,
        quantity: item.quantity,
        unitCostPrice: item.unitCostPrice,
        lineTotal,
        variantRef: snap.ref,
        previousQuantity,
        newQuantity: previousQuantity + item.quantity,
      });
    });

    const additionalCosts = Math.max(0, money(Number(input.additionalCosts) || 0));
    const totalCost = subtotal + additionalCosts;
    const amountPaid = Math.max(0, Math.min(money(Number(input.amountPaid) || 0), totalCost));
    const balanceOwed = Math.max(0, totalCost - amountPaid);
    const purchaseId = `pur-${Date.now()}`;
    const purchaseNumber = `PUR-${purchaseId.slice(-6)}`;
    const now = admin.firestore.FieldValue.serverTimestamp();

    const purchaseRef = db.collection(`businesses/${BUSINESS_ID}/purchases`).doc(purchaseId);
    tx.set(purchaseRef, {
      id: purchaseId,
      businessId: BUSINESS_ID,
      purchaseNumber,
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      employeeId: input.employeeId,
      items: lineItems.map(
        ({ variantRef: _variantRef, previousQuantity: _previousQuantity, newQuantity: _newQuantity, ...rest }) => rest,
      ),
      subtotal,
      additionalCosts,
      total: totalCost,
      amountPaid,
      balanceDue: balanceOwed,
      paymentStatus: amountPaid >= totalCost ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid',
      status: 'completed',
      idempotencyKey: input.idempotencyKey,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    });

    tx.set(idempotencyRef, { purchaseId, createdAt: now });

    lineItems.forEach((lineItem) => {
      tx.update(lineItem.variantRef, {
        quantityOnHand: lineItem.newQuantity,
        costPrice: lineItem.unitCostPrice,
        updatedAt: now,
      });

      tx.create(db.collection(`businesses/${BUSINESS_ID}/stockMovements`).doc(), {
        businessId: BUSINESS_ID,
        variantId: lineItem.variantId,
        productName: lineItem.productName,
        variantName: lineItem.variantName,
        movementType: 'Purchase',
        quantityChange: lineItem.quantity,
        quantityBefore: lineItem.previousQuantity,
        quantityAfter: lineItem.newQuantity,
        referenceType: 'purchase',
        referenceId: purchaseId,
        reason: `Stock receipt ${purchaseNumber} from ${input.supplierName}`,
        performedBy: input.employeeId,
        createdAt: now,
      });
    });

    const suppRef = db.collection(`businesses/${BUSINESS_ID}/suppliers`).doc(input.supplierId);
    const suppSnap = await tx.get(suppRef);
    if (suppSnap.exists) {
      const supplier = suppSnap.data() as any;
      const totalSupplied = Number(supplier.totalPurchases ?? 0) + totalCost;
      const totalPaid = Number(supplier.totalPaid ?? 0) + amountPaid;
      const owed = Math.max(0, totalSupplied - totalPaid);
      tx.update(suppRef, {
        totalPurchases: totalSupplied,
        totalPaid,
        balanceDue: owed,
        updatedAt: now,
      });
    }

    return { duplicate: false, purchaseId, purchaseNumber, total: totalCost, balanceOwed };
  });

  if (result.duplicate) {
    return { ok: true, duplicate: true, purchaseId: result.purchaseId };
  }
  return { ok: true, duplicate: false, purchase: result };
});

interface RecordPaymentInput {
  idempotencyKey: string;
  partyType: 'customer' | 'supplier';
  partyId: string;
  amount: number;
  paymentMethod: string;
  recordedBy: string;
}

/**
 * Callable: record a customer or supplier payment atomically.
 * Updates the balance and writes a payment + audit trail entry.
 */
export const recordPayment = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  }

  await requireStaff(request.auth.uid, ['finance:record_payment']);

  const input = request.data as RecordPaymentInput;
  const amount = money(input.amount);
  if (!input.idempotencyKey || !input.partyId || !['customer', 'supplier'].includes(input.partyType)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'idempotencyKey, partyType and partyId are required.',
    );
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Amount must be greater than zero.');
  }

  const idempotencyRef = db
    .collection(`businesses/${BUSINESS_ID}/idempotency`)
    .doc(input.idempotencyKey);

  const result = await db.runTransaction(async (tx) => {
    const idempotencySnap = await tx.get(idempotencyRef);
    if (idempotencySnap.exists) {
      return {
        duplicate: true,
        paymentId: idempotencySnap.data()?.paymentId,
        balanceDue: idempotencySnap.data()?.balanceDue,
      };
    }

    const collectionName = input.partyType === 'customer' ? 'customers' : 'suppliers';
    const partyRef = db.collection(`businesses/${BUSINESS_ID}/${collectionName}`).doc(input.partyId);
    const partySnap = await tx.get(partyRef);
    if (!partySnap.exists) {
      throw new functions.https.HttpsError('not-found', `${input.partyType} not found.`);
    }

    const party = partySnap.data() as any;
    const balanceDue = Number(party.balanceDue ?? 0);
    if (amount > balanceDue) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Payment exceeds the outstanding balance.',
      );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const paymentId = `pay-${Date.now()}`;
    const newBalance = Math.max(0, balanceDue - amount);
    const totalPaid = Number(party.totalPaid ?? 0) + amount;

    tx.update(partyRef, {
      totalPaid,
      balanceDue: newBalance,
      updatedAt: now,
    });

    tx.set(db.collection(`businesses/${BUSINESS_ID}/payments`).doc(paymentId), {
      id: paymentId,
      businessId: BUSINESS_ID,
      referenceType: input.partyType,
      referenceId: input.partyId,
      customerId: input.partyType === 'customer' ? input.partyId : undefined,
      supplierId: input.partyType === 'supplier' ? input.partyId : undefined,
      partyName: String(party.name ?? ''),
      amount,
      paymentMethod: input.paymentMethod,
      direction: input.partyType === 'customer' ? 'in' : 'out',
      recordedBy: request.auth?.uid ?? input.recordedBy,
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
    });

    tx.set(db.collection(`businesses/${BUSINESS_ID}/auditLogs`).doc(), {
      businessId: BUSINESS_ID,
      userId: request.auth?.uid,
      action: 'payment.recorded',
      entityType: input.partyType,
      entityId: input.partyId,
      details: { amount, paymentMethod: input.paymentMethod, balanceDue: newBalance },
      createdAt: now,
    });

    tx.set(idempotencyRef, { paymentId, balanceDue: newBalance, createdAt: now });

    return { duplicate: false, paymentId, balanceDue: newBalance };
  });

  return { ok: true, ...result };
});

/**
 * Callable: create an employee account without signing the owner out.
 * Only an active owner of the business may call this.
 */
export const createEmployee = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  }

  const callerRef = db
    .collection(`businesses/${BUSINESS_ID}/users`)
    .doc(request.auth.uid);
  const callerSnap = await callerRef.get();
  if (!callerSnap.exists || callerSnap.data()?.role !== 'owner' || callerSnap.data()?.active !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only an active owner can create employee accounts.',
    );
  }

  const data = request.data as {
    email?: string;
    password?: string;
    name?: string;
    role?: string;
    permissions?: unknown[];
  };
  const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
  const password = typeof data?.password === 'string' ? data.password : '';
  const name = typeof data?.name === 'string' ? data.name.trim() : '';
  const role = typeof data?.role === 'string' ? data.role : 'salesperson';
  const permissions = Array.isArray(data?.permissions)
    ? data.permissions.filter((permission: unknown) => typeof permission === 'string')
    : [];

  if (!email || !password || !name) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'name, email and password are required.',
    );
  }
  if (password.length < 6) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Password must be at least 6 characters.',
    );
  }
  if (!['owner', 'salesperson', 'stock_manager'].includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid role.');
  }

  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });
  } catch (error: any) {
    if (error?.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'An account with this email already exists.');
    }
    throw new functions.https.HttpsError('internal', 'Could not create the employee account.');
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.collection(`businesses/${BUSINESS_ID}/users`).doc(userRecord.uid).set({
    id: userRecord.uid,
    uid: userRecord.uid,
    businessId: BUSINESS_ID,
    name,
    email,
    role,
    permissions,
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  return { ok: true, uid: userRecord.uid };
});

function customerFromSale(sale: Record<string, any>): ReceiptCustomer {
  const snapshot = sale.customerSnapshot || {};
  return cleanUndefined({
    name: String(snapshot.name || sale.customerName || DEFAULT_WALK_IN_CUSTOMER),
    phone: snapshot.phone ? String(snapshot.phone) : undefined,
    address: snapshot.address ? String(snapshot.address) : undefined,
  });
}

interface ReceiptPdfInput {
  receiptId?: string;
  forceNewVersion?: boolean;
}

async function buildReceiptPdfResponse(
  receiptId: string,
  forceNewVersion: boolean,
) {
  const result = await generateReceiptPdfInternal(receiptId, { forceNewVersion });

  if (result.status === 'failed') {
    throw new functions.https.HttpsError(
      'internal',
      result.error || 'Could not generate the receipt PDF.',
    );
  }

  if (result.status === 'generating') {
    return { ok: true, status: 'generating' as const, receiptId };
  }

  const snap = await receiptDocumentRef(receiptId).get();
  const receipt = snap.data() as Record<string, any> | undefined;

  return {
    ok: true,
    status: 'ready' as const,
    receiptId,
    receiptNumber: receipt?.receiptNumber,
    url: await signedReceiptUrl(result.path),
    path: result.path,
    fileName: receiptFileName(String(receipt?.receiptNumber || 'receipt')),
    checksum: result.checksum,
    size: result.size,
    templateVersion: result.templateVersion,
  };
}

/**
 * Callable: create (or reuse) the private PDF for a receipt and return a
 * short-lived signed download URL.
 */
export const generateReceiptPDF = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  }

  const profile = await requireStaff(request.auth.uid, [
    'receipts:view',
    'receipts:view_all',
    'receipts:generate',
    'sales:view',
    'sales:create',
    'finance:record_payment',
  ]);

  const input = (request.data || {}) as ReceiptPdfInput;
  if (!input.receiptId) {
    throw new functions.https.HttpsError('invalid-argument', 'receiptId is required.');
  }

  await loadReceiptForCaller(profile, input.receiptId);
  return buildReceiptPdfResponse(input.receiptId, input.forceNewVersion === true);
});

/**
 * Callable: retry a failed PDF generation, optionally producing a new
 * template version.
 */
export const retryReceiptPDF = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  }

  const profile = await requireStaff(request.auth.uid, [
    'receipts:view',
    'receipts:view_all',
    'receipts:generate',
    'sales:view',
    'sales:create',
    'finance:record_payment',
  ]);

  const input = (request.data || {}) as ReceiptPdfInput;
  if (!input.receiptId) {
    throw new functions.https.HttpsError('invalid-argument', 'receiptId is required.');
  }

  await loadReceiptForCaller(profile, input.receiptId);
  return buildReceiptPdfResponse(input.receiptId, input.forceNewVersion === true);
});

interface PaymentReceiptInput {
  idempotencyKey?: string;
  saleId?: string;
  amount?: number;
  amountKobo?: number;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}

/**
 * Callable: record a payment against an existing sale and issue a payment
 * receipt. The sale, customer ledger, payment ledger and receipt are written
 * in a single transaction so balances can never drift.
 */
export const generatePaymentReceipt = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  }

  const profile = await requireStaff(request.auth.uid, [
    'finance:record_payment',
    'sales:create',
    'receipts:create',
  ]);

  const input = (request.data || {}) as PaymentReceiptInput;
  const saleId = String(input.saleId || '').trim();
  const paymentMethod = String(input.paymentMethod || 'cash').trim() || 'cash';
  const amount = money(Number(input.amountKobo ?? input.amount));
  const idempotencyKey = String(input.idempotencyKey || '').trim();

  if (!saleId || !idempotencyKey) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'saleId and idempotencyKey are required.',
    );
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Payment amount must be greater than zero.',
    );
  }

  const issued = lagosMoment();
  const configuration = await loadReceiptConfiguration();
  const saleRef = db.collection(`businesses/${BUSINESS_ID}/sales`).doc(saleId);
  const receiptId = receiptCollectionRef().doc().id;
  const receiptRef = receiptDocumentRef(receiptId);
  const counterRef = receiptCounterRef(issued.year);
  const idempotencyRef = db
    .collection(`businesses/${BUSINESS_ID}/idempotency`)
    .doc(idempotencyDocumentId(`payment-${idempotencyKey}`));
  const paymentId = `pay-${Date.now()}`;

  const result = await db.runTransaction(async (tx) => {
    const idempotencySnap = await tx.get(idempotencyRef);
    if (idempotencySnap.exists) {
      const data = idempotencySnap.data();
      return {
        duplicate: true,
        receiptId: data?.receiptId,
        receiptNumber: data?.receiptNumber,
        paymentId: data?.paymentId,
        saleId,
        balanceDue: data?.balanceDue,
      };
    }

    const saleSnap = await tx.get(saleRef);
    if (!saleSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Sale not found.');
    }
    const sale = saleSnap.data() as Record<string, any>;
    if (sale.status !== 'completed') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Payments can only be recorded against completed sales.',
      );
    }

    const outstanding = Math.max(0, Number(sale.balanceDue ?? 0));
    if (outstanding <= 0) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'This sale has already been fully paid.',
      );
    }
    if (amount > outstanding) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Payment exceeds the outstanding balance on this sale.',
      );
    }

    const customerRef = sale.customerId
      ? db.collection(`businesses/${BUSINESS_ID}/customers`).doc(String(sale.customerId))
      : null;
    const customerSnap = customerRef ? await tx.get(customerRef) : null;
    const counterSnap = await tx.get(counterRef);

    const total = Number(sale.total ?? 0);
    const newAmountPaid = Number(sale.amountPaid ?? 0) + amount;
    const newBalance = Math.max(0, total - newAmountPaid);
    const newSaleStatus = salePaymentStatus(newAmountPaid, total);
    const receiptStatus = receiptPaymentStatus(newAmountPaid, total);
    const sequence = nextSequence(counterSnap.data(), 'payment');
    const receiptNumber = buildReceiptNumber(
      configuration.settings.paymentPrefix,
      issued.year,
      sequence,
    );
    const now = admin.firestore.FieldValue.serverTimestamp();

    tx.update(saleRef, {
      amountPaid: newAmountPaid,
      balanceDue: newBalance,
      paymentStatus: newSaleStatus,
      lastPaymentAt: now,
      updatedAt: now,
    });

    if (customerRef && customerSnap?.exists) {
      const customer = customerSnap.data() as Record<string, any>;
      const totalPurchases = Number(customer.totalPurchases ?? 0);
      const totalPaid = Number(customer.totalPaid ?? 0) + amount;
      tx.update(customerRef, {
        totalPaid,
        balanceDue: Math.max(0, totalPurchases - totalPaid),
        updatedAt: now,
      });
    }

    tx.set(db.collection(`businesses/${BUSINESS_ID}/payments`).doc(paymentId), cleanUndefined({
      id: paymentId,
      businessId: BUSINESS_ID,
      referenceType: 'sale',
      referenceId: saleId,
      customerId: sale.customerId,
      partyName: sale.customerName || DEFAULT_WALK_IN_CUSTOMER,
      amount,
      paymentMethod,
      reference: input.reference,
      direction: 'in',
      recordedBy: profile.uid,
      receiptId,
      receiptNumber,
      idempotencyKey,
      createdAt: now,
    }));

    tx.set(receiptRef, cleanUndefined({
      ...receiptBase({
        receiptId,
        receiptNumber,
        receiptType: 'payment',
        issued,
        businessSnapshot: configuration.snapshot,
        processedBy: profile,
        paymentStatus: receiptStatus,
        customer: customerFromSale(sale),
        saleId,
        saleReceiptNumber: sale.receiptNumber,
        originalReceiptId: sale.receiptId,
        originalReceiptNumber: sale.receiptNumber,
        notes: input.notes,
      }),
      saleId,
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
    }));

    tx.set(counterRef, { payment: sequence, updatedAt: now }, { merge: true });
    tx.set(idempotencyRef, {
      receiptId,
      receiptNumber,
      paymentId,
      saleId,
      balanceDue: newBalance,
      createdAt: now,
    });
    tx.set(db.collection(`businesses/${BUSINESS_ID}/auditLogs`).doc(), {
      businessId: BUSINESS_ID,
      userId: profile.uid,
      action: 'receipt.payment_recorded',
      entityType: 'sale',
      entityId: saleId,
      details: { receiptNumber, amount, paymentMethod, balanceDue: newBalance },
      createdAt: now,
    });

    return {
      duplicate: false,
      receiptId,
      receiptNumber,
      paymentId,
      saleId,
      amountPaid: newAmountPaid,
      balanceDue: newBalance,
      paymentStatus: newSaleStatus,
    };
  });

  return { ok: true, ...result };
});

interface ReturnItemInput {
  productId?: string;
  variantId?: string;
  quantity?: number;
}

interface ReturnReceiptInput {
  idempotencyKey?: string;
  saleId?: string;
  items?: ReturnItemInput[];
  reason?: string;
  refundMethod?: string;
  notes?: string;
}

/**
 * Callable: restock returned items and issue a return receipt linked to the
 * original sale. Item prices always come from the original sale snapshot.
 */
export const generateReturnReceipt = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  }

  const profile = await requireStaff(request.auth.uid, [
    'sales:refund',
    'sales:edit',
    'receipts:refund',
  ]);

  const input = (request.data || {}) as ReturnReceiptInput;
  const saleId = String(input.saleId || '').trim();
  const reason = String(input.reason || '').trim();
  const idempotencyKey = String(input.idempotencyKey || '').trim();
  const refundMethod = String(input.refundMethod || 'cash').trim() || 'cash';
  const requestedItems = Array.isArray(input.items) ? input.items : [];

  if (!saleId || !idempotencyKey) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'saleId and idempotencyKey are required.',
    );
  }
  if (!reason) {
    throw new functions.https.HttpsError('invalid-argument', 'A return reason is required.');
  }
  if (!requestedItems.length) {
    throw new functions.https.HttpsError('invalid-argument', 'At least one returned item is required.');
  }
  for (const item of requestedItems) {
    if (!item.productId || !item.variantId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Every returned item needs productId and variantId.',
      );
    }
    if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Returned quantities must be greater than zero.',
      );
    }
  }

  const returnKeys = requestedItems.map((item) => `${item.productId}:${item.variantId}`);
  if (new Set(returnKeys).size !== returnKeys.length) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Each returned variant may only appear once per return.',
    );
  }

  const issued = lagosMoment();
  const configuration = await loadReceiptConfiguration();
  const saleRef = db.collection(`businesses/${BUSINESS_ID}/sales`).doc(saleId);
  const receiptId = receiptCollectionRef().doc().id;
  const receiptRef = receiptDocumentRef(receiptId);
  const counterRef = receiptCounterRef(issued.year);
  const idempotencyRef = db
    .collection(`businesses/${BUSINESS_ID}/idempotency`)
    .doc(idempotencyDocumentId(`return-${idempotencyKey}`));

  const result = await db.runTransaction(async (tx) => {
    const idempotencySnap = await tx.get(idempotencyRef);
    if (idempotencySnap.exists) {
      const data = idempotencySnap.data();
      return {
        duplicate: true,
        receiptId: data?.receiptId,
        receiptNumber: data?.receiptNumber,
        saleId,
        totalRefunded: data?.totalRefunded,
      };
    }

    const saleSnap = await tx.get(saleRef);
    if (!saleSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Sale not found.');
    }
    const sale = saleSnap.data() as Record<string, any>;
    if (sale.status !== 'completed') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Returns can only be recorded against completed sales.',
      );
    }

    const saleItems = Array.isArray(sale.items) ? sale.items : [];
    const alreadyReturned = (sale.returnedQuantities || {}) as Record<string, number>;

    const variantRefs = requestedItems.map((item) =>
      db
        .collection(`businesses/${BUSINESS_ID}/products/${item.productId}/variants`)
        .doc(String(item.variantId)),
    );
    const variantSnaps = await tx.getAll(...variantRefs);
    const customerRef = sale.customerId
      ? db.collection(`businesses/${BUSINESS_ID}/customers`).doc(String(sale.customerId))
      : null;
    const customerSnap = customerRef ? await tx.get(customerRef) : null;
    const counterSnap = await tx.get(counterRef);

    const returnLines: any[] = [];
    const nextReturned = { ...alreadyReturned };
    let totalReturn = 0;

    requestedItems.forEach((requested, index) => {
      const key = `${requested.productId}:${requested.variantId}`;
      const saleItem = saleItems.find(
        (item: any) => `${item.productId}:${item.variantId}` === key,
      );
      if (!saleItem) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'A returned item does not belong to this sale.',
        );
      }

      const quantity = Number(requested.quantity);
      const soldQuantity = Number(saleItem.quantity ?? 0);
      const returnedQuantity = Number(nextReturned[key] ?? 0);
      if (returnedQuantity + quantity > soldQuantity) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Cannot return more than the ${soldQuantity} sold for ${saleItem.productName}.`,
        );
      }

      const variantSnap = variantSnaps[index];
      if (!variantSnap.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          `Variant ${requested.variantId} not found.`,
        );
      }

      const unitPrice = Number(saleItem.unitSellingPrice ?? 0);
      const lineTotal = money(quantity * unitPrice);
      totalReturn += lineTotal;
      nextReturned[key] = returnedQuantity + quantity;

      returnLines.push({
        productId: saleItem.productId,
        productName: saleItem.productName,
        variantId: saleItem.variantId,
        variantName: saleItem.variationName || saleItem.variantName || 'Standard',
        unit: saleItem.unit,
        quantity,
        unitSellingPrice: unitPrice,
        costBasis: Number(saleItem.costBasis ?? 0),
        lineTotal,
        previousQuantity: Number((variantSnap.data() as any)?.quantityOnHand ?? 0),
      });
    });

    if (totalReturn <= 0) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'The return has no monetary value.',
      );
    }

    const sequence = nextSequence(counterSnap.data(), 'return');
    const receiptNumber = buildReceiptNumber(
      configuration.settings.returnPrefix,
      issued.year,
      sequence,
    );
    const now = admin.firestore.FieldValue.serverTimestamp();
    const grossTotal = Number(sale.total ?? 0);
    const returnedTotal = Number(sale.returnedTotalKobo ?? 0) + totalReturn;
    const effectiveTotal = Math.max(0, grossTotal - returnedTotal);
    const newBalance = Math.max(0, effectiveTotal - Number(sale.amountPaid ?? 0));
    const newSaleStatus = salePaymentStatus(Number(sale.amountPaid ?? 0), effectiveTotal);
    const fullyReturned = saleItems.every(
      (item: any) => Number(nextReturned[`${item.productId}:${item.variantId}`] ?? 0) >= Number(item.quantity ?? 0),
    );

    tx.update(saleRef, {
      returnedQuantities: nextReturned,
      returnedTotalKobo: returnedTotal,
      returnStatus: fullyReturned ? 'returned' : 'partially_returned',
      balanceDue: newBalance,
      paymentStatus: newSaleStatus,
      lastReturnAt: now,
      updatedAt: now,
    });

    returnLines.forEach((line, index) => {
      const variantSnap = variantSnaps[index];
      const newQuantity = line.previousQuantity + line.quantity;
      tx.update(variantSnap.ref, { quantityOnHand: newQuantity, updatedAt: now });
      tx.create(db.collection(`businesses/${BUSINESS_ID}/stockMovements`).doc(), {
        businessId: BUSINESS_ID,
        variantId: line.variantId,
        productName: line.productName,
        variantName: line.variantName,
        movementType: 'Customer Return',
        quantityChange: line.quantity,
        quantityBefore: line.previousQuantity,
        quantityAfter: newQuantity,
        referenceType: 'return',
        referenceId: receiptId,
        reason: `Return receipt #${receiptNumber} against #${sale.receiptNumber || saleId}`,
        performedBy: profile.uid,
        createdAt: now,
      });
    });

    if (customerRef && customerSnap?.exists) {
      const customer = customerSnap.data() as Record<string, any>;
      const totalPurchases = Math.max(0, Number(customer.totalPurchases ?? 0) - totalReturn);
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

    tx.set(receiptRef, cleanUndefined({
      ...receiptBase({
        receiptId,
        receiptNumber,
        receiptType: 'return',
        issued,
        businessSnapshot: configuration.snapshot,
        processedBy: profile,
        paymentStatus: 'refunded',
        customer: customerFromSale(sale),
        saleId,
        saleReceiptNumber: sale.receiptNumber,
        originalReceiptId: sale.receiptId,
        originalReceiptNumber: sale.receiptNumber,
        notes: input.notes,
      }),
      saleId,
      customerId: sale.customerId,
      items: receiptItems,
      itemCount: receiptItems.reduce((sum, item) => sum + item.quantity, 0),
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
    }));

    tx.set(counterRef, { return: sequence, updatedAt: now }, { merge: true });
    tx.set(idempotencyRef, {
      receiptId,
      receiptNumber,
      saleId,
      totalRefunded: totalReturn,
      createdAt: now,
    });
    tx.set(db.collection(`businesses/${BUSINESS_ID}/auditLogs`).doc(), {
      businessId: BUSINESS_ID,
      userId: profile.uid,
      action: 'receipt.return_recorded',
      entityType: 'sale',
      entityId: saleId,
      details: { receiptNumber, totalReturn, reason },
      createdAt: now,
    });

    return {
      duplicate: false,
      receiptId,
      receiptNumber,
      saleId,
      totalRefunded: totalReturn,
      balanceDue: newBalance,
    };
  });

  return { ok: true, ...result };
});

interface VoidReceiptInput {
  idempotencyKey?: string;
  saleId?: string;
  reason?: string;
  notes?: string;
}

/**
 * Callable: void a completed sale, restore its stock and issue a void receipt.
 */
export const generateVoidReceipt = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  }

  const profile = await requireStaff(request.auth.uid, [
    'sales:cancel',
    'receipts:void',
  ]);

  const input = (request.data || {}) as VoidReceiptInput;
  const saleId = String(input.saleId || '').trim();
  const reason = String(input.reason || '').trim();
  const idempotencyKey = String(input.idempotencyKey || '').trim();

  if (!saleId || !idempotencyKey) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'saleId and idempotencyKey are required.',
    );
  }
  if (!reason) {
    throw new functions.https.HttpsError('invalid-argument', 'A void reason is required.');
  }

  const issued = lagosMoment();
  const configuration = await loadReceiptConfiguration();
  const saleRef = db.collection(`businesses/${BUSINESS_ID}/sales`).doc(saleId);
  const receiptId = receiptCollectionRef().doc().id;
  const receiptRef = receiptDocumentRef(receiptId);
  const counterRef = receiptCounterRef(issued.year);
  const idempotencyRef = db
    .collection(`businesses/${BUSINESS_ID}/idempotency`)
    .doc(idempotencyDocumentId(`void-${idempotencyKey}`));

  const result = await db.runTransaction(async (tx) => {
    const idempotencySnap = await tx.get(idempotencyRef);
    if (idempotencySnap.exists) {
      const data = idempotencySnap.data();
      return {
        duplicate: true,
        receiptId: data?.receiptId,
        receiptNumber: data?.receiptNumber,
        saleId,
      };
    }

    const saleSnap = await tx.get(saleRef);
    if (!saleSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Sale not found.');
    }
    const sale = saleSnap.data() as Record<string, any>;
    if (sale.status === 'cancelled' || sale.voided === true) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'This sale has already been voided.',
      );
    }
    if (sale.status !== 'completed') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Only completed sales can be voided.',
      );
    }
    if (Number(sale.returnedTotalKobo ?? 0) > 0) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'This sale has recorded returns. Record additional returns instead of voiding it.',
      );
    }

    const saleItems = Array.isArray(sale.items) ? sale.items : [];
    const variantRefs = saleItems.map((item: any) =>
      db
        .collection(`businesses/${BUSINESS_ID}/products/${item.productId}/variants`)
        .doc(String(item.variantId)),
    );
    const variantSnaps = variantRefs.length ? await tx.getAll(...variantRefs) : [];
    const customerRef = sale.customerId
      ? db.collection(`businesses/${BUSINESS_ID}/customers`).doc(String(sale.customerId))
      : null;
    const customerSnap = customerRef ? await tx.get(customerRef) : null;
    const originalReceiptRef = sale.receiptId
      ? receiptDocumentRef(String(sale.receiptId))
      : null;
    const originalReceiptSnap = originalReceiptRef ? await tx.get(originalReceiptRef) : null;
    const counterSnap = await tx.get(counterRef);

    const sequence = nextSequence(counterSnap.data(), 'void');
    const receiptNumber = buildReceiptNumber(
      configuration.settings.voidPrefix,
      issued.year,
      sequence,
    );
    const now = admin.firestore.FieldValue.serverTimestamp();

    variantSnaps.forEach((snap, index) => {
      const saleItem = saleItems[index];
      if (!snap.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          `Variant ${saleItem.variantId} no longer exists.`,
        );
      }
      const previousQuantity = Number((snap.data() as any)?.quantityOnHand ?? 0);
      const newQuantity = previousQuantity + Number(saleItem.quantity ?? 0);
      tx.update(snap.ref, { quantityOnHand: newQuantity, updatedAt: now });
      tx.create(db.collection(`businesses/${BUSINESS_ID}/stockMovements`).doc(), {
        businessId: BUSINESS_ID,
        variantId: saleItem.variantId,
        productName: saleItem.productName,
        variantName: saleItem.variationName || saleItem.variantName,
        movementType: 'Void',
        quantityChange: Number(saleItem.quantity ?? 0),
        quantityBefore: previousQuantity,
        quantityAfter: newQuantity,
        referenceType: 'sale',
        referenceId: saleId,
        reason: `Void receipt #${receiptNumber} — ${reason}`,
        performedBy: profile.uid,
        createdAt: now,
      });
    });

    tx.update(saleRef, {
      status: 'cancelled',
      voided: true,
      voidedAt: now,
      voidReason: reason,
      voidReceiptId: receiptId,
      voidReceiptNumber: receiptNumber,
      balanceDue: 0,
      updatedAt: now,
    });

    if (customerRef && customerSnap?.exists) {
      const customer = customerSnap.data() as Record<string, any>;
      const totalPurchases = Math.max(0, Number(customer.totalPurchases ?? 0) - Number(sale.total ?? 0));
      const totalPaid = Math.max(0, Number(customer.totalPaid ?? 0) - Number(sale.amountPaid ?? 0));
      tx.update(customerRef, {
        totalPurchases,
        totalPaid,
        balanceDue: Math.max(0, totalPurchases - totalPaid),
        updatedAt: now,
      });
    }

    if (originalReceiptRef && originalReceiptSnap?.exists) {
      tx.update(originalReceiptRef, {
        documentStatus: 'voided',
        voidedAt: now,
        voidReason: reason,
        voidReceiptId: receiptId,
        voidReceiptNumber: receiptNumber,
        pdfStatus: 'stale',
        updatedAt: now,
      });
    }

    tx.set(receiptRef, cleanUndefined({
      ...receiptBase({
        receiptId,
        receiptNumber,
        receiptType: 'void',
        issued,
        businessSnapshot: configuration.snapshot,
        processedBy: profile,
        paymentStatus: 'refunded',
        customer: customerFromSale(sale),
        saleId,
        saleReceiptNumber: sale.receiptNumber,
        originalReceiptId: sale.receiptId,
        originalReceiptNumber: sale.receiptNumber,
        notes: input.notes,
      }),
      saleId,
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
    }));

    tx.set(counterRef, { void: sequence, updatedAt: now }, { merge: true });
    tx.set(idempotencyRef, {
      receiptId,
      receiptNumber,
      saleId,
      createdAt: now,
    });
    tx.set(db.collection(`businesses/${BUSINESS_ID}/auditLogs`).doc(), {
      businessId: BUSINESS_ID,
      userId: profile.uid,
      action: 'receipt.sale_voided',
      entityType: 'sale',
      entityId: saleId,
      details: { receiptNumber, voidNumber: receiptNumber, reason },
      createdAt: now,
    });

    return {
      duplicate: false,
      receiptId,
      receiptNumber,
      saleId,
      originalReceiptId: sale.receiptId || null,
    };
  });

  if (!result.duplicate && result.originalReceiptId) {
    await generateReceiptPdfInternal(String(result.originalReceiptId), {
      forceNewVersion: true,
    }).catch((error) => {
      functions.logger.warn('Could not refresh the voided receipt PDF.', error);
    });
  }

  return { ok: true, ...result };
});

/**
 * Firestore trigger: generate the private PDF as soon as any receipt is
 * created by the callable or by the POS checkout transaction.
 */
export const generateReceiptPdfOnCreate = onDocumentCreated(
  'businesses/{businessId}/receipts/{receiptId}',
  async (event) => {
    if (event.params.businessId !== BUSINESS_ID) return;
    const result = await generateReceiptPdfInternal(event.params.receiptId);
    if (result.status === 'failed') {
      functions.logger.error('Receipt PDF generation failed.', {
        receiptId: event.params.receiptId,
        error: result.error,
      });
    }
  },
);
