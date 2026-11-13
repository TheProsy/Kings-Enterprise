export const ROLES = {
  OWNER: 'owner',
  SALESPERSON: 'salesperson',
  STOCK_MANAGER: 'stock_manager',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Store Owner',
  salesperson: 'Salesperson',
  stock_manager: 'Stock Manager',
};

export const PERMISSIONS = {
  // Products
  PRODUCTS_VIEW: 'products:view',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_EDIT: 'products:edit',
  PRODUCTS_DELETE: 'products:delete',
  PRODUCTS_MANAGE_STOCK: 'products:manage_stock',

  // Sales
  SALES_VIEW: 'sales:view',
  SALES_CREATE: 'sales:create',
  SALES_EDIT: 'sales:edit',
  SALES_CANCEL: 'sales:cancel',
  SALES_REFUND: 'sales:refund',

  // Receipts
  RECEIPTS_VIEW: 'receipts:view',
  RECEIPTS_VIEW_ALL: 'receipts:view_all',
  RECEIPTS_CREATE: 'receipts:create',
  RECEIPTS_GENERATE: 'receipts:generate',
  RECEIPTS_REFUND: 'receipts:refund',
  RECEIPTS_VOID: 'receipts:void',

  // Purchases
  PURCHASES_VIEW: 'purchases:view',
  PURCHASES_CREATE: 'purchases:create',

  // Suppliers
  SUPPLIERS_VIEW: 'suppliers:view',
  SUPPLIERS_CREATE: 'suppliers:create',
  SUPPLIERS_EDIT: 'suppliers:edit',

  // Customers
  CUSTOMERS_VIEW: 'customers:view',
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_EDIT: 'customers:edit',

  // Expenses
  EXPENSES_VIEW: 'expenses:view',
  EXPENSES_CREATE: 'expenses:create',

  // Finance
  FINANCE_VIEW: 'finance:view',
  FINANCE_RECORD_PAYMENT: 'finance:record_payment',

  // Reports
  REPORTS_VIEW: 'reports:view',

  // Employees
  EMPLOYEES_VIEW: 'employees:view',
  EMPLOYEES_CREATE: 'employees:create',
  EMPLOYEES_EDIT: 'employees:edit',
  EMPLOYEES_DEACTIVATE: 'employees:deactivate',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_LABELS: Record<Permission, string> = {
  'products:view': 'View products',
  'products:create': 'Add products',
  'products:edit': 'Edit products',
  'products:delete': 'Delete products',
  'products:manage_stock': 'Manage stock levels',
  'sales:view': 'View sales',
  'sales:create': 'Create sales (POS)',
  'sales:edit': 'Edit sales',
  'sales:cancel': 'Cancel sales',
  'sales:refund': 'Refund sales',
  'receipts:view': 'View own receipts',
  'receipts:view_all': 'View all receipts',
  'receipts:create': 'Create receipts',
  'receipts:generate': 'Generate receipt documents',
  'receipts:refund': 'Refund receipts',
  'receipts:void': 'Void receipts',
  'purchases:view': 'View purchases',
  'purchases:create': 'Receive stock purchases',
  'suppliers:view': 'View suppliers',
  'suppliers:create': 'Add suppliers',
  'suppliers:edit': 'Edit suppliers',
  'customers:view': 'View customers',
  'customers:create': 'Add customers',
  'customers:edit': 'Edit customers',
  'expenses:view': 'View expenses',
  'expenses:create': 'Record expenses',
  'finance:view': 'View finance ledgers',
  'finance:record_payment': 'Record debt payments',
  'reports:view': 'View reports',
  'employees:view': 'View staff',
  'employees:create': 'Add staff',
  'employees:edit': 'Edit staff permissions',
  'employees:deactivate': 'Deactivate staff',
  'settings:view': 'View settings',
  'settings:edit': 'Edit settings',
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.OWNER]: Object.values(PERMISSIONS),
  [ROLES.SALESPERSON]: [
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.RECEIPTS_VIEW,
    PERMISSIONS.RECEIPTS_CREATE,
    PERMISSIONS.RECEIPTS_GENERATE,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.EXPENSES_VIEW,
    PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.FINANCE_RECORD_PAYMENT,
    PERMISSIONS.REPORTS_VIEW,
  ],
  [ROLES.STOCK_MANAGER]: [
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_EDIT,
    PERMISSIONS.PRODUCTS_MANAGE_STOCK,
    PERMISSIONS.PURCHASES_VIEW,
    PERMISSIONS.PURCHASES_CREATE,
    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.SUPPLIERS_CREATE,
    PERMISSIONS.SUPPLIERS_EDIT,
    PERMISSIONS.REPORTS_VIEW,
  ],
};

export const BREAKPOINTS = {
  sm: '320px',
  md: '360px',
  lg: '480px',
  xl: '768px',
  desktop: '1024px',
} as const;

export const CURRENCY = 'NGN';
export const CURRENCY_SYMBOL = '₦';

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Bank Transfer' },
  { value: 'pos', label: 'POS' },
  { value: 'mixed', label: 'Mixed Payment' },
] as const;

