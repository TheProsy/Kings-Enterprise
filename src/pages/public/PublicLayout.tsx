import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  MessageCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { BUSINESS } from '@/config/business';
import { cn } from '@/lib/utilities';
import { useTheme } from '@/contexts/useTheme';
import { ROUTES } from '@/constants';
import { BrandLogo } from '@/components/common/BrandLogo';

const CURRENT_YEAR = new Date().getFullYear();

const NAV_ITEMS = [
  { path: ROUTES.HOME, label: 'Home' },
  { path: ROUTES.ABOUT, label: 'About' },
  { path: ROUTES.PRODUCTS, label: 'Products' },
  { path: ROUTES.GUIDES, label: 'Guides' },
  { path: ROUTES.CONTACT, label: 'Contact' },
  { path: ROUTES.REQUEST_QUOTE, label: 'Request a Quote' },
];

export function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-text-primary transition-colors">
      <nav className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <NavLink to={ROUTES.HOME} className="flex min-w-0 items-center gap-2.5">
              <BrandLogo
                variant={theme === 'dark' ? 'white' : 'full'}
                size="md"
                className="h-12 max-w-[210px] sm:max-w-[260px]"
              />
            </NavLink>

            <div className="hidden items-center gap-7 md:flex">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === ROUTES.HOME}
                  className={({ isActive }) =>
                    cn(
                      'relative py-1 text-sm font-semibold transition-colors',
                      isActive
                        ? 'text-brand after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-brand'
                        : 'text-text-secondary hover:text-text-primary',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
                aria-label={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
              >
                {theme === 'light' ? (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Sun className="h-4 w-4 text-warning" aria-hidden="true" />
                )}
              </button>

              <NavLink
                to={ROUTES.LOGIN}
                className="hidden h-10 items-center rounded-lg border border-border bg-surface px-3.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-2 sm:inline-flex"
              >
                Staff Portal
              </NavLink>
              <NavLink
                to={ROUTES.REQUEST_QUOTE}
                className="hidden h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-hover sm:inline-flex"
              >
                Request Quote
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </NavLink>

              <div className="md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((open) => !open)}
                  className="rounded-lg p-2 text-text-primary transition-colors hover:bg-surface-2"
                  aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="animate-slide-down space-y-1 border-t border-border py-3 md:hidden">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === ROUTES.HOME}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                      isActive
                        ? 'bg-brand-soft text-brand-fg'
                        : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <NavLink
                  to={ROUTES.LOGIN}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg border border-border px-3 py-2.5 text-center text-sm font-semibold text-text-primary transition-colors hover:bg-surface-2"
                >
                  Staff Portal
                </NavLink>
                <NavLink
                  to={ROUTES.REQUEST_QUOTE}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Request a Quote
                </NavLink>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-surface text-text-secondary">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-3">
              <NavLink to={ROUTES.HOME} className="inline-block">
                <BrandLogo
                  variant={theme === 'dark' ? 'white' : 'full'}
                  size="sm"
                  className="h-10 max-w-[220px]"
                />
              </NavLink>
              <p className="text-xs leading-relaxed text-text-secondary">
                Premier building materials distributor in Lokoja, Kogi State. Direct certified supply of
                Dangote and BUA cement, standard TMT iron rods, BRC mesh, and roofing.
              </p>
            </div>

            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-primary">
                Quick Navigation
              </h4>
              <ul className="space-y-2">
                <li>
                  <NavLink to={ROUTES.HOME} className="transition-colors hover:text-brand">
                    Home
                  </NavLink>
                </li>
                <li>
                  <NavLink to={ROUTES.ABOUT} className="transition-colors hover:text-brand">
                    About Our Store
                  </NavLink>
                </li>
                <li>
                  <NavLink to={ROUTES.PRODUCTS} className="transition-colors hover:text-brand">
                    Materials Catalogue
                  </NavLink>
                </li>
                <li>
                  <NavLink to={ROUTES.REQUEST_QUOTE} className="transition-colors hover:text-brand">
                    Get a Price Quote
                  </NavLink>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-primary">
                Materials
              </h4>
              <ul className="space-y-2">
                <li>Dangote & BUA Cement</li>
                <li>TMT High-Tensile Iron Rods</li>
                <li>Hardwood Timber & Planks</li>
                <li>Stone Dust & Sharp Sand</li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-primary">
                Guides & Policies
              </h4>
              <ul className="space-y-2">
                <li>
                  <NavLink to={ROUTES.GUIDES} className="transition-colors hover:text-brand">
                    Building Material Guides
                  </NavLink>
                </li>
                <li>
                  <NavLink to={ROUTES.DELIVERY} className="transition-colors hover:text-brand">
                    Delivery & Pickup
                  </NavLink>
                </li>
                <li>
                  <NavLink to={ROUTES.RETURNS} className="transition-colors hover:text-brand">
                    Returns & Damaged Goods
                  </NavLink>
                </li>
                <li>
                  <NavLink to={ROUTES.PRIVACY} className="transition-colors hover:text-brand">
                    Privacy Policy
                  </NavLink>
                </li>
                <li>
                  <NavLink to={ROUTES.TERMS} className="transition-colors hover:text-brand">
                    Terms of Service
                  </NavLink>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-primary">
                Depot Location
              </h4>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <span>{BUSINESS.address}</span>
              </p>
              <a
                href={BUSINESS.phoneHref}
                className="flex items-center gap-2 transition-colors hover:text-brand"
              >
                <Phone className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <span>{BUSINESS.phone}</span>
              </a>
              {BUSINESS.email && (
                <a
                  href={`mailto:${BUSINESS.email}`}
                  className="flex items-center gap-2 transition-colors hover:text-brand"
                >
                  <Mail className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                  <span>{BUSINESS.email}</span>
                </a>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-text-muted sm:flex-row">
            <p>
              © {CURRENT_YEAR} {BUSINESS.name}. All rights reserved.
            </p>
            <p>Kings Building Materials — Lokoja, Kogi State</p>
          </div>
        </div>
      </footer>

      {/* Mobile conversion bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface lg:hidden">
        <a
          href={BUSINESS.phoneHref}
          className="flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-bold text-text-primary transition-colors hover:bg-surface-2"
        >
          <Phone className="h-4 w-4 text-brand" aria-hidden="true" />
          Call Store
        </a>
        <a
          href={BUSINESS.whatsapp}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-2 bg-brand py-3.5 text-sm font-bold text-white"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          WhatsApp
        </a>
      </div>
      <div className="h-[57px] lg:hidden" aria-hidden="true" />
    </div>
  );
}
