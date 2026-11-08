export interface BusinessProfile {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  taxId?: string;
  currency?: string;
  createdAt: any;
  updatedAt: any;
}

export interface User {
  id: string;
  businessId: string;
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: 'owner' | 'salesperson' | 'stock_manager';
  permissions: string[];
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  categoryId?: string;
  description?: string;
  imageUrl?: string;
  hasVariants: boolean;
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface ProductVariant {
  id: string;
  businessId: string;
  productId: string;
  brand?: string;
  attributes: Record<string, string>;
  unit: string;
  costPrice: number; // integer kobo
  sellingPrice: number; // integer kobo
  quantityOnHand: number;
  minimumStock: number;
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface SaleItem {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  brand?: string;
  unit: string;
  quantity: number;
  unitSellingPrice: number; // integer kobo
  costBasis: number; // integer kobo
  lineTotal: number; // integer kobo
}

export interface Sale {
  id: string;
  businessId: string;
  receiptId?: string;
  receiptNumber: string;
  customerId?: string;
  customerPhone?: string;
  customerAddress?: string;
  employeeId: string;
  employeeName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentMethod: string;
  status: 'completed' | 'cancelled' | 'refunded';
  idempotencyKey?: string;
  customerName?: string;
  notes?: string;
  returnedQuantities?: Record<string, number>;
  returnedTotalKobo?: number;
  returnStatus?: 'partially_returned' | 'returned';
  voided?: boolean;
  voidReason?: string;
  voidReceiptId?: string;
  voidReceiptNumber?: string;
  createdAt: any;
  updatedAt?: any;
}

export type ReceiptType = 'sale' | 'payment' | 'return' | 'void';
export type ReceiptDocumentStatus = 'active' | 'voided';
export type ReceiptPaymentStatus = 'paid' | 'partially_paid' | 'unpaid' | 'refunded';

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

export interface ReceiptBusinessSnapshot {
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

export interface ReceiptCustomerSnapshot {
  name: string;
  phone?: string;
  address?: string;
}

export interface ReceiptItem {
  productId: string;
  productName: string;
  variantId: string;
  variationName?: string;
  unit: string;
  quantity: number;
  unitPriceKobo: number;
  unitSellingPrice?: number;
  lineTotalKobo: number;
  lineTotal?: number;
  costBasisKobo?: number;
}

export interface ReceiptPaymentLine {
  method: string;
  label?: string;
  amountKobo: number;
  reference?: string;
}

export interface Receipt {
  id: string;
  businessId: string;
  receiptNumber: string;
  receiptType: ReceiptType;
  documentStatus: ReceiptDocumentStatus;
  paymentStatus: ReceiptPaymentStatus;
  templateVersion?: number;
  customerId?: string;
  customerName?: string;
  customerSnapshot?: ReceiptCustomerSnapshot;
  items?: ReceiptItem[];
  itemCount?: number;
  subtotalKobo?: number;
  discountKobo?: number;
  additionalChargesKobo?: number;
  taxKobo?: number;
  totalKobo: number;
  amountPaidKobo: number;
  balanceDueKobo: number;
  paymentMethod?: string;
  paymentMethods?: ReceiptPaymentLine[];
  paymentReference?: string;
  saleId?: string;
  saleReceiptNumber?: string;
  originalReceiptId?: string;
  originalReceiptNumber?: string;
  originalProcessedByName?: string;
  returnReason?: string;
  voidReason?: string;
  notes?: string;
  businessSnapshot?: ReceiptBusinessSnapshot;
  processedBy?: {
    userId: string;
    displayName: string;
    role?: string;
  };
  issuedAt?: any;
  issuedDateLabel?: string;
  issuedTimeLabel?: string;
  issuedIsoDate?: string;
  issuedYear?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  address?: string;
  totalPurchases: number;
  totalPaid: number;
  balanceDue: number;
  createdAt: any;
  updatedAt: any;
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  address?: string;
  totalPurchases: number;
  totalPaid: number;
  balanceDue: number;
  createdAt: any;
  updatedAt: any;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  brand?: string;
  unit: string;
  quantity: number;
  unitCostPrice: number; // integer kobo
  lineTotal: number; // integer kobo
}

export interface Purchase {
  id: string;
  businessId: string;
  purchaseNumber?: string;
  supplierId: string;
  supplierName?: string;
  employeeId: string;
  items: PurchaseItem[];
  subtotal: number;
  additionalCosts: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod?: string;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  status: 'ordered' | 'received' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface Expense {
  id: string;
  businessId: string;
  description: string;
  category: string;
  amount: number; // integer kobo
  paymentMethod: string;
  receiptUrl?: string;
  notes?: string;
  recordedBy: string;
  createdAt: any;
}

export interface StockMovement {
  id: string;
  businessId: string;
  variantId: string;
  productName?: string;
  variantName?: string;
  movementType: 'Purchase' | 'Sale' | 'Customer Return' | 'Void' | 'Damage' | 'Adjustment' | 'Opening Stock';
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceType: 'sale' | 'purchase' | 'return' | 'adjustment' | 'damage';
  referenceId: string;
  reason?: string;
  performedBy: string;
  createdAt: any;
}

export interface Payment {
  id: string;
  businessId: string;
  referenceType: 'sale' | 'purchase' | 'customer' | 'supplier';
  referenceId: string;
  customerId?: string;
  supplierId?: string;
  partyName?: string;
  amount: number; // integer kobo
  paymentMethod: string;
  direction: 'in' | 'out';
  recordedBy: string;
  idempotencyKey?: string;
  createdAt: any;
}

export interface AuditLog {
  id: string;
  businessId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any>;
  createdAt: any;
}

export interface Settings {
  id: string;
  businessId: string;
  general: Record<string, any>;
  receipt: Record<string, any>;
  inventory: Record<string, any>;
  payments: Record<string, any>;
  appearance: Record<string, any>;
  security: Record<string, any>;
  updatedAt: any;
}

export interface DashboardSummary {
  todaySales: number;
  todayMoneyReceived: number;
  totalProducts: number;
  lowStockProducts: number;
  recentSales: Sale[];
  alerts: string[];
}

export type PaymentMethod = 'cash' | 'transfer' | 'pos' | 'mixed';