export const EXPENSE_CATEGORIES = [
  'Transportation',
  'Loading and Offloading',
  'Staff Salaries',
  'Rent',
  'Electricity',
  'Repairs and Maintenance',
  'Fuel',
  'Business Supplies',
  'Other Expenses',
] as const;

export const STOCK_MOVEMENT_TYPES = [
  'Purchase',
  'Sale',
  'Customer Return',
  'Void',
  'Damage',
  'Adjustment',
  'Opening Stock',
] as const;

export const ROUTES = {
  // Public
  HOME: '/',
  ABOUT: '/about',
  PRODUCTS: '/products',
  PRODUCT_DETAIL: '/products/:productId',
  CATEGORY: '/categories/:categoryId',
  CONTACT: '/contact',
  REQUEST_QUOTE: '/request-quote',
  GUIDES: '/guides',
  GUIDE_DETAIL: '/guides/:slug',
  DELIVERY: '/delivery',
  RETURNS: '/returns',
  PRIVACY: '/privacy',
  TERMS: '/terms',

  // Auth
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',

  // App
  APP_DASHBOARD: '/app/dashboard',
  APP_PRODUCTS: '/app/products',
  APP_PRODUCTS_NEW: '/app/products/new',
  APP_PRODUCT_DETAIL: '/app/products/:productId',
  APP_PRODUCT_EDIT: '/app/products/:productId/edit',
  APP_PRODUCT_CATEGORIES: '/app/products/categories',
  APP_PRODUCT_LOW_STOCK: '/app/products/low-stock',
  APP_PRODUCT_STOCK_HISTORY: '/app/products/stock-history',
  APP_SALES: '/app/sales',
  APP_SALES_NEW: '/app/sales/new',
  APP_SALES_HISTORY: '/app/sales/history',
  APP_SALE_DETAIL: '/app/sales/:saleId',
  APP_SALE_RECEIPT: '/app/sales/:saleId/receipt',
  APP_RECEIPTS: '/app/receipts',
  APP_RECEIPT_DETAIL: '/app/receipts/:receiptId',
  APP_PURCHASES: '/app/purchases',
  APP_PURCHASES_NEW: '/app/purchases/new',
  APP_PURCHASES_HISTORY: '/app/purchases/history',
  APP_PURCHASE_DETAIL: '/app/purchases/:purchaseId',
  APP_SUPPLIERS: '/app/suppliers',
  APP_SUPPLIERS_NEW: '/app/suppliers/new',
  APP_SUPPLIER_DETAIL: '/app/suppliers/:supplierId',
  APP_CUSTOMERS: '/app/customers',
  APP_CUSTOMERS_NEW: '/app/customers/new',
  APP_CUSTOMER_DETAIL: '/app/customers/:customerId',
  APP_CUSTOMER_DEBTS: '/app/customers/debts',
  APP_EXPENSES: '/app/expenses',
  APP_EXPENSES_NEW: '/app/expenses/new',
  APP_EXPENSES_HISTORY: '/app/expenses/history',
  APP_FINANCE: '/app/finance',
  APP_FINANCE_MONEY_RECEIVED: '/app/finance/money-received',
  APP_FINANCE_MONEY_SPENT: '/app/finance/money-spent',
  APP_FINANCE_CUSTOMER_DEBTS: '/app/finance/customer-debts',
  APP_FINANCE_SUPPLIER_DEBTS: '/app/finance/supplier-debts',
  APP_FINANCE_CASHBOOK: '/app/finance/cashbook',
  APP_REPORTS: '/app/reports',
  APP_REPORTS_SALES: '/app/reports/sales',
  APP_REPORTS_STOCK: '/app/reports/stock',
  APP_REPORTS_PROFIT: '/app/reports/profit',
  APP_REPORTS_EXPENSES: '/app/reports/expenses',
  APP_REPORTS_DEBTS: '/app/reports/debts',
  APP_REPORTS_INCOME: '/app/reports/income',
  APP_EMPLOYEES: '/app/employees',
  APP_EMPLOYEES_NEW: '/app/employees/new',
  APP_EMPLOYEE_DETAIL: '/app/employees/:employeeId',
  APP_EMPLOYEE_PERMISSIONS: '/app/employees/permissions',
  APP_SETTINGS: '/app/settings',
  APP_SETTINGS_BUSINESS: '/app/settings/business',
  APP_SETTINGS_RECEIPT: '/app/settings/receipt',
  APP_SETTINGS_INVENTORY: '/app/settings/inventory',
  APP_SETTINGS_PAYMENTS: '/app/settings/payments',
  APP_SETTINGS_APPEARANCE: '/app/settings/appearance',
  APP_SETTINGS_SECURITY: '/app/settings/security',
  APP_SETTINGS_AUDIT_LOGS: '/app/settings/audit-logs',
  APP_HELP: '/app/help',
  UNAUTHORIZED: '/unauthorized',
  NOT_FOUND: '/not-found',
} as const;

export function buildRoute(
  pattern: string,
  params: Record<string, string | number | undefined> = {},
): string {
  return pattern.replace(/:([A-Za-z0-9_]+)/g, (_match, key: string) => {
    const value = params[key];
    return value === undefined || value === null ? '' : encodeURIComponent(String(value));
  });
}
