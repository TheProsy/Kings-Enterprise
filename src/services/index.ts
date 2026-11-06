import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
  orderBy,
  limit,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { deleteApp, initializeApp } from 'firebase/app';
import { auth, db, firebaseConfig } from '@/lib/firebase/config';
import { User, Category, Product, ProductVariant, Customer, Supplier, Sale, Purchase, Expense, StockMovement, AuditLog, Payment, Settings, Receipt } from '@/types';
import {
  createSaleReceipt,
  recordSalePayment,
  createSaleReturn,
  voidSale,
} from '@/lib/receiptIssuing';
import type {
  RecordSalePaymentInput,
  ReturnReceiptInput,
  VoidReceiptInput,
} from '@/lib/receiptIssuing';
import { generateId } from '@/lib/formatters';
import { BUSINESS } from '@/config/business';

export type {
  RecordSalePaymentInput,
  ReturnReceiptInput,
  VoidReceiptInput,
  PaymentReceiptResult,
  ReturnReceiptResult,
  VoidReceiptResult,
} from '@/lib/receiptIssuing';

const BUSINESS_ID = BUSINESS.id;

// Auth service
export const authService = {
  async createEmployee(email: string, password: string, name: string, role: string, permissions: string[]) {
    const normalizedEmail = email.trim().toLowerCase();
    const employeeName = name.trim();
    const secondaryApp = initializeApp(firebaseConfig, `kings-employee-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    let createdAuthUser = false;

    try {
      let uid: string;

      try {
        const credential = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);
        uid = credential.user.uid;
        createdAuthUser = true;
        await updateProfile(credential.user, { displayName: employeeName });
      } catch (error: any) {
        if (error?.code === 'auth/email-already-in-use') {
          try {
            const credential = await signInWithEmailAndPassword(secondaryAuth, normalizedEmail, password);
            uid = credential.user.uid;
          } catch {
            throw new Error('EMPLOYEE_EMAIL_EXISTS');
          }
        } else {
          throw error;
        }
      }

      const profileRef = doc(db, `businesses/${BUSINESS_ID}/users/${uid}`);
      const existingProfile = await getDoc(profileRef);
      if (existingProfile.exists()) {
        throw new Error('EMPLOYEE_PROFILE_EXISTS');
      }

      await setDoc(profileRef, {
        id: uid,
        uid,
        businessId: BUSINESS_ID,
        name: employeeName,
        email: normalizedEmail,
        role,
        permissions,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { ok: true, uid };
    } catch (error) {
      if (createdAuthUser && secondaryAuth.currentUser) {
        await deleteUser(secondaryAuth.currentUser).catch(() => undefined);
      }
      throw error;
    } finally {
      await signOut(secondaryAuth).catch(() => undefined);
      await deleteApp(secondaryApp).catch(() => undefined);
    }
  },

  async updateEmployeePermissions(userId: string, permissions: string[]) {
    const userRef = doc(db, `businesses/${BUSINESS_ID}/users/${userId}`);
    await updateDoc(userRef, { permissions, updatedAt: serverTimestamp() });
  },

  async updatePassword(currentPassword: string, newPassword: string) {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) {
      throw new Error('You must be signed in with an email account.');
    }
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  },

  async deactivateEmployee(userId: string) {
    const userRef = doc(db, `businesses/${BUSINESS_ID}/users/${userId}`);
    await updateDoc(userRef, { active: false, updatedAt: serverTimestamp() });
  },

  async getEmployees() {
    const q = query(collection(db, `businesses/${BUSINESS_ID}/users`));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as User);
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) {
      throw new Error('You must be signed in with an email account.');
    }
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  },
};

// Business settings
export const settingsService = {
  async get() {
    const snap = await getDoc(doc(db, `businesses/${BUSINESS_ID}/settings/main`));
    return snap.exists() ? (snap.data() as Settings) : null;
  },
  async save(
    section: 'general' | 'receipt' | 'inventory' | 'payments' | 'appearance' | 'security',
    values: Record<string, unknown>,
  ) {
    await setDoc(
      doc(db, `businesses/${BUSINESS_ID}/settings/main`),
      {
        id: 'main',
        businessId: BUSINESS_ID,
        [section]: values,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },

  /** Merges one or more settings sections into the stored settings document. */
  async update(sections: Partial<
    Pick<Settings, 'general' | 'receipt' | 'inventory' | 'payments' | 'appearance' | 'security'>
  >) {
    await setDoc(
      doc(db, `businesses/${BUSINESS_ID}/settings/main`),
      {
        id: 'main',
        businessId: BUSINESS_ID,
        ...sections,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },
};

// Category service
export const categoryService = {
  async list() {
    const q = query(
      collection(db, `businesses/${BUSINESS_ID}/categories`),
      where('active', '==', true)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
  },
  async create(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = generateId();
    await setDoc(doc(db, `businesses/${BUSINESS_ID}/categories/${id}`), { ...data, id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return id;
  },
  async update(id: string, data: Partial<Category>) {
    await updateDoc(doc(db, `businesses/${BUSINESS_ID}/categories/${id}`), { ...data, updatedAt: serverTimestamp() });
  },
  async deactivate(id: string) {
    await updateDoc(doc(db, `businesses/${BUSINESS_ID}/categories/${id}`), { active: false, updatedAt: serverTimestamp() });
  },
};

// Product service
export const productService = {
  async list() {
    const q = query(collection(db, `businesses/${BUSINESS_ID}/products`), where('active', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
  },
  async get(id: string) {
    const snap = await getDoc(doc(db, `businesses/${BUSINESS_ID}/products/${id}`));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Product) : null;
  },
  async create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = generateId();
    await setDoc(doc(db, `businesses/${BUSINESS_ID}/products/${id}`), { ...data, id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return id;
  },
  async update(id: string, data: Partial<Product>) {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );
    await updateDoc(doc(db, `businesses/${BUSINESS_ID}/products/${id}`), { ...payload, updatedAt: serverTimestamp() });
  },
  async deactivate(id: string) {
    await updateDoc(doc(db, `businesses/${BUSINESS_ID}/products/${id}`), { active: false, updatedAt: serverTimestamp() });
  },
};

// Variant service
export const variantService = {
  async list(productId: string) {
    const q = query(
      collection(db, `businesses/${BUSINESS_ID}/products/${productId}/variants`),
      where('active', '==', true)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductVariant));
  },
  async create(productId: string, data: Omit<ProductVariant, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = generateId();
    await setDoc(doc(db, `businesses/${BUSINESS_ID}/products/${productId}/variants/${id}`), { ...data, id, productId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return id;
  },
  async update(productId: string, variantId: string, data: Partial<ProductVariant>) {
    await updateDoc(doc(db, `businesses/${BUSINESS_ID}/products/${productId}/variants/${variantId}`), { ...data, updatedAt: serverTimestamp() });
  },
};

// Customer service
export const customerService = {
  async list() {
    const q = query(collection(db, `businesses/${BUSINESS_ID}/customers`));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
  },
  async create(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = generateId();
    await setDoc(doc(db, `businesses/${BUSINESS_ID}/customers/${id}`), { ...data, id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return id;
  },
  async update(id: string, data: Partial<Customer>) {
    await updateDoc(doc(db, `businesses/${BUSINESS_ID}/customers/${id}`), { ...data, updatedAt: serverTimestamp() });
  },
};

// Supplier service
export const supplierService = {
  async list() {
    const q = query(collection(db, `businesses/${BUSINESS_ID}/suppliers`));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier));
  },
  async create(data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = generateId();
    await setDoc(doc(db, `businesses/${BUSINESS_ID}/suppliers/${id}`), { ...data, id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return id;
  },
};

// Sale service
export const saleService = {
  async list() {
    const q = query(
      collection(db, `businesses/${BUSINESS_ID}/sales`),
      orderBy('createdAt', 'desc'),
      limit(250),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale));
  },
  async create(data: Omit<Sale, 'id'>) {
    const id = generateId();
    await setDoc(doc(db, `businesses/${BUSINESS_ID}/sales/${id}`), { ...data, id, createdAt: serverTimestamp() });
    return id;
  },
};

// Purchase service
export const purchaseService = {
  async list() {
    const q = query(
      collection(db, `businesses/${BUSINESS_ID}/purchases`),
      orderBy('createdAt', 'desc'),
      limit(250),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase));
  },
  async create(data: Omit<Purchase, 'id'>) {
    const id = generateId();
    await setDoc(doc(db, `businesses/${BUSINESS_ID}/purchases/${id}`), { ...data, id, createdAt: serverTimestamp() });
    return id;
  },
};

// Expense service
export const expenseService = {
  async list() {
    const q = query(
      collection(db, `businesses/${BUSINESS_ID}/expenses`),
      orderBy('createdAt', 'desc'),
      limit(250),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
  },
  async create(data: Omit<Expense, 'id' | 'createdAt'> & { createdAt?: Date }) {
    const id = generateId();
    await setDoc(doc(db, `businesses/${BUSINESS_ID}/expenses/${id}`), {
      ...data,
      id,
      createdAt: data.createdAt ? Timestamp.fromDate(data.createdAt) : serverTimestamp(),
    });
    return id;
  },
};

const money = (value: number) => Math.round(value);

const stripUndefined = <T extends Record<string, unknown>>(data: T): T =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;

// Checkout operations (sales, stock deduction and receipt numbering run in one
// client-side Firestore transaction; no Cloud Functions required).
export const checkoutService = {
  async createSale(input: {
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
  }) {
    return createSaleReceipt(input);
  },

  async receiveStock(input: {
    idempotencyKey: string;
    items: Array<{
      productId: string;
      productName: string;
      variantId: string;
      variantName: string;
      unit: string;
      quantity: number;
      unitCostPrice: number;
    }>;
    supplierId: string;
    supplierName: string;
    additionalCosts: number;
    amountPaid: number;
    paymentMethod: string;
    employeeId: string;
    employeeName: string;
    notes?: string;
  }) {
    const idempotencyRef = doc(db, `businesses/${BUSINESS_ID}/idempotency/${input.idempotencyKey}`);

    return await runTransaction(db, async (tx) => {
      const idempotencySnap = await tx.get(idempotencyRef);
      if (idempotencySnap.exists()) {
        const data = idempotencySnap.data();
        return {
          ok: true,
          duplicate: true,
          purchase: { purchaseId: data.purchaseId, purchaseNumber: data.purchaseNumber, total: 0, balanceOwed: 0 },
        };
      }

      const variantRefs = input.items.map(
        (item) => doc(db, `businesses/${BUSINESS_ID}/products/${item.productId}/variants/${item.variantId}`),
      );
      const variantSnaps = await Promise.all(variantRefs.map((ref) => tx.get(ref)));

      const suppRef = doc(db, `businesses/${BUSINESS_ID}/suppliers/${input.supplierId}`);
      const suppSnap = await tx.get(suppRef);

      const lineItems: any[] = [];
      let subtotal = 0;

      variantSnaps.forEach((snap: any, index: number) => {
        const item = input.items[index];
        if (!snap.exists) {
          throw new Error(`Variant ${item.variantId} not found.`);
        }
        if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
          throw new Error(`Invalid quantity for ${item.productName}.`);
        }
        if (!Number.isFinite(item.unitCostPrice) || item.unitCostPrice < 0) {
          throw new Error(`Invalid cost price for ${item.productName}.`);
        }
        const variant = snap.data() as any;
        const previousQuantity = Number(variant.quantityOnHand ?? 0);
        const lineTotal = money(item.quantity * item.unitCostPrice);
        subtotal += lineTotal;
        lineItems.push({
          ...item,
          unitCostPrice: item.unitCostPrice,
          lineTotal,
          variantRef: snap.ref,
          previousQuantity,
          newQuantity: previousQuantity + item.quantity,
        });
      });

      const variantKeys = input.items.map((item) => `${item.productId}:${item.variantId}`);
      if (new Set(variantKeys).size !== variantKeys.length) {
        throw new Error('Each product variant may only appear once per purchase.');
      }

      const additionalCosts = Math.max(0, money(Number(input.additionalCosts) || 0));
      const totalCost = subtotal + additionalCosts;
      const amountPaid = Math.max(0, Math.min(money(Number(input.amountPaid) || 0), totalCost));
      const balanceOwed = Math.max(0, totalCost - amountPaid);

      const purchaseId = `pur-${Date.now()}`;
      const purchaseNumber = `PUR-${purchaseId.slice(-6)}`;
      const now = serverTimestamp();

      const purchaseRef = doc(db, `businesses/${BUSINESS_ID}/purchases/${purchaseId}`);
      tx.set(purchaseRef, stripUndefined({
        id: purchaseId,
        businessId: BUSINESS_ID,
        purchaseNumber,
        supplierId: input.supplierId,
        supplierName: input.supplierName,
        employeeId: input.employeeId,
        items: lineItems.map(({ variantRef: _variantRef, previousQuantity: _previousQuantity, newQuantity: _newQuantity, ...rest }) => rest),
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
      }));

      tx.set(idempotencyRef, { purchaseId, purchaseNumber, createdAt: now });

      lineItems.forEach((lineItem) => {
        tx.update(lineItem.variantRef, {
          quantityOnHand: lineItem.newQuantity,
          costPrice: lineItem.unitCostPrice,
          updatedAt: now,
        });
        tx.set(
          doc(collection(db, `businesses/${BUSINESS_ID}/stockMovements`)),
          {
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
          },
        );
      });

      if (suppSnap.exists()) {
        const supplier = suppSnap.data() as any;
        const totalSupplied = Number(supplier.totalPurchases ?? 0) + totalCost;
        const totalPaid = Number(supplier.totalPaid ?? 0) + amountPaid;
        tx.update(suppRef, {
          totalPurchases: totalSupplied,
          totalPaid,
          balanceDue: Math.max(0, totalSupplied - totalPaid),
          updatedAt: now,
        });
      }

      return {
        ok: true,
        duplicate: false,
        purchase: { purchaseId, purchaseNumber, total: totalCost, balanceOwed },
      };
    });
  },

  /** Alias of `receiveStock` used by the purchase entry screens. */
  async createPurchase(input: {
    idempotencyKey: string;
    items: Array<{
      productId: string;
      productName: string;
      variantId: string;
      variantName: string;
      unit: string;
      quantity: number;
      unitCostPrice: number;
    }>;
    supplierId: string;
    supplierName?: string;
    additionalCosts: number;
    amountPaid: number;
    paymentMethod: string;
    employeeId: string;
    employeeName: string;
    notes?: string;
  }) {
    return this.receiveStock({
      ...input,
      supplierName: input.supplierName ?? 'Unknown Supplier',
    });
  },

  async recordPayment(input: {
    idempotencyKey: string;
    partyType: 'customer' | 'supplier';
    partyId: string;
    amount: number;
    paymentMethod: string;
    recordedBy: string;
  }) {
    const idempotencyRef = doc(db, `businesses/${BUSINESS_ID}/idempotency/${input.idempotencyKey}`);
    const collectionName = input.partyType === 'customer' ? 'customers' : 'suppliers';
    const partyRef = doc(db, `businesses/${BUSINESS_ID}/${collectionName}/${input.partyId}`);

    return await runTransaction(db, async (tx) => {
      const idempotencySnap = await tx.get(idempotencyRef);
      if (idempotencySnap.exists()) {
        const data = idempotencySnap.data();
        return { ok: true, duplicate: true, paymentId: data.paymentId, balanceDue: data.balanceDue };
      }

      const partySnap = await tx.get(partyRef);
      if (!partySnap.exists()) {
        throw new Error(`${input.partyType} not found.`);
      }

      const party = partySnap.data() as any;
      const balanceDue = Number(party.balanceDue ?? 0);
      const amount = money(input.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Amount must be greater than zero.');
      }
      if (amount > balanceDue) {
        throw new Error('Payment exceeds the outstanding balance.');
      }

      const now = serverTimestamp();
      const paymentId = `pay-${Date.now()}`;
      const newBalance = Math.max(0, balanceDue - amount);
      const totalPaid = Number(party.totalPaid ?? 0) + amount;

      tx.update(partyRef, { totalPaid, balanceDue: newBalance, updatedAt: now });

      tx.set(doc(collection(db, `businesses/${BUSINESS_ID}/payments`)), stripUndefined({
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
        recordedBy: input.recordedBy,
        idempotencyKey: input.idempotencyKey,
        createdAt: now,
      }));

      tx.set(doc(collection(db, `businesses/${BUSINESS_ID}/auditLogs`)), {
        businessId: BUSINESS_ID,
        userId: input.recordedBy,
        action: 'payment.recorded',
        entityType: input.partyType,
        entityId: input.partyId,
        details: { amount, paymentMethod: input.paymentMethod, balanceDue: newBalance },
        createdAt: now,
      });

      tx.set(idempotencyRef, { paymentId, balanceDue: newBalance, createdAt: now });

      return { ok: true, duplicate: false, paymentId, balanceDue: newBalance };
    });
  },
};

// Recorded customer/supplier payments
export const paymentService = {
  async list() {
    const q = query(
      collection(db, `businesses/${BUSINESS_ID}/payments`),
      orderBy('createdAt', 'desc'),
      limit(250),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
  },
};

// Receipts issued by the client checkout, payment, return and void flows
const toMillis = (value: any): number => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export const receiptService = {
  async list(options: { userId?: string; canViewAll?: boolean } = {}) {
    const receiptsRef = collection(db, `businesses/${BUSINESS_ID}/receipts`);
    const canViewAll = options.canViewAll === true;
    const q =
      canViewAll || !options.userId
        ? query(receiptsRef, orderBy('createdAt', 'desc'), limit(300))
        : query(
            receiptsRef,
            where('processedBy.userId', '==', options.userId),
            limit(300),
          );
    const snap = await getDocs(q);
    const receipts = snap.docs.map((entry) => ({ id: entry.id, ...entry.data() } as Receipt));
    return receipts.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  },

  async get(receiptId: string) {
    const snap = await getDoc(doc(db, `businesses/${BUSINESS_ID}/receipts/${receiptId}`));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Receipt) : null;
  },

  async recordPayment(input: RecordSalePaymentInput) {
    return recordSalePayment(input);
  },

  async createReturn(input: ReturnReceiptInput) {
    return createSaleReturn(input);
  },

  async voidSale(input: VoidReceiptInput) {
    return voidSale(input);
  },
};

// Stock movement history
export const stockService = {
  async listMovements() {
    const q = query(
      collection(db, `businesses/${BUSINESS_ID}/stockMovements`),
      orderBy('createdAt', 'desc'),
      limit(250),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockMovement));
  },
};

// Audit logs
export const auditService = {
  async list() {
    const q = query(
      collection(db, `businesses/${BUSINESS_ID}/auditLogs`),
      orderBy('createdAt', 'desc'),
      limit(250),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
  },
};

// Public catalogue: products joined with their variants
export interface CatalogueItem extends ProductVariant {
  productName: string;
  categoryId?: string;
  categoryName?: string;
  imageUrl?: string;
}

export const catalogueService = {
  async list() {
    const [products, categories] = await Promise.all([
      productService.list(),
      categoryService.list(),
    ]);
    const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

    const variantsByProduct = await Promise.all(
      products.map(async (product) => {
        const variants = await variantService.list(product.id);
        return variants.map((variant) => ({
          ...variant,
          productName: product.name,
          categoryId: product.categoryId,
          categoryName: product.categoryId ? categoryNames.get(product.categoryId) : undefined,
          imageUrl: product.imageUrl,
        } as CatalogueItem));
      }),
    );

    return {
      products,
      categories,
      items: variantsByProduct.flat(),
    };
  },
};

// Website enquiries (public write, staff read)
export interface EnquiryInput {
  type: 'contact' | 'quote';
  name: string;
  phone: string;
  email?: string;
  message: string;
  quantity?: string;
  deliveryLocation?: string;
  productInterest?: string;
}

export const enquiryService = {
  async create(data: EnquiryInput) {
    const id = generateId();
    await setDoc(doc(db, `businesses/${BUSINESS_ID}/enquiries/${id}`), {
      id,
      businessId: BUSINESS_ID,
      ...data,
      status: 'new',
      createdAt: serverTimestamp(),
    });
    return id;
  },
};

export { BUSINESS_ID, BUSINESS };
