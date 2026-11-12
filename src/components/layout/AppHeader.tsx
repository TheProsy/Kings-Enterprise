import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  LogOut,
  User,
  ChevronDown,
  Sun,
  Moon,
  Store,
  ArrowRight,
  X,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { PERMISSIONS, ROUTES } from '@/constants';
import { useTheme } from '@/contexts/useTheme';
import { cn } from '@/lib/utilities';
import { BUSINESS } from '@/config/business';

interface AppHeaderProps {
  onMenuToggle: () => void;
}

const PAGE_TITLES: Array<[string, string]> = [
  ['/app/sales/new', 'New Sale (POS)'],
  ['/app/sales/history', 'Sales History'],
  ['/app/sales', 'Sales History'],
  ['/app/receipts', 'Receipts'],
  ['/app/products/categories', 'Product Categories'],
  ['/app/products/low-stock', 'Low Stock'],
  ['/app/products/stock-history', 'Stock History'],
  ['/app/products/new', 'Add Product'],
  ['/app/products', 'Products & Stock'],
  ['/app/purchases/new', 'Receive Stock'],
  ['/app/purchases', 'Purchases'],
  ['/app/suppliers', 'Suppliers'],
  ['/app/customers/debts', 'Customer Debts'],
  ['/app/customers', 'Customers'],
  ['/app/expenses/new', 'Record Expense'],
  ['/app/expenses/history', 'Expenses'],
  ['/app/expenses', 'Expenses'],
  ['/app/finance/money-received', 'Money Received'],
  ['/app/finance/money-spent', 'Money Spent'],
  ['/app/finance/customer-debts', 'Customer Debts'],
  ['/app/finance/supplier-debts', 'Supplier Debts'],
  ['/app/finance/cashbook', 'Cashbook'],
  ['/app/finance', 'Money & Finance'],
  ['/app/reports/sales', 'Sales Report'],
  ['/app/reports/stock', 'Stock Report'],
  ['/app/reports/profit', 'Profit & Loss'],
  ['/app/reports/expenses', 'Expenses Report'],
  ['/app/reports/debts', 'Debts Report'],
  ['/app/reports', 'Reports'],
  ['/app/employees/permissions', 'Staff Permissions'],
  ['/app/employees', 'Employees'],
  ['/app/settings/audit-logs', 'Audit Logs'],
  ['/app/settings', 'Settings'],
  ['/app/help', 'Help & Guides'],
  ['/app/dashboard', 'Dashboard'],
];

export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
        setMobileSearchOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (mobileSearchOpen) {
      mobileSearchInputRef.current?.focus();
    }
  }, [mobileSearchOpen]);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  const submitSearch = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const query = searchQuery.trim();
      navigate(query ? `${ROUTES.APP_PRODUCTS}?q=${encodeURIComponent(query)}` : ROUTES.APP_PRODUCTS);
      setMobileSearchOpen(false);
    },
    [navigate, searchQuery],
  );

  const getPageTitle = () => {
    const path = location.pathname;
    const match = PAGE_TITLES.find(([prefix]) => path.startsWith(prefix));
    return match ? match[1] : 'Dashboard';
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface print:hidden">
      <div className="flex h-header items-center justify-between gap-3 px-4 sm:px-6 lg:pl-sidebar">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="-ml-1 rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary lg:hidden"
            onClick={onMenuToggle}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted sm:inline-flex">
              <Store className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              {BUSINESS.shortName}
            </span>
            <span className="hidden text-text-muted sm:inline" aria-hidden="true">
              /
            </span>
            <h1 className="truncate text-sm font-bold tracking-tight text-text-primary sm:text-base">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        <form onSubmit={submitSearch} className="hidden max-w-sm flex-1 md:block">
          <div className="relative w-full">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search materials…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/20"
              aria-label="Search materials"
            />
          </div>
        </form>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary md:hidden"
            aria-label="Search materials"
            aria-expanded={mobileSearchOpen}
          >
            {mobileSearchOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {hasPermission(PERMISSIONS.SALES_CREATE) ? (
            <NavLink
              to={ROUTES.APP_SALES_NEW}
              className="hidden h-10 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-hover sm:inline-flex"
            >
              <span>New Sale</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </NavLink>
          ) : null}

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
            aria-label={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Sun className="h-4 w-4 text-warning" aria-hidden="true" />
            )}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setUserMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 py-1.5 pl-1.5 pr-2 transition-colors hover:bg-surface-3"
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              aria-label="User profile menu"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-xs font-bold text-white">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
              <span className="hidden max-w-[100px] truncate text-sm font-semibold text-text-primary md:inline">
                {user?.name || 'Staff'}
              </span>
              <ChevronDown
                className={cn(
                  'hidden h-3.5 w-3.5 text-text-muted transition-transform sm:block',
                  userMenuOpen && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </button>

            {userMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-60 animate-slide-down rounded-xl border border-border bg-surface py-2 shadow-lg"
              >
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-sm font-bold text-text-primary">
                    {user?.name || 'Store User'}
                  </p>
                  <p className="truncate text-xs capitalize text-text-secondary">
                    {user?.role || 'Staff'}
                  </p>
                </div>

                <div className="py-1">
                  {hasPermission(PERMISSIONS.SETTINGS_VIEW) ? (
                    <NavLink
                      to={ROUTES.APP_SETTINGS}
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
                    >
                      <User className="h-4 w-4" aria-hidden="true" />
                      Account Settings
                    </NavLink>
                  ) : null}
                  <NavLink
                    to={ROUTES.HOME}
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
                  >
                    <Store className="h-4 w-4" aria-hidden="true" />
                    Public Storefront
                  </NavLink>
                </div>

                <div className="border-t border-border pt-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileSearchOpen && (
        <form
          onSubmit={submitSearch}
          className="border-t border-border bg-surface px-4 py-3 md:hidden"
        >
          <div className="relative w-full">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <input
              ref={mobileSearchInputRef}
              type="search"
              placeholder="Search materials…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/20"
              aria-label="Search materials"
            />
          </div>
        </form>
      )}
    </header>
  );
}
