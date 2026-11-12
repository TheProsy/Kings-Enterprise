import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { BUSINESS } from '@/config/business';
import type { Customer, Sale } from '@/types';

const BUSINESS_ID = BUSINESS.id;
const WALK_IN_NAME = 'walk-in customer';
const BATCH_LIMIT = 450;

export interface BackfillCustomersResult {
  salesScanned: number;
  salesLinked: number;
  customersCreated: number;
  customersUpdated: number;
}

interface BackfillGroup {
  name: string;
  phone: string;
  address: string;
  customerId: string;
  isNew: boolean;
  sales: Sale[];
}

function normalizePhone(value?: string) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeName(value?: string) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function hashString(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function backfillCustomerId(key: string) {
  const prefix = key.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40);
  return `backfill_${prefix}_${hashString(key)}`;
}

async function commitOperations(
  operations: Array<{ ref: DocumentReference; data: Record<string, unknown> }>,
) {
  for (let index = 0; index < operations.length; index += BATCH_LIMIT) {
    const batch = writeBatch(db);
    operations.slice(index, index + BATCH_LIMIT).forEach((operation) => {
      batch.set(operation.ref, operation.data, { merge: true });
    });
    await batch.commit();
  }
}

export async function backfillCustomersFromSales(): Promise<BackfillCustomersResult> {
  const [salesSnap, customersSnap] = await Promise.all([
    getDocs(collection(db, `businesses/${BUSINESS_ID}/sales`)),
    getDocs(collection(db, `businesses/${BUSINESS_ID}/customers`)),
  ]);

  const customers = customersSnap.docs.map(
    (entry) => ({ id: entry.id, ...entry.data() }) as Customer,
  );
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const knownCustomerIds = new Set(customerById.keys());
  const byPhone = new Map<string, Customer>();
  const byName = new Map<string, Customer[]>();

  customers.forEach((customer) => {
    const phone = normalizePhone(customer.phone);
    if (phone && !byPhone.has(phone)) byPhone.set(phone, customer);
    const name = normalizeName(customer.name);
    if (!name) return;
    byName.set(name, [...(byName.get(name) ?? []), customer]);
  });

  const sales = salesSnap.docs.map(
    (entry) => ({ id: entry.id, ...entry.data() }) as Sale,
  );
  const groups = new Map<string, BackfillGroup>();

  sales.forEach((sale) => {
    if (sale.customerId && customerById.has(sale.customerId)) return;
    if (sale.voided || sale.status === 'cancelled') return;

    const name = String(sale.customerName || '').trim();
    const phone = String(sale.customerPhone || '').trim();
    const address = String(sale.customerAddress || '').trim();
    const normalizedPhone = normalizePhone(phone);
    const normalizedName = normalizeName(name);
    if (!normalizedPhone && (!normalizedName || normalizedName === WALK_IN_NAME)) {
      return;
    }

    const nameMatches = byName.get(normalizedName);
    const deterministicId = backfillCustomerId(
      normalizedPhone ? `phone:${normalizedPhone}` : `name:${normalizedName}`,
    );
    const existingCustomer =
      (normalizedPhone ? byPhone.get(normalizedPhone) : undefined) ??
      (nameMatches && nameMatches.length === 1 ? nameMatches[0] : undefined) ??
      customerById.get(deterministicId);

    const key = existingCustomer
      ? `customer:${existingCustomer.id}`
      : normalizedPhone
        ? `phone:${normalizedPhone}`
        : `name:${normalizedName}`;

    const group = groups.get(key) ?? {
      name: name || phone,
      phone,
      address,
      customerId: existingCustomer?.id ?? deterministicId,
      isNew: !existingCustomer,
      sales: [],
    };

    if (!group.phone && phone) group.phone = phone;
    if (!group.address && address) group.address = address;
    sale.customerId = group.customerId;
    knownCustomerIds.add(group.customerId);
    group.sales.push(sale);
    groups.set(key, group);
  });

  const now = serverTimestamp();
  const creations: Array<{ ref: DocumentReference; data: Record<string, unknown> }> = [];
  const links: Array<{ ref: DocumentReference; data: Record<string, unknown> }> = [];
  let customersCreated = 0;
  let salesLinked = 0;

  groups.forEach((group) => {
    const customerRef = doc(
      db,
      `businesses/${BUSINESS_ID}/customers/${group.customerId}`,
    );

    if (group.isNew) {
      const data: Record<string, unknown> = {
        id: group.customerId,
        businessId: BUSINESS_ID,
        name: group.name,
        totalPurchases: 0,
        totalPaid: 0,
        balanceDue: 0,
        createdAt: now,
        updatedAt: now,
      };
      if (group.phone) data.phone = group.phone;
      if (group.address) data.address = group.address;
      creations.push({ ref: customerRef, data });
      customersCreated += 1;
    }

    group.sales.forEach((sale) => {
      links.push({
        ref: doc(db, `businesses/${BUSINESS_ID}/sales/${sale.id}`),
        data: { customerId: group.customerId, updatedAt: now },
      });
      salesLinked += 1;
    });
  });

  const totals = new Map<
    string,
    { totalPurchases: number; balanceDue: number }
  >();

  sales.forEach((sale) => {
    if (!sale.customerId || !knownCustomerIds.has(sale.customerId)) return;
    if (sale.voided || sale.status === 'cancelled') return;
    const entry = totals.get(sale.customerId) ?? {
      totalPurchases: 0,
      balanceDue: 0,
    };
    entry.totalPurchases += Math.max(
      0,
      Number(sale.total || 0) - Number(sale.returnedTotalKobo || 0),
    );
    entry.balanceDue += Math.max(0, Number(sale.balanceDue || 0));
    totals.set(sale.customerId, entry);
  });

  const updates: Array<{ ref: DocumentReference; data: Record<string, unknown> }> = [];
  totals.forEach((entry, customerId) => {
    const totalPurchases = Math.max(0, entry.totalPurchases);
    const balanceDue = Math.max(0, entry.balanceDue);
    updates.push({
      ref: doc(db, `businesses/${BUSINESS_ID}/customers/${customerId}`),
      data: {
        totalPurchases,
        totalPaid: Math.max(0, totalPurchases - balanceDue),
        balanceDue,
        updatedAt: now,
      },
    });
  });

  await commitOperations(creations);
  await commitOperations(links);
  await commitOperations(updates);

  return {
    salesScanned: sales.length,
    salesLinked,
    customersCreated,
    customersUpdated: updates.length,
  };
}
