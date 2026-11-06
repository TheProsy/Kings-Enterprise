import { NavLink, useLocation } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/utilities';
import { BUSINESS } from '@/config/business';
import { NAV_ITEMS, isNavItemActive } from '@/constants/navigation';
import { BrandLogo } from '@/components/common/BrandLogo';

interface AppSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function AppSidebar({ isOpen, onToggle }: AppSidebarProps) {
  const { user, hasPermission, logout } = useAuth();
  const location = useLocation();

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-overlay/50 transition-opacity duration-200 lg:hidden print:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onToggle}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-sidebar flex-col border-r border-white/10 bg-brand-800 text-white transition-transform duration-200 ease-out lg:translate-x-0 print:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-header items-center justify-between border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandLogo variant="icon" size="sm" className="h-9 w-9" />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold leading-tight tracking-tight text-white">
                {BUSINESS.shortName}
              </h2>
              <span className="block text-2xs font-medium uppercase tracking-wider text-white/50">
                Management Portal
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV_ITEMS.map((section) => {
            const filteredItems = section.items.filter(
              (item) => !item.permission || hasPermission(item.permission),
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={section.section}>
                <p className="px-3 text-2xs font-bold uppercase tracking-wider text-white/40">
                  {section.section}
                </p>
                <ul className="mt-2 space-y-0.5">
                  {filteredItems.map((item) => {
                    const isActive = isNavItemActive(location.pathname, item);
                    return (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          onClick={onToggle}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-brand font-semibold text-white'
                              : 'text-white/70 hover:bg-white/10 hover:text-white',
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-white transition-opacity',
                              isActive ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center justify-between gap-2 rounded-lg bg-white/5 p-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-brand/40 text-xs font-bold text-white">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold leading-tight text-white">
                  {user?.name || 'User'}
                </p>
                <p className="truncate text-2xs capitalize leading-tight text-white/50">
                  {user?.role || 'Staff'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="shrink-0 rounded-lg p-1.5 text-white/60 transition-colors hover:bg-danger/20 hover:text-danger"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
