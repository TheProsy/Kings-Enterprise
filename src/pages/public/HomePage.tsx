import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { NavLink, Link } from 'react-router-dom';
import { Hero } from '@/components/ui/Hero';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ProductImage } from '@/components/ui/ProductImage';
import { formatMoney } from '@/lib/formatters';
import { catalogueService, type CatalogueItem } from '@/services';
import { Truck, Package, CreditCard, Users, ChevronRight, BookOpen } from 'lucide-react';
import { ROUTES } from '@/constants';
import { getProductImage, getCategoryImage } from '@/constants/images';
import { GUIDES } from '@/pages/public/GuidesPage';

const FEATURES = [
  {
    title: 'Certified Prime Stock',
    desc: 'Direct factory supply of certified Dangote & BUA cement, standard TMT rebar, and BRC mesh.',
    icon: <Package className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: 'Fair Wholesale & Retail',
    desc: 'Transparent pricing with bulk discounts for construction contractors, builders, and developers.',
    icon: <CreditCard className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: 'Prompt Site Delivery',
    desc: 'Dependable logistics dispatch delivering directly to construction sites throughout Kogi State.',
    icon: <Truck className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: 'Trade Credit Accounts',
    desc: 'Structured supply agreements and flexible credit facilities for registered recurring contractors.',
    icon: <Users className="h-5 w-5" aria-hidden="true" />,
  },
];

interface FeaturedItem {
  key: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  imageUrl?: string;
  href: string;
}

const FALLBACK_FEATURED: FeaturedItem[] = [
  {
    key: 'f1',
    name: 'Dangote 3X Cement 42.5R (50kg)',
    category: 'Cement',
    price: 920000,
    unit: 'bag',
    imageUrl: '/images/products/dangote-cement.jpg',
    href: ROUTES.PRODUCTS,
  },
  {
    key: 'f2',
    name: '12mm TMT High-Tensile Iron Rod (12m)',
    category: 'Iron Rods',
    price: 850000,
    unit: 'length',
    imageUrl: '/images/products/tmt-iron-rods-12mm.jpg',
    href: ROUTES.PRODUCTS,
  },
  {
    key: 'f3',
    name: 'Aluminium Long Span Roofing Sheet 0.45mm',
    category: 'Roofing',
    price: 650000,
    unit: 'metre',
    imageUrl: '/images/products/roofing-sheet-longspan.jpg',
    href: ROUTES.PRODUCTS,
  },
  {
    key: 'f4',
    name: 'Marine Plywood 18mm (4ft x 8ft)',
    category: 'Timber',
    price: 1650000,
    unit: 'sheet',
    imageUrl: '/images/products/marine-plywood-18mm.jpg',
    href: ROUTES.PRODUCTS,
  },
];

const FALLBACK_CATEGORIES: Array<{
  id?: string;
  name: string;
  count: number;
  image?: string;
}> = [
  { name: 'Cement & Aggregates', count: 14, image: '/images/categories/cement.jpg' },
  { name: 'TMT Iron Rods & Steel', count: 18, image: '/images/categories/steel.jpg' },
  { name: 'Hardwood Timber & Boards', count: 12, image: '/images/categories/timber.jpg' },
  { name: 'Roofing Sheets & Ceilings', count: 9, image: '/images/categories/roofing.jpg' },
  { name: 'Plumbing & PVC Pipes', count: 16, image: '/images/categories/plumbing.jpg' },
  { name: 'Wire Mesh & Nails', count: 11, image: '/images/categories/nails-wire.jpg' },
];

