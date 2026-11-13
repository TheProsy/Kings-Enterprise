import {
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  collectionGroup,
  updateDoc,
  serverTimestamp,
  orderBy,
  limit,
  Timestamp,
  runTransaction,
  writeBatch,
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
import { User, Category, Product, ProductVariant, Customer, Supplier, Sale, Purchase, PurchaseItem, Expense, StockMovement, AuditLog, Payment, Settings, Receipt, PaymentMethod } from '@/types';
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
import { normalizeLowStockThreshold } from '@/lib/stock';
import { PAYMENT_METHODS } from '@/constants';
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

const businessCollection = (name: string) =>
  collection(db, `businesses/${BUSINESS_ID}/${name}`);

const businessDoc = (path: string) => doc(db, `businesses/${BUSINESS_ID}/${path}`);

const docsReferencing = async (collectionName: string, referenceId: string) =>
  (
    await getDocs(query(businessCollection(collectionName), where('referenceId', '==', referenceId)))
  ).docs;

/** Audits an owner deletion without blocking the deletion if the log write fails. */
const recordDeletionAudit = async (
  entityType: string,
  entityId: string,
  details: Record<string, unknown> = {},
) => {
  try {
    const id = generateId();
    await setDoc(businessDoc(`auditLogs/${id}`), {
      id,
      businessId: BUSINESS_ID,
      userId: auth.currentUser?.uid ?? 'unknown',
      action: `${entityType}.deleted`,
      entityType,
      entityId,
      details,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Could not write deletion audit log:', error);
  }
};

/** Audits an edit without blocking the write if the log write fails. */
const recordUpdateAudit = async (
  entityType: string,
  entityId: string,
  details: Record<string, unknown> = {},
) => {
  try {
    const id = generateId();
    await setDoc(businessDoc(`auditLogs/${id}`), {
      id,
      businessId: BUSINESS_ID,
      userId: auth.currentUser?.uid ?? 'unknown',
      action: `${entityType}.updated`,
      entityType,
      entityId,
      details,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Could not write update audit log:', error);
  }
};

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

  async deleteEmployee(userId: string) {
    if (auth.currentUser?.uid === userId) {
      throw new Error('CANNOT_DELETE_SELF');
    }

    const userRef = doc(db, `businesses/${BUSINESS_ID}/users/${userId}`);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      throw new Error('EMPLOYEE_NOT_FOUND');
    }

    const employee = snapshot.data() as User;
    await deleteDoc(userRef);
    await recordDeletionAudit('employee', userId, {
      name: employee.name,
      email: employee.email,
      role: employee.role,
    });
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
    catalogueService.invalidate();
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
    catalogueService.invalidate();
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
    catalogueService.invalidate();
    return id;
  },
  async update(id: string, data: Partial<Category>) {
    await updateDoc(doc(db, `businesses/${BUSINESS_ID}/categories/${id}`), { ...data, updatedAt: serverTimestamp() });
    catalogueService.invalidate();
  },
  async deactivate(id: string) {
    await updateDoc(doc(db, `businesses/${BUSINESS_ID}/categories/${id}`), { active: false, updatedAt: serverTimestamp() });
    catalogueService.invalidate();
  },
  async remove(id: string) {
    await deleteDoc(businessDoc(`categories/${id}`));
    catalogueService.invalidate();
    await recordDeletionAudit('category', id);
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
    catalogueService.invalidate();
    return id;
  },
  async update(id: string, data: Partial<Product>) {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );
    await updateDoc(doc(db, `businesses/${BUSINESS_ID}/products/${id}`), { ...payload, updatedAt: serverTimestamp() });
    catalogueService.invalidate();
  },
  async deactivate(id: string) {
    await updateDoc(doc(db, `businesses/${BUSINESS_ID}/products/${id}`), { active: false, updatedAt: serverTimestamp() });
    catalogueService.invalidate();
  },
  async remove(id: string) {
    const variantsSnap = await getDocs(
      collection(db, `businesses/${BUSINESS_ID}/products/${id}/variants`),
    );
    const batch = writeBatch(db);
    variantsSnap.forEach((variantDoc) => batch.delete(variantDoc.ref));
    batch.delete(businessDoc(`products/${id}`));
    await batch.commit();
    catalogueService.invalidate();
    await recordDeletionAudit('product', id, { variants: variantsSnap.size });
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
    catalogueService.invalidate();
    return id;
  },
  async update(productId: string, variantId: string, data: Partial<ProductVariant>) {
    await updateDoc(doc(db, `businesses/${BUSINESS_ID}/products/${productId}/variants/${variantId}`), { ...data, updatedAt: serverTimestamp() });
    catalogueService.invalidate();
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
  async remove(id: string) {
    await deleteDoc(businessDoc(`customers/${id}`));
    await recordDeletionAudit('customer', id);
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
  async remove(id: string) {
    await deleteDoc(businessDoc(`suppliers/${id}`));
    await recordDeletionAudit('supplier', id);
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
  async get(id: string) {
    const snap = await getDoc(doc(db, `businesses/${BUSINESS_ID}/sales/${id}`));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Sale) : null;
  },
  async create(data: Omit<Sale, 'id'>) {
    const id = generateId();
    await setDoc(doc(db, `businesses/${BUSINESS_ID}/sales/${id}`), { ...data, id, createdAt: serverTimestamp() });
    return id;
  },
  /**
   * Owner-only hard delete. Restocks every unit still held by the sale,
   * reverses the customer ledger, and removes the linked receipts,
   * payments and stock movements so no orphan records remain.
   */
  async remove(id: string) {
    const saleRef = businessDoc(`sales/${id}`);
    const receiptDocs = (
      await getDocs(query(businessCollection('receipts'), where('saleId', '==', id)))
    ).docs;
    const paymentDocs = (await docsReferencing('payments', id)).filter(
      (entry) => entry.data().referenceType === 'sale',
    );
    const movementDocs = (
      await Promise.all(
        [id, ...receiptDocs.map((entry) => entry.id)].map((referenceId) =>
          docsReferencing('stockMovements', referenceId),
        ),
      )
    ).flat();

    await runTransaction(db, async (tx) => {
      const saleSnap = await tx.get(saleRef);
      if (!saleSnap.exists()) return;

      const sale = saleSnap.data() as any;
      const items: any[] = Array.isArray(sale.items) ? sale.items : [];
      const returned: Record<string, number> = sale.returnedQuantities || {};
      // Voided sales already restocked their items and reversed the customer
      // ledger, so deleting them only removes the documents.
      const wasVoided = sale.voided === true || sale.status === 'cancelled';
      const variantRefs = items.map((item) =>
        businessDoc(`products/${item.productId}/variants/${item.variantId}`),
      );
      const customerRef = sale.customerId
        ? businessDoc(`customers/${sale.customerId}`)
        : null;
      const variantSnaps = await Promise.all(variantRefs.map((ref) => tx.get(ref)));
      const customerSnap = customerRef ? await tx.get(customerRef) : null;
      const now = serverTimestamp();

      items.forEach((item, index) => {
        if (wasVoided) return;
        const snap = variantSnaps[index];
        if (!snap.exists()) return;
        const returnedQuantity = Number(
          returned[`${item.productId}:${item.variantId}`] ?? 0,
        );
        const restockQuantity = Math.max(
          0,
          Number(item.quantity ?? 0) - returnedQuantity,
        );
        if (restockQuantity === 0) return;
        const currentQuantity = Number((snap.data() as any).quantityOnHand ?? 0);
        tx.update(snap.ref, {
          quantityOnHand: currentQuantity + restockQuantity,
          updatedAt: now,
        });
      });

      if (!wasVoided && customerRef && customerSnap?.exists()) {
        const customer = customerSnap.data() as any;
        const netSaleTotal = Math.max(
          0,
          Number(sale.total ?? 0) - Number(sale.returnedTotalKobo ?? 0),
        );
        const totalPurchases = Math.max(
          0,
          Number(customer.totalPurchases ?? 0) - netSaleTotal,
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

      tx.delete(saleRef);
      receiptDocs.forEach((entry) => tx.delete(entry.ref));
      paymentDocs.forEach((entry) => tx.delete(entry.ref));
      movementDocs.forEach((entry) => tx.delete(entry.ref));
    });

    await recordDeletionAudit('sale', id);
    catalogueService.invalidate();
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
  /**
   * Corrects a recorded purchase: re-applies stock quantities and unit costs,
   * rebuilds its stock movements, and reconciles the supplier ledger.
   */
  async update(
    id: string,
    input: {
      items: PurchaseItem[];
      additionalCosts: number;
      amountPaid: number;
      paymentMethod?: string;
      notes?: string;
    },
  ) {
    const purchaseRef = businessDoc(`purchases/${id}`);
    const oldMovementDocs = await docsReferencing('stockMovements', id);

    await runTransaction(db, async (tx) => {
      const purchaseSnap = await tx.get(purchaseRef);
      if (!purchaseSnap.exists()) throw new Error('Purchase not found.');
      const purchase = purchaseSnap.data() as any;
      if (purchase.status === 'cancelled') {
        throw new Error('Cancelled purchases cannot be edited.');
      }

      const oldItems: any[] = Array.isArray(purchase.items) ? purchase.items : [];
      const newItems: PurchaseItem[] = input.items.map((item) => {
        if (!item.productId || !item.variantId) {
          throw new Error('Invalid purchase item.');
        }
        if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
          throw new Error(`Invalid quantity for ${item.productName}.`);
        }
        if (!Number.isFinite(item.unitCostPrice) || item.unitCostPrice < 0) {
          throw new Error(`Invalid cost price for ${item.productName}.`);
        }
        return {
          productId: item.productId,
          productName: item.productName,
          variantId: item.variantId,
          variantName: item.variantName,
          unit: item.unit,
          quantity: item.quantity,
          unitCostPrice: item.unitCostPrice,
          lineTotal: money(item.quantity * item.unitCostPrice),
        };
      });

      if (newItems.length === 0) {
        throw new Error('A purchase must contain at least one item.');
      }
      const newKeys = newItems.map((item) => `${item.productId}:${item.variantId}`);
      if (new Set(newKeys).size !== newKeys.length) {
        throw new Error('Each product variant may only appear once per purchase.');
      }

      const variantKeys = [
        ...new Set([
          ...oldItems.map((item) => `${item.productId}:${item.variantId}`),
          ...newKeys,
        ]),
      ];
      const variantRefs = variantKeys.map((key) => {
        const [productId, variantId] = key.split(':');
        return businessDoc(`products/${productId}/variants/${variantId}`);
      });
      const variantSnaps = await Promise.all(variantRefs.map((ref) => tx.get(ref)));
      const variants = new Map<
        string,
        { ref: ReturnType<typeof businessDoc>; snap: any }
      >();
      variantKeys.forEach((key, index) => {
        variants.set(key, { ref: variantRefs[index], snap: variantSnaps[index] });
      });

      const supplierRef = purchase.supplierId
        ? businessDoc(`suppliers/${purchase.supplierId}`)
        : null;
      const supplierSnap = supplierRef ? await tx.get(supplierRef) : null;
      const now = serverTimestamp();

      const oldByKey = new Map(
        oldItems.map((item) => [`${item.productId}:${item.variantId}`, item]),
      );
      const newByKey = new Map(
        newItems.map((item) => [`${item.productId}:${item.variantId}`, item]),
      );

      const quantityAfterByKey = new Map<string, number>();
      variantKeys.forEach((key) => {
        const entry = variants.get(key);
        if (!entry || !entry.snap.exists()) return;
        const oldItem = oldByKey.get(key);
        const newItem = newByKey.get(key);
        const delta = Number(newItem?.quantity ?? 0) - Number(oldItem?.quantity ?? 0);
        const currentQuantity = Number((entry.snap.data() as any).quantityOnHand ?? 0);
        const quantityAfter = Math.max(0, currentQuantity + delta);
        quantityAfterByKey.set(key, quantityAfter);
        const update: Record<string, unknown> = {
          quantityOnHand: quantityAfter,
          updatedAt: now,
        };
        if (newItem) update.costPrice = newItem.unitCostPrice;
        tx.update(entry.ref, update);
      });

      oldMovementDocs.forEach((entry) => tx.delete(entry.ref));
      newItems.forEach((item) => {
        const key = `${item.productId}:${item.variantId}`;
        const entry = variants.get(key);
        if (!entry || !entry.snap.exists()) return;
        const quantityAfter = quantityAfterByKey.get(key) ?? 0;
        tx.set(doc(collection(db, `businesses/${BUSINESS_ID}/stockMovements`)), {
          businessId: BUSINESS_ID,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          movementType: 'Purchase',
          quantityChange: item.quantity,
          quantityBefore: Math.max(0, quantityAfter - item.quantity),
          quantityAfter,
          referenceType: 'purchase',
          referenceId: id,
          reason: `Stock receipt ${purchase.purchaseNumber ?? id.slice(0, 6)} from ${
            purchase.supplierName || 'supplier'
          } (edited)`,
          performedBy: purchase.employeeId,
          createdAt: now,
        });
      });

      const subtotal = newItems.reduce((sum, item) => sum + item.lineTotal, 0);
      const additionalCosts = Math.max(0, money(Number(input.additionalCosts) || 0));
      const total = subtotal + additionalCosts;
      const amountPaid = Math.max(0, Math.min(money(Number(input.amountPaid) || 0), total));
      const balanceDue = Math.max(0, total - amountPaid);

      if (supplierRef && supplierSnap?.exists()) {
        const supplier = supplierSnap.data() as any;
        const totalPurchases = Math.max(
          0,
          Number(supplier.totalPurchases ?? 0) - Number(purchase.total ?? 0) + total,
        );
        const totalPaid = Math.max(
          0,
          Number(supplier.totalPaid ?? 0) - Number(purchase.amountPaid ?? 0) + amountPaid,
        );
        tx.update(supplierRef, {
          totalPurchases,
          totalPaid,
          balanceDue: Math.max(0, totalPurchases - totalPaid),
          updatedAt: now,
        });
      }

      tx.update(
        purchaseRef,
        stripUndefined({
          items: newItems,
          subtotal,
          additionalCosts,
          total,
          amountPaid,
          balanceDue,
          paymentStatus: amountPaid >= total ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid',
          paymentMethod: input.paymentMethod,
          notes: input.notes,
          updatedAt: now,
        }),
      );
    });

    await recordUpdateAudit('purchase', id, {
      items: input.items.length,
      additionalCosts: input.additionalCosts,
      amountPaid: input.amountPaid,
    });
    catalogueService.invalidate();
  },
  /**
   * Owner-only hard delete. Reverses the stock intake, reduces the supplier
   * ledger, and removes the purchase's stock movements.
   */
  async remove(id: string) {
    const purchaseRef = businessDoc(`purchases/${id}`);
    const movementDocs = await docsReferencing('stockMovements', id);

    await runTransaction(db, async (tx) => {
      const purchaseSnap = await tx.get(purchaseRef);
      if (!purchaseSnap.exists()) return;

      const purchase = purchaseSnap.data() as any;
      const items: any[] = Array.isArray(purchase.items) ? purchase.items : [];
      const variantRefs = items.map((item) =>
        businessDoc(`products/${item.productId}/variants/${item.variantId}`),
      );
      const supplierRef = purchase.supplierId
        ? businessDoc(`suppliers/${purchase.supplierId}`)
        : null;
      const variantSnaps = await Promise.all(variantRefs.map((ref) => tx.get(ref)));
      const supplierSnap = supplierRef ? await tx.get(supplierRef) : null;
      const now = serverTimestamp();

      items.forEach((item, index) => {
        const snap = variantSnaps[index];
        if (!snap.exists()) return;
        const currentQuantity = Number((snap.data() as any).quantityOnHand ?? 0);
        tx.update(snap.ref, {
          quantityOnHand: Math.max(0, currentQuantity - Number(item.quantity ?? 0)),
          updatedAt: now,
        });
      });

      if (supplierRef && supplierSnap?.exists()) {
        const supplier = supplierSnap.data() as any;
        const totalPurchases = Math.max(
          0,
          Number(supplier.totalPurchases ?? 0) - Number(purchase.total ?? 0),
        );
        const totalPaid = Math.max(
          0,
          Number(supplier.totalPaid ?? 0) - Number(purchase.amountPaid ?? 0),
        );
        tx.update(supplierRef, {
          totalPurchases,
          totalPaid,
          balanceDue: Math.max(0, totalPurchases - totalPaid),
          updatedAt: now,
        });
      }

      tx.delete(purchaseRef);
      movementDocs.forEach((entry) => tx.delete(entry.ref));
    });

    await recordDeletionAudit('purchase', id);
    catalogueService.invalidate();
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
  async update(
    id: string,
    data: Partial<
      Pick<Expense, 'description' | 'category' | 'amount' | 'paymentMethod' | 'notes' | 'receiptUrl'>
    > & { createdAt?: Date },
  ) {
    const payload: Record<string, unknown> = {
      ...stripUndefined(data as Record<string, unknown>),
      updatedAt: serverTimestamp(),
    };
    if (data.createdAt) {
      payload.createdAt = Timestamp.fromDate(data.createdAt);
    } else {
      delete payload.createdAt;
    }
    await updateDoc(businessDoc(`expenses/${id}`), payload);
    await recordUpdateAudit('expense', id, {
      ...data,
      createdAt: data.createdAt?.toISOString(),
    });
  },
  async remove(id: string) {
    await deleteDoc(businessDoc(`expenses/${id}`));
    await recordDeletionAudit('expense', id);
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
    customerPhone?: string;
    customerAddress?: string;
    employeeId: string;
    employeeName: string;
    notes?: string;
  }) {
    const result = await createSaleReceipt(input);
    catalogueService.invalidate();
    return result;
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

    const result = await runTransaction(db, async (tx) => {
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
        paymentMethod: input.paymentMethod,
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

    catalogueService.invalidate();
    return result;
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
  /**
   * Corrects a recorded payment and reconciles the linked sale, customer or
   * supplier ledger by the difference between the old and new amount.
   */
  async update(id: string, input: { amount: number; paymentMethod?: string }) {
    const paymentRef = businessDoc(`payments/${id}`);
    const amount = money(Number(input.amount) || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Amount must be greater than zero.');
    }

    await runTransaction(db, async (tx) => {
      const paymentSnap = await tx.get(paymentRef);
      if (!paymentSnap.exists()) throw new Error('Payment not found.');
      const payment = paymentSnap.data() as any;
      const oldAmount = Number(payment.amount ?? 0);
      const delta = amount - oldAmount;
      const now = serverTimestamp();

      if (payment.referenceType === 'sale') {
        const saleRef = businessDoc(`sales/${payment.referenceId}`);
        const saleSnap = await tx.get(saleRef);
        if (!saleSnap.exists()) throw new Error('The linked sale was not found.');
        const sale = saleSnap.data() as any;
        if (sale.status !== 'completed') {
          throw new Error('Payments on voided or cancelled sales cannot be edited.');
        }
        const total = Number(sale.total ?? 0);
        const newAmountPaid = Math.max(0, Number(sale.amountPaid ?? 0) + delta);
        if (newAmountPaid > total) {
          throw new Error('The updated payment exceeds the sale total.');
        }
        tx.update(saleRef, {
          amountPaid: newAmountPaid,
          balanceDue: Math.max(0, total - newAmountPaid),
          paymentStatus:
            newAmountPaid >= total ? 'paid' : newAmountPaid > 0 ? 'partial' : 'unpaid',
          updatedAt: now,
        });

        if (sale.customerId) {
          const customerRef = businessDoc(`customers/${sale.customerId}`);
          const customerSnap = await tx.get(customerRef);
          if (customerSnap.exists()) {
            const customer = customerSnap.data() as any;
            const totalPurchases = Number(customer.totalPurchases ?? 0);
            const totalPaid = Math.max(0, Number(customer.totalPaid ?? 0) + delta);
            tx.update(customerRef, {
              totalPaid,
              balanceDue: Math.max(0, totalPurchases - totalPaid),
              updatedAt: now,
            });
          }
        }
      } else if (payment.referenceType === 'customer' || payment.referenceType === 'supplier') {
        const collectionName =
          payment.referenceType === 'customer' ? 'customers' : 'suppliers';
        const partyRef = businessDoc(`${collectionName}/${payment.referenceId}`);
        const partySnap = await tx.get(partyRef);
        if (!partySnap.exists()) {
          throw new Error('The linked customer or supplier was not found.');
        }
        const party = partySnap.data() as any;
        const totalPurchases = Number(party.totalPurchases ?? 0);
        const totalPaid = Math.max(0, Number(party.totalPaid ?? 0) + delta);
        if (totalPaid > totalPurchases) {
          throw new Error('The updated payment exceeds the outstanding balance.');
        }
        tx.update(partyRef, {
          totalPaid,
          balanceDue: Math.max(0, totalPurchases - totalPaid),
          updatedAt: now,
        });
      } else {
        throw new Error('This payment cannot be edited.');
      }

      tx.update(
        paymentRef,
        stripUndefined({
          amount,
          paymentMethod: input.paymentMethod,
          updatedAt: now,
        }),
      );
      tx.set(doc(collection(db, `businesses/${BUSINESS_ID}/auditLogs`)), {
        businessId: BUSINESS_ID,
        userId: auth.currentUser?.uid ?? 'unknown',
        action: 'payment.updated',
        entityType: 'payment',
        entityId: id,
        details: { oldAmount, amount, paymentMethod: input.paymentMethod },
        createdAt: now,
      });
    });
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

  async remove(receiptId: string) {
    await deleteDoc(businessDoc(`receipts/${receiptId}`));
    await recordDeletionAudit('receipt', receiptId);
  },

  async recordPayment(input: RecordSalePaymentInput) {
    return recordSalePayment(input);
  },

  async createReturn(input: ReturnReceiptInput) {
    const result = await createSaleReturn(input);
    catalogueService.invalidate();
    return result;
  },

  async voidSale(input: VoidReceiptInput) {
    const result = await voidSale(input);
    catalogueService.invalidate();
    return result;
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
  /** Owner-only. Removes the history entry; stock levels are not changed. */
  async remove(movementId: string) {
    await deleteDoc(businessDoc(`stockMovements/${movementId}`));
    await recordDeletionAudit('stockMovement', movementId);
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
  productDescription?: string;
  categoryId?: string;
  categoryName?: string;
  imageUrl?: string;
}

interface CatalogueSnapshot {
  products: Product[];
  categories: Category[];
  items: CatalogueItem[];
  lowStockThreshold: number;
  paymentMethods: PaymentMethod[];
}

const CATALOGUE_CACHE_MS = 60_000;
let catalogueCache: { snapshot: CatalogueSnapshot; expiresAt: number } | null = null;
let catalogueRequest: Promise<CatalogueSnapshot> | null = null;

async function loadCatalogue(): Promise<CatalogueSnapshot> {
  const settingsPromise = auth.currentUser
    ? settingsService.get().catch(() => null)
    : Promise.resolve(null);
  const [products, categories, variantsSnapshot, settings] = await Promise.all([
    productService.list(),
    categoryService.list(),
    getDocs(collectionGroup(db, 'variants')),
    settingsPromise,
  ]);
  const lowStockThreshold = normalizeLowStockThreshold(
    (settings as Settings | null)?.inventory?.lowStockThreshold,
  );
  const paymentFlags: Record<PaymentMethod, boolean> = {
    cash: true,
    transfer: true,
    pos: true,
    mixed: false,
    ...((settings as Settings | null)?.payments as
      | Partial<Record<PaymentMethod, boolean>>
      | undefined),
  };
  const enabledPaymentMethods = PAYMENT_METHODS.filter(
    (method) => paymentFlags[method.value],
  ).map((method) => method.value);
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const productsById = new Map(products.map((product) => [product.id, product]));

  const variants = variantsSnapshot.docs
    .map((entry) => ({ id: entry.id, ...entry.data() } as ProductVariant))
    .filter(
      (variant) =>
        variant.businessId === BUSINESS_ID && variant.active === true,
    );

  const items = variants.flatMap((variant) => {
    const product = productsById.get(variant.productId);
    if (!product) return [];

    return [
      {
        ...variant,
        productName: product.name,
        productDescription: product.description,
        categoryId: product.categoryId,
        categoryName: product.categoryId
          ? categoryNames.get(product.categoryId)
          : undefined,
        imageUrl: product.imageUrl,
      } as CatalogueItem,
    ];
  });

  return {
    products,
    categories,
    items,
    lowStockThreshold,
    paymentMethods:
      enabledPaymentMethods.length > 0 ? enabledPaymentMethods : ['cash'],
  };
}

export const catalogueService = {
  /** Clears the short-lived catalogue cache after products/categories change. */
  invalidate() {
    catalogueCache = null;
  },

  async list(options: { fresh?: boolean } = {}): Promise<CatalogueSnapshot> {
    if (!options.fresh && catalogueCache && catalogueCache.expiresAt > Date.now()) {
      return catalogueCache.snapshot;
    }

    if (!catalogueRequest) {
      catalogueRequest = loadCatalogue().finally(() => {
        catalogueRequest = null;
      });
    }

    try {
      const snapshot = await catalogueRequest;
      catalogueCache = {
        snapshot,
        expiresAt: Date.now() + CATALOGUE_CACHE_MS,
      };
      return snapshot;
    } catch (error) {
      if (catalogueCache) return catalogueCache.snapshot;
      throw error;
    }
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
