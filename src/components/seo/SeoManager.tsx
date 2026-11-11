import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import sitePagesData from '@/content/site-pages.json';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME } from '@/config/site';
import { applyNoIndex, applySeo } from '@/lib/seo';

interface RouteSeo {
  title: string;
  description: string;
  type?: 'website' | 'product' | 'article';
}

interface TrustPageMeta {
  path: string;
  seoTitle: string;
  description: string;
}

const TRUST_ROUTES = Object.fromEntries(
  Object.values(sitePagesData as Record<string, TrustPageMeta>).map((page) => [
    page.path,
    { title: page.seoTitle, description: page.description },
  ]),
) as Record<string, RouteSeo>;

const STATIC_ROUTES: Record<string, RouteSeo> = {
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  '/about': {
    title: `About Blessed Kings Enterprises (Kings Building Materials) | Lokoja`,
    description:
      'Learn about Blessed Kings Enterprises, trading as Kings Building Materials in Lokoja, Kogi State. Certified cement, TMT iron rods, roofing, timber and plumbing supplies backed by fair pricing and reliable site delivery.',
  },
  '/products': {
    title: `Building Materials Catalogue & Prices in Lokoja | ${SITE_NAME}`,
    description:
      'Browse live prices for cement, iron rods, roofing sheets, timber, plumbing, paints, nails and tools at Kings Building Materials in Lokoja. Wholesale and retail supply.',
  },
  '/contact': {
    title: `Contact ${SITE_NAME} | Lokoja, Kogi State`,
    description:
      'Call or WhatsApp Kings Building Materials in Lokoja, Kogi State for building material prices, stock checks, bulk orders and site delivery.',
  },
  '/request-quote': {
    title: `Request a Building Materials Quote | ${SITE_NAME}`,
    description:
      'Send your material list to Kings Building Materials for a fast quote. Cement, iron rods, roofing, timber, plumbing and construction tools in Lokoja, Kogi State.',
  },
  '/guides': {
    title: `Building Material Buying Guides | ${SITE_NAME}`,
    description:
      'Practical buying guides for cement, iron rods, roofing, plumbing and construction materials in Lokoja, Kogi State from Kings Building Materials.',
  },
  ...TRUST_ROUTES,
};

const PRIVATE_PREFIXES = [
  '/app',
  '/login',
  '/forgot-password',
  '/unauthorized',
  '/not-found',
];

export function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname !== '/' ? pathname.replace(/\/+$/, '') : '/';

    if (
      PRIVATE_PREFIXES.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      )
    ) {
      applyNoIndex(`Management Portal | ${SITE_NAME}`);
      return;
    }

    const staticMeta = STATIC_ROUTES[path];
    if (staticMeta) {
      applySeo({ ...staticMeta, path });
      return;
    }

    // Guide detail pages set their own article metadata from guide data.
    if (/^\/guides\/[^/]+$/.test(path)) {
      return;
    }

    // Category and product pages set precise metadata from catalogue data.
    if (/^\/(categories|products)\/[^/]+$/.test(path)) {
      return;
    }

    applyNoIndex(
      `Page Not Found | ${SITE_NAME}`,
      'The page you requested could not be found.',
    );
  }, [pathname]);

  return null;
}