export function HomePage() {
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [categories, setCategories] = useState<
    Array<{ id?: string; name: string; count: number; image?: string }>
  >([]);

  useEffect(() => {
    let active = true;
    catalogueService
      .list()
      .then(({ items: catalogueItems, categories: catalogueCategories }) => {
        if (!active) return;
        setItems(catalogueItems);

        const counts = new Map<string, number>();
        catalogueItems.forEach((item) => {
          const name = item.categoryName || 'Other';
          counts.set(name, (counts.get(name) || 0) + 1);
        });
        setCategories(
          catalogueCategories
            .map((category) => ({
              id: category.id,
              name: category.name,
              count: counts.get(category.name) || 0,
              image: getCategoryImage(category.name),
            }))
            .filter((category) => category.count > 0),
        );
      })
      .catch((error) => {
        console.error('Unable to load public catalogue:', error);
      });
    return () => {
      active = false;
    };
  }, []);

  const featured = useMemo<FeaturedItem[]>(() => {
    if (items.length === 0) return FALLBACK_FEATURED;
    return items.slice(0, 4).map((item) => ({
      key: `${item.productId}:${item.id}`,
      name: item.productName,
      category: item.categoryName || 'Building Materials',
      price: item.sellingPrice,
      unit: item.unit,
      imageUrl: item.imageUrl || getProductImage(item.productName, item.categoryName),
      href: `/products/${encodeURIComponent(item.productId)}`,
    }));
  }, [items]);

  const categoryTiles = categories.length > 0 ? categories : FALLBACK_CATEGORIES;

  return (
    <div className="min-h-screen bg-canvas">
      <Hero />

      {/* Value propositions */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Why builders rely on our store"
            description="Serving construction contractors, engineers, and private home builders across Lokoja and surrounding sites."
            align="center"
            className="mx-auto mb-12 max-w-2xl"
          />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                variant="soft"
                className="p-6 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-soft text-brand-fg">
                  {feature.icon}
                </div>
                <h3 className="mb-1.5 text-base font-bold text-text-primary">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-text-secondary">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Category directory */}
      <section className="bg-brand-800 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-5">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-300">
                Comprehensive Inventory
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Shop by material category
              </h2>
              <p className="text-sm leading-relaxed text-white/75">
                Everything required from excavation and foundation casting through block
                laying, decking and roof trusses — with complete transparency on current
                daily rates.
              </p>
              <div className="pt-2">
                <NavLink
                  to={ROUTES.PRODUCTS}
                  className="inline-flex h-12 items-center gap-2 rounded-lg bg-brand px-6 text-sm font-bold text-white shadow-md transition-colors hover:bg-brand-hover"
                >
                  <span>Explore Full Catalogue</span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </NavLink>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:col-span-7">
              {categoryTiles.map((category) => (
                <NavLink
                  key={category.name}
                  to={
                    category.id
                      ? `/categories/${encodeURIComponent(category.id)}`
                      : `${ROUTES.PRODUCTS}?category=${encodeURIComponent(category.name)}`
                  }
                  className="group relative flex min-h-[130px] flex-col justify-end overflow-hidden rounded-xl border border-white/15 bg-brand-950 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300/80 hover:shadow-xl"
                >
                  <img
                    src={category.image || getCategoryImage(category.name)}
                    alt={category.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 filter brightness-[0.5] contrast-[1.05]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-950/95 via-brand-950/50 to-transparent" />
                  <div className="relative z-10">
                    <p className="line-clamp-1 text-sm font-bold text-white drop-shadow-sm group-hover:text-brand-300 transition-colors">
                      {category.name}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-white/70">
                      {category.count} materials
                    </p>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured products */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
                Current stock in high demand
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Real-time pricing for verified builder materials.
              </p>
            </div>
            <NavLink
              to={ROUTES.PRODUCTS}
              className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline"
            >
              <span>View All Inventory</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </NavLink>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <Card
                key={product.key}
                variant="soft"
                className="flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative">
                  <Link
                    to={product.href}
                    aria-label={`View ${product.name}`}
                    className="block"
                  >
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="aspect-[4/3] w-full rounded-none"
                    />
                  </Link>
                  <div className="absolute left-3 top-3">
                    <Badge variant="default" size="sm">
                      {product.category}
                    </Badge>
                  </div>
                </div>

                <CardContent className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <h3 className="line-clamp-2 text-base font-bold leading-snug text-text-primary">
                      <Link to={product.href}>
                        {product.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-xs text-text-muted">Sold per {product.unit}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                    <span className="text-lg font-extrabold tabular-nums text-text-primary">
                      {product.price > 0 ? formatMoney(product.price) : 'Price on request'}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <NavLink to={`${ROUTES.REQUEST_QUOTE}?product=${encodeURIComponent(product.name)}`}>
                        Get Quote
                      </NavLink>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Buying guides */}
      <section className="border-t border-border bg-surface-2 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Buying guides
              </div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
                Plan your materials before you buy
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Practical advice on cement grades, iron rod sizes, quantity estimates, roofing
                and delivery in Lokoja.
              </p>
            </div>
            <NavLink
              to={ROUTES.GUIDES}
              className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline"
            >
              <span>All guides</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </NavLink>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {GUIDES.slice(0, 3).map((guide) => (
              <Card key={guide.slug} variant="interactive" className="flex flex-col p-6">
                <p className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
                  {guide.readingTime}
                </p>
                <h3 className="mt-2 text-base font-bold leading-snug text-text-primary">
                  <Link
                    to={`${ROUTES.GUIDES}/${guide.slug}`}
                    className="transition-colors hover:text-brand"
                  >
                    {guide.title}
                  </Link>
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
                  {guide.description}
                </p>
                <Link
                  to={`${ROUTES.GUIDES}/${guide.slug}`}
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-hover"
                >
                  Read guide
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
