import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utilities';
import { useAuth } from '@/features/auth';
import { NAV_ITEMS, isNavItemActive, type NavItem } from '@/constants/navigation';

interface MobileBottomNavigationProps {
  onOpenSidebar?: () => void;
}

export function MobileBottomNavigation({ onOpenSidebar }: MobileBottomNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const primary = NAV_ITEMS.flatMap((section) => section.items);

  const dashboardItem = primary.find((item) => item.path === '/app/dashboard');
  const productsItem = primary.find((item) => item.path === '/app/products');
  const sellItem = primary.find((item) => item.path === '/app/sales/new');
  const recordsItem = primary.find((item) => item.path === '/app/sales');

  const tabClass = (isActive: boolean) =>
    cn(
      'flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 transition-colors',
      isActive ? 'text-brand' : 'text-text-secondary hover:text-text-primary',
    );

  const renderTab = (item: NavItem, label: string) => {
    const isActive = isNavItemActive(location.pathname, item);
    return (
      <button
        key={item.path}
        type="button"
        onClick={() => navigate(item.path)}
        className={tabClass(isActive)}
        aria-current={isActive ? 'page' : undefined}
      >
        <item.icon className="h-5 w-5" aria-hidden="true" />
        <span className="text-2xs font-medium leading-none">{label}</span>
      </button>
    );
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch gap-1 border-t border-border bg-surface px-2 lg:hidden print:hidden"
      aria-label="Primary"
    >
      {dashboardItem && renderTab(dashboardItem, 'Home')}
      {productsItem && renderTab(productsItem, 'Products')}

      {sellItem && (
        <button
          type="button"
          onClick={() => navigate(sellItem.path)}
          className="flex flex-1 flex-col items-center justify-center gap-1 px-1"
          aria-label="Open point of sale"
          aria-current={isNavItemActive(location.pathname, sellItem) ? 'page' : undefined}
        >
          <span className="-mt-5 flex h-13 w-13 items-center justify-center rounded-2xl bg-brand text-white shadow-md transition-transform active:scale-95">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="9" cy="20" r="1.6" />
              <circle cx="18" cy="20" r="1.6" />
              <path
                d="M2 3h2.2l2.4 12.2a1.8 1.8 0 0 0 1.8 1.4h8.9a1.8 1.8 0 0 0 1.8-1.4L21 7H5.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-2xs font-bold leading-none text-text-primary">Sell</span>
        </button>
      )}

      {recordsItem && renderTab(recordsItem, 'Records')}

      <button
        type="button"
        onClick={onOpenSidebar}
        className={tabClass(false)}
        aria-label={`More options${user?.name ? ` for ${user.name}` : ''}`}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="text-2xs font-medium leading-none">More</span>
      </button>
    </nav>
  );
}
