import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ProductImage } from '@/components/ui/ProductImage';
import { SearchInput } from '@/components/forms/SearchInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatMoney } from '@/lib/formatters';
import { catalogueService, type CatalogueItem } from '@/services';
import { Package, FileText, ChevronRight } from 'lucide-react';
import { ROUTES } from '@/constants';
import { getProductImage } from '@/constants/images';
import { SITE_NAME, SITE_URL } from '@/config/site';
import { applyNoIndex, applySeo, removeJsonLd, setJsonLd } from '@/lib/seo';

interface DisplayProduct {
  key: string;
  productId?: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  brand?: string;
  imageUrl?: string;
  quantityOnHand?: number;
}

const FALLBACK_PRODUCTS: DisplayProduct[] = [
  {
    key: 'p1',
    name: 'Dangote Cement 42.5R 50kg',
    category: 'Cement',
    price: 520000,
    unit: 'bag',
    brand: 'Dangote',
    imageUrl: '/images/products/dangote-cement.jpg',
  },
  {
    key: 'p2',
    name: 'BUA Cement 42.5 50kg',
    category: 'Cement',
    price: 500000,
    unit: 'bag',
    brand: 'BUA',
    imageUrl: '/images/products/bua-cement.jpg',
  },
  {
    key: 'p3',
    name: '12mm High-Tensile Iron Rod (12m)',
    category: 'Iron Rods',
    price: 450000,
    unit: 'length',
    brand: 'Tiger',
    imageUrl: '/images/products/tmt-iron-rods-12mm.jpg',
  },
  {
    key: 'p4',
    name: '10mm High-Tensile Iron Rod (12m)',
    category: 'Iron Rods',
    price: 320000,
    unit: 'length',
    brand: 'Tiger',
    imageUrl: '/images/products/tmt-iron-rods-10mm.jpg',
  },
  {
    key: 'p5',
    name: '8mm Iron Rod (12m)',
    category: 'Iron Rods',
    price: 220000,
    unit: 'length',
    brand: 'Standard',
    imageUrl: '/images/products/iron-rod-8mm.jpg',
  },
  {
    key: 'p6',
    name: '6mm Iron Rod (12m)',
    category: 'Iron Rods',
    price: 150000,
    unit: 'length',
    brand: 'Standard',
    imageUrl: '/images/products/iron-rod-6mm.jpg',
  },
  {
    key: 'p7',
    name: 'Common Wire Nails 2.5 inches',
    category: 'Nails',
    price: 120000,
    unit: 'kg',
    brand: 'Diamond',
    imageUrl: '/images/products/wire-nails-2-5.jpg',
  },
  {
    key: 'p8',
    name: 'Common Wire Nails 3 inches',
    category: 'Nails',
    price: 120000,
    unit: 'kg',
    brand: 'Diamond',
    imageUrl: '/images/products/wire-nails-3.jpg',
  },
  {
    key: 'p9',
    name: 'Hardened Concrete Nails 2 inches',
    category: 'Nails',
    price: 150000,
    unit: 'pack',
    brand: 'Steel',
    imageUrl: '/images/products/concrete-nails-2.jpg',
  },
  {
    key: 'p10',
    name: 'Marine Plywood 12mm (4x8ft)',
    category: 'Wood',
    price: 850000,
    unit: 'sheet',
    brand: 'Standard',
    imageUrl: '/images/products/marine-plywood-12mm.jpg',
  },
  {
    key: 'p11',
    name: 'Emulsion Wall Paint White 20L',
    category: 'Paint',
    price: 450000,
    unit: 'drum',
    brand: 'Dulux',
    imageUrl: '/images/products/emulsion-paint-white.jpg',
  },
  {
    key: 'p12',
    name: 'Textured Exterior Paint 20L',
    category: 'Paint',
    price: 550000,
    unit: 'drum',
    brand: 'Berger',
    imageUrl: '/images/products/textured-paint-20l.jpg',
  },
  {
    key: 'p13',
    name: 'PVC Ceiling Panels (0.25x5.95m)',
    category: 'Ceiling',
    price: 350000,
    unit: 'bundle',
    brand: 'Star',
    imageUrl: '/images/products/pvc-ceiling-panels.jpg',
  },
  {
    key: 'p14',
    name: 'Annealed Binding Wire Roll',
    category: 'Binding',
    price: 80000,
    unit: 'roll',
    brand: 'Standard',
    imageUrl: '/images/products/binding-wire-roll.jpg',
  },
  {
    key: 'p15',
    name: 'Heavy-Duty Paint Brush 2.5"',
    category: 'Tools',
    price: 25000,
    unit: 'piece',
    brand: 'Harris',
    imageUrl: '/images/products/paint-brush-heavy-duty.jpg',
  },
  {
    key: 'p16',
    name: 'Pro Roller Brush Kit 9"',
    category: 'Tools',
    price: 40000,
    unit: 'set',
    brand: 'Harris',
    imageUrl: '/images/products/roller-brush-kit.jpg',
  },
];

