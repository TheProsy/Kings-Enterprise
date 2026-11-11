import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME } from '@/config/site';
import { applyNoIndex, applySeo } from '@/lib/seo';

interface RouteSeo {
  title: string;
  description: string;
  type?: 'website' | 'product' | 'article';
}

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
};

const PRIVATE_PREFIXES = [
  '/app',
  '/login',
  '/forgot-password',
  '/unauthorized',
  '/not-found',
];

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

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

    const categoryMatch = path.match(/^\/categories\/([^/]+)$/);
    if (categoryMatch) {
      const category = titleCase(safeDecode(categoryMatch[1]));
      applySeo({
        title: `${category} in Lokoja | ${SITE_NAME}`,
        description: `Browse ${category.toLowerCase()} prices and availability at ${SITE_NAME} in Lokoja, Kogi State. Request a quote or order by phone and WhatsApp.`,
        path,
      });
      return;
    }

    const productMatch = path.match(/^\/products\/([^/]+)$/);
    if (productMatch) {
      applySeo({
        title: `Building Material Product | ${SITE_NAME}`,
        description: `View product details, current depot pricing and availability at ${SITE_NAME} in Lokoja, Kogi State. Bulk and retail supply with prompt site delivery.`,
        path,
        type: 'product',
      });
      return;
    }

    applyNoIndex(
      `Page Not Found | ${SITE_NAME}`,
      'The page you requested could not be found.',
    );
  }, [pathname]);

  return null;
}
