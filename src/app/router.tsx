import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicLayout } from '@/pages/public/PublicLayout';
import { HomePage } from '@/pages/public/HomePage';
import { AboutPage } from '@/pages/public/AboutPage';
import { ProductsPage as PublicProductsPage } from '@/pages/public/ProductsPage';
import { ContactPage } from '@/pages/public/ContactPage';
import { RequestQuotePage } from '@/pages/public/RequestQuotePage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { NotFoundPage, UnauthorizedPage } from '@/pages/errors/NotFoundPage';
import { RouteErrorPage } from '@/pages/errors/RouteErrorPage';
import { ROUTES } from '@/constants';
import { DashboardPage } from '@/features/dashboard';
import {
  ProductsPage as MgmtProductsPage,
  CategoriesPage,
  LowStockPage,
  StockHistoryPage,
  NewProductPage,
} from '@/features/products';
import { SalesPage, SalesHistoryPage } from '@/features/sales';
import { ReceiptsPage, ReceiptDetailPage } from '@/features/receipts';
import { PurchasesPage, NewPurchasePage } from '@/features/purchases';
import { SuppliersPage, SupplierDetailPage } from '@/features/suppliers';
import { CustomersPage, CustomerDetailPage } from '@/features/customers';
import { ExpensesPage, NewExpensePage } from '@/features/expenses';
import {
  FinancePage,
  MoneyReceivedPage,
  MoneySpentPage,
  CustomerDebtsPage,
  SupplierDebtsPage,
  CashbookPage,
} from '@/features/finance';
import { EmployeesPage, EmployeePermissionsPage } from '@/features/employees';
import { SettingsPage, AuditLogsPage } from '@/features/settings';
import { HelpPage } from '@/features/help';
import {
  ReportsPage,
  SalesReportPage,
  StockReportPage,
  ProfitReportPage,
  ExpensesReportPage,
  DebtsReportPage,
} from '@/features/reports';
import { PERMISSIONS } from '@/constants';
import { RequireSession, RequirePermission } from './guards';

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'products', element: <PublicProductsPage /> },
      { path: 'products/:productId', element: <PublicProductsPage /> },
      { path: 'categories/:categoryId', element: <PublicProductsPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'request-quote', element: <RequestQuotePage /> },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/app',
    element: (
      <RequireSession>
        <AppLayout />
      </RequireSession>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to={ROUTES.APP_DASHBOARD} replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      {
        path: 'products',
        element: (
          <RequirePermission permission={PERMISSIONS.PRODUCTS_VIEW}>
            <MgmtProductsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'products/new',
        element: (
          <RequirePermission permission={PERMISSIONS.PRODUCTS_CREATE}>
            <NewProductPage />
          </RequirePermission>
        ),
      },
      {
        path: 'products/categories',
        element: (
          <RequirePermission permission={PERMISSIONS.PRODUCTS_VIEW}>
            <CategoriesPage />
          </RequirePermission>
        ),
      },
      {
        path: 'products/low-stock',
        element: (
          <RequirePermission permission={PERMISSIONS.PRODUCTS_VIEW}>
            <LowStockPage />
          </RequirePermission>
        ),
      },
      {
        path: 'products/stock-history',
        element: (
          <RequirePermission permission={PERMISSIONS.PRODUCTS_VIEW}>
            <StockHistoryPage />
          </RequirePermission>
        ),
      },
      {
        path: 'sales',
        element: (
          <RequirePermission permission={PERMISSIONS.SALES_VIEW}>
            <SalesHistoryPage />
          </RequirePermission>
        ),
      },
      {
        path: 'sales/new',
        element: (
          <RequirePermission permission={PERMISSIONS.SALES_CREATE}>
            <SalesPage />
          </RequirePermission>
        ),
      },
      {
        path: 'sales/history',
        element: (
          <RequirePermission permission={PERMISSIONS.SALES_VIEW}>
            <SalesHistoryPage />
          </RequirePermission>
        ),
      },
      {
        path: 'receipts',
        element: (
          <RequirePermission permission={PERMISSIONS.RECEIPTS_VIEW}>
            <ReceiptsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'receipts/:receiptId',
        element: (
          <RequirePermission permission={PERMISSIONS.RECEIPTS_VIEW}>
            <ReceiptDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: 'purchases',
        element: (
          <RequirePermission permission={PERMISSIONS.PURCHASES_VIEW}>
            <PurchasesPage />
          </RequirePermission>
        ),
      },
      {
        path: 'purchases/new',
        element: (
          <RequirePermission permission={PERMISSIONS.PURCHASES_CREATE}>
            <NewPurchasePage />
          </RequirePermission>
        ),
      },
      {
        path: 'suppliers',
        element: (
          <RequirePermission permission={PERMISSIONS.SUPPLIERS_VIEW}>
            <SuppliersPage />
          </RequirePermission>
        ),
      },
      {
        path: 'suppliers/:supplierId',
        element: (
          <RequirePermission permission={PERMISSIONS.SUPPLIERS_VIEW}>
            <SupplierDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: 'customers',
        element: (
          <RequirePermission permission={PERMISSIONS.CUSTOMERS_VIEW}>
            <CustomersPage />
          </RequirePermission>
        ),
      },
      {
        path: 'customers/debts',
        element: (
          <RequirePermission permission={PERMISSIONS.CUSTOMERS_VIEW}>
            <CustomerDebtsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'customers/:customerId',
        element: (
          <RequirePermission permission={PERMISSIONS.CUSTOMERS_VIEW}>
            <CustomerDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: 'expenses',
        element: (
          <RequirePermission permission={PERMISSIONS.EXPENSES_VIEW}>
            <ExpensesPage />
          </RequirePermission>
        ),
      },
      {
        path: 'expenses/new',
        element: (
          <RequirePermission permission={PERMISSIONS.EXPENSES_CREATE}>
            <NewExpensePage />
          </RequirePermission>
        ),
      },
      {
        path: 'expenses/history',
        element: (
          <RequirePermission permission={PERMISSIONS.EXPENSES_VIEW}>
            <ExpensesPage />
          </RequirePermission>
        ),
      },
      {
        path: 'finance',
        element: (
          <RequirePermission permission={PERMISSIONS.FINANCE_VIEW}>
            <FinancePage />
          </RequirePermission>
        ),
      },
      {
        path: 'finance/money-received',
        element: (
          <RequirePermission permission={PERMISSIONS.FINANCE_VIEW}>
            <MoneyReceivedPage />
          </RequirePermission>
        ),
      },
      {
        path: 'finance/money-spent',
        element: (
          <RequirePermission permission={PERMISSIONS.FINANCE_VIEW}>
            <MoneySpentPage />
          </RequirePermission>
        ),
      },
      {
        path: 'finance/customer-debts',
        element: (
          <RequirePermission permission={PERMISSIONS.FINANCE_VIEW}>
            <CustomerDebtsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'finance/supplier-debts',
        element: (
          <RequirePermission permission={PERMISSIONS.FINANCE_VIEW}>
            <SupplierDebtsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'finance/cashbook',
        element: (
          <RequirePermission permission={PERMISSIONS.FINANCE_VIEW}>
            <CashbookPage />
          </RequirePermission>
        ),
      },
      {
        path: 'reports',
        element: (
          <RequirePermission permission={PERMISSIONS.REPORTS_VIEW}>
            <ReportsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'reports/sales',
        element: (
          <RequirePermission permission={PERMISSIONS.REPORTS_VIEW}>
            <SalesReportPage />
          </RequirePermission>
        ),
      },
      {
        path: 'reports/stock',
        element: (
          <RequirePermission permission={PERMISSIONS.REPORTS_VIEW}>
            <StockReportPage />
          </RequirePermission>
        ),
      },
      {
        path: 'reports/profit',
        element: (
          <RequirePermission permission={PERMISSIONS.REPORTS_VIEW}>
            <ProfitReportPage />
          </RequirePermission>
        ),
      },
      {
        path: 'reports/expenses',
        element: (
          <RequirePermission permission={PERMISSIONS.REPORTS_VIEW}>
            <ExpensesReportPage />
          </RequirePermission>
        ),
      },
      {
        path: 'reports/debts',
        element: (
          <RequirePermission permission={PERMISSIONS.REPORTS_VIEW}>
            <DebtsReportPage />
          </RequirePermission>
        ),
      },
      {
        path: 'reports/employees',
        element: (
          <RequirePermission permission={PERMISSIONS.REPORTS_VIEW}>
            <ReportsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'employees',
        element: (
          <RequirePermission permission={PERMISSIONS.EMPLOYEES_VIEW}>
            <EmployeesPage />
          </RequirePermission>
        ),
      },
      {
        path: 'employees/permissions',
        element: (
          <RequirePermission permission={PERMISSIONS.EMPLOYEES_EDIT}>
            <EmployeePermissionsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'settings',
        element: (
          <RequirePermission permission={PERMISSIONS.SETTINGS_VIEW}>
            <SettingsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'settings/audit-logs',
        element: (
          <RequirePermission permission={PERMISSIONS.SETTINGS_VIEW}>
            <AuditLogsPage />
          </RequirePermission>
        ),
      },
      { path: 'help', element: <HelpPage /> },
      { path: 'not-found', element: <NotFoundPage /> },
      { path: 'unauthorized', element: <UnauthorizedPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage />, errorElement: <RouteErrorPage /> },
]);

export { router };
export default router;