export function ProductsPage() {
  const { productId, categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('q') || '';

  const [items, setItems] = useState<CatalogueItem[]>([]);
  const categoryRouteName = categoryId
    ? items.find(
        (item) =>
          item.categoryId === categoryId || item.categoryName === categoryId,
      )?.categoryName
    : undefined;
  const activeCategory = categoryParam || categoryRouteName || 'All';
  const [search, setSearch] = useState(searchParam);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    catalogueService
      .list()
      .then(({ items: catalogueItems }) => {
        if (active) setItems(catalogueItems);
      })
      .catch((error) => {
        console.error('Unable to load public catalogue:', error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const products = useMemo<DisplayProduct[]>(() => {
    if (loading) return [];
    if (items.length === 0) return FALLBACK_PRODUCTS;
    return items.map((item) => ({
      key: `${item.productId}:${item.id}`,
      productId: item.productId,
      name: item.productName,
      category: item.categoryName || 'Building Materials',
      price: item.sellingPrice,
      unit: item.unit,
      brand: item.brand,
      imageUrl: item.imageUrl || getProductImage(item.productName, item.categoryName),
      quantityOnHand: item.quantityOnHand,
    }));
  }, [items, loading]);

  const selectCategory = (category: string) => {
    const next = new URLSearchParams(searchParams);
    if (category === 'All') next.delete('category');
    else next.set('category', category);
    const query = next.toString();
    navigate(`/products${query ? `?${query}` : ''}`, { replace: true });
  };

  const categories = useMemo(() => {
    const names = Array.from(new Set(products.map((product) => product.category)));
    return ['All', ...names];
  }, [products]);

  const filtered = products.filter((product) => {
    const matchesCategory =
      activeCategory === 'All' || product.category === activeCategory;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      product.name.toLowerCase().includes(term) ||
      product.brand?.toLowerCase().includes(term);
    const matchesProduct =
      !productId || (product.productId || product.key) === productId;
    const matchesCategoryId =
      !categoryId ||
      items.some(
        (item) =>
          item.productId === (product.productId || product.key) &&
          (item.categoryId === categoryId || item.categoryName === categoryId),
      );
    return matchesCategory && matchesSearch && matchesProduct && matchesCategoryId;
  });

  useEffect(() => {
    if (!productId || loading) return;
    const variants = products.filter(
      (item) => (item.productId || item.key) === productId,
    );
    const product = variants[0];
    if (!product) {
      applyNoIndex(
        `Product Not Found | ${SITE_NAME}`,
        'The requested product could not be found. Browse the full building materials catalogue for current prices and availability.',
      );
      return;
    }

    const productPath = `/products/${encodeURIComponent(productId)}`;
    const prices = variants
      .map((variant) => variant.price)
      .filter((price) => Number.isFinite(price) && price > 0);
    const minimumPrice =
      prices.length > 0 ? Math.min(...prices) : product.price;
    const priceCopy =
      minimumPrice > 0
        ? `from ${formatMoney(minimumPrice)} per ${product.unit}`
        : 'with current prices available on request';
    const description = `Buy ${product.name}${product.brand ? ` by ${product.brand}` : ''} in Lokoja ${priceCopy}. Check live stock at ${SITE_NAME} and order by phone or WhatsApp.`;
    const imagePath = product.imageUrl || '/images/og/kings-building-materials.jpg';
    const inStock = variants.some(
      (variant) =>
        variant.quantityOnHand === undefined || variant.quantityOnHand > 0,
    );

    applySeo({
      title: `${product.name} | ${SITE_NAME}`,
      description,
      path: productPath,
      type: 'product',
      image: imagePath,
      imageAlt: `${product.name} at ${SITE_NAME}, Lokoja`,
    });

    setJsonLd('product-schema', {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      url: `${SITE_URL}${productPath}`,
      image: [imagePath.startsWith('http') ? imagePath : `${SITE_URL}${imagePath}`],
      description,
      sku: productId,
      ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
      category: product.category,
      ...(prices.length > 0
        ? {
            offers: {
              '@type': 'AggregateOffer',
              url: `${SITE_URL}${productPath}`,
              priceCurrency: 'NGN',
              lowPrice: (Math.min(...prices) / 100).toFixed(2),
              highPrice: (Math.max(...prices) / 100).toFixed(2),
              offerCount: prices.length,
              availability: inStock
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
              seller: { '@type': 'Organization', name: SITE_NAME },
            },
          }
        : {}),
    });

    setJsonLd('product-breadcrumb-schema', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${SITE_URL}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Products',
          item: `${SITE_URL}/products`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: product.name,
          item: `${SITE_URL}${productPath}`,
        },
      ],
    });

    return () => {
      removeJsonLd('product-schema');
      removeJsonLd('product-breadcrumb-schema');
    };
  }, [productId, products, loading]);

  useEffect(() => {
    if (!categoryId) return;
    const matched = items.find(
      (item) => item.categoryId === categoryId || item.categoryName === categoryId,
    );
    let categoryName = matched?.categoryName;
    if (!categoryName) {
      try {
        categoryName = decodeURIComponent(categoryId);
      } catch {
        categoryName = categoryId;
      }
      categoryName = categoryName
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
    }

    applySeo({
      title: `${categoryName} in Lokoja | ${SITE_NAME}`,
      description: `Browse ${categoryName.toLowerCase()} prices and availability at ${SITE_NAME} in Lokoja, Kogi State. Request a quote or order by phone and WhatsApp.`,
      path: `/categories/${encodeURIComponent(categoryId)}`,
    });

    setJsonLd('category-breadcrumb-schema', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${SITE_URL}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Products',
          item: `${SITE_URL}/products`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: categoryName,
          item: `${SITE_URL}/categories/${encodeURIComponent(categoryId)}`,
        },
      ],
    });

    return () => removeJsonLd('category-breadcrumb-schema');
  }, [categoryId, items]);

  const matchedProduct = productId
    ? products.find(
        (product) => (product.productId || product.key) === productId,
      )
    : undefined;
  const categoryHeading = categoryId
    ? items.find(
        (item) =>
          item.categoryId === categoryId || item.categoryName === categoryId,
      )?.categoryName ||
      categoryId
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase())
    : undefined;
  const pageHeading =
    matchedProduct?.name ||
    categoryHeading ||
    'Building Materials Catalogue';
  const pageDescription = matchedProduct
    ? `Current depot pricing and availability for ${matchedProduct.name} in Lokoja, Kogi State.`
    : categoryHeading
      ? `Browse ${categoryHeading.toLowerCase()} prices and availability in Lokoja, Kogi State.`
      : 'Browse verified wholesale and retail inventory available for immediate dispatch across Kogi State.';

  return (
    <div className="min-h-screen bg-canvas">
      <section className="border-b border-border bg-surface py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {(productId || categoryId) && (
            <nav
              aria-label="Breadcrumb"
              className="mb-4 flex flex-wrap items-center gap-1.5 text-xs font-medium text-text-secondary"
            >
              <Link to="/" className="transition-colors hover:text-brand">
                Home
              </Link>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <Link to="/products" className="transition-colors hover:text-brand">
                Products
              </Link>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <span className="text-text-primary" aria-current="page">
                {pageHeading}
              </span>
            </nav>
          )}
          <SectionHeader
            as="h1"
            title={pageHeading}
            description={pageDescription}
            action={
              <Button variant="primary" size="sm" asChild>
                <Link to={ROUTES.REQUEST_QUOTE}>
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Request Full Quote
                </Link>
              </Button>
            }
          />

          <div className="flex flex-col gap-4 pt-2 md:flex-row md:items-center md:justify-between">
            <SegmentedControl
              options={categories.map((category) => ({ value: category, label: category }))}
              value={activeCategory}
              onChange={selectCategory}
              size="sm"
              ariaLabel="Filter by category"
              className="md:flex-1"
            />

            <div className="w-full shrink-0 md:max-w-xs">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search materials or brands…"
                ariaLabel="Search materials"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            {loading
              ? 'Loading materials catalogue…'
              : `Showing ${filtered.length} product${filtered.length !== 1 ? 's' : ''}`}
          </p>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map((product) => (
                <Card
                  key={product.key}
                  variant="soft"
                  className="group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative">
                    <Link
                      to={`/products/${encodeURIComponent(product.productId || product.key)}`}
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
                    <div className="space-y-1">
                      <h3 className="line-clamp-2 text-base font-bold leading-snug text-text-primary transition-colors group-hover:text-brand">
                        <Link
                          to={`/products/${encodeURIComponent(product.productId || product.key)}`}
                        >
                          {product.name}
                        </Link>
                      </h3>
                      {product.brand && (
                        <p className="text-sm font-medium text-text-secondary">
                          Brand: <span className="text-text-primary">{product.brand}</span>
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                      <div>
                        <span className="block text-2xs font-semibold uppercase tracking-wide text-text-muted">
                          Depot Rate
                        </span>
                        {product.price > 0 ? (
                          <>
                            <span className="text-lg font-extrabold tabular-nums text-text-primary">
                              {formatMoney(product.price)}
                            </span>
                            <span className="ml-1 text-xs text-text-secondary">/ {product.unit}</span>
                          </>
                        ) : (
                          <span className="text-base font-bold text-brand">Price on request</span>
                        )}
                      </div>

                      <Button variant="secondary" size="sm" asChild className="shrink-0">
                        <Link to={`${ROUTES.REQUEST_QUOTE}?product=${encodeURIComponent(product.name)}`}>
                          Add to Quote
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            !loading && (
              <EmptyState
                icon={<Package className="h-8 w-8" aria-hidden="true" />}
                title="No materials found"
                description={`No products match your current search “${search}”. Try searching for cement, iron rods, or roofing materials.`}
                action={
                  <Button
                    variant="primary"
                    onClick={() => {
                      setSearch('');
                      selectCategory('All');
                    }}
                  >
                    Clear Search Filters
                  </Button>
                }
              />
            )
          )}
        </div>
      </section>
    </div>
  );
}
