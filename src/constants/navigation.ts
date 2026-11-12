import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  BarChart3,
  Settings,
  HelpCircle,
  FileText,
  History,
  ClipboardList,
  AlertTriangle,
  UserCog,
  Receipt,
} from 'lucide-react';
import { ROUTES, PERMISSIONS } from '@/constants';

export interface NavItem {
  path: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  permission?: string | null;
  /**
   * Exact route paths that also mark this item active.
   * Sub-routes are listed explicitly so a parent entry never lights up
   * alongside the child screen that owns the route.
   */
  alsoActive?: string[];
  /** Any path beginning with this value also marks the item active. */
  activePrefix?: string;
}

export interface NavSection {
  section: string;
  items: NavItem[];
}

export const NAV_ITEMS: NavSection[] = [
  {
    section: 'Overview',
    items: [{ path: ROUTES.APP_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    section: 'Inventory',
    items: [
      {
        path: ROUTES.APP_PRODUCTS,
        label: 'Products & Stock',
        icon: Package,
        permission: PERMISSIONS.PRODUCTS_VIEW,
        alsoActive: [ROUTES.APP_PRODUCTS_NEW, ROUTES.APP_PRODUCT_CATEGORIES],
      },
      {
        path: ROUTES.APP_PRODUCT_LOW_STOCK,
        label: 'Low Stock',
        icon: AlertTriangle,
        permission: PERMISSIONS.PRODUCTS_VIEW,
      },
      {
        path: ROUTES.APP_PRODUCT_STOCK_HISTORY,
        label: 'Stock History',
        icon: History,
        permission: PERMISSIONS.PRODUCTS_VIEW,
      },
    ],
  },
  {
    section: 'Sales & Purchases',
    items: [
      {
        path: ROUTES.APP_SALES_NEW,
        label: 'New Sale (POS)',
        shortLabel: 'Sell',
        icon: ShoppingCart,
        permission: PERMISSIONS.SALES_CREATE,
      },
      {
        path: ROUTES.APP_SALES,
        label: 'Sales History',
        icon: FileText,
        permission: PERMISSIONS.SALES_VIEW,
        alsoActive: [ROUTES.APP_SALES_HISTORY],
      },
      {
        path: ROUTES.APP_RECEIPTS,
        label: 'Receipts',
        icon: Receipt,
        permission: PERMISSIONS.RECEIPTS_VIEW,
        activePrefix: ROUTES.APP_RECEIPTS,
      },
      {
        path: ROUTES.APP_PURCHASES,
        label: 'Purchases',
        icon: Truck,
        permission: PERMISSIONS.PURCHASES_VIEW,
        alsoActive: [ROUTES.APP_PURCHASES_NEW],
      },
    ],
  },
  {
    section: 'Partners',
    items: [
      {
        path: ROUTES.APP_SUPPLIERS,
        label: 'Suppliers',
        icon: ClipboardList,
        permission: PERMISSIONS.SUPPLIERS_VIEW,
        alsoActive: [ROUTES.APP_SUPPLIERS_NEW],
        activePrefix: ROUTES.APP_SUPPLIERS,
      },
      {
        path: ROUTES.APP_CUSTOMERS,
        label: 'Customers',
        icon: Users,
        permission: PERMISSIONS.CUSTOMERS_VIEW,
        activePrefix: ROUTES.APP_CUSTOMERS,
      },
    ],
  },
  {
    section: 'Finance & Analytics',
    items: [
      {
        path: ROUTES.APP_EXPENSES,
        label: 'Expenses',
        icon: Wallet,
        permission: PERMISSIONS.EXPENSES_VIEW,
        alsoActive: [ROUTES.APP_EXPENSES_NEW, ROUTES.APP_EXPENSES_HISTORY],
      },
      {
        path: ROUTES.APP_FINANCE,
        label: 'Money & Finance',
        icon: Wallet,
        permission: PERMISSIONS.FINANCE_VIEW,
        alsoActive: [
          ROUTES.APP_FINANCE_MONEY_RECEIVED,
          ROUTES.APP_FINANCE_MONEY_SPENT,
          ROUTES.APP_FINANCE_CUSTOMER_DEBTS,
          ROUTES.APP_FINANCE_SUPPLIER_DEBTS,
          ROUTES.APP_FINANCE_CASHBOOK,
        ],
      },
      {
        path: ROUTES.APP_REPORTS,
        label: 'Reports',
        icon: BarChart3,
        permission: PERMISSIONS.REPORTS_VIEW,
        alsoActive: [
          ROUTES.APP_REPORTS_SALES,
          ROUTES.APP_REPORTS_STOCK,
          ROUTES.APP_REPORTS_PROFIT,
          ROUTES.APP_REPORTS_EXPENSES,
          ROUTES.APP_REPORTS_DEBTS,
        ],
      },
    ],
  },
  {
    section: 'Management',
    items: [
      {
        path: ROUTES.APP_EMPLOYEES,
        label: 'Employees',
        icon: UserCog,
        permission: PERMISSIONS.EMPLOYEES_VIEW,
        alsoActive: [ROUTES.APP_EMPLOYEE_PERMISSIONS],
      },
      {
        path: ROUTES.APP_SETTINGS,
        label: 'Settings',
        icon: Settings,
        permission: PERMISSIONS.SETTINGS_VIEW,
        alsoActive: [ROUTES.APP_SETTINGS_AUDIT_LOGS],
      },
      { path: ROUTES.APP_HELP, label: 'Help & Guides', icon: HelpCircle, permission: null },
    ],
  },
];

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.path) return true;
  if (item.activePrefix && pathname.startsWith(`${item.activePrefix}/`)) return true;
  return item.alsoActive?.includes(pathname) ?? false;
}
