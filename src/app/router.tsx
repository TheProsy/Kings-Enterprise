import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '@/app/RootLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicLayout } from '@/pages/public/PublicLayout';
import { HomePage } from '@/pages/public/HomePage';
import { AboutPage } from '@/pages/public/AboutPage';
import { ProductsPage as PublicProductsPage } from '@/pages/public/ProductsPage';
import { ContactPage } from '@/pages/public/ContactPage';
import { RequestQuotePage } from '@/pages/public/RequestQuotePage';
import { ContentPage } from '@/pages/public/ContentPage';
import { GuidesPage } from '@/pages/public/GuidesPage';
import { GuideDetailPage } from '@/pages/public/GuideDetailPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { NotFoundPage, UnauthorizedPage } from '@/pages/errors/NotFoundPage';
import { RouteErrorPage } from '@/pages/errors/RouteErrorPage';
import { ROUTES, PERMISSIONS } from '@/constants';
import { RequireSession, RequirePermission } from './guards';

function lazyNamed(
  loader: () => Promise<unknown>,
  name: string,
): LazyExoticComponent<ComponentType> {
  return lazy(async () => {
    const module = (await loader()) as Record<string, ComponentType>;
    return { default: module[name] };
  });
}

const DashboardPage = lazyNamed(() => import('@/features/dashboard'), 'DashboardPage');
const MgmtProductsPage = lazyNamed(() => import('@/features/products'), 'ProductsPage');
const CategoriesPage = lazyNamed(() => import('@/features/products'), 'CategoriesPage');
const LowStockPage = lazyNamed(() => import('@/features/products'), 'LowStockPage');
const StockHistoryPage = lazyNamed(() => import('@/features/products'), 'StockHistoryPage');
const NewProductPage = lazyNamed(() => import('@/features/products'), 'NewProductPage');
const SalesPage = lazyNamed(() => import('@/features/sales'), 'SalesPage');
const SalesHistoryPage = lazyNamed(() => import('@/features/sales'), 'SalesHistoryPage');
const ReceiptsPage = lazyNamed(() => import('@/features/receipts'), 'ReceiptsPage');
const ReceiptDetailPage = lazyNamed(() => import('@/features/receipts'), 'ReceiptDetailPage');
const PurchasesPage = lazyNamed(() => import('@/features/purchases'), 'PurchasesPage');
const NewPurchasePage = lazyNamed(() => import('@/features/purchases'), 'NewPurchasePage');
const SuppliersPage = lazyNamed(() => import('@/features/suppliers'), 'SuppliersPage');
const SupplierDetailPage = lazyNamed(() => import('@/features/suppliers'), 'SupplierDetailPage');
const CustomersPage = lazyNamed(() => import('@/features/customers'), 'CustomersPage');
const CustomerDetailPage = lazyNamed(() => import('@/features/customers'), 'CustomerDetailPage');
const ExpensesPage = lazyNamed(() => import('@/features/expenses'), 'ExpensesPage');
const NewExpensePage = lazyNamed(() => import('@/features/expenses'), 'NewExpensePage');
const FinancePage = lazyNamed(() => import('@/features/finance'), 'FinancePage');
const MoneyReceivedPage = lazyNamed(() => import('@/features/finance'), 'MoneyReceivedPage');
const MoneySpentPage = lazyNamed(() => import('@/features/finance'), 'MoneySpentPage');
const CustomerDebtsPage = lazyNamed(() => import('@/features/finance'), 'CustomerDebtsPage');
const SupplierDebtsPage = lazyNamed(() => import('@/features/finance'), 'SupplierDebtsPage');
const CashbookPage = lazyNamed(() => import('@/features/finance'), 'CashbookPage');
const EmployeesPage = lazyNamed(() => import('@/features/employees'), 'EmployeesPage');
const EmployeePermissionsPage = lazyNamed(
  () => import('@/features/employees'),
  'EmployeePermissionsPage',
);
const SettingsPage = lazyNamed(() => import('@/features/settings'), 'SettingsPage');
const AuditLogsPage = lazyNamed(() => import('@/features/settings'), 'AuditLogsPage');
const HelpPage = lazyNamed(() => import('@/features/help'), 'HelpPage');
const ReportsPage = lazyNamed(() => import('@/features/reports'), 'ReportsPage');
const SalesReportPage = lazyNamed(() => import('@/features/reports'), 'SalesReportPage');
const StockReportPage = lazyNamed(() => import('@/features/reports'), 'StockReportPage');
const ProfitReportPage = lazyNamed(() => import('@/features/reports'), 'ProfitReportPage');
const ExpensesReportPage = lazyNamed(() => import('@/features/reports'), 'ExpensesReportPage');
const DebtsReportPage = lazyNamed(() => import('@/features/reports'), 'DebtsReportPage');
const IncomeReportPage = lazyNamed(() => import('@/features/reports'), 'IncomeReportPage');

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
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
      { path: 'guides', element: <GuidesPage /> },
      { path: 'guides/:slug', element: <GuideDetailPage /> },
      { path: 'delivery', element: <ContentPage pageKey="delivery" /> },
      { path: 'returns', element: <ContentPage pageKey="returns" /> },
      { path: 'privacy', element: <ContentPage pageKey="privacy" /> },
      { path: 'terms', element: <ContentPage pageKey="terms" /> },
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
        element: <Navigate to={ROUTES.APP_FINANCE_CUSTOMER_DEBTS} replace />,
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
          <RequirePermission permission={PERMISSIONS.CUSTOMERS_VIEW}>
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
        path: 'reports/income',
        element: (
          <RequirePermission permission={PERMISSIONS.REPORTS_VIEW}>
            <IncomeReportPage />
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
    ],
  },
]);

export { router };
export default router;
